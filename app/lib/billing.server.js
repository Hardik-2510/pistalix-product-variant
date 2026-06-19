import prisma from "../db.server";

export const PLANS = {
  free: {
    name: "Free Tier",
    price: 0,
    features: {
      maxOptionSets: 2,
      optionTypes: "Standard (6+ types)",
      conditionalLogic: true,
      customBranding: false,
      support: "email"
    }
  },
  basic: {
    name: "Basic Plan",
    price: 9.99,
    features: {
      maxOptionSets: 10,
      optionTypes: "Standard (6+ types)",
      conditionalLogic: true,
      customBranding: false,
      support: "email"
    }
  },
  pro: {
    name: "Pro Plan",
    price: 29.99,
    features: {
      maxOptionSets: Infinity, // Unlimited
      optionTypes: "All Types + Custom Fonts",
      conditionalLogic: true,
      customBranding: true,
      support: "priority"
    }
  }
};

const getInterval = (interval) => {
  return interval === "yearly" ? "ANNUAL" : "EVERY_30_DAYS";
};

export async function switchPlan(admin, tier, interval, shop) {
  const plan = PLANS[tier];
  if (!plan) throw new Error("Invalid plan tier");

  if (tier === "free") {
    // If downgrading to free, Shopify doesn't need billing approval.
    // We would cancel the existing active subscription via API.
    return null; 
  }

  // Calculate price (e.g. 20% discount for yearly)
  let priceAmount = plan.price;
  if (interval === "yearly") {
    priceAmount = parseFloat((plan.price * 12 * 0.8).toFixed(2));
  }

  const returnUrl = `${process.env.SHOPIFY_APP_URL}/app/billing/confirm?shop=${shop}`;

  const response = await admin.graphql(
    `#graphql
    mutation CreateTimeBasedAppSubscription($returnUrl: URL!, $test: Boolean!) {
      appSubscriptionCreate(
        name: "${plan.name} - ${interval === 'yearly' ? 'Yearly' : 'Monthly'}"
        returnUrl: $returnUrl
        test: $test
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: { amount: ${priceAmount}, currencyCode: USD }
                interval: ${getInterval(interval)}
              }
            }
          }
        ]
      ) {
        userErrors {
          field
          message
        }
        confirmationUrl
        appSubscription {
          id
          name
          status
        }
      }
    }`,
    {
      variables: {
        returnUrl,
        test: true // Set to false in production
      }
    }
  );

  const data = await response.json();
  const { userErrors, confirmationUrl } = data.data.appSubscriptionCreate;

  if (userErrors && userErrors.length > 0) {
    throw new Error(userErrors[0].message);
  }

  return confirmationUrl;
}

// -------------------------------------------------------------------
// Sync subscription status (used by webhook & background tasks)
// -------------------------------------------------------------------
export async function syncSubscriptionStatus(admin, shopDomain) {
  // Query active subscriptions with interval info
  const query = `
    #graphql
    query GetActiveAppSubscriptions {
      currentAppInstallation {
        activeSubscriptions {
          id
          name
          status
          lineItems {
            plan {
              appRecurringPricingDetails {
                interval
              }
            }
          }
        }
      }
    }
  `;

  const response = await admin.graphql(query);
  const data = await response.json();
  const activeSubs = (data.data?.currentAppInstallation?.activeSubscriptions) || [];

  if (activeSubs.length === 0) {
    // No paid subscriptions – revert to free tier
    await updateShopToTier(shopDomain, "free", null, null, null);
    return;
  }

  // Determine highest tier based on price configuration
  let bestSub = activeSubs[0];
  let bestTier = getTierFromName(bestSub.name);

  for (const sub of activeSubs) {
    if (sub.status !== "ACTIVE") continue;
    const tier = getTierFromName(sub.name);
    if (PLANS[tier].price > PLANS[bestTier].price) {
      bestSub = sub;
      bestTier = tier;
    }
  }

  // Extract billing interval from line items (assumes at least one line item)
  const intervalRaw = bestSub.lineItems?.[0]?.plan?.appRecurringPricingDetails?.interval;
  const interval = intervalRaw ? getInterval(intervalRaw) : null;

  await updateShopToTier(
    shopDomain,
    bestTier,
    interval,
    bestSub.id,
    bestSub.name
  );
}

function getTierFromName(name) {
  const lower = name.toLowerCase();
  if (lower.includes("pro")) return "pro";
  if (lower.includes("basic")) return "basic";
  return "free";
}

async function updateShopToTier(shopDomain, tier, interval, subId, subName) {
  await prisma.shop.update({
    where: { shopDomain },
    data: {
      planTier: tier,
      billingInterval: interval,
      subscriptionId: subId,
      planName: subName,
      subscriptionStatus: subId ? "ACTIVE" : null,
    },
  });
}
