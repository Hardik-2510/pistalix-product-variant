import {
  Page,
  Card,
  EmptyState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Integrations() {
  return (
    <Page title="Integrations">
      <Card padding="0">
        <EmptyState
          heading="No integrations configured"
          action={{
            content: "Browse integrations",
            variant: "primary",
            onAction: () => {},
          }}
          secondaryAction={{
            content: "Learn more",
            onAction: () => window.open('https://help.shopify.com', '_blank')
          }}
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <p>Connect your app with third-party services to enhance your store&apos;s functionality.</p>
        </EmptyState>
      </Card>
    </Page>
  );
}
