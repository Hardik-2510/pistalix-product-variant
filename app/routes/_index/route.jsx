import { redirect, Form, useLoaderData, useSubmit } from "react-router";
import { login } from "../../shopify.server";
import { AppProvider, Page, Card, BlockStack, Text, TextField, Button, List, Box } from "@shopify/polaris";
import { useState, useCallback } from "react";
import english from "@shopify/polaris/locales/en.json";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData();
  const [shop, setShop] = useState("");
  const submit = useSubmit();

  const handleLogin = useCallback(() => {
    submit({ shop }, { method: "post", action: "/auth/login" });
  }, [shop, submit]);

  return (
    <AppProvider i18n={english}>
      <Page>
        <Box paddingBlockStart="800">
          <Card>
            <BlockStack gap="400">
              <Text variant="headingLg" as="h1">
                A short heading about [your app]
              </Text>
              <Text variant="bodyMd" as="p">
                A tagline about [your app] that describes your value proposition.
              </Text>
              {showForm && (
                <Form method="post" action="/auth/login" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                  <BlockStack gap="300">
                    <TextField
                      label="Shop domain"
                      name="shop"
                      value={shop}
                      onChange={setShop}
                      autoComplete="off"
                      helpText="e.g: my-shop-domain.myshopify.com"
                    />
                    <Button submit variant="primary">
                      Log in
                    </Button>
                  </BlockStack>
                </Form>
              )}
              <List>
                <List.Item>
                  <Text fontWeight="bold" as="span">Product feature</Text>. Some detail about your feature and its benefit to your customer.
                </List.Item>
                <List.Item>
                  <Text fontWeight="bold" as="span">Product feature</Text>. Some detail about your feature and its benefit to your customer.
                </List.Item>
                <List.Item>
                  <Text fontWeight="bold" as="span">Product feature</Text>. Some detail about your feature and its benefit to your customer.
                </List.Item>
              </List>
            </BlockStack>
          </Card>
        </Box>
      </Page>
    </AppProvider>
  );
}
