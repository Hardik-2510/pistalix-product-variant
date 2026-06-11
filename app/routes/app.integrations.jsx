import {
  Page,
  Card,
  Text,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Integrations() {
  return (
    <Page>
      <Card>
        <Text variant="headingLg" as="h1">
          Integrations
        </Text>
        <Box paddingBlockStart="400">
          <Text as="p" tone="subdued">
            Third-party integrations will go here.
          </Text>
        </Box>
      </Card>
    </Page>
  );
}
