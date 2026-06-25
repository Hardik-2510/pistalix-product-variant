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

// Paper plane icon — Free plan (proper folded paper plane, flying right)
const PaperPlaneIcon = () => (
  <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" style={{ width: '72px', height: '72px' }}>
    {/* Main body: big triangle pointing right */}
    <polygon points="8,16 72,40 8,64" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" strokeLinejoin="round"/>
    {/* Bottom fold crease */}
    <polygon points="8,64 30,45 46,52" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" strokeLinejoin="round"/>
    {/* Top fold crease line */}
    <line x1="8" y1="16" x2="30" y2="45" stroke="#94a3b8" strokeWidth="1.5"/>
    {/* Fold highlight line from nose to tail */}
    <line x1="30" y1="45" x2="72" y2="40" stroke="#64748b" strokeWidth="1.5"/>
  </svg>
);

// Airplane icon — Standard plan (realistic top-down commercial jet)
const AirplaneIcon = () => (
  <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" style={{ width: '72px', height: '72px' }}>
    {/* Fuselage */}
    <ellipse cx="40" cy="40" rx="7" ry="28" fill="#e0e7ff" stroke="#6366f1" strokeWidth="2"/>
    {/* Nose cone */}
    <ellipse cx="40" cy="14" rx="5" ry="7" fill="#c7d2fe" stroke="#6366f1" strokeWidth="2"/>
    {/* Main wings */}
    <path d="M40,32 L10,52 L18,56 L40,44 L62,56 L70,52 Z" fill="#a5b4fc" stroke="#6366f1" strokeWidth="1.5" strokeLinejoin="round"/>
    {/* Red stripe on wings */}
    <path d="M40,36 L14,53 L18,55 L40,41 L62,55 L66,53 Z" fill="#f87171" opacity="0.5"/>
    {/* Tail fin */}
    <path d="M40,62 L28,72 L40,68 L52,72 Z" fill="#a5b4fc" stroke="#6366f1" strokeWidth="1.5" strokeLinejoin="round"/>
    {/* Windows */}
    <circle cx="40" cy="28" r="3" fill="white" stroke="#6366f1" strokeWidth="1.2"/>
    <circle cx="40" cy="36" r="3" fill="white" stroke="#6366f1" strokeWidth="1.2"/>
    {/* Engines under wings */}
    <ellipse cx="24" cy="46" rx="5" ry="3" fill="#6366f1" opacity="0.7"/>
    <ellipse cx="56" cy="46" rx="5" ry="3" fill="#6366f1" opacity="0.7"/>
  </svg>
);

// Rocket icon — Premium plan (space shuttle style, facing up with flames)
const RocketIcon = () => (
  <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" style={{ width: '72px', height: '72px' }}>
    {/* Body */}
    <rect x="30" y="22" width="20" height="32" rx="4" fill="#fee2e2" stroke="#ef4444" strokeWidth="2"/>
    {/* Nose cone */}
    <path d="M30,22 Q40,4 50,22 Z" fill="#fca5a5" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round"/>
    {/* Porthole */}
    <circle cx="40" cy="32" r="6" fill="white" stroke="#ef4444" strokeWidth="2"/>
    <circle cx="40" cy="32" r="3.5" fill="#fca5a5"/>
    {/* Left fin */}
    <path d="M30,46 L18,60 L30,54 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round"/>
    {/* Right fin */}
    <path d="M50,46 L62,60 L50,54 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round"/>
    {/* Nozzle base */}
    <rect x="34" y="54" width="12" height="6" rx="2" fill="#f87171" stroke="#ef4444" strokeWidth="1.5"/>
    {/* Flames */}
    <ellipse cx="40" cy="64" rx="7" ry="5" fill="#fbbf24"/>
    <ellipse cx="37" cy="67" rx="4" ry="5" fill="#f97316" opacity="0.9"/>
    <ellipse cx="43" cy="68" rx="3" ry="4" fill="#ef4444" opacity="0.85"/>
    {/* Sparkle stars */}
    <text x="9" y="20" fontSize="10" fill="#fbbf24" fontFamily="sans-serif">✦</text>
    <text x="60" y="16" fontSize="12" fill="#fbbf24" fontFamily="sans-serif">✦</text>
    <text x="6" y="40" fontSize="8" fill="#fbbf24" fontFamily="sans-serif">✦</text>
    <text x="63" y="38" fontSize="8" fill="#fbbf24" fontFamily="sans-serif">✦</text>
  </svg>
);

const PLAN_ICONS = { basic: PaperPlaneIcon, standard: AirplaneIcon, premium: RocketIcon };

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
                        <BlockStack gap="300">
                          {/* Plan Icon */}
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div style={{
                              background: 'rgba(255,255,255,0.75)',
                              borderRadius: '16px',
                              padding: '12px 16px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            }}>
                              {(() => { const Icon = PLAN_ICONS[key]; return <Icon />; })()}
                            </div>
                          </div>

                          <BlockStack gap="100">
                            <div style={{ textAlign: 'center' }}>
                              <Text variant="headingLg" as="h2" fontWeight="bold">
                                {plan.name}
                              </Text>
                            </div>
                            {isCurrent && (
                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <Badge tone="success">Current</Badge>
                              </div>
                            )}
                            <div style={{ textAlign: 'center' }}>
                              <InlineStack gap="100" blockAlign="end" align="center">
                                <Text variant="heading2xl" as="p" fontWeight="bold">
                                  {plan.price === 0 ? "Free" : `$${plan.price}`}
                                </Text>
                                {plan.price > 0 && (
                                  <Text as="span" variant="bodyMd" tone="subdued">/ month</Text>
                                )}
                              </InlineStack>
                            </div>
                          </BlockStack>
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
