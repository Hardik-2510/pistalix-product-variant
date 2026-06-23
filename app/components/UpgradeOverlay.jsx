import { Box, Text, Button, InlineStack, BlockStack, Badge } from "@shopify/polaris";
import { useNavigate } from "react-router";

const PLAN_DISPLAY = {
  basic:    { label: "Basic",    color: "subdued" },
  standard: { label: "Standard", color: "info" },
  premium:  { label: "Premium",  color: "attention" },
};

const TIER_ORDER = ["basic", "standard", "premium"];

/**
 * UpgradeOverlay — Wraps children in a blurred/locked state with an
 * upgrade prompt overlay when the user's plan doesn't meet the requirement.
 *
 * Props:
 * - requiredPlan: "standard" | "premium" — minimum tier needed
 * - currentPlan: "basic" | "standard" | "premium" — user's current tier
 * - featureLabel: string — short description of what's locked (optional)
 * - children: the content to render beneath the overlay
 */
export default function UpgradeOverlay({ requiredPlan, currentPlan, featureLabel, children }) {
  const navigate = useNavigate();

  const currentIdx = TIER_ORDER.indexOf(currentPlan || "basic");
  const requiredIdx = TIER_ORDER.indexOf(requiredPlan || "basic");

  // If the user meets the requirement, just render children normally
  if (currentIdx >= requiredIdx) {
    return <>{children}</>;
  }

  const planInfo = PLAN_DISPLAY[requiredPlan] || PLAN_DISPLAY.premium;

  return (
    <div style={{ position: "relative" }}>
      {/* Blurred / dimmed children */}
      <div
        style={{
          filter: "blur(2.5px)",
          opacity: 0.45,
          pointerEvents: "none",
          userSelect: "none",
          transition: "filter 0.3s ease, opacity 0.3s ease",
        }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Overlay card */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
        }}
      >
        <div
          style={{
            background: "rgba(255, 255, 255, 0.92)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid var(--p-color-border)",
            borderRadius: "12px",
            padding: "20px 28px",
            maxWidth: "340px",
            textAlign: "center",
            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)",
          }}
        >
          <BlockStack gap="300" inlineAlign="center">
            {/* Lock icon */}
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #f6f0ff 0%, #e8e0f0 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              🔒
            </div>

            <BlockStack gap="100" inlineAlign="center">
              <InlineStack gap="200" align="center" blockAlign="center">
                <Text variant="headingSm" as="h4" fontWeight="bold">
                  {planInfo.label} Plan Feature
                </Text>
                <Badge tone={planInfo.color}>{planInfo.label}</Badge>
              </InlineStack>

              <Text as="p" tone="subdued" variant="bodySm" alignment="center">
                {featureLabel
                  ? `${featureLabel} requires the ${planInfo.label} plan or higher.`
                  : `This feature is available on the ${planInfo.label} plan.`}
              </Text>
            </BlockStack>

            <Button
              variant="primary"
              size="medium"
              onClick={() => navigate("/app/pricing")}
            >
              Upgrade to {planInfo.label}
            </Button>
          </BlockStack>
        </div>
      </div>
    </div>
  );
}
