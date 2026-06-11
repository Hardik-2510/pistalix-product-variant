// Removed unused json import
import prisma from "../db.server";
import { unauthenticated } from "../shopify.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");
  const shop = url.searchParams.get("shop");

  if (!productId || !shop) {
    return Response.json({ found: false, template: null }, { headers: corsHeaders() });
  }

  const productGid = `gid://shopify/Product/${productId}`;

  try {
    const optionSets = await prisma.optionSet.findMany({
      where: {
        shopId: shop,
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
    });

    if (!optionSets.length) {
      return Response.json({ found: false, template: null }, { headers: corsHeaders() });
    }

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
    // This is the API fallback path. In most cases, products in a collection
    // already have their metafield written at save time. This handles edge cases
    // where the metafield hasn't been synced yet (e.g. new products added later).
    if (!matchedOptionSet) {
      const hasCollectionRules = optionSets.some(
        (os) => os.productRules.some((r) => r.targetType === "collection")
      );

      if (hasCollectionRules) {
        try {
          const { admin } = await unauthenticated.admin(shop);
          
          // Fetch the product's collection IDs in one query
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
          if (rule.targetType === "all" || rule.targetType === "ALL_PRODUCTS") {
            matchedOptionSet = os;
            break;
          }
        }
        if (matchedOptionSet) break;
      }
    }

    if (matchedOptionSet) {
      const mappedElements = matchedOptionSet.sections.flatMap((sec) =>
        sec.elements.map((el) => ({
          id: el.id,
          type: el.type,
          label: el.label,
          subtext: el.subtext,
          required: el.required,
          order: el.order,
          config: el.config ? JSON.parse(el.config) : {},
        }))
      );

      return Response.json({
        found: true,
        template: {
          id: matchedOptionSet.id,
          name: matchedOptionSet.name,
          elements: mappedElements,
        },
      }, { headers: corsHeaders() });
    }

    return Response.json({ found: false, template: null }, { headers: corsHeaders() });

  } catch (error) {
    console.error("API Error in product-options", error);
    return Response.json({ found: false, template: null }, { headers: corsHeaders() });
  }
};

export const action = async () => {
  return Response.json(null, { headers: corsHeaders() });
};

// Helper for CORS preflight
export const handleDataRequest = async (args) => {
  if (args.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }
  return null;
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  };
}
