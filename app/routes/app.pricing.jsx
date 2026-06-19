import { useLoaderData, useFetcher, data as json } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { PLANS } from "../lib/billing.server";
import { Page, Layout, Card, Text, BlockStack, InlineStack, Button, Badge, List } from "@shopify/polaris";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = await prisma.shop.findUnique({ 
    where: { shopDomain: session.shop }, 
    select: { planTier: true, billingInterval: true } 
  });

  return json({ currentTier: shop?.planTier || "free", plans: PLANS });
};

export default function PricingPage() {
  const { currentTier, plans } = useLoaderData();
  const fetcher = useFetcher();

  const handleUpgrade = (tier) => {
    fetcher.submit({ tier, interval: "monthly" }, { method: "post", action: "/api/upgrade" });
  };

  return (
    <Page title="Pricing Plans">
      <Layout>
        <Layout.Section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {Object.entries(plans).map(([key, plan]) => {
              const isCurrent = key === currentTier;
              const isLoading = fetcher.state !== "idle" && fetcher.formData?.get("tier") === key;

              return (
                <Card key={key} background={isCurrent ? "bg-surface-secondary" : "bg-surface"}>
                  <BlockStack gap="400">
                    <InlineStack align="space-between">
                      <Text variant="headingLg" as="h2">{plan.name}</Text>
                      {isCurrent && <Badge tone="success">Current Plan</Badge>}
                    </InlineStack>
                    
                    <Text variant="heading3xl" as="p">
                      ${plan.price} <Text as="span" variant="bodyMd" tone="subdued">/ month</Text>
                    </Text>

                    <List type="bullet">
                      <List.Item>Option Sets: {plan.features.maxOptionSets === Infinity ? "Unlimited" : plan.features.maxOptionSets}</List.Item>
                      <List.Item>Option Types: {plan.features.optionTypes}</List.Item>
                      <List.Item>Conditional Logic: {plan.features.conditionalLogic ? "Included" : "Not included"}</List.Item>
                      <List.Item>Custom Branding: {plan.features.customBranding ? "Included" : "Not included"}</List.Item>
                      <List.Item>Support: {plan.features.support === "priority" ? "Priority Support" : "Email Support"}</List.Item>
                    </List>

                    <Button 
                      size="large"
                      variant={isCurrent ? "secondary" : "primary"}
                      disabled={isCurrent}
                      loading={isLoading}
                      onClick={() => handleUpgrade(key)}
                    >
                      {isCurrent ? "Current Plan" : key === "free" ? "Downgrade to Free" : "Upgrade to " + plan.name}
                    </Button>
                  </BlockStack>
                </Card>
              );
            })}
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
