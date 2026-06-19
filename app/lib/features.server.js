import prisma from "../db.server";
import { PLANS } from "./billing.server";

export async function requireFeature(shopDomain, featureName) {
  const shop = await prisma.shop.findUnique({ where: { shopDomain: shopDomain } });
  
  if (!shop) throw new Error("Shop not found");

  // Defaults to Free plan features if no plan is set
  const currentTier = shop.planTier || "free"; 
  const features = PLANS[currentTier].features;

  // Check if feature exists and is true
  if (features[featureName] === true || features[featureName] === Infinity) {
    return true;
  }
  
  // Also check if it's a numeric limit
  if (typeof features[featureName] === "number" && features[featureName] > 0) {
    // For numeric limits, the caller should probably check the current usage against the limit.
    // For now, returning the limit itself if they just want to check access.
    // However, the caller usually just wants a boolean, so let's say true if > 0.
    return true; 
  }

  return false;
}

export async function getFeatureLimit(shopDomain, featureName) {
  const shop = await prisma.shop.findUnique({ where: { shopDomain: shopDomain } });
  
  if (!shop) throw new Error("Shop not found");

  const currentTier = shop.planTier || "free"; 
  const features = PLANS[currentTier].features;

  return features[featureName] || 0;
}
