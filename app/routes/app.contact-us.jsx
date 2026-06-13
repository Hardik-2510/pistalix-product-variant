import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  Button,
  Icon,
  Box,
  InlineGrid,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import {
  ChatIcon,
  EmailIcon,
  BookIcon,
} from "@shopify/polaris-icons";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function ContactUs() {
  return (
    <Page title="Contact Us">
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <Text variant="headingLg" as="h2">How can we help you?</Text>
              <Text as="p" tone="subdued">
                We&apos;re here to help you get the most out of Pistalix Options. Choose a support option below.
              </Text>

              <Box paddingBlockStart="400">
                <InlineGrid columns={{ xs: 1, sm: 1, md: 3 }} gap="400">
                  <Card>
                    <BlockStack gap="300" inlineAlign="center">
                      <Box padding="300" background="bg-surface-secondary" borderRadius="100">
                        <Icon source={ChatIcon} tone="base" />
                      </Box>
                      <Text variant="headingMd" as="h3">Live Chat</Text>
                      <Text as="p" tone="subdued" alignment="center">
                        Chat with our support team in real-time.
                      </Text>
                      <Button onClick={() => window.open('https://pistalix.in', '_blank')}>Start chat</Button>
                    </BlockStack>
                  </Card>

                  <Card>
                    <BlockStack gap="300" inlineAlign="center">
                      <Box padding="300" background="bg-surface-secondary" borderRadius="100">
                        <Icon source={EmailIcon} tone="base" />
                      </Box>
                      <Text variant="headingMd" as="h3">Email Support</Text>
                      <Text as="p" tone="subdued" alignment="center">
                        Send us an email and we&apos;ll get back to you within 24 hours.
                      </Text>
                      <Text as="p" tone="subdued" alignment="center">
                      info@pistalix.in
                      </Text>
                    </BlockStack>
                  </Card>

                  <Card>
                    <BlockStack gap="300" inlineAlign="center">
                      <Box padding="300" background="bg-surface-secondary" borderRadius="100">
                        <Icon source={BookIcon} tone="base" />
                      </Box>
                      <Text variant="headingMd" as="h3">Documentation</Text>
                      <Text as="p" tone="subdued" alignment="center">
                        Read our detailed guides and tutorials.
                      </Text>
                      <Button onClick={() => window.open('https://pistalix.in', '_blank')}>View docs</Button>
                    </BlockStack>
                  </Card>
                </InlineGrid>
              </Box>
            </BlockStack>
          </Layout.Section>

          <Layout.Section>
            <Box paddingBlockStart="800" paddingBlockEnd="400">
              <BlockStack gap="200" inlineAlign="center">
                <Text as="p" tone="subdued" alignment="center">
                  © Pistalix Solutions Private Limited | All Right Reserved
                </Text>
                <Text as="p" tone="subdued" alignment="center">
                  Address: Unique Square, Opp. Zudio, Singanpor, Katargam, Surat, – 395004
                </Text>
              </BlockStack>
            </Box>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
