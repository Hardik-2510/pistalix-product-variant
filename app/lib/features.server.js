/* eslint-disable no-unused-vars */
import prisma from "../db.server";
import { PLANS, meetsMinimumTier } from "./billing.server";

/**
 * Get the current shop's plan tier. Returns "basic" if not found.
 */
export async function getShopTier(shopDomain) {
  // Developer Override: automatically unlock all premium features for internal dev stores
  const DEVELOPER_STORES = [
    "varify-pov.myshopify.com",
    "varify-pov.myshopify.com"
  ];
  if (
    DEVELOPER_STORES.includes(shopDomain) ||
    process.env.FORCE_PREMIUM === "true" ||
    process.env.NODE_ENV === "development"
  ) {
    return "premium";
  }

  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    select: { planTier: true }
  });
  return shop?.planTier || "basic";
}

/**
 * Get all feature flags for a shop's current plan.
 * Returns the features object from PLANS config.
 */
export async function getShopFeatures(shopDomain) {
  const tier = await getShopTier(shopDomain);
  return { tier, features: PLANS[tier]?.features || PLANS.basic.features };
}

/**
 * Check whether a boolean feature is enabled for the shop's plan.
 */
export async function requireFeature(shopDomain, featureName) {
  const { features } = await getShopFeatures(shopDomain);
  const val = features[featureName];
  if (val === true || val === Infinity) return true;
  if (typeof val === "number" && val > 0) return true;
  return false;
}

/**
 * Get the numeric limit for a feature (e.g. maxOptionSetsAndTemplates).
 */
export async function getFeatureLimit(shopDomain, featureName) {
  const { features } = await getShopFeatures(shopDomain);
  return features[featureName] || 0;
}

/**
 * Validate that the shop hasn't exceeded their combined
 * option-set + custom-template limit.
 *
 * Returns { allowed: boolean, current: number, limit: number }
 */
export async function validateOptionSetLimit(shopDomain) {
  const { features } = await getShopFeatures(shopDomain);
  const limit = features.maxOptionSetsAndTemplates;

  if (limit === Infinity) {
    return { allowed: true, current: 0, limit: Infinity };
  }

  // Count all OptionSet records for this shop (both option sets and templates)
  const current = await prisma.optionSet.count({
    where: { shopId: shopDomain }
  });

  return {
    allowed: current < limit,
    current,
    limit,
  };
}

/**
 * Sanitize settings payload based on plan tier.
 * Strips locked feature data so it can't be persisted via API bypass.
 */
export function sanitizeSettingsForTier(settings, tier) {
  const features = PLANS[tier]?.features || PLANS.basic.features;
  const sanitized = { ...settings };

  // Typography — locked for basic & standard
  if (!features.typography) {
    delete sanitized.typography;
  }

  // Custom Fonts — locked for basic & standard
  if (!features.customFontFeature) {
    delete sanitized.customFonts;
  }

  // Advanced color keys — locked for basic
  if (!features.colorAdvanced && sanitized.colors) {
    const generalColorKeys = [
      "appBackground", "labelText", "requiredCharacter",
      "helpText", "totalText", "totalTextMoney"
    ];
    const filteredColors = {};
    for (const key of generalColorKeys) {
      if (sanitized.colors[key] !== undefined) {
        filteredColors[key] = sanitized.colors[key];
      }
    }
    sanitized.colors = filteredColors;
  }

  // Product Page Feature — locked for basic
  if (!features.productPageFeature && sanitized.toggleStates) {
    // Remove product-page-specific toggles
    delete sanitized.toggleStates.autoScroll;
    delete sanitized.toggleStates.goToCart;
    delete sanitized.filePreview;
  }

  return sanitized;
}
