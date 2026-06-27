// Removed unused json import

import { authenticate } from "../shopify.server";
import { getMatchedOptionSetForProduct } from "../lib/matching.server";

// Short-lived in-memory cache so we don't run the (Admin-API-backed) matching
// logic on every storefront product view — protects the shop's Admin API rate
// limit and cuts latency. Safe for a single-instance deploy.
const CACHE_TTL_MS = 60_000;
const MAX_CACHE_ENTRIES = 1000;
const optionCache = new Map(); // `${shop}:${productId}` -> { expires, body }

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

  const cacheKey = `${shop}:${productId}`;
  const cached = optionCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return Response.json(cached.body, { headers: corsHeaders(true) });
  }

  const productGid = `gid://shopify/Product/${productId}`;

  try {
    const matchedOptionSet = await getMatchedOptionSetForProduct(productGid, shop, admin);

    let body;
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
      body = {
        found: true,
        template: {
          id: matchedOptionSet.id,
          name: matchedOptionSet.name,
          elements: mappedElements,
        },
      };
    } else {
      body = { found: false, template: null };
    }

    // Cache briefly (bounded to avoid unbounded memory growth).
    if (optionCache.size >= MAX_CACHE_ENTRIES) optionCache.clear();
    optionCache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, body });

    return Response.json(body, { headers: corsHeaders(true) });

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

function corsHeaders(cacheable = false) {
  const base = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (cacheable) {
    // Allow the browser/CDN to reuse option data for up to 60s. Merchant edits
    // appear on the storefront within a minute.
    return { ...base, "Cache-Control": "public, max-age=60" };
  }
  return {
    ...base,
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  };
}
