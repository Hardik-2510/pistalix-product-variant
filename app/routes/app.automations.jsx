import {
  Page,
  Card,
  Text,
  Box,
  BlockStack,
  Button,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { useNavigate } from "react-router";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

const WorkflowIcon = () => (
  <svg width="150" height="150" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M50 15c1.4 0 2.6.9 3 2.2l1 3.5c1.7.5 3.3 1.2 4.7 2.2l3.2-1.8c1.2-.7 2.7-.4 3.6.5l3.8 3.8c1 .9 1.2 2.4.5 3.6l-1.8 3.2c1 1.4 1.7 3 2.2 4.7l3.5 1c1.3.4 2.2 1.6 2.2 3v5.2c0 1.4-.9 2.6-2.2 3l-3.5 1c-.5 1.7-1.2 3.3-2.2 4.7l1.8 3.2c.7 1.2.4 2.7-.5 3.6l-3.8 3.8c-.9 1-2.4 1.2-3.6.5l-3.2-1.8c-1.4 1-3 1.7-4.7 2.2l-1 3.5c-.4 1.3-1.6 2.2-3 2.2h-5.2c-1.4 0-2.6-.9-3-2.2l-1-3.5c-1.7-.5-3.3-1.2-4.7-2.2l-3.2 1.8c-1.2.7-2.7.4-3.6-.5l-3.8-3.8c-1-.9-1.2-2.4-.5-3.6l1.8-3.2c-1-1.4-1.7-3-2.2-4.7l-3.5-1c-1.3-.4-2.2-1.6-2.2-3v-5.2c0-1.4.9-2.6 2.2-3l3.5-1c.5-1.7 1.2-3.3 2.2-4.7l-1.8-3.2c-.7-1.2-.4-2.7.5-3.6l3.8-3.8c.9-1 2.4-1.2 3.6-.5l3.2 1.8c1.4-1 3-1.7 4.7-2.2l1-3.5c.4-1.3 1.6-2.2 3-2.2h5.2z" 
      fill="#f4f6f8" 
      stroke="#000" 
      strokeWidth="3.5" 
      strokeLinejoin="round"
    />
    <circle cx="50" cy="50" r="23" fill="none" stroke="#000" strokeWidth="3.5" />
    
    <path d="M43 31.5a18 18 0 0 1 18 5.5" fill="none" stroke="#60A5FA" strokeWidth="4" strokeLinecap="round" />
    <path d="M57 37h5v-5" fill="none" stroke="#60A5FA" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    
    <path d="M57 68.5a18 18 0 0 1-18-5.5" fill="none" stroke="#60A5FA" strokeWidth="4" strokeLinecap="round" />
    <path d="M43 63h-5v5" fill="none" stroke="#60A5FA" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    
    <circle cx="50" cy="50" r="8" fill="#f4f6f8" stroke="#000" strokeWidth="3.5" />
    <line x1="47" y1="47" x2="53" y2="53" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export default function Automations() {
  const navigate = useNavigate();
  return (
    <Page
      title="Automations ⓘ"
      primaryAction={{ content: 'Add workflow', onAction: () => navigate('/app/workflows/templates') }}
    >
      <Card padding="0">
        <Box padding="300" borderBlockEndWidth="1" borderColor="border">
          <Text variant="headingSm" as="h2">
            Workflows
          </Text>
        </Box>
        <Box padding="1000">
          <BlockStack inlineAlign="center" gap="400">
            <WorkflowIcon />
            
            <BlockStack inlineAlign="center" gap="200">
              <Text variant="headingLg" as="h3" fontWeight="bold">
                You don&apos;t have any workflows yet
              </Text>
              <Text as="p" tone="subdued">
                Start by creating one to automate your tasks
              </Text>
            </BlockStack>

            <Box paddingBlockStart="200">
              <Button variant="primary" onClick={() => navigate('/app/workflows/templates')}>Create your first workflow</Button>
            </Box>
          </BlockStack>
        </Box>
      </Card>
    </Page>
  );
}
