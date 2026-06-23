import prisma from "../db.server";

/**
 * Evaluates rules for all active Option Sets for a shop and determines
 * the highest priority Option Set for a given product.
 * 
 * Priority: Manual > Collection > All
 * Recency: Most recently updated wins (orderBy updatedAt: 'desc')
 *
 * @param {string} productGid - The GID of the product (e.g. gid://shopify/Product/123)
 * @param {string} shopDomain - The shop domain
 * @param {object} admin - Authenticated shopify admin client
 * @returns {object|null} The matched Option Set or null
 */
export async function getMatchedOptionSetForProduct(productGid, shopDomain, admin, preFetchedOptionSets = null) {
  const optionSets = preFetchedOptionSets || await prisma.optionSet.findMany({
    where: {
      shopId: shopDomain,
      status: { in: ["ACTIVE", "active", "TEMPLATE", "template"] }
    },
    include: {
      productRules: true,
      sections: {
        include: {
          elements: {
            orderBy: { order: "asc" }
          }
        },
        orderBy: { order: "asc" }
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  if (!optionSets.length) return null;

  let matchedOptionSet = null;

  // ── Priority 1: Manual Selection ──────────────────────────────────────────
  for (const os of optionSets) {
    for (const rule of os.productRules) {
      if (rule.targetType === "manual") {
        try {
          const values = JSON.parse(rule.targetValues || "[]");
          if (Array.isArray(values) && values.includes(productGid)) {
            matchedOptionSet = os;
            break;
          } else if (typeof rule.targetValues === "string" && rule.targetValues === productGid) {
            matchedOptionSet = os;
            break;
          }
        } catch (e) {
          if (rule.targetValues === productGid) {
            matchedOptionSet = os;
            break;
          }
        }
      }
    }
    if (matchedOptionSet) break;
  }

  // ── Priority 2: Collection ────────────────────────────────────────────────
  if (!matchedOptionSet && admin) {
    const hasCollectionRules = optionSets.some(
      (os) => os.productRules.some((r) => r.targetType === "collection")
    );

    if (hasCollectionRules) {
      try {
        const response = await admin.graphql(
          `#graphql
            query GetProductCollections($id: ID!) {
              product(id: $id) {
                collections(first: 50) {
                  edges {
                    node {
                      id
                    }
                  }
                }
              }
            }
          `,
          { variables: { id: productGid } }
        );
        const data = await response.json();
        const productCollectionIds = (data.data?.product?.collections?.edges || [])
          .map((e) => e.node.id);

        if (productCollectionIds.length > 0) {
          for (const os of optionSets) {
            for (const rule of os.productRules) {
              if (
                rule.targetType === "collection" &&
                productCollectionIds.includes(rule.targetValues)
              ) {
                matchedOptionSet = os;
                break;
              }
            }
            if (matchedOptionSet) break;
          }
        }
      } catch (e) {
        console.error("Failed to fetch product collections for fallback matching", e);
      }
    }
  }

  // ── Priority 3: Apply to All Products ────────────────────────────────────
  if (!matchedOptionSet) {
    for (const os of optionSets) {
      for (const rule of os.productRules) {
        const type = rule.targetType.toLowerCase();
        if (type === "all" || type === "all_products") {
          matchedOptionSet = os;
          break;
        }
      }
      if (matchedOptionSet) break;
    }
  }

  return matchedOptionSet;
}
