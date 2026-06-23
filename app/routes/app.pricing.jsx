import { useEffect } from "react";
import { useLoaderData, useFetcher, data as json } from "react-router";
import { authenticate } from "../shopify.server";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, Button, Badge, Divider
} from "@shopify/polaris";

import { getShopTier } from "../lib/features.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const currentTier = await getShopTier(session.shop);

  // Import PLANS only in the server-side loader
  const { PLANS } = await import("../lib/billing.server.js");

  return json({ currentTier, plans: PLANS });
};

const FEATURE_ROWS = [
  { label: "Option Sets & Templates", key: "maxOptionSetsAndTemplates", format: (v) => v === Infinity ? "Unlimited" : `Up to ${v}` },
  { label: "Advanced Features", key: "advancedFeatures", type: "bool" },
  { label: "Advanced Settings", key: "advancedSettings", type: "bool" },
  { label: "Product Page Controls", key: "productPageFeature", type: "bool" },
  { label: "Custom Fonts", key: "customFontFeature", type: "bool" },
  { label: "Color — General", key: "colorGeneral", type: "bool" },
  { label: "Color — Advanced", key: "colorAdvanced", type: "bool" },
  { label: "Typography Styling", key: "typography", type: "bool" },
];

const PLAN_ORDER = ["basic", "standard", "premium"];

const PLAN_STYLES = {
  basic: {
    gradient: "linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)",
    accent: "#64748b",
    badge: "subdued",
  },
  standard: {
    gradient: "linear-gradient(135deg, #eef2ff 0%, #c7d2fe 100%)",
    accent: "#6366f1",
    badge: "info",
  },
  premium: {
    gradient: "linear-gradient(135deg, #fef3c7 0%, #fbbf24 20%, #f59e0b 100%)",
    accent: "#d97706",
    badge: "attention",
  },
};

function FeatureCheck({ enabled }) {
  return (
    <div style={{
      width: "22px", height: "22px", borderRadius: "50%",
      background: enabled ? "#10b981" : "#e5e7eb",
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 0.2s ease",
    }}>
      {enabled ? (
        <svg width="12" height="12" viewBox="0 0 20 20" fill="white">
          <path d="M7.629 14.571l-4.2-4.2 1.4-1.4 2.8 2.8 7.142-7.142 1.4 1.4L7.63 14.57z"/>
        </svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 20 20" fill="#9ca3af">
          <path d="M11.414 10l4.293-4.293a1 1 0 00-1.414-1.414L10 8.586 5.707 4.293a1 1 0 00-1.414 1.414L8.586 10l-4.293 4.293a1 1 0 101.414 1.414L10 11.414l4.293 4.293a1 1 0 001.414-1.414L11.414 10z"/>
        </svg>
      )}
    </div>
  );
}

export default function PricingPage() {
  const { currentTier, plans } = useLoaderData();
  const fetcher = useFetcher();

  const handleUpgrade = (tier) => {
    fetcher.submit({ tier, interval: "monthly" }, { method: "post", action: "/api/upgrade" });
  };

  useEffect(() => {
    if (fetcher.data?.confirmationUrl) {
      window.open(fetcher.data.confirmationUrl, "_top");
    }
  }, [fetcher.data]);

  return (
    <Page title="Pricing Plans">
      <style suppressHydrationWarning>{`
        .plan-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          border-radius: 12px;
        }
        .plan-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.12);
        }
        .plan-card-premium {
          position: relative;
          overflow: hidden;
        }
        .plan-card-premium::before {
          content: "";
          position: absolute;
          top: 0; right: 0;
          width: 80px; height: 80px;
          background: linear-gradient(135deg, transparent 50%, rgba(251, 191, 36, 0.15) 50%);
          z-index: 0;
        }
      `}</style>

      <Layout>
        <Layout.Section>
          <BlockStack gap="200">
            <Text as="p" tone="subdued" alignment="center">
              Choose the plan that fits your store. Upgrade or downgrade anytime.
            </Text>
          </BlockStack>
        </Layout.Section>

        <Layout.Section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {PLAN_ORDER.map((key) => {
              const plan = plans[key];
              const style = PLAN_STYLES[key];
              const isCurrent = key === currentTier;
              const isLoading = fetcher.state !== "idle" && fetcher.formData?.get("tier") === key;

              return (
                <div key={key} className={`plan-card ${key === "premium" ? "plan-card-premium" : ""}`}>
                  <Card>
                    <BlockStack gap="400">
                      {/* Plan header */}
                      <div style={{
                        background: style.gradient,
                        margin: "-20px -20px 0 -20px",
                        padding: "24px 20px 20px",
                        borderRadius: "12px 12px 0 0",
                        position: "relative",
                      }}>
                        <BlockStack gap="200">
                          <InlineStack align="space-between" blockAlign="center">
                            <Text variant="headingLg" as="h2" fontWeight="bold">
                              {plan.name}
                            </Text>
                            {isCurrent && <Badge tone="success">Current</Badge>}
                          </InlineStack>
                          <InlineStack gap="100" blockAlign="end">
                            <Text variant="heading2xl" as="p" fontWeight="bold">
                              {plan.price === 0 ? "Free" : `$${plan.price}`}
                            </Text>
                            {plan.price > 0 && (
                              <Text as="span" variant="bodyMd" tone="subdued">/ month</Text>
                            )}
                          </InlineStack>
                        </BlockStack>
                      </div>

                      {/* Feature list */}
                      <BlockStack gap="300">
                        {FEATURE_ROWS.map((row) => {
                          const val = plan.features[row.key];
                          const enabled = row.type === "bool" ? val : true;
                          const displayVal = row.format ? row.format(val) : (val ? "✓" : "✗");

                          return (
                            <InlineStack key={row.key} gap="300" blockAlign="center">
                              <FeatureCheck enabled={enabled} />
                              <BlockStack gap="0">
                                <Text as="span" variant="bodyMd">
                                  {row.label}
                                </Text>
                                {row.format && (
                                  <Text as="span" variant="bodySm" tone="subdued">
                                    {displayVal}
                                  </Text>
                                )}
                              </BlockStack>
                            </InlineStack>
                          );
                        })}
                      </BlockStack>

                      <Divider />

                      {/* CTA */}
                      <Button
                        size="large"
                        fullWidth
                        variant={isCurrent ? "secondary" : "primary"}
                        tone={key === "basic" && !isCurrent ? "critical" : undefined}
                        disabled={isCurrent}
                        loading={isLoading}
                        onClick={() => handleUpgrade(key)}
                      >
                        {isCurrent
                          ? "Current Plan"
                          : key === "basic"
                            ? "Downgrade to Free"
                            : `Upgrade to ${plan.name}`}
                      </Button>
                    </BlockStack>
                  </Card>
                </div>
              );
            })}
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
