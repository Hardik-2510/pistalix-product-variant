import {
  Page,
  Card,
  Text,
  BlockStack,
  Button,
  InlineStack,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { useNavigate } from "react-router";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

const SyncIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
  </svg>
);

const AppIcon = () => (
  <div style={{ width: 44, height: 44, backgroundColor: '#A72D6D', borderRadius: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="4" width="14" height="16" rx="2" fill="white" />
      <path d="M9 11l2 2 4-4" stroke="#A72D6D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 14v4c0 1-1 2-2 2H8c-1 0-2-1-2-2v-3c0-1 1-1 2-1h4z" fill="#F6E05E" stroke="#B7791F" strokeWidth="1" />
      <circle cx="12" cy="14" r="2" fill="#F6E05E" stroke="#B7791F" strokeWidth="1" />
    </svg>
  </div>
);

const EmailIcon = () => (
  <div style={{ width: 44, height: 44, backgroundColor: '#FEFCBF', borderRadius: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #D69E2E' }}>
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#D69E2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="#FEFCBF" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  </div>
);

const NotesIcon = () => (
  <div style={{ width: 44, height: 44, backgroundColor: '#fff', borderRadius: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #CBD5E0' }}>
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4A5568" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#fff"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <path d="M18 12l2-2a2 2 0 0 0-3-3l-2 2" stroke="#E53E3E" strokeWidth="2" />
      <path d="M15 9l-6 6v3h3l6-6" stroke="#E53E3E" strokeWidth="2" fill="#FED7D7" />
    </svg>
  </div>
);

const TagIcon = () => (
  <div style={{ width: 44, height: 44, backgroundColor: '#FED7D7', borderRadius: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #E53E3E' }}>
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#E53E3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" fill="#FED7D7"></path>
      <line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3"></line>
    </svg>
  </div>
);

function TemplateCard({ title, badgeText, description, Icon1, Icon2, onSelect }) {
  return (
    <Card padding="400">
      <InlineStack align="space-between" blockAlign="center" wrap={false}>
        <InlineStack gap="500" blockAlign="center" wrap={false}>
          {/* Icon Box */}
          <div style={{ backgroundColor: '#EDF2F7', padding: '16px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '16px', minWidth: '160px', justifyContent: 'center' }}>
            <Icon1 />
            <SyncIcon />
            <Icon2 />
          </div>
          
          <BlockStack gap="200">
            <InlineStack gap="300" blockAlign="center">
              <Text variant="headingMd" as="h3">{title}</Text>
              <div style={{ backgroundColor: '#E2E8F0', padding: '2px 8px', borderRadius: '12px' }}>
                <Text variant="bodySm" tone="subdued" fontWeight="medium">{badgeText}</Text>
              </div>
            </InlineStack>
            <Text as="p" tone="subdued">{description}</Text>
          </BlockStack>
        </InlineStack>

        <div style={{ flexShrink: 0, paddingLeft: '16px', whiteSpace: 'nowrap' }}>
          <Button variant="primary" onClick={onSelect}>+ Select</Button>
        </div>
      </InlineStack>
    </Card>
  );
}

export default function WorkflowTemplates() {
  const navigate = useNavigate();

  return (
    <Page
      backAction={{ content: 'Automations', onAction: () => navigate('/app/automations') }}
      title="Workflow templates"
    >
      <BlockStack gap="400">
        <TemplateCard 
          title="Email notification"
          badgeText="(Maximum: 1)"
          description="When customers place an order with Globo options, the app will automatically send a notification to your email."
          Icon1={AppIcon}
          Icon2={EmailIcon}
          onSelect={() => navigate('/app/workflows/new?type=email-notification')}
        />
        
        <TemplateCard 
          title="Order notes update"
          badgeText="(Maximum: 1)"
          description="When customers place an order with Globo options, the app will update order notes to include these options."
          Icon1={AppIcon}
          Icon2={NotesIcon}
          onSelect={() => navigate('/app/workflows/new?type=order-notes')}
        />

        <TemplateCard 
          title="Order tags update"
          badgeText="(Maximum: no limits)"
          description="When customers place an order with Globo options, the app will update order tags based on selected options."
          Icon1={AppIcon}
          Icon2={TagIcon}
          onSelect={() => navigate('/app/workflows/new?type=order-tags')}
        />
      </BlockStack>
    </Page>
  );
}
