import prisma from "../db.server";

/**
 * Safely execute a GraphQL query via admin.graphql().
 * The Shopify admin client throws on graphQLErrors — this wrapper catches those
 * and returns { data: null, errors: [...] } instead of crashing the caller.
 */
async function safeGraphQL(admin, query, variables = {}) {
  try {
    const response = await admin.graphql(query, { variables });
    const json = await response.json();
    return json;
  } catch (err) {
    // The Shopify client throws an object with .graphQLErrors and .response
    if (err.response) {
      try {
        const json = await err.response.json().catch(() => null);
        if (json) return json;
      } catch {
        // response already consumed
      }
    }
    if (err.graphQLErrors) {
      console.error("GraphQL errors:", JSON.stringify(err.graphQLErrors, null, 2));
    } else {
      console.error("GraphQL request failed:", err.message || err);
    }
    return { data: null, errors: err.graphQLErrors || [{ message: String(err) }] };
  }
}

/**
 * Delete metafields in bulk using the modern metafieldsDelete mutation.
 * Each entry needs { ownerId, namespace, key }.
 */
async function deleteMetafieldsBatch(admin, metafieldIdentifiers) {
  if (metafieldIdentifiers.length === 0) return;

  // Process in chunks of 25
  const chunkSize = 25;
  for (let i = 0; i < metafieldIdentifiers.length; i += chunkSize) {
    const chunk = metafieldIdentifiers.slice(i, i + chunkSize);
    const result = await safeGraphQL(admin, `
      mutation metafieldsDelete($metafields: [MetafieldIdentifierInput!]!) {
        metafieldsDelete(metafields: $metafields) {
          deletedMetafields {
            key
            namespace
            ownerId
          }
          userErrors {
            field
            message
          }
        }
      }
    `, { metafields: chunk });

    if (result.data?.metafieldsDelete?.userErrors?.length > 0) {
      console.error("Metafield delete errors:", result.data.metafieldsDelete.userErrors);
    } else if (result.data?.metafieldsDelete?.deletedMetafields) {
      console.log(`Deleted ${result.data.metafieldsDelete.deletedMetafields.length} metafield(s).`);
    }
  }
}

/**
 * Syncs an OptionSet to Shopify Product Metafields for rapid Storefront reading.
 * When a template is assigned to products (manual selection), the template data
 * is written directly to each product's metafield so the Theme App Extension
 * can read it from Liquid without any API calls.
 *
 * @param {string} optionSetId - The ID of the option set in the DB.
 * @param {object} admin - The authenticated Shopify admin client.
 */
