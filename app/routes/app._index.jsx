import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
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
    envKeys: Object.keys(process.env).filter(k => k.includes('SHOPIFY')),
    functionId
  };
}

export default function Index() {
  return (
    <Page title="Home">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Welcome to Pistalix-Globo
              </Text>
              <Text as="p">
                This is your app&apos;s home dashboard. Use the navigation menu to manage your Option Sets, Templates, and other settings.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}