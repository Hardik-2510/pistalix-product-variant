import { authenticate } from "../shopify.server";
import { syncSubscriptionStatus } from "../lib/billing.server";

export const action = async ({ request }) => {
  const { topic, shop, admin } = await authenticate.webhook(request);

  if (topic !== "APP_SUBSCRIPTIONS_UPDATE") {
    return new Response("Unhandled webhook topic", { status: 404 });
  }

  if (!admin) {
    // The webhook may fire when a shop uninstalls, which we handle elsewhere
    return new Response();
  }




  // Use shared sync logic to update shop tier & interval
  await syncSubscriptionStatus(admin, shop);
  return new Response();
};
