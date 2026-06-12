import { useState, useCallback, useRef } from "react";
import { useLoaderData, useSubmit, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import {
  Page,
  Card,
  Tabs,
  Button,
  ButtonGroup,
  InlineStack,
  InlineGrid,
  BlockStack,
  Box,
  Text,
  Select,
  ChoiceList,
  TextField,
  AppProvider,
} from "@shopify/polaris";
import english from "@shopify/polaris/locales/en.json";
import {
  TextAlignLeftIcon,
  TextAlignCenterIcon,
  TextAlignRightIcon,
  TextIndentIcon
} from "@shopify/polaris-icons";

function CustomToggle({ checked, onChange, activeColor = "#2c2e2f", inactiveColor = "#c4cdd5" }) {
  return (
    <div 
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      role="button"
      tabIndex={0}
      style={{
        width: "40px", height: "24px", borderRadius: "12px",
        background: checked ? activeColor : inactiveColor,
        position: "relative", cursor: "pointer",
        transition: "background 0.2s ease"
      }}
    >
      <div style={{
        width: "18px", height: "18px", borderRadius: "50%",
        background: "white",
        position: "absolute", top: "3px",
        left: checked ? "19px" : "3px",
        transition: "left 0.2s ease",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
      }} />
    </div>
  );
}


function ColorSwatchItem({ label, value, onChange }) {
  return (
    <Box>
      <InlineStack align="start" blockAlign="center" gap="300">
        <div style={{ position: 'relative' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: value,
            border: '1px solid var(--p-color-border-strong)',
            cursor: 'pointer'
          }} />
          <input 
            type="color" 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            style={{
              opacity: 0,
              position: 'absolute',
              top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer',
              padding: 0, margin: 0, border: 'none'
            }}
          />
        </div>
        <BlockStack gap="0">
          <Text as="span">{label}</Text>
          <Text as="p" tone="subdued">{value}</Text>
        </BlockStack>
      </InlineStack>
    </Box>
  );
}

function TranslationRow({ english }) {
  return (
    <>
      <Box padding="300" borderBlockEndWidth="1" borderColor="border">
        <Text as="p" tone="subdued">{english}</Text>
      </Box>
      <Box padding="300" borderBlockEndWidth="1" borderColor="border" borderInlineStartWidth="1">
        <TextField value={english} borderless autoComplete="off" />
      </Box>
    </>
  );
}

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  try {
    const response = await admin.graphql(`
      #graphql
      query {
        shop {
          id
          metafield(namespace: "pistalix", key: "settings") {
            value
          }
        }
      }
    `);
    const data = await response.json();
    const settingsStr = data?.data?.shop?.metafield?.value || "{}";
    const shopId = data?.data?.shop?.id;
    let settings = {};
    try {
      settings = JSON.parse(settingsStr);
    } catch(e) {
      console.warn("Failed to parse settings JSON:", e);
    }
    return { settings, shopId };
  } catch (error) {
    console.error("GraphQL Error in loader:", error);
    return { settings: {}, shopId: null };
  }
}

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const payload = formData.get("payload");
  const ownerId = formData.get("shopId");
  if (!payload || !ownerId) return { success: false };
  
  try {
    await admin.graphql(`
      #graphql
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          key
          namespace
          value
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
      variables: {
        metafields: [
          {
            namespace: "pistalix",
            key: "settings",
            type: "json",
            value: payload,
            ownerId: ownerId
          }
        ]
      }
    });
    
    return { success: true };
  } catch (error) {
    console.error("GraphQL Error during save:", error);
    return { success: false, error: error.message || "Failed to connect to Shopify API" };
  }
}

export default function Settings() {
  const { settings, shopId } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";

  const [topTab, setTopTab] = useState(0);
  const [settingsTab, setSettingsTab] = useState(0);
  const [alignment, setAlignment] = useState(settings.alignment || "left");
  const [position, setPosition] = useState(settings.position || "Above add to cart button");
  const [customSelector, setCustomSelector] = useState(settings.customSelector || ".product__description");
  const [filePreview, setFilePreview] = useState(settings.filePreview || "Show image if the uploaded file is a photo, otherwise show link");
  const [colors, setColors] = useState(settings.colors || {
    appBackground: '#ffffff',
    labelText: '#000000',
    requiredCharacter: '#ff0000',
    helpText: '#737373',
    totalText: '#202223',
    totalTextMoney: '#008000',
    inputText: '#000000',
    inputBorder: '#9a9a9a',
    inputBackground: '#ffffff',
    switchBackground: '#dddddd',
    switchActiveBackground: '#ea1255',
    rangeSliderThumb: '#121212',
    rangeSliderBackground: '#dddddd',
    rangeSliderActiveBackground: '#121212',
    dropdownText: '#000000',
    dropdownBorder: '#9a9a9a',
    dropdownBackground: '#ffffff',
    dropdownSelected: '#f8e0e6',
    checkboxRadioText: '#000000',
    checkboxRadioTextHover: '#000000',
    checkboxRadioTextActive: '#000000',
    checkboxRadioHover: '#eb1256',
    checkboxRadioActive: '#eb1256',
    buttonText: '#000000',
    buttonTextHover: '#eb1256',
    buttonTextActive: '#ffffff',
    buttonBackground: '#ffffff',
    buttonBackgroundHover: '#ffffff',
    buttonBackgroundActive: '#eb1256'
  });

  const handleColorChange = (key, val) => {
    setColors(prev => ({ ...prev, [key]: val }));
  };

  const [toggleStates, setToggleStates] = useState(settings.toggleStates || {
    tooltip: true,
    displayValue: true,
    limitHeight: false,
    collectionQuickview: true,
    goToCart: true,
    autoScroll: true,
    hideQuantity: true,
    showEditOptions: false,
    homePageWidget: true,
    regularPageWidget: true,
    showAddonForInputs: true,
    showAddonForOptions: true,
    showAddonMessage: true,
    addAddonPriceToProductPrice: true,
    mergeMainProductAndAddonProducts: false,
  });

  const [addonMoneyFormat, setAddonMoneyFormat] = useState(settings.addonMoneyFormat || "Without currency");
  const [addonLabelFormat, setAddonLabelFormat] = useState(settings.addonLabelFormat || "(+ {{addon}})");

  const fileInputRef = useRef(null);

  const handleExport = () => {
    const payload = {
      alignment, position, customSelector, filePreview, colors, toggleStates, addonMoneyFormat, addonLabelFormat
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pistalix-product-options-settings.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (imported.alignment) setAlignment(imported.alignment);
        if (imported.position) setPosition(imported.position);
        if (imported.customSelector) setCustomSelector(imported.customSelector);
        if (imported.filePreview) setFilePreview(imported.filePreview);
        if (imported.colors) setColors(imported.colors);
        if (imported.toggleStates) setToggleStates(imported.toggleStates);
        if (imported.addonMoneyFormat) setAddonMoneyFormat(imported.addonMoneyFormat);
        if (imported.addonLabelFormat) setAddonLabelFormat(imported.addonLabelFormat);
        alert("Settings imported successfully. Click Save to apply changes.");
      } catch(err) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const handleSave = () => {
    const payload = {
      alignment, position, customSelector, filePreview, colors, toggleStates, addonMoneyFormat, addonLabelFormat
    };
    submit({ payload: JSON.stringify(payload), shopId: shopId }, { method: "post" });
  };

  const handleTopTabChange = useCallback(
    (selectedIndex) => setTopTab(selectedIndex),
    []
  );
  const handleSettingsTabChange = useCallback(
    (selectedIndex) => setSettingsTab(selectedIndex),
    []
  );

  const handleToggle = useCallback((key) => {
    setToggleStates((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const topTabs = [
    { content: "Settings" },
    { content: "Translations" },
    { content: "Theme Setup" },
  ];

  const settingsTabs = [
    { id: "general", content: "General" },
    { id: "design", content: "Design" },
    { id: "addon-price", content: "Add-on price" },
  ];

  let mainContent;
  if (topTab === 0) {
    mainContent = (
      <Box>
        <InlineGrid columns={{ xs: 1, md: "2fr 1fr" }} gap="400">
          <Box>
            <Card padding="0">
              <Tabs
                tabs={settingsTabs}
                selected={settingsTab}
                onSelect={handleSettingsTabChange}
              >
                <Box>
                  {settingsTab === 0 && (
                    <BlockStack gap="0">
                      <Box padding="400" borderBlockEndWidth="025" borderColor="border">
                        <Text variant="headingMd" as="h3">Widget Settings</Text>
                        <BlockStack gap="300">
                          <Box paddingBlockStart="200" paddingBlockEnd="200">
                            <InlineStack align="space-between" blockAlign="center">
                              <Text as="p">Position of Widget</Text>
                              <Select 
                                options={[
                                  "Above product variants",
                                  "Below product variants",
                                  "Above add to cart button",
                                  "Below add to cart button",
                                  "Above an HTML element",
                                  "Below an HTML element",
                                  "At the start of an HTML element",
                                  "At the end of HTML element",
                                ]} 
                                value={position}
                                onChange={setPosition}
                              />
                            </InlineStack>
                          </Box>
                          {position.includes("HTML element") && (
                            <Box paddingBlockStart="200" paddingBlockEnd="200">
                              <InlineStack align="space-between" blockAlign="center">
                                <Text as="p">Selector of the HTML element</Text>
                                <TextField value={customSelector} onChange={setCustomSelector} autoComplete="off" />
                              </InlineStack>
                            </Box>
                          )}
                          <Box paddingBlockStart="200" paddingBlockEnd="200">
                            <InlineStack align="space-between" blockAlign="center">
                              <Text as="p">Alignment</Text>
                              <ButtonGroup segmented>
                                <Button icon={TextAlignLeftIcon} pressed={alignment === "left"} onClick={() => setAlignment("left")} />
                                <Button icon={TextAlignCenterIcon} pressed={alignment === "center"} onClick={() => setAlignment("center")} />
                                <Button icon={TextAlignRightIcon} pressed={alignment === "right"} onClick={() => setAlignment("right")} />
                                <Button icon={TextIndentIcon} pressed={alignment === "justify"} onClick={() => setAlignment("justify")} />
                              </ButtonGroup>
                            </InlineStack>
                          </Box>
                          <Box paddingBlockStart="200" paddingBlockEnd="200">
                            <InlineStack align="space-between" blockAlign="center">
                              <Text as="p">Show tooltip when hovering over options</Text>
                              <CustomToggle checked={toggleStates.tooltip} onChange={() => handleToggle("tooltip")} />
                            </InlineStack>
                          </Box>
                          <Box paddingBlockStart="200" paddingBlockEnd="200">
                            <InlineStack align="space-between" blockAlign="center">
                              <Text as="p">Display selected value next to label</Text>
                              <CustomToggle checked={toggleStates.displayValue} onChange={() => handleToggle("displayValue")} />
                            </InlineStack>
                          </Box>
                          <Box paddingBlockStart="200" paddingBlockEnd="200">
                            <InlineStack align="space-between" blockAlign="center">
                              <Text as="p">Limit widget height (scroll if too long)</Text>
                              <CustomToggle checked={toggleStates.limitHeight} onChange={() => handleToggle("limitHeight")} />
                            </InlineStack>
                          </Box>
                        </BlockStack>
                      </Box>
                      <Box padding="400" borderBlockEndWidth="025" borderColor="border">
                        <Text variant="headingMd" as="h3">Collection page</Text>
                        <BlockStack gap="300">
                          <Box paddingBlockStart="200" paddingBlockEnd="200">
                            <InlineStack align="space-between" blockAlign="center">
                              <Text as="p">Show options on Quickview popups ⓘ</Text>
                              <CustomToggle checked={toggleStates.collectionQuickview} onChange={() => handleToggle("collectionQuickview")} />
                            </InlineStack>
                          </Box>
                        </BlockStack>
                      </Box>
                      <Box padding="400" borderBlockEndWidth="025" borderColor="border">
                        <Text variant="headingMd" as="h3">Product page</Text>
                        <BlockStack gap="300">
                          <Box paddingBlockStart="200" paddingBlockEnd="200">
                            <InlineStack align="space-between" blockAlign="center">
                              <Text as="p">Go to cart immediately after adding to cart ⓘ</Text>
                              <CustomToggle checked={toggleStates.goToCart} onChange={() => handleToggle("goToCart")} />
                            </InlineStack>
                          </Box>
                          <Box paddingBlockStart="200" paddingBlockEnd="200">
                            <InlineStack align="space-between" blockAlign="center">
                              <Text as="p">Auto-scroll to first error message</Text>
                              <CustomToggle checked={toggleStates.autoScroll} onChange={() => handleToggle("autoScroll")} />
                            </InlineStack>
                          </Box>
                          <Box paddingBlockStart="200" paddingBlockEnd="200">
                            <InlineStack align="space-between" blockAlign="center">
                              <Text as="p">File preview</Text>
                              <Select 
                                options={[
                                  "Show image if the uploaded file is a photo, otherwise show link",
                                  "Show link"
                                ]} 
                                value={filePreview}
                                onChange={setFilePreview}
                              />
                            </InlineStack>
                          </Box>
                        </BlockStack>
                      </Box>
                      <Box padding="400" borderBlockEndWidth="025" borderColor="border">
                        <Text variant="headingMd" as="h3">Cart page</Text>
                        <BlockStack gap="300">
                          <Box paddingBlockStart="200" paddingBlockEnd="200">
                            <InlineStack align="space-between" blockAlign="center">
                              <Text as="p">Hide quantity box and remove button for add-on products ⓘ</Text>
                              <CustomToggle checked={toggleStates.hideQuantity} onChange={() => handleToggle("hideQuantity")} />
                            </InlineStack>
                          </Box>
                          <Box paddingBlockStart="200" paddingBlockEnd="200">
                            <InlineStack align="space-between" blockAlign="center">
                              <Text as="p">Show Edit Options button in cart ⓘ</Text>
                              <CustomToggle checked={toggleStates.showEditOptions} onChange={() => handleToggle("showEditOptions")} />
                            </InlineStack>
                          </Box>
                          
                          <Box paddingBlockStart="200" paddingBlockEnd="200">
                            <InlineStack align="space-between" blockAlign="center">
                              <Text as="p" tone="subdued">Personalize preview mode</Text>
                              <ButtonGroup>
                                <Button disabled>👁️</Button>
                                <Button disabled>⬇️</Button>
                              </ButtonGroup>
                            </InlineStack>
                          </Box>
                          
                        </BlockStack>
                      </Box>
                      <Box padding="400" borderBlockEndWidth="025" borderColor="border">
                        <Text variant="headingMd" as="h3">Other pages</Text>
                        <BlockStack gap="300">
                          <Box paddingBlockStart="200" paddingBlockEnd="200">
                            <InlineStack align="space-between" blockAlign="center">
                              <Text as="p">Show widget on home page (featured product section only) ⓘ</Text>
                              <CustomToggle checked={toggleStates.homePageWidget} onChange={() => handleToggle("homePageWidget")} />
                            </InlineStack>
                          </Box>
                          <Box paddingBlockStart="200" paddingBlockEnd="200">
                            <InlineStack align="space-between" blockAlign="center">
                              <Text as="p">Show widget on regular page (featured product section only)</Text>
                              <CustomToggle checked={toggleStates.regularPageWidget} onChange={() => handleToggle("regularPageWidget")} />
                            </InlineStack>
                          </Box>
                        </BlockStack>
                      </Box>
                      <Box padding="400">
                        <Text variant="headingMd" as="h3">Custom fonts</Text>
                        <BlockStack gap="300">
                          <Box>
                            <Text as="p" fontWeight="bold">Font name <Text as="span" tone="critical">*</Text></Text>
                            <TextField placeholder="" autoComplete="off" />
                          </Box>
                          <Box>
                            <Text as="p" fontWeight="bold">Font file <Text as="span" tone="critical">*</Text></Text>
                            <Box padding="400" borderStyle="dashed" borderWidth="025" borderColor="border-strong" borderRadius="100">
                              <BlockStack inlineAlign="center" gap="200">
                                <Button>Add file</Button>
                                <Text as="p" tone="subdued">Accepts .woff2, .woff, .ttf and .otf</Text>
                              </BlockStack>
                            </Box>
                          </Box>
                          <Button>Upload font</Button>
                        </BlockStack>
                      </Box>
                    </BlockStack>
                  )}

                  {settingsTab === 1 && (
                    <BlockStack gap="400">
                      <Card padding="0">
                        <Box padding="400" borderBlockEndWidth="1" borderColor="border">
                          <Text variant="headingSm" as="h2">Color</Text>
                        </Box>
                        <Box padding="400">
                          <BlockStack gap="400">
                            <Box borderBlockEndWidth="1" borderColor="border" paddingBlockEnd="300">
                              <Box paddingBlockEnd="200">
                                <Text variant="headingXs" as="h6" tone="subdued" fontWeight="semibold">General</Text>
                              </Box>
                              <InlineGrid columns={{ xs: 1, md: 2 }} gap="300">
                                <ColorSwatchItem label="App background" value={colors.appBackground} onChange={(val) => handleColorChange("appBackground", val)} />
                                <ColorSwatchItem label="Label text" value={colors.labelText} onChange={(val) => handleColorChange("labelText", val)} />
                                <ColorSwatchItem label="Required character" value={colors.requiredCharacter} onChange={(val) => handleColorChange("requiredCharacter", val)} />
                                <ColorSwatchItem label="Help text" value={colors.helpText} onChange={(val) => handleColorChange("helpText", val)} />
                                <ColorSwatchItem label="Total text" value={colors.totalText} onChange={(val) => handleColorChange("totalText", val)} />
                                <ColorSwatchItem label="Total text money" value={colors.totalTextMoney} onChange={(val) => handleColorChange("totalTextMoney", val)} />
                              </InlineGrid>
                              
                            </Box>

                            <Box borderBlockEndWidth="1" borderColor="border" paddingBlockEnd="300">
                              <Box paddingBlockEnd="200">
                                <Text variant="headingXs" as="h6" tone="subdued" fontWeight="semibold">Single input</Text>
                              </Box>
                              <InlineGrid columns={{ xs: 1, md: 2 }} gap="300">
                                <ColorSwatchItem label="Input text" value={colors.inputText} onChange={(val) => handleColorChange("inputText", val)} />
                                <ColorSwatchItem label="Input border" value={colors.inputBorder} onChange={(val) => handleColorChange("inputBorder", val)} />
                                <ColorSwatchItem label="Input background" value={colors.inputBackground} onChange={(val) => handleColorChange("inputBackground", val)} />
                                <ColorSwatchItem label="Switch background" value={colors.switchBackground} onChange={(val) => handleColorChange("switchBackground", val)} />
                                <ColorSwatchItem label="Switch active background" value={colors.switchActiveBackground} onChange={(val) => handleColorChange("switchActiveBackground", val)} />
                                <ColorSwatchItem label="Range slider thumb" value={colors.rangeSliderThumb} onChange={(val) => handleColorChange("rangeSliderThumb", val)} />
                                <ColorSwatchItem label="Range slider background" value={colors.rangeSliderBackground} onChange={(val) => handleColorChange("rangeSliderBackground", val)} />
                                <ColorSwatchItem label="Range slider active background" value={colors.rangeSliderActiveBackground} onChange={(val) => handleColorChange("rangeSliderActiveBackground", val)} />
                              </InlineGrid>
                              
                            </Box>

                            <Box borderBlockEndWidth="1" borderColor="border" paddingBlockEnd="300">
                              <Box paddingBlockEnd="200">
                                <Text variant="headingXs" as="h6" tone="subdued" fontWeight="semibold">Choice list</Text>
                              </Box>
                              <InlineGrid columns={{ xs: 1, md: 2 }} gap="300">
                                <ColorSwatchItem label="Dropdown text" value={colors.dropdownText} onChange={(val) => handleColorChange("dropdownText", val)} />
                                <ColorSwatchItem label="Dropdown border" value={colors.dropdownBorder} onChange={(val) => handleColorChange("dropdownBorder", val)} />
                                <ColorSwatchItem label="Dropdown background" value={colors.dropdownBackground} onChange={(val) => handleColorChange("dropdownBackground", val)} />
                                <ColorSwatchItem label="Dropdown selected" value={colors.dropdownSelected} onChange={(val) => handleColorChange("dropdownSelected", val)} />
                                <ColorSwatchItem label="Checkbox & Radio text" value={colors.checkboxRadioText} onChange={(val) => handleColorChange("checkboxRadioText", val)} />
                                <ColorSwatchItem label="Checkbox & Radio text hover" value={colors.checkboxRadioTextHover} onChange={(val) => handleColorChange("checkboxRadioTextHover", val)} />
                                <ColorSwatchItem label="Checkbox & Radio text active" value={colors.checkboxRadioTextActive} onChange={(val) => handleColorChange("checkboxRadioTextActive", val)} />
                                <ColorSwatchItem label="Checkbox & Radio hover" value={colors.checkboxRadioHover} onChange={(val) => handleColorChange("checkboxRadioHover", val)} />
                                <ColorSwatchItem label="Checkbox & Radio active" value={colors.checkboxRadioActive} onChange={(val) => handleColorChange("checkboxRadioActive", val)} />
                              </InlineGrid>
                              
                            </Box>

                            <Box paddingBlockEnd="300">
                              <Box paddingBlockEnd="200">
                                <Text variant="headingXs" as="h6" tone="subdued" fontWeight="semibold">Swatch</Text>
                              </Box>
                              <InlineGrid columns={{ xs: 1, md: 2 }} gap="300">
                                <ColorSwatchItem label="Button text" value={colors.buttonText} onChange={(val) => handleColorChange("buttonText", val)} />
                                <ColorSwatchItem label="Button text hover" value={colors.buttonTextHover} onChange={(val) => handleColorChange("buttonTextHover", val)} />
                                <ColorSwatchItem label="Button text active" value={colors.buttonTextActive} onChange={(val) => handleColorChange("buttonTextActive", val)} />
                                <ColorSwatchItem label="Button background" value={colors.buttonBackground} onChange={(val) => handleColorChange("buttonBackground", val)} />
                                <ColorSwatchItem label="Button background hover" value={colors.buttonBackgroundHover} onChange={(val) => handleColorChange("buttonBackgroundHover", val)} />
                                <ColorSwatchItem label="Button background active" value={colors.buttonBackgroundActive} onChange={(val) => handleColorChange("buttonBackgroundActive", val)} />
                              </InlineGrid>
                            </Box>
                          </BlockStack>
                        </Box>
                      </Card>
                    </BlockStack>
                  )}

                  {settingsTab === 2 && (
                    <BlockStack gap="0">
                      <Box padding="400">
                        <Text variant="headingMd" as="h3">Product page</Text>
                        <Box paddingBlockStart="400">
                          <BlockStack gap="300">
                            <Box paddingBlockStart="200" paddingBlockEnd="200">
                              <InlineStack align="space-between" blockAlign="center">
                                <Text as="p">Add-on money format</Text>
                                <Select 
                                  options={[
                                    "Without currency",
                                    "With currency"
                                  ]} 
                                  value={addonMoneyFormat}
                                  onChange={setAddonMoneyFormat}
                                />
                              </InlineStack>
                            </Box>
                            
                            <Box paddingBlockStart="200" paddingBlockEnd="200">
                              <InlineStack align="space-between" blockAlign="center">
                                <Text as="p">Add-on label format</Text>
                                <TextField 
                                  value={addonLabelFormat}
                                  onChange={setAddonLabelFormat}
                                  autoComplete="off"
                                />
                              </InlineStack>
                            </Box>

                            <Box paddingBlockStart="200" paddingBlockEnd="200">
                              <InlineStack align="space-between" blockAlign="center">
                                <Text as="p">Show add-on for inputs ⓘ</Text>
                                <CustomToggle checked={toggleStates.showAddonForInputs} onChange={() => handleToggle("showAddonForInputs")} />
                              </InlineStack>
                            </Box>

                            <Box paddingBlockStart="200" paddingBlockEnd="200">
                              <InlineStack align="space-between" blockAlign="center">
                                <Text as="p">Show add-on for options ⓘ</Text>
                                <CustomToggle checked={toggleStates.showAddonForOptions} onChange={() => handleToggle("showAddonForOptions")} />
                              </InlineStack>
                            </Box>

                            <Box paddingBlockStart="200" paddingBlockEnd="200">
                              <InlineStack align="space-between" blockAlign="center">
                                <Text as="p">Show add-on message</Text>
                                <CustomToggle checked={toggleStates.showAddonMessage} onChange={() => handleToggle("showAddonMessage")} />
                              </InlineStack>
                            </Box>

                            <Box paddingBlockStart="200" paddingBlockEnd="200">
                              <InlineStack align="space-between" blockAlign="center">
                                <Text as="p">Add add-on price to the product price</Text>
                                <CustomToggle checked={toggleStates.addAddonPriceToProductPrice} onChange={() => handleToggle("addAddonPriceToProductPrice")} />
                              </InlineStack>
                            </Box>

                            <Box paddingBlockStart="200" paddingBlockEnd="200">
                              <InlineStack align="space-between" blockAlign="center">
                                <Text as="p">Merge Main product & Add-on products</Text>
                                <CustomToggle checked={toggleStates.mergeMainProductAndAddonProducts} onChange={() => handleToggle("mergeMainProductAndAddonProducts")} />
                              </InlineStack>
                            </Box>
                          </BlockStack>
                        </Box>
                      </Box>
                    </BlockStack>
                  )}
                </Box>
              </Tabs>
            </Card>
          </Box>
          <Box>
            <div style={{ position: "sticky", top: "1rem" }}>
              <Card padding="400">
                <Text variant="headingSm" as="h3">Preview</Text>
                <Box paddingBlockStart="400">
                  <div className="widget-preview-container" style={{ textAlign: alignment, background: colors.appBackground, color: colors.labelText, padding: '16px', borderRadius: '8px' }}>
                      <style>{`
    .widget-preview-container {
      --p-color-bg-surface: ${colors.appBackground};
      --p-color-text: ${colors.labelText};
      --p-color-text-subdued: ${colors.helpText};
      --p-color-text-critical: ${colors.requiredCharacter};
      --p-color-border-strong: ${colors.inputBorder};
    }
    .widget-preview-container .Polaris-Text--root { color: ${colors.labelText} !important; }
    .widget-preview-container .Polaris-Text--toneSubdued { color: ${colors.helpText} !important; }
    .widget-preview-container .Polaris-Text--toneCritical { color: ${colors.requiredCharacter} !important; }
    
    .widget-preview-container .Polaris-TextField__Input { 
      background-color: ${colors.inputBackground} !important; 
      color: ${colors.inputText} !important; 
      border-color: ${colors.inputBorder} !important; 
    }
    .widget-preview-container .Polaris-Select__Input { 
      background-color: ${colors.dropdownBackground} !important; 
      color: ${colors.dropdownText} !important; 
      border-color: ${colors.dropdownBorder} !important; 
    }
    
    .widget-preview-container .Polaris-ChoiceList__Choice { 
      color: ${colors.checkboxRadioText} !important; 
    }
    
    /* Radio and Checkbox circle/box overrides */
    .widget-preview-container .Polaris-Choice__Control input[type="radio"]:checked + .Polaris-Choice__Backdrop {
      border-color: ${colors.checkboxRadioActive} !important;
      background-color: ${colors.checkboxRadioActive} !important;
    }
    .widget-preview-container .Polaris-Choice__Control input[type="checkbox"]:checked + .Polaris-Choice__Backdrop {
      border-color: ${colors.checkboxRadioActive} !important;
      background-color: ${colors.checkboxRadioActive} !important;
    }
    .widget-preview-container .Polaris-Choice__Control input[type="radio"] + .Polaris-Choice__Backdrop,
    .widget-preview-container .Polaris-Choice__Control input[type="checkbox"] + .Polaris-Choice__Backdrop {
      border-color: ${colors.inputBorder} !important;
    }

    .widget-preview-container .Polaris-Button { 
      background: ${colors.buttonBackground} !important; 
      color: ${colors.buttonText} !important; 
      border-color: ${colors.inputBorder} !important; 
    }
    .widget-preview-container .Polaris-Button:hover { 
      background: ${colors.buttonBackgroundHover} !important; 
      color: ${colors.buttonTextHover} !important; 
    }
    .widget-preview-container .Polaris-Button:active { 
      background: ${colors.buttonBackgroundActive} !important; 
      color: ${colors.buttonTextActive} !important; 
    }
  `}</style>
                    <BlockStack gap="300">
                      {toggleStates.tooltip && (
                        <div style={{ display: "inline-block", background: colors.inputBackground, color: colors.helpText, padding: "4px 8px", borderRadius: "4px", fontSize: "12px", marginBottom: "-8px", zIndex: 1, border: `1px solid ${colors.inputBorder}` }}>
                          Helpful tooltip
                        </div>
                      )}
                      <Box>
                        <Text as="p" fontWeight="bold">
                          Text <Text as="span" tone="critical">*</Text>
                          {toggleStates.displayValue && <Text as="span" tone="subdued"> (entered value)</Text>}
                        </Text>
                        <TextField placeholder="Enter your text..." autoComplete="off" />
                      </Box>
                      <Box>
                        <Text as="p" fontWeight="bold">
                          File upload
                          {toggleStates.displayValue && <Text as="span" tone="subdued"> (uploaded.jpg)</Text>}
                        </Text>
                        <div style={{ padding: "12px", border: `1px dashed ${colors.inputBorder}`, borderRadius: "4px", background: colors.inputBackground }}>
                          <BlockStack inlineAlign={alignment === "center" ? "center" : alignment === "right" ? "end" : "start"} gap="200">
                            <Button variant="primary">Choose file</Button>
                            <Text as="p" tone="subdued">
                              or drop file to upload
                            </Text>
                          </BlockStack>
                        </div>
                        {filePreview.includes("image") ? (
                          <div style={{ marginTop: "8px", width: "40px", height: "40px", background: "#e0e0e0", borderRadius: "4px" }} />
                        ) : (
                          <div style={{ marginTop: "8px" }}><Text as="p" tone="subdued" variant="bodySm">uploaded.jpg</Text></div>
                        )}
                      </Box>
                      <Box>
                        <Text as="p" fontWeight="bold">
                          Select
                          {toggleStates.displayValue && <Text as="span" tone="subdued"> (Option 1)</Text>}
                        </Text>
                        <Select options={["Please choose..."]} value="Please choose..." onChange={() => {}} />
                      </Box>
                      <Box>
                        <Text as="p" fontWeight="bold">Switch</Text>
                        <CustomToggle checked={false} onChange={() => {}} activeColor={colors.switchActiveBackground} inactiveColor={colors.switchBackground} />
                      </Box>
                      <Box>
                        <Text as="p" fontWeight="bold">Radio button</Text>
                        <ChoiceList
                          choices={[{ label: "Radio 1", value: "radio1" }, { label: "Radio 2", value: "radio2" }]} selected={["radio1"]}
                          // selected={[]}
                        />
                      </Box>
                      <Box>
                        <Text as="p" fontWeight="bold">Checkbox</Text>
                        <ChoiceList
                          choices={[
                            { label: "Checkbox 1", value: "checkbox1" }
                          ]}
                          selected={[]}
                          allowMultiple
                        />
                      </Box>
                    </BlockStack>
                  </div>
                </Box>
              </Card>
            </div>
          </Box>
        </InlineGrid>
      </Box>
    );
  } else if (topTab === 1) {
    mainContent = (
      <Box padding="400">
        <BlockStack gap="400">
          <Card padding="0">
            <Box padding="400" borderBlockEndWidth="1" borderColor="border">
              <InlineStack align="space-between" blockAlign="center" gap="300">
                <Text variant="headingLg" as="h1">
                  Translations
                </Text>
                <InlineStack gap="200">
                  <Button>Add language</Button>
                  <Button>Translating Default ⭐</Button>
                </InlineStack>
              </InlineStack>
            </Box>
            <Box padding="400">
              <BlockStack gap="400">
                <Card padding="0">
                  <Box padding="300" borderBlockEndWidth="1" borderColor="border">
                    <Text variant="headingMd" as="h3">Widget</Text>
                  </Box>
                  <Box>
                    <InlineGrid columns={2} gap="0">
                      <Box padding="300" borderBlockEndWidth="1" borderColor="border" background="bg-surface-subdued">
                        <Text as="p" fontWeight="bold">English (Default)</Text>
                      </Box>
                      <Box padding="300" borderBlockEndWidth="1" borderColor="border" borderInlineStartWidth="1">
                        <Text as="p" fontWeight="bold">Default</Text>
                      </Box>
                      
                      <TranslationRow english="Choose file" />
                      <TranslationRow english="or drop file to upload" />
                      <TranslationRow english="File uploading" />
                      <TranslationRow english="Uploaded file:" />
                      <TranslationRow english="Link" />
                      <TranslationRow english="Selections will add ({addon}) to the price" />
                      <TranslationRow english="Enter quantity" />
                      <TranslationRow english="Search..." />
                    </InlineGrid>
                  </Box>
                </Card>

                <Card padding="0">
                  <Box padding="300" borderBlockEndWidth="1" borderColor="border">
                    <Text variant="headingMd" as="h3">Cart widget</Text>
                  </Box>
                  <Box>
                    <InlineGrid columns={2} gap="0">
                      <Box padding="300" borderBlockEndWidth="1" borderColor="border" background="bg-surface-subdued">
                        <Text as="p" fontWeight="bold">English (Default)</Text>
                      </Box>
                      <Box padding="300" borderBlockEndWidth="1" borderColor="border" borderInlineStartWidth="1">
                        <Text as="p" fontWeight="bold">Default</Text>
                      </Box>
                      
                      <TranslationRow english="Edit Options" />
                      <TranslationRow english="Cancel" />
                      <TranslationRow english="Save Changes" />
                    </InlineGrid>
                  </Box>
                </Card>
              </BlockStack>
            </Box>
          </Card>
        </BlockStack>
      </Box>
    );
  } else {
    mainContent = (
      <Card>
        <Text variant="headingMd" as="h3">
          Theme Setup
        </Text>
      </Card>
    );
  }

  const pageTitle =
    topTab === 0
      ? "Settings"
      : topTab === 1
        ? "Translations"
        : "Theme Setup";

  return (
    <AppProvider i18n={english}>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json" onChange={handleImport} />
      <Page 
        title={pageTitle}
        primaryAction={{
          content: "Save",
          onAction: handleSave,
          loading: isSaving,
        }}
        secondaryActions={topTab === 0 ? [
          { content: "Export settings", onAction: handleExport },
          { content: "Import settings", onAction: () => fileInputRef.current?.click() },
        ] : undefined}
      >
        <Box paddingBlockEnd="400">
          <InlineStack align="center" gap="200">
            <ButtonGroup variant="segmented">
              {topTabs.map((tab, index) => (
                <Button
                  key={index}
                  variant={topTab === index ? "primary" : "tertiary"}
                  onClick={() => handleTopTabChange(index)}
                >
                  {tab.content}
                </Button>
              ))}
            </ButtonGroup>
          </InlineStack>
        </Box>
        {mainContent}
      </Page>
    </AppProvider>
  );
}