export async function syncOptionSetToMetafields(optionSetId, admin) {
  // 1. Fetch OptionSet with relations
  const optionSet = await prisma.optionSet.findUnique({
    where: { id: optionSetId },
    include: {
      sections: {
        include: { elements: true },
        orderBy: { order: "asc" }
      },
      productRules: true,
    }
  });

  if (!optionSet) throw new Error("Option Set not found for sync");

  // 2. Build the payload — this is what the storefront JS will read
  const payload = {
    id: optionSet.id,
    name: optionSet.name,
    elements: optionSet.sections.flatMap(sec =>
      sec.elements
        .sort((a, b) => a.order - b.order)
        .map(el => ({
          id: el.id,
          type: el.type,
          label: el.label,
          subtext: el.subtext,
          required: el.required,
          order: el.order,
          config: el.config ? JSON.parse(el.config) : {},
        }))
    )
  };

  const payloadString = JSON.stringify(payload);

  if (optionSet.status === "DRAFT" || optionSet.status === "draft") {
    console.log(`Option Set ${optionSetId} is a DRAFT. Clearing all metafields...`);
    await clearOptionSetMetafields(optionSetId, admin);
    return;
  }

  // 3. Determine Targets from Product Rules
  const rules = optionSet.productRules || [];
  let isGlobal = false;
  let targetProductGids = [];

  console.log(`Syncing option set ${optionSetId} with ${rules.length} rule(s)...`);

  for (const rule of rules) {
    const ruleType = rule.targetType.toLowerCase();
    
    if (ruleType === "all" || ruleType === "all_products") {
      isGlobal = true;
      console.log("  → Rule type: Apply to all products");
    } else if (ruleType === "manual" || ruleType === "specific_products") {
      const val = rule.targetValues || "[]";
      if (val.startsWith("[")) {
        try {
          const gids = JSON.parse(val);
          targetProductGids = [...targetProductGids, ...gids];
        } catch (e) {
          // parse error, skip
        }
      } else if (val.startsWith("gid://")) {
        targetProductGids.push(val);
      }
      console.log(`  → Rule type: Manual, GIDs: ${targetProductGids.length}`);
    } else if (ruleType === "collection") {
      const collectionGid = rule.targetValues;
      if (collectionGid && collectionGid.startsWith("gid://shopify/Collection/")) {
        let collHasNextPage = true;
        let collCursor = null;
        const collectionProductGids = [];

        while (collHasNextPage) {
          const result = await safeGraphQL(admin, `
            query GetCollectionProducts($id: ID!, $cursor: String) {
              collection(id: $id) {
                products(first: 50, after: $cursor) {
                  edges {
                    cursor
                    node { id }
                  }
                  pageInfo { hasNextPage }
                }
              }
            }
          `, collCursor ? { id: collectionGid, cursor: collCursor } : { id: collectionGid });

          if (!result.data) {
            console.error(`Failed to fetch collection ${collectionGid} products.`);
            break;
          }

          const edges = result.data?.collection?.products?.edges || [];
          for (const edge of edges) {
            collectionProductGids.push(edge.node.id);
            collCursor = edge.cursor;
          }
          collHasNextPage = result.data?.collection?.products?.pageInfo?.hasNextPage || false;
        }

        console.log(`  → Collection ${collectionGid}: found ${collectionProductGids.length} products.`);
        targetProductGids = [...targetProductGids, ...collectionProductGids];
      }
    }
  }

  // 3a. Find products that currently have the metafield for this option set but are no longer targeted
  const productMetafieldsToDelete = []; // { ownerId, namespace, key }
  let hasNextPage = true;
  let cursor = null;

  while (hasNextPage) {
    const result = await safeGraphQL(admin, `
      query GetProductsMetafields($cursor: String) {
        products(first: 50, after: $cursor) {
          edges {
            cursor
            node {
              id
              metafield(namespace: "pistalix", key: "product_options") {
                id
                value
              }
            }
          }
          pageInfo { hasNextPage }
        }
      }
    `, cursor ? { cursor } : {});

    if (!result.data) {
      console.error("Failed to query products for metafield cleanup — skipping cleanup step.");
      break;
    }

    const edges = result.data?.products?.edges || [];
    for (const edge of edges) {
      const product = edge.node;
      cursor = edge.cursor;

      if (product.metafield && product.metafield.value) {
        try {
          const metafieldVal = JSON.parse(product.metafield.value);
          if (metafieldVal.id === optionSet.id && !targetProductGids.includes(product.id)) {
            productMetafieldsToDelete.push({
              ownerId: product.id,
              namespace: "pistalix",
              key: "product_options"
            });
          }
        } catch (e) {
          // parse error, skip
        }
      }
    }
    hasNextPage = result.data?.products?.pageInfo?.hasNextPage || false;
  }

  // Execute deletion of old product metafields
  if (productMetafieldsToDelete.length > 0) {
    console.log(`Clearing old metafields on ${productMetafieldsToDelete.length} product(s)...`);
    await deleteMetafieldsBatch(admin, productMetafieldsToDelete);
  }

  // 3b. Clear shop-level global metafield if this option set is no longer "apply to all"
  if (!isGlobal) {
    const shopMetaResult = await safeGraphQL(admin, `
      query {
        shop {
          id
          metafield(namespace: "pistalix", key: "global_product_options") {
            id
            value
          }
        }
      }
    `);

    if (shopMetaResult.data) {
      const shopId = shopMetaResult.data?.shop?.id;
      const shopMetafield = shopMetaResult.data?.shop?.metafield;
      if (shopMetafield && shopMetafield.value && shopId) {
        try {
          const shopMetaVal = JSON.parse(shopMetafield.value);
          if (shopMetaVal.id === optionSet.id) {
            console.log(`Clearing shop-level global_product_options for option set ${optionSetId}...`);
            await deleteMetafieldsBatch(admin, [{
              ownerId: shopId,
              namespace: "pistalix",
              key: "global_product_options"
            }]);
          }
        } catch (e) {
          // JSON parse error, skip
        }
      }
    }
  }

  // 4. Build metafield inputs
  const metafields = [];

  if (isGlobal) {
    const shopResult = await safeGraphQL(admin, `query { shop { id } }`);
    if (shopResult.data) {
      const shopId = shopResult.data.shop.id;
      metafields.push({
        ownerId: shopId,
        namespace: "pistalix",
        key: "global_product_options",
        type: "json",
        value: payloadString
      });
    }
  }
  
  if (targetProductGids.length > 0) {
    for (const gid of targetProductGids) {
      metafields.push({
        ownerId: gid,
        namespace: "pistalix",
        key: "product_options",
        type: "json",
        value: payloadString
      });
    }
  }

  if (metafields.length === 0) {
    console.log(`No metafield targets for option set ${optionSetId}. Old metafields have been cleaned up.`);
    return;
  }

  // 5. Execute MetafieldsSet Mutation in chunks of 25
  const chunkSize = 25;
  for (let i = 0; i < metafields.length; i += chunkSize) {
    const chunk = metafields.slice(i, i + chunkSize);
    const result = await safeGraphQL(admin, `
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
            ownerType
          }
          userErrors {
            field
            message
          }
        }
      }
    `, { metafields: chunk });

    if (result.data?.metafieldsSet?.userErrors?.length > 0) {
      console.error("Metafield Sync Errors:", result.data.metafieldsSet.userErrors);
    } else if (result.data) {
      console.log(`Successfully synced chunk of ${chunk.length} Metafield(s).`);
    }
  }
}

