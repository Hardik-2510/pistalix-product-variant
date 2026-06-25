import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  InlineStack,
  Button,
  Badge,
  Box,
  ProgressBar,
  Collapsible,
} from "@shopify/polaris";
import { ChevronUpIcon, ChevronDownIcon, XIcon, ExternalIcon } from "@shopify/polaris-icons";
import { useState } from "react";
import { useNavigate, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

const DottedCircleIcon = () => (
  <svg viewBox="0 0 20 20" style={{ width: '20px', height: '20px', fill: 'none', stroke: '#8c9196', strokeWidth: '1.5', strokeDasharray: '3 3' }}>
    <circle cx="10" cy="10" r="8" />
  </svg>
);

const SolidCheckCircleIcon = () => (
  <svg viewBox="0 0 20 20" style={{ width: '20px', height: '20px' }}>
    <circle cx="10" cy="10" r="9" fill="#000" />
    <path d="M6 10l3 3 6-6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  // eslint-disable-next-line no-undef
  const functionId = process.env.SHOPIFY_CART_PRICE_OVERRIDE_ID;

  if (functionId) {
    try {
      const existingRes = await admin.graphql(`
        query {
          cartTransforms(first: 10) {
            nodes { id functionId }
          }
        }
      `);
      const existingData = await existingRes.json();
      const exists = existingData.data?.cartTransforms?.nodes?.some(n => n.functionId === functionId);

      if (!exists) {
        const response = await admin.graphql(`
          mutation cartTransformCreate($functionId: String!) {
            cartTransformCreate(functionId: $functionId) {
              cartTransform { id }
              userErrors { field message }
            }
          }
        `, { variables: { functionId } });
        const data = await response.json();
        console.log("Cart Transform Activation:", JSON.stringify(data));
      }
    } catch (err) {
      console.error("Failed to activate Cart Transform:", err);
    }
  }

  const optionSetsCount = await prisma.optionSet.count();

  return { 
    activated: !!functionId,
    // eslint-disable-next-line no-undef
    envKeys: Object.keys(process.env).filter(k => k.includes('SHOPIFY')),
    functionId,
    optionSetsCount
  };
}

export default function Index() {
  const navigate = useNavigate();
  const { optionSetsCount } = useLoaderData();
  const [isSetupGuideVisible, setIsSetupGuideVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  
  const step1Done = optionSetsCount > 0;
  const step2Done = true; 
  const step3Done = true;
  
  const completedCount = [step1Done, step2Done, step3Done].filter(Boolean).length;
  const progress = (completedCount / 3) * 100;
  
  const initialActiveStep = !step1Done ? 1 : 0;
  const [activeStep, setActiveStep] = useState(initialActiveStep);

  const faqItems = [
    {
      q: "Why aren't my custom options showing on the product page?",
      a: "Make sure the Varify App Block is added to your theme. Go to Online Store → Themes → Customize, then add the 'Varify Product Options' block to your product page template and save."
    },
    {
      q: "How do I control where the option widget appears on the page?",
      a: "In the Theme Editor, you can drag and reorder the Varify App Block to your desired position relative to other product page elements like the title, price, and Add to Cart button."
    },
    {
      q: "How do I match the widget's font and colors to my store theme?",
      a: "Head to Settings in the Varify app and use the Widget Style section. You can customize fonts, colors, borders, and button styles to perfectly match your store's branding."
    },
    {
      q: "Why are extra products appearing in my store catalog after installing the app?",
      a: "Some features like Bundles or Product Links may create linked products in your catalog. You can hide them by setting their status to 'Draft' in your Shopify Products admin, so they won't appear in collections or search."
    },
    {
      q: "Can I display selected option values on the order confirmation or packing slip?",
      a: "Yes! Since Varify saves options as Shopify line item properties, they automatically appear on order confirmations, packing slips, and fulfillment emails without any extra setup."
    },
  ];
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <Page title="Dashboard">
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              
              {isSetupGuideVisible && (
                <Card padding="0">
                  <Box padding="400">
                    <BlockStack gap="400">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text variant="headingMd" as="h2">Setup guide</Text>
                        <InlineStack gap="200" blockAlign="center">
                          <Button variant="plain" icon={isExpanded ? ChevronUpIcon : ChevronDownIcon} onClick={() => setIsExpanded(!isExpanded)} />
                          <Button variant="plain" icon={XIcon} onClick={() => setIsSetupGuideVisible(false)} />
                        </InlineStack>
                      </InlineStack>
                      
                      <Text as="p" tone="subdued">Let&apos;s get started by following this guide</Text>
                      
                      <InlineStack gap="400" blockAlign="center" wrap={false}>
                        <Text as="span" variant="bodyMd" fontWeight="semibold">{completedCount} / 3 completed</Text>
                        <Box style={{ flex: 1 }}>
                          <ProgressBar progress={progress} size="small" tone="primary" />
                        </Box>
                      </InlineStack>
                    </BlockStack>
                  </Box>
                  
                  <Collapsible open={isExpanded} id="setup-guide-collapsible" transition={{duration: '200ms', timingFunction: 'ease-in-out'}}>
                    <Box paddingBlockEnd="400" paddingInlineStart="400" paddingInlineEnd="400">
                      <BlockStack gap="0">
                        {/* Step 1 */}
                        <Box background={activeStep === 1 ? "bg-surface-secondary" : "transparent"} padding="300" borderRadius="200">
                          <InlineStack gap="300" wrap={false} blockAlign="start">
                            <Box paddingBlockStart="050" onClick={() => setActiveStep(activeStep === 1 ? 0 : 1)} style={{cursor:'pointer'}}>
                              {step1Done ? <SolidCheckCircleIcon /> : <DottedCircleIcon />}
                            </Box>
                            <BlockStack gap="200">
                              <Box onClick={() => setActiveStep(activeStep === 1 ? 0 : 1)} style={{cursor:'pointer'}}>
                                <Text variant="headingSm" as="h3">Step 1: Create your first option set</Text>
                              </Box>
                              <Collapsible open={activeStep === 1} id="step-1">
                                <BlockStack gap="300">
                                  <Text as="p" tone="subdued">Start by creating a new set of product options or editing an existing one.</Text>
                                  <InlineStack>
                                    <Button onClick={() => navigate("/app/option-sets/new")}>Create option set</Button>
                                  </InlineStack>
                                </BlockStack>
                              </Collapsible>
                            </BlockStack>
                          </InlineStack>
                        </Box>

                        {/* Step 2 */}
                        <Box background={activeStep === 2 ? "bg-surface-secondary" : "transparent"} padding="300" borderRadius="200">
                          <InlineStack gap="300" wrap={false} blockAlign="start">
                            <Box paddingBlockStart="050" onClick={() => setActiveStep(activeStep === 2 ? 0 : 2)} style={{cursor:'pointer'}}>
                              {step2Done ? <SolidCheckCircleIcon /> : <DottedCircleIcon />}
                            </Box>
                            <BlockStack gap="200">
                              <Box onClick={() => setActiveStep(activeStep === 2 ? 0 : 2)} style={{cursor:'pointer'}}>
                                <Text variant="headingSm" as="h3">Step 2: Make options visible on your storefront</Text>
                              </Box>
                              <Collapsible open={activeStep === 2} id="step-2">
                                <BlockStack gap="300">
                                  <Text as="p" tone="subdued">Enable the App Block in your theme editor to make options visible on your store.</Text>
                                  <InlineStack>
                                    <Button onClick={() => window.open(`https://admin.shopify.com/store/varify-pov/themes/current/editor?context=apps`, "_blank")}>Open theme editor</Button>
                                  </InlineStack>
                                </BlockStack>
                              </Collapsible>
                            </BlockStack>
                          </InlineStack>
                        </Box>

                        {/* Step 3 */}
                        <Box background={activeStep === 3 ? "bg-surface-secondary" : "transparent"} padding="300" borderRadius="200">
                          <InlineStack gap="300" wrap={false} blockAlign="start">
                            <Box paddingBlockStart="050" onClick={() => setActiveStep(activeStep === 3 ? 0 : 3)} style={{cursor:'pointer'}}>
                              {step3Done ? <SolidCheckCircleIcon /> : <DottedCircleIcon />}
                            </Box>
                            <BlockStack gap="200">
                              <Box onClick={() => setActiveStep(activeStep === 3 ? 0 : 3)} style={{cursor:'pointer'}}>
                                <Text variant="headingSm" as="h3">Step 3: Customize the widget</Text>
                              </Box>
                              <Collapsible open={activeStep === 3} id="step-3">
                                <BlockStack gap="300">
                                  <Text as="p" tone="subdued">Change the look and feel of your option sets by customizing widget settings.</Text>
                                  <InlineStack>
                                    <Button onClick={() => navigate("/app/settings")}>Customize widget</Button>
                                  </InlineStack>
                                </BlockStack>
                              </Collapsible>
                            </BlockStack>
                          </InlineStack>
                        </Box>
                      </BlockStack>
                    </Box>
                  </Collapsible>
                </Card>
              )}

              <Card padding="0">
                <Box padding="400" borderBlockEndWidth="025" borderColor="border" background="bg-surface-secondary">
                  <Text variant="headingSm" as="h3" fontWeight="semibold">Quick Actions</Text>
                </Box>
                <Box padding="400">
                  <InlineStack gap="300" wrap={false} blockAlign="center">
                    <Card>
                      <BlockStack gap="200" inlineAlign="center">
                        <Text variant="headingMd" as="h4">Option Sets</Text>
                        <Text as="p" tone="subdued" alignment="center">Manage your product options</Text>
                        <Button onClick={() => navigate("/app/option-sets")}>View sets</Button>
                      </BlockStack>
                    </Card>
                    <Card>
                      <BlockStack gap="200" inlineAlign="center">
                        <Text variant="headingMd" as="h4">Templates</Text>
                        <Text as="p" tone="subdued" alignment="center">Use pre-built configurations</Text>
                        <Button onClick={() => navigate("/app/templates")}>View templates</Button>
                      </BlockStack>
                    </Card>
                  </InlineStack>
                </Box>
              </Card>

              {/* FAQ Section */}
              <div style={{ borderRadius: '12px', border: '1px solid #e1e3e5', overflow: 'hidden', background: '#fff' }}>
                {/* Header */}
                <div style={{
                  padding: '16px 20px',
                  background: 'linear-gradient(135deg, #f6f0ff 0%, #fff 100%)',
                  borderBottom: '1px solid #e1e3e5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '8px',
                    background: '#6200ea', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0
                  }}>
                    <svg viewBox="0 0 20 20" style={{ width: '14px', height: '14px', fill: '#fff' }}>
                      <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 3a1 1 0 110 2 1 1 0 010-2zm0 4a1 1 0 011 1v4a1 1 0 11-2 0v-4a1 1 0 011-1z" />
                    </svg>
                  </div>
                  <div>
                    <Text variant="headingSm" as="h3" fontWeight="semibold">Frequently Asked Questions</Text>
                    <Text as="p" tone="subdued" variant="bodySm">Common questions to help you get the most out of Varify</Text>
                  </div>
                </div>

                {/* FAQ Items */}
                {faqItems.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      borderBottom: idx < faqItems.length - 1 ? '1px solid #f1f1f1' : 'none',
                    }}
                  >
                    <button
                      onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                      style={{
                        all: 'unset',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                        padding: '16px 20px',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                        background: openFaq === idx ? '#faf5ff' : 'transparent',
                        transition: 'background 0.15s ease',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: '22px', height: '22px', borderRadius: '50%',
                          background: openFaq === idx ? '#6200ea' : '#ede7f6',
                          color: openFaq === idx ? '#fff' : '#6200ea',
                          fontSize: '11px', fontWeight: '700',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'all 0.15s ease',
                        }}>
                          {idx + 1}
                        </div>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: openFaq === idx ? '600' : '400',
                          color: openFaq === idx ? '#1a1a1a' : '#202223',
                          transition: 'font-weight 0.1s ease',
                        }}>
                          {item.q}
                        </span>
                      </div>
                      <div style={{
                        flexShrink: 0,
                        color: openFaq === idx ? '#6200ea' : '#8c9196',
                        transition: 'color 0.15s ease, transform 0.2s ease',
                        transform: openFaq === idx ? 'rotate(180deg)' : 'rotate(0deg)',
                        width: '20px', height: '20px',
                      }}>
                        <ChevronDownIcon />
                      </div>
                    </button>

                    <Collapsible open={openFaq === idx} id={`faq-${idx}`} transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}>
                      <div style={{
                        padding: '0 20px 16px 54px',
                        background: '#faf5ff',
                      }}>
                        <p style={{
                          margin: 0,
                          fontSize: '13px',
                          lineHeight: '1.6',
                          color: '#6d7175',
                        }}>
                          {item.a}
                        </p>
                      </div>
                    </Collapsible>
                  </div>
                ))}

                {/* Footer */}
                <div style={{
                  padding: '14px 20px',
                  borderTop: '1px solid #e1e3e5',
                  background: '#fafafa',
                  display: 'flex',
                  justifyContent: 'center',
                }}>
                  <Button
                    variant="plain"
                    icon={ExternalIcon}
                    url="https://varify-pov.myshopify.com"
                    external
                  >
                    View more FAQ
                  </Button>
                </div>
              </div>
            </BlockStack>
          </Layout.Section>
          
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="headingSm" as="h3">App Status</Text>
                    <Badge tone="success">Active</Badge>
                  </InlineStack>
                  <Text as="p" tone="subdued">Your widget is currently enabled and visible on the storefront.</Text>
                  <Button variant="primary" onClick={() => navigate("/app/settings")}>Manage Settings</Button>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text variant="headingSm" as="h3">Need help?</Text>
                  <Text as="p" tone="subdued">Check out our documentation or contact support for assistance.</Text>
                  <Button variant="tertiary">View documentation</Button>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}