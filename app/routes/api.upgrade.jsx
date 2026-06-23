import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import { switchPlan } from "../lib/billing.server";

// GET handler – used for redirect links
export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const tier = url.searchParams.get('tier'); // 'basic', 'standard', 'premium'
  const interval = url.searchParams.get('interval') || 'monthly';

  if (tier === 'basic') {
    return redirect('/app?msg=downgraded_to_free');
  }

  try {
    const confirmationUrl = await switchPlan(admin, tier, interval, session.shop);
    return redirect(confirmationUrl);
  } catch (error) {
    console.error(error);
    return redirect('/app/pricing?error=' + encodeURIComponent(error.message));
  }
};

// POST handler – used by forms submitting upgrade requests
export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const tier = formData.get('tier'); // 'basic', 'standard', 'premium'
  const interval = formData.get('interval') || 'monthly';

  if (tier === 'basic') {
    return redirect('/app?msg=downgraded_to_free');
  }

  try {
    const confirmationUrl = await switchPlan(admin, tier, interval, session.shop);
    return new Response(JSON.stringify({ confirmationUrl }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error(error);
    return redirect('/app/pricing?error=' + encodeURIComponent(error.message));
  }
};