/**
 * Clears all product options metafields belonging to the specified optionSetId.
 */
export async function clearOptionSetMetafields(optionSetId, admin) {
  const metafieldsToDelete = []; // { ownerId, namespace, key }

  // 1. Check shop-level global_product_options metafield
  const shopMetaResult = await safeGraphQL(admin, `
    query {
      shop {
        id
        metafield(namespace: "pistalix", key: "global_product_options") {
          id
          value
        }
      }
    }
  `);

  if (shopMetaResult.data) {
    const shopId = shopMetaResult.data?.shop?.id;
    const shopMetafield = shopMetaResult.data?.shop?.metafield;
    if (shopMetafield && shopMetafield.value && shopId) {
      try {
        const shopMetaVal = JSON.parse(shopMetafield.value);
        if (shopMetaVal.id === optionSetId) {
          metafieldsToDelete.push({
            ownerId: shopId,
            namespace: "pistalix",
            key: "global_product_options"
          });
          console.log(`Will clear shop-level global_product_options for option set ${optionSetId}`);
        }
      } catch (e) {
        // parse error, skip
      }
    }
  }

  // 2. Clear product-level metafields
  let hasNextPage = true;
  let cursor = null;

  while (hasNextPage) {
    const result = await safeGraphQL(admin, `
      query GetProductsMetafields($cursor: String) {
        products(first: 50, after: $cursor) {
          edges {
            cursor
            node {
              id
              metafield(namespace: "pistalix", key: "product_options") {
                id
                value
              }
            }
          }
          pageInfo { hasNextPage }
        }
      }
    `, cursor ? { cursor } : {});

    if (!result.data) {
      console.error("Failed to query products for clearing metafields — skipping.");
      break;
    }

    const edges = result.data?.products?.edges || [];
    for (const edge of edges) {
      const product = edge.node;
      cursor = edge.cursor;

      if (product.metafield && product.metafield.value) {
        try {
          const metafieldVal = JSON.parse(product.metafield.value);
          if (metafieldVal.id === optionSetId) {
            metafieldsToDelete.push({
              ownerId: product.id,
              namespace: "pistalix",
              key: "product_options"
            });
          }
        } catch (e) {
          // parse error, skip
        }
      }
    }
    hasNextPage = result.data?.products?.pageInfo?.hasNextPage || false;
  }

  // 3. Delete all collected metafields
  if (metafieldsToDelete.length > 0) {
    console.log(`Clearing ${metafieldsToDelete.length} metafield(s) for option set ${optionSetId}...`);
    await deleteMetafieldsBatch(admin, metafieldsToDelete);
  }
}
