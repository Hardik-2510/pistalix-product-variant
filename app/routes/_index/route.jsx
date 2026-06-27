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
                Varify Product Options Variant
              </Text>
              <Text variant="bodyMd" as="p">
                Break past Shopify&rsquo;s variant limits. Add unlimited custom product
                options &mdash; text fields, file uploads, color &amp; image swatches,
                dropdowns, and more &mdash; with add-on pricing and conditional logic.
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
                  <Text fontWeight="bold" as="span">Unlimited custom options</Text>. Add text inputs, file uploads, color &amp; image swatches, dropdowns, and checkboxes to any product.
                </List.Item>
                <List.Item>
                  <Text fontWeight="bold" as="span">Reusable option sets &amp; templates</Text>. Build once and apply across products and collections, with ready-made templates to start fast.
                </List.Item>
                <List.Item>
                  <Text fontWeight="bold" as="span">Conditional logic &amp; add-on pricing</Text>. Show or hide options based on customer choices, and add extra costs that calculate automatically.
                </List.Item>
              </List>
            </BlockStack>
          </Card>
        </Box>
      </Page>
    </AppProvider>
  );
}
