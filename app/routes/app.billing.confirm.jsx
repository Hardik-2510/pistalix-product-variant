import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import { syncSubscriptionStatus } from "../lib/billing.server";

// This route is the return URL after the merchant approves the subscription
export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  // Shopify may include a charge_id query param; we don't need it directly
  // Ensure the shop's subscription status is up‑to‑date
  await syncSubscriptionStatus(admin, session.shop);
  // Redirect to the main app with a success message
  return redirect("/app?msg=upgrade_successful");
};

// No POST action needed for this route
