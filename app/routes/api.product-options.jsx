// Removed unused json import

import { authenticate } from "../shopify.server";
import { getMatchedOptionSetForProduct } from "../lib/matching.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");

  if (!productId) {
    return Response.json({ found: false, template: null }, { headers: corsHeaders() });
  }

  // Verify this is a genuine Shopify app-proxy request (HMAC-signed) and take
  // the shop from the verified session — never trust the `shop` query param.
  let admin, shop;
  try {
    const proxy = await authenticate.public.appProxy(request);
    admin = proxy.admin;
    shop = proxy.session?.shop;
  } catch {
    return Response.json({ found: false, template: null }, { status: 401, headers: corsHeaders() });
  }

  if (!admin || !shop) {
    return Response.json({ found: false, template: null }, { status: 401, headers: corsHeaders() });
  }

  const productGid = `gid://shopify/Product/${productId}`;

  try {
    const matchedOptionSet = await getMatchedOptionSetForProduct(productGid, shop, admin);

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
