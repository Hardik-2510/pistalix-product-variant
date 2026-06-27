/**
 * Hybrid option-pricing support.
 *
 * Shopify only allows cart-line PRICE OVERRIDES (cart transform `lineUpdate`)
 * on Shopify Plus. For non-Plus shops we instead charge option add-ons via a
 * hidden "$0.01 fee" product: the storefront adds that variant with
 * quantity = (add-on amount in cents), so 500 × $0.01 = $5.00. This works on
 * every plan with the native cart + checkout.
 *
 * This module:
 *   1. Detects whether the shop is Plus.
 *   2. For non-Plus shops, ensures the fee product exists (idempotent) and is
 *      published to the Online Store.
 *   3. Writes a storefront-readable `pistalix.fee_config` shop metafield
 *      ({ isPlus, feeVariantId }) the theme widget reads to pick its path.
 */

const FEE_PRODUCT_TITLE = "Product Options — price add-on (do not delete)";
const FEE_METAFIELD_NS = "pistalix";
const FEE_METAFIELD_KEY = "fee_config";

async function gql(admin, query, variables) {
  const res = await admin.graphql(query, variables ? { variables } : undefined);
  return res.json();
}

/** Read the existing fee_config metafield, if any. */
async function readFeeConfig(admin) {
  const json = await gql(
    admin,
    `#graphql
    query {
      shop {
        metafield(namespace: "${FEE_METAFIELD_NS}", key: "${FEE_METAFIELD_KEY}") { value }
      }
    }`
  );
  const raw = json?.data?.shop?.metafield?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Persist the fee_config metafield (owner: shop). */
async function writeFeeConfig(admin, shopGid, config) {
  await gql(
    admin,
    `#graphql
    mutation SetFeeConfig($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors { field message }
      }
    }`,
    {
      metafields: [
        {
          namespace: FEE_METAFIELD_NS,
          key: FEE_METAFIELD_KEY,
          type: "json",
          ownerId: shopGid,
          value: JSON.stringify(config),
        },
      ],
    }
  );
}

/** Find the Online Store publication id (required to make the product buyable). */
async function getOnlineStorePublicationId(admin) {
  const json = await gql(
    admin,
    `#graphql
    query { publications(first: 20) { nodes { id name } } }`
  );
  const nodes = json?.data?.publications?.nodes || [];
  const online = nodes.find((n) => n.name === "Online Store");
  return online?.id || null;
}

/** Create the hidden fee product and return its numeric variant id. */
async function createFeeProduct(admin) {
  // 1. Create the product (a default variant is created automatically).
  const createJson = await gql(
    admin,
    `#graphql
    mutation CreateFeeProduct($product: ProductCreateInput!) {
      productCreate(product: $product) {
        product {
          id
          variants(first: 1) { nodes { id } }
        }
        userErrors { field message }
      }
    }`,
    {
      product: {
        title: FEE_PRODUCT_TITLE,
        status: "ACTIVE",
        productType: "Service",
        tags: ["pistalix-fee", "hidden"],
      },
    }
  );

  const createErrors = createJson?.data?.productCreate?.userErrors;
  if (createErrors?.length) {
    throw new Error("productCreate: " + JSON.stringify(createErrors));
  }
  const product = createJson?.data?.productCreate?.product;
  const productGid = product?.id;
  const variantGid = product?.variants?.nodes?.[0]?.id;
  if (!productGid || !variantGid) {
    throw new Error("productCreate returned no product/variant.");
  }

  // 2. Set the variant to $0.01, no inventory tracking, no shipping.
  const updateJson = await gql(
    admin,
    `#graphql
    mutation UpdateFeeVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants { id }
        userErrors { field message }
      }
    }`,
    {
      productId: productGid,
      variants: [
        {
          id: variantGid,
          price: "0.01",
          taxable: true,
          inventoryItem: { tracked: false, requiresShipping: false },
        },
      ],
    }
  );
  const updateErrors = updateJson?.data?.productVariantsBulkUpdate?.userErrors;
  if (updateErrors?.length) {
    console.error("productVariantsBulkUpdate userErrors:", JSON.stringify(updateErrors));
  }

  // 3. Publish to the Online Store so it can be added to the cart.
  const publicationId = await getOnlineStorePublicationId(admin);
  if (publicationId) {
    const pubJson = await gql(
      admin,
      `#graphql
      mutation PublishFeeProduct($id: ID!, $input: [PublicationInput!]!) {
        publishablePublish(id: $id, input: $input) {
          userErrors { field message }
        }
      }`,
      { id: productGid, input: [{ publicationId }] }
    );
    const pubErrors = pubJson?.data?.publishablePublish?.userErrors;
    if (pubErrors?.length) {
      console.error("publishablePublish userErrors:", JSON.stringify(pubErrors));
    }
  } else {
    console.warn("Online Store publication not found — fee product may not be buyable.");
  }

  // Storefront /cart/add needs the NUMERIC variant id.
  const numericVariantId = variantGid.split("/").pop();
  return { productGid, variantGid, feeVariantId: numericVariantId };
}

/**
 * Ensure the shop has a valid fee_config. Safe to call on every auth (idempotent).
 * Returns the config object, or null on failure.
 */
export async function ensureFeeConfig(admin) {
  try {
    // Resolve shop GID + Plus status in one query.
    const shopJson = await gql(
      admin,
      `#graphql
      query { shop { id plan { shopifyPlus } } }`
    );
    const shopGid = shopJson?.data?.shop?.id;
    const isPlus = !!shopJson?.data?.shop?.plan?.shopifyPlus;
    if (!shopGid) throw new Error("Could not resolve shop id.");

    const existing = await readFeeConfig(admin);

    // Plus shops use the cart transform — no fee product needed.
    if (isPlus) {
      if (!existing || existing.isPlus !== true) {
        await writeFeeConfig(admin, shopGid, { isPlus: true });
      }
      return { isPlus: true };
    }

    // Non-Plus: reuse the existing fee variant if we already created one.
    if (existing && existing.feeVariantId) {
      if (existing.isPlus !== false) {
        await writeFeeConfig(admin, shopGid, { ...existing, isPlus: false });
      }
      return { isPlus: false, feeVariantId: existing.feeVariantId };
    }

    // Otherwise create the fee product and persist the config.
    const { feeVariantId } = await createFeeProduct(admin);
    const config = { isPlus: false, feeVariantId };
    await writeFeeConfig(admin, shopGid, config);
    return config;
  } catch (err) {
    console.error("ensureFeeConfig failed:", err);
    return null;
  }
}
