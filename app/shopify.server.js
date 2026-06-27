import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  DeliveryMethod,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import { ensureFeeConfig } from "./lib/feeProduct.server";

// Shop-level metafields the theme widget reads via Liquid (shop.metafields.*).
// They must have a definition with storefront PUBLIC_READ access to be exposed.
const SHOP_METAFIELD_DEFINITIONS = [
  { name: "Global Product Options", namespace: "pistalix", key: "global_product_options" },
  { name: "Product Options Settings", namespace: "pistalix", key: "settings" },
  { name: "Product Options Fee Config", namespace: "pistalix", key: "fee_config" },
];

async function ensureShopMetafieldDefinitions(admin) {
  for (const def of SHOP_METAFIELD_DEFINITIONS) {
    try {
      const res = await admin.graphql(
        `#graphql
        mutation CreateShopMetafieldDef($definition: MetafieldDefinitionInput!) {
          metafieldDefinitionCreate(definition: $definition) {
            createdDefinition { id }
            userErrors { field message code }
          }
        }`,
        {
          variables: {
            definition: {
              name: def.name,
              namespace: def.namespace,
              key: def.key,
              type: "json",
              ownerType: "SHOP",
              access: { storefront: "PUBLIC_READ" },
            },
          },
        }
      );
      const json = await res.json();
      const errs = json?.data?.metafieldDefinitionCreate?.userErrors || [];
      // TAKEN = definition already exists → expected on re-auth, ignore.
      const meaningful = errs.filter((e) => e.code !== "TAKEN");
      if (meaningful.length) {
        console.error("metafieldDefinitionCreate userErrors:", JSON.stringify(meaningful));
      }
    } catch (err) {
      console.error(`Failed to ensure metafield definition ${def.namespace}.${def.key}:`, err);
    }
  }
}

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  isEmbeddedApp: true,
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  webhooks: {
    APP_SUBSCRIPTIONS_UPDATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app/subscriptions_update",
    },
  },
  hooks: {
    afterAuth: async ({ session, admin }) => {
      // Ensure a Shop row exists for every authenticated shop. OptionSet.shopId
      // and billing both FK to Shop.shopDomain, so without this, creating an
      // option set "from scratch" fails with a foreign-key constraint error.
      await prisma.shop.upsert({
        where: { shopDomain: session.shop },
        update: {},
        create: { shopDomain: session.shop },
      });
      // Ensure shop-level metafield definitions exist with storefront read
      // access, so the theme widget can read them via Liquid shop.metafields.*
      await ensureShopMetafieldDefinitions(admin);
      // Detect Plus vs non-Plus and provision the fee product for non-Plus
      // shops; writes the storefront-readable pistalix.fee_config metafield.
      await ensureFeeConfig(admin);
      // Register code-defined webhooks (e.g. APP_SUBSCRIPTIONS_UPDATE).
      await shopify.registerWebhooks({ session });
    },
  },
  future: {
    expiringOfflineAccessTokens: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
