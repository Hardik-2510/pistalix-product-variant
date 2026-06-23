import { Box, Text, Button, InlineStack, Banner, Badge } from "@shopify/polaris";
import { useNavigate } from "react-router";

const TIER_ORDER = ["basic", "standard", "premium"];

const PLAN_LABELS = {
  basic: "Basic",
  standard: "Standard",
  premium: "Premium",
};

/**
 * PlanGate — Inline gating component for use within element editors
 * and smaller UI sections.
 *
 * Props:
 * - requiredTier: "standard" | "premium" — minimum tier needed
 * - currentTier: "basic" | "standard" | "premium" — user's current tier
 * - featureLabel: string — what feature is locked (for the banner text)
 * - children: content to render when plan is sufficient
 */
export default function PlanGate({ requiredTier, currentTier, featureLabel, children }) {
  const navigate = useNavigate();

  const currentIdx = TIER_ORDER.indexOf(currentTier || "basic");
  const requiredIdx = TIER_ORDER.indexOf(requiredTier || "basic");

  if (currentIdx >= requiredIdx) {
    return <>{children}</>;
  }

  const requiredLabel = PLAN_LABELS[requiredTier] || "Premium";

  return (
    <Banner tone="warning">
      <InlineStack align="space-between" blockAlign="center" gap="400" wrap>
        <InlineStack gap="200" blockAlign="center">
          <span style={{ fontSize: "16px" }}>🔒</span>
          <Text as="span" variant="bodyMd">
            {featureLabel || "This feature"} requires the{" "}
            <Text as="span" fontWeight="bold">{requiredLabel}</Text> plan.
          </Text>
          <Badge tone="attention">{requiredLabel}</Badge>
        </InlineStack>
        <Button size="slim" onClick={() => navigate("/app/pricing")}>
          Upgrade
        </Button>
      </InlineStack>
    </Banner>
  );
}
