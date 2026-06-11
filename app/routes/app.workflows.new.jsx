import { useState, useCallback } from "react";
import {
  Page,
  Card,
  Text,
  Box,
  BlockStack,
  InlineStack,
  TextField,
  Select,
  Badge,
  Tabs,
  Button,
  Link,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { useNavigate, useSearchParams } from "react-router";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

const WORKFLOW_TYPES = {
  "email-notification": {
    title: "Email notification",
    defaultName: "Email notification",
  },
  "order-notes": {
    title: "Order notes update",
    defaultName: "Order notes update",
  },
  "order-tags": {
    title: "Order tags update",
    defaultName: "Order tags update",
  },
};

const DEFAULT_EMAIL_SUBJECT = "[{{ shop.name }}] New Globo Options Order {{ order_name }}";

const DEFAULT_EMAIL_HTML = `<table class="body">
  <tbody>
    <tr>
      <td>
        <table class="header row">
          <tbody>
            <tr>
              <td class="header__cell">
                <center>
                  <table class="container">
                    <tbody>
                      <tr>
                        <td>
                          <table class="row">
                            <tbody>
                              <tr>
                                <td class="shop-name__cell">
                                  <h1 class="shop-name__text">
                                    <a>{{ shop.name }}</a>
                                  </h1>
                                </td>
                                <td class="order-number__cell" align="right">
                                  <span class="order-number__text">Order {{ order_name }}</span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </center>
              </td>
            </tr>
          </tbody>
        </table>
        <table class="row_content">
          <!-- email body content -->
        </table>
      </td>
    </tr>
  </tbody>
</table>`;

const GENERAL_VARIABLES = [
  { description: "Shop name", variable: "{{ shop.name }}" },
  { description: "Order number", variable: "{{ order_number }}" },
  { description: "Order name (with # before number)", variable: "{{ order_name }}" },
  { description: "Subtotal price", variable: "{{ subtotal_price | money }}" },
  { description: "Total tax", variable: "{{ total_tax | money }}" },
  { description: "Total price", variable: "{{ total_price | money }}" },
  { description: "Shipping price", variable: "{{ shipping_price | money }}" },
  { description: "Discount amount", variable: "{{ discount_amount | money }}" },
  { description: "Currency", variable: "{{ currency }}" },
  { description: "Financial status", variable: "{{ financial_status }}" },
  { description: "Customer email", variable: "{{ customer_email }}" },
  { description: "Customer first name", variable: "{{ customer_first_name }}" },
  { description: "Customer last name", variable: "{{ customer_last_name }}" },
  { description: "Customer full name", variable: "{{ customer_name }}" },
  { description: "Order note", variable: "{{ order_note }}" },
  { description: "Admin order URL", variable: "{{ admin_order_url }}" },
];

const SMTP_PROVIDERS = [
  { label: "Default", value: "default" },
  { label: "Google", value: "google" },
  { label: "Sendinblue", value: "sendinblue" },
  { label: "SendGrid", value: "sendgrid" },
  { label: "Outlook", value: "outlook" },
  { label: "Pepipost", value: "pepipost" },
  { label: "Amazon SES", value: "amazon-ses" },
  { label: "Elastic Email", value: "elastic-email" },
  { label: "Mailgun", value: "mailgun" },
  { label: "Zoho", value: "zoho" },
];

/* ── Preview Tab ───────────────────────────────────────────── */
function PreviewTab() {
  return (
    <Box>
      <Box padding="400" background="bg-surface-secondary" borderBlockEndWidth="025" borderColor="border">
        <Text as="p" tone="subdued">
          Subject: <Text as="span" fontWeight="medium">[follow-docs] New Globo Options Order #9999</Text>
        </Text>
      </Box>

      <Box padding="600">
        <div style={{ maxWidth: 600, margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
            <Text variant="heading2xl" as="h2" fontWeight="bold">follow-docs</Text>
            <Text as="span" tone="subdued">ORDER #9999</Text>
          </div>

          {/* Greeting */}
          <div style={{ marginBottom: 16 }}>
            <Text variant="headingLg" as="h3" fontWeight="bold">New Globo Options Order!</Text>
          </div>
          <div style={{ marginBottom: 24 }}>
            <Text as="p">
              Hi hardik patel, Peter Parker has placed a new order containing Globo Options with your store.
            </Text>
          </div>

          {/* View order button */}
          <div style={{ marginBottom: 32 }}>
            <div style={{
              display: 'inline-block',
              backgroundColor: '#1a1a1a',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}>
              View order
            </div>
          </div>

          {/* Order summary */}
          <div style={{ marginBottom: 24 }}>
            <Text variant="headingMd" as="h4" fontWeight="bold">Order summary</Text>
          </div>

          {/* Line item 1 */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '16px 0', borderBottom: '1px solid #e5e5e5' }}>
            <div style={{ width: 64, height: 64, backgroundColor: '#f5f5f5', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <svg width="40" height="30" viewBox="0 0 40 30" fill="none">
                <path d="M5 25h30M8 25l3-10h18l3 10M15 15l2-8h6l2 8M20 7V3" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <Text as="p" fontWeight="bold">The Boxer × 1</Text>
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginTop: 4 }}>
                <div>Handlebars: Straight</div>
                <div>Headlight Lens: Clear Lens</div>
                <div>Frame Finish: Black</div>
                <div>Exhaust Finish: Black</div>
                <div>Tank Colour: Marigold Yellow</div>
                <div>Seat Type: Custom - Classic Racer (Additional $30)</div>
                <div>Seat Finish - Other: Leather Upholstered</div>
                <div>Tyres: Off-road</div>
                <div>Terms and Conditions: I agree to the terms and conditions outlined in the link above</div>
              </div>
            </div>
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              <Text as="p" fontWeight="medium">$400.00</Text>
            </div>
          </div>

          {/* Line item 2 */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #e5e5e5' }}>
            <div style={{ width: 64, height: 64, backgroundColor: '#f5f5f5', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="30" height="20" viewBox="0 0 30 20" fill="none">
                <rect x="5" y="5" width="20" height="10" rx="2" stroke="#999" strokeWidth="1.5"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <Text as="p" fontWeight="bold">Bike Customization - Seat Type × 1</Text>
              <Text as="p" tone="subdued">Classic Racer</Text>
            </div>
            <div style={{ flexShrink: 0 }}>
              <Text as="p" fontWeight="medium">$30.00</Text>
            </div>
          </div>

          {/* Line item 3 */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #e5e5e5' }}>
            <div style={{ width: 64, height: 64, backgroundColor: '#f5f5f5', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="30" viewBox="0 0 20 30" fill="none">
                <rect x="4" y="2" width="12" height="26" rx="2" stroke="#999" strokeWidth="1.5"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <Text as="p" fontWeight="bold">Bike Customization - Seat Finish × 1</Text>
              <Text as="p" tone="subdued">Leather Upholstered</Text>
            </div>
            <div style={{ flexShrink: 0 }}>
              <Text as="p" fontWeight="medium">$30.00</Text>
            </div>
          </div>

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: 16, padding: '24px 0', borderTop: '2px solid #e5e5e5', marginTop: 8 }}>
            <Text as="p" tone="subdued">Total</Text>
            <Text variant="headingLg" as="p" fontWeight="bold">$460.00 USD</Text>
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: 24, marginTop: 8 }}>
            <Text as="p" tone="subdued">
              If you have any questions, reply to this email or contact us at{' '}
              <Link url="mailto:hardik@pistalix.in" monochrome>hardik@pistalix.in</Link>
            </Text>
          </div>
        </div>
      </Box>
    </Box>
  );
}

/* ── Edit Code Tab ─────────────────────────────────────────── */
function EditCodeTab({ subject, onSubjectChange, emailHtml, onEmailHtmlChange }) {
  const [showVariables, setShowVariables] = useState(false);
  return (
    <Box>
      <Box padding="400">
        <BlockStack gap="400">
          <Text variant="headingSm" as="h3">Edit code</Text>
          <TextField
            label=""
            value={subject}
            onChange={onSubjectChange}
            autoComplete="off"
            labelHidden
          />
        </BlockStack>
      </Box>

      <Box padding="400" paddingBlockStart="0">
        <BlockStack gap="300">
          <Text variant="headingSm" as="h3">Email body (HTML)</Text>
          <div style={{
            border: '1px solid var(--p-color-border)',
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            <textarea
              value={emailHtml}
              onChange={(e) => onEmailHtmlChange(e.target.value)}
              spellCheck={false}
              style={{
                width: '100%',
                minHeight: 360,
                padding: 16,
                fontFamily: '"SF Mono", "Fira Code", "Fira Mono", Menlo, Consolas, monospace',
                fontSize: 13,
                lineHeight: 1.6,
                border: 'none',
                outline: 'none',
                resize: 'vertical',
                backgroundColor: '#fafafa',
                color: '#333',
                tabSize: 2,
              }}
            />
          </div>

          {/* Action links */}
          <InlineStack align="space-between">
            <Button variant="plain">Revert to default</Button>
            <Button variant="plain" onClick={() => setShowVariables(!showVariables)}>
              {showVariables ? 'Hide the Liquid variable list' : 'View the Liquid variable list'}
            </Button>
          </InlineStack>
        </BlockStack>
      </Box>

      {/* Variables table */}
      {showVariables && (
      <Box padding="400" paddingBlockStart="200">
        <Card padding="0">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid var(--p-color-border)' }}>
            <Box padding="300">
              <BlockStack gap="100">
                <Text variant="headingSm" as="h3" fontWeight="bold">General variables</Text>
                <Text as="p" tone="subdued" variant="bodySm">
                  All of the general variables related to the order.
                </Text>
              </BlockStack>
            </Box>
            <Box padding="300" borderInlineStartWidth="025" borderColor="border">
              <Text variant="headingSm" as="h3" fontWeight="bold">Variable description</Text>
            </Box>
            <Box padding="300" borderInlineStartWidth="025" borderColor="border">
              <Text variant="headingSm" as="h3" fontWeight="bold">Variable name</Text>
            </Box>
          </div>

          {GENERAL_VARIABLES.map((v, index) => (
            <div
              key={index}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                borderBottom: index < GENERAL_VARIABLES.length - 1 ? '1px solid var(--p-color-border)' : 'none',
              }}
            >
              <Box padding="300">
                {index === 0 ? null : null}
              </Box>
              <Box padding="300" borderInlineStartWidth="025" borderColor="border">
                <Text as="p">{v.description}</Text>
              </Box>
              <Box padding="300" borderInlineStartWidth="025" borderColor="border">
                <Text as="p">
                  <code style={{ fontFamily: 'monospace', fontSize: 13 }}>{v.variable}</code>
                </Text>
              </Box>
            </div>
          ))}
        </Card>
      </Box>
      )}
    </Box>
  );
}

/* ── Configure Tab ─────────────────────────────────────────── */
function ConfigureTab({ provider, onProviderChange }) {
  return (
    <Box padding="400">
      <BlockStack gap="400">
        <Text variant="headingSm" as="h3" fontWeight="bold">Mail SMTP & API</Text>
        <Select
          label="Select provider"
          options={SMTP_PROVIDERS}
          value={provider}
          onChange={onProviderChange}
        />
      </BlockStack>
    </Box>
  );
}

/* ── Main Component ────────────────────────────────────────── */
export default function WorkflowNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") || "email-notification";

  const workflowConfig = WORKFLOW_TYPES[type] || WORKFLOW_TYPES["email-notification"];

  const [name, setName] = useState(workflowConfig.defaultName);
  const [status, setStatus] = useState("active");
  const [selectedTab, setSelectedTab] = useState(0);
  const [emailSubject, setEmailSubject] = useState(DEFAULT_EMAIL_SUBJECT);
  const [emailHtml, setEmailHtml] = useState(DEFAULT_EMAIL_HTML);
  const [smtpProvider, setSmtpProvider] = useState("default");

  const statusOptions = [
    { label: "Draft", value: "draft" },
    { label: "Active", value: "active" },
  ];

  const tabs = [
    { id: "preview", content: "Preview" },
    { id: "edit-code", content: "Edit code" },
    { id: "configure", content: "Configure" },
  ];

  const handleTabChange = useCallback(
    (selectedIndex) => setSelectedTab(selectedIndex),
    []
  );

  return (
    <Page
      backAction={{
        content: "Workflow templates",
        onAction: () => navigate("/app/workflows/templates"),
      }}
      title={
        <InlineStack gap="300" blockAlign="center">
          <Text variant="headingLg" as="h1">
            {workflowConfig.title}
          </Text>
          <Badge tone="success">Active</Badge>
        </InlineStack>
      }
    >
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="400">
            <TextField
              label="Name"
              value={name}
              onChange={setName}
              autoComplete="off"
            />

            <Select
              label="Status"
              options={statusOptions}
              value={status}
              onChange={setStatus}
            />
          </BlockStack>
        </Card>

        <Card padding="0">
          <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
            {selectedTab === 0 && <PreviewTab />}
            {selectedTab === 1 && (
              <EditCodeTab
                subject={emailSubject}
                onSubjectChange={setEmailSubject}
                emailHtml={emailHtml}
                onEmailHtmlChange={setEmailHtml}
              />
            )}
            {selectedTab === 2 && (
              <ConfigureTab
                provider={smtpProvider}
                onProviderChange={setSmtpProvider}
              />
            )}
          </Tabs>
        </Card>
      </BlockStack>
    </Page>
  );
}
