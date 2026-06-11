import { Page, Card, BlockStack, Text, Button, Banner } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { useFetcher } from "react-router";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return { ready: true };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const results = { shopDeleted: false, productsCleared: 0, errors: [] };

  // 1. Clear shop-level metafield
  try {
    const shopResult = await admin.graphql(`
      query {
        shop {
          id
          metafield(namespace: "pistalix", key: "global_product_options") {
            id
          }
        }
      }
    `);
    const shopData = await shopResult.json();
    const shopMf = shopData.data?.shop?.metafield;
    const shopId = shopData.data?.shop?.id;

    if (shopMf && shopId) {
      const delRes = await admin.graphql(`
        mutation metafieldsDelete($metafields: [MetafieldIdentifierInput!]!) {
          metafieldsDelete(metafields: $metafields) {
            deletedMetafields { key namespace ownerId }
            userErrors { field message }
          }
        }
      `, { variables: { metafields: [{ ownerId: shopId, namespace: "pistalix", key: "global_product_options" }] } });
      const delData = await delRes.json();
      if (delData.data?.metafieldsDelete?.userErrors?.length > 0) {
        results.errors.push(...delData.data.metafieldsDelete.userErrors);
      } else {
        results.shopDeleted = true;
      }
    }
  } catch (e) {
    results.errors.push({ message: "Shop metafield error: " + e.message });
  }

  // 2. Clear ALL product-level metafields
  try {
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage) {
      const prodResult = await admin.graphql(`
        query GetProductsMetafields($cursor: String) {
          products(first: 50, after: $cursor) {
            edges {
              cursor
              node {
                id
                metafield(namespace: "pistalix", key: "product_options") {
                  id
                }
              }
            }
            pageInfo { hasNextPage }
          }
        }
      `, { variables: cursor ? { cursor } : {} });
      const prodData = await prodResult.json();
      const edges = prodData.data?.products?.edges || [];

      const toDelete = [];
      for (const edge of edges) {
        cursor = edge.cursor;
        if (edge.node.metafield) {
          toDelete.push({
            ownerId: edge.node.id,
            namespace: "pistalix",
            key: "product_options"
          });
        }
      }

      if (toDelete.length > 0) {
        const delRes = await admin.graphql(`
          mutation metafieldsDelete($metafields: [MetafieldIdentifierInput!]!) {
            metafieldsDelete(metafields: $metafields) {
              deletedMetafields { key namespace ownerId }
              userErrors { field message }
            }
          }
        `, { variables: { metafields: toDelete } });
        const delData = await delRes.json();
        if (delData.data?.metafieldsDelete?.userErrors?.length > 0) {
          results.errors.push(...delData.data.metafieldsDelete.userErrors);
        } else {
          results.productsCleared += toDelete.length;
        }
      }

      hasNextPage = prodData.data?.products?.pageInfo?.hasNextPage || false;
    }
  } catch (e) {
    results.errors.push({ message: "Product metafield error: " + e.message });
  }

  return results;
};

export default function ClearMetafields() {
  const fetcher = useFetcher();
  const isLoading = fetcher.state !== "idle";
  const results = fetcher.data;

  return (
    <Page title="Clear All Pistalix Metafields" backAction={{ url: "/app" }}>
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="300">
            <Text as="p">
              This will remove all <strong>pistalix.product_options</strong> metafields from every product 
              and the <strong>pistalix.global_product_options</strong> metafield from the shop.
            </Text>
            <Text as="p" tone="subdued">
              Use this when templates are still showing on the online store after being deleted from the app.
            </Text>
            <Button
              variant="primary"
              tone="critical"
              loading={isLoading}
              onClick={() => fetcher.submit({}, { method: "POST" })}
            >
              Clear All Metafields Now
            </Button>
          </BlockStack>
        </Card>

        {results && (
          <Card>
            <BlockStack gap="200">
              <Banner tone={results.errors?.length > 0 ? "warning" : "success"}>
                <BlockStack gap="100">
                  <Text as="p">Shop-level metafield: {results.shopDeleted ? "✅ Deleted" : "⏭ Not found (already clean)"}</Text>
                  <Text as="p">Product metafields cleared: {results.productsCleared}</Text>
                  {results.errors?.length > 0 && (
                    <Text as="p" tone="critical">Errors: {JSON.stringify(results.errors)}</Text>
                  )}
                </BlockStack>
              </Banner>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}
