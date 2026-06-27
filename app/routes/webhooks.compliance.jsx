import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * Mandatory Shopify privacy / GDPR compliance webhooks.
 *
 * A single endpoint handles all three required topics:
 *   - customers/data_request : provide a customer's stored data
 *   - customers/redact       : erase a customer's data
 *   - shop/redact            : 48h after uninstall, erase ALL shop data
 *
 * authenticate.webhook() verifies the HMAC signature for us — an invalid
 * signature throws and the request is rejected automatically (401).
 *
 * NOTE: This app stores NO customer personal data (it only stores merchant
 * sessions and option-set configuration keyed by shop). So the customer
 * topics have nothing to return or delete; we still must acknowledge them.
 */
export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  // Normalise to a stable form regardless of how the library formats it.
  const normalized = String(topic).toUpperCase().replace(/\//g, "_");

  console.log(`Received compliance webhook ${normalized} for ${shop}`);

  switch (normalized) {
    case "CUSTOMERS_DATA_REQUEST":
      // No customer personal data is stored by this app — nothing to return.
      break;

    case "CUSTOMERS_REDACT":
      // No customer personal data is stored by this app — nothing to delete.
      break;

    case "SHOP_REDACT": {
      // The shop uninstalled 48h ago — purge everything we hold for it.
      const shopDomain = payload?.shop_domain || shop;

      // Sessions (contain access tokens) — delete by shop.
      await db.session.deleteMany({ where: { shop: shopDomain } });

      // Shop row cascades to OptionSet → Section / Element / ProductRule.
      await db.shop.deleteMany({ where: { shopDomain } });

      console.log(`Purged all data for ${shopDomain}`);
      break;
    }

    default:
      console.warn(`Unhandled compliance topic: ${normalized}`);
  }

  return new Response();
};
