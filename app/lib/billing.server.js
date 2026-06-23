import prisma from "../db.server";

// ─── Plan Configuration ──────────────────────────────────────────────
// Basic (Free) / Standard ($4.99) / Premium ($9.99)
// ─────────────────────────────────────────────────────────────────────
export const PLANS = {
  basic: {
    name: "Basic Plan",
    price: 0,
    features: {
      maxOptionSetsAndTemplates: 3,
      maxSectionsPerOptionSet: 1,
      advancedFeatures: false,
      advancedSettings: false,
      customFontFeature: false,
      productPageFeature: false,
      colorGeneral: true,
      colorAdvanced: false,   // Single Input, Choices, Tabs, Groups
      typography: false,
    }
  },
  standard: {
    name: "Standard Plan",
    price: 4.99,
    features: {
      maxOptionSetsAndTemplates: 5,
      maxSectionsPerOptionSet: 3,
      advancedFeatures: true,
      advancedSettings: false,
      customFontFeature: false,
      productPageFeature: true,
      colorGeneral: true,
      colorAdvanced: true,
      typography: false,
    }
  },
  premium: {
    name: "Premium Plan",
    price: 9.99,
    features: {
      maxOptionSetsAndTemplates: Infinity,
      maxSectionsPerOptionSet: Infinity,
      advancedFeatures: true,
      advancedSettings: true,
      customFontFeature: true,
      productPageFeature: true,
      colorGeneral: true,
      colorAdvanced: true,
      typography: true,
    }
  }
};

// Tier hierarchy for comparison (higher index = higher tier)
const TIER_ORDER = ["basic", "standard", "premium"];

/**
 * Check if a tier meets a required minimum tier.
 * e.g. meetsMinimumTier("basic", "standard") → false
 *      meetsMinimumTier("premium", "standard") → true
 */
export function meetsMinimumTier(currentTier, requiredTier) {
  const currentIdx = TIER_ORDER.indexOf(currentTier || "basic");
  const requiredIdx = TIER_ORDER.indexOf(requiredTier || "basic");
  return currentIdx >= requiredIdx;
}

/**
 * Get the minimum tier required for a given feature.
 * Returns "basic", "standard", or "premium".
 */
export function getRequiredTierForFeature(featureName) {
  for (const tier of TIER_ORDER) {
    const val = PLANS[tier].features[featureName];
    if (val === true || val === Infinity || (typeof val === "number" && val > 0)) {
      return tier;
    }
  }
  return "premium"; // default fallback
}

const getInterval = (interval) => {
  return interval === "yearly" ? "ANNUAL" : "EVERY_30_DAYS";
};

export async function switchPlan(admin, tier, interval, shop) {
  const plan = PLANS[tier];
  if (!plan) throw new Error("Invalid plan tier");

  if (tier === "basic") {
    // If downgrading to free (basic), Shopify doesn't need billing approval.
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
    // No paid subscriptions – revert to basic (free) tier
    await updateShopToTier(shopDomain, "basic", null, null, null);
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
  if (lower.includes("premium")) return "premium";
  if (lower.includes("standard")) return "standard";
  // Legacy mappings for existing subscriptions
  if (lower.includes("pro")) return "premium";
  if (lower.includes("basic")) return "basic";
  return "basic";
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
