import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  InlineStack,
  Button,
  Badge,
  Box,
  CalloutCard,
} from "@shopify/polaris";
import { useNavigate } from "react-router";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  // eslint-disable-next-line no-undef
  const functionId = process.env.SHOPIFY_CART_PRICE_OVERRIDE_ID;

  if (functionId) {
    try {
      // Check if it already exists
      const existingRes = await admin.graphql(`
        query {
          cartTransforms(first: 10) {
            nodes {
              id
              functionId
            }
          }
        }
      `);
      const existingData = await existingRes.json();
      const exists = existingData.data?.cartTransforms?.nodes?.some(n => n.functionId === functionId);

      if (!exists) {
        // Create the cart transform if it doesn't exist
        const response = await admin.graphql(`
          mutation cartTransformCreate($functionId: String!) {
            cartTransformCreate(functionId: $functionId) {
              cartTransform {
                id
              }
              userErrors {
                field
                message
              }
            }
          }
        `, {
          variables: { functionId }
        });
        const data = await response.json();
        console.log("Cart Transform Activation:", JSON.stringify(data));
      } else {
        console.log("Cart Transform already activated for", functionId);
      }
    } catch (err) {
      console.error("Failed to activate Cart Transform:", err);
    }
  }

  return { 
    activated: !!functionId,
    // eslint-disable-next-line no-undef
    envKeys: Object.keys(process.env).filter(k => k.includes('SHOPIFY')),
    functionId
  };
}

export default function Index() {
  const navigate = useNavigate();

  return (
    <Page title="Dashboard">
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              <CalloutCard
                title="Welcome to Varify Product Option Variants"
                illustration="https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-705f57c725ac05be5a34ec20c05b94298cb8afd100f26b56d0081a3e8d5f80d5.svg"
                primaryAction={{
                  content: "Create option set",
                  onAction: () => navigate("/app/option-sets/new"),
                }}
              >
                <p>Customize your products with unlimited options. Start by creating an option set and assigning it to your products.</p>
              </CalloutCard>

              <Card padding="0">
                <Box padding="400" borderBlockEndWidth="025" borderColor="border" background="bg-surface-secondary">
                  <Text variant="headingSm" as="h3" fontWeight="semibold">Quick Actions</Text>
                </Box>
                <Box padding="400">
                  <InlineStack gap="300" wrap={false} blockAlign="center">
                    <Card>
                      <BlockStack gap="200" inlineAlign="center">
                        <Text variant="headingMd" as="h4">Option Sets</Text>
                        <Text as="p" tone="subdued" alignment="center">Manage your product options</Text>
                        <Button onClick={() => navigate("/app/option-sets")}>View sets</Button>
                      </BlockStack>
                    </Card>
                    <Card>
                      <BlockStack gap="200" inlineAlign="center">
                        <Text variant="headingMd" as="h4">Templates</Text>
                        <Text as="p" tone="subdued" alignment="center">Use pre-built configurations</Text>
                        <Button onClick={() => navigate("/app/templates")}>View templates</Button>
                      </BlockStack>
                    </Card>
                  </InlineStack>
                </Box>
              </Card>
            </BlockStack>
          </Layout.Section>
          
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="headingSm" as="h3">App Status</Text>
                    <Badge tone="success">Active</Badge>
                  </InlineStack>
                  <Text as="p" tone="subdued">Your widget is currently enabled and visible on the storefront.</Text>
                  <Button variant="primary" onClick={() => navigate("/app/settings")}>Manage Settings</Button>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text variant="headingSm" as="h3">Need help?</Text>
                  <Text as="p" tone="subdued">Check out our documentation or contact support for assistance.</Text>
                  <Button variant="tertiary">View documentation</Button>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}