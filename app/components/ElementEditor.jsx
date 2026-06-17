import { useState, useEffect } from "react";
import ConditionalLogicEditor from "./ConditionalLogicEditor";
import TargetedActionsEditor from "./TargetedActionsEditor";
import ColorPickerInput from "./ColorPickerInput";
import ImageUploadInput from "./ImageUploadInput";
import { Editor } from "@tinymce/tinymce-react";
import {
  Card,
  BlockStack,
  InlineStack,
  Box,
  Text,
  Button,
  TextField,
  Checkbox,
  Tabs,
  ButtonGroup,
  Select,
  Banner,
  InlineGrid,
} from "@shopify/polaris";

function ClientRichTextEditor({ value, onChange }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <TextField value={value} onChange={onChange} multiline={4} autoComplete="off" />;

  return (
    <div style={{ borderRadius: "8px", border: "1px solid #c9cccf", overflow: "hidden" }}>
      <Editor
        tinymceScriptSrc="https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.3/tinymce.min.js"
        value={value || ""}
        onEditorChange={(content) => onChange(content)}
        init={{
          height: 300,
          menubar: false,
          statusbar: true,
          elementpath: false,
          resize: true,
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
          ],
          toolbar: 'blocks | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | indent outdent | forecolor backcolor | link blockquote | numlist bullist | removeformat | table',
          content_style: 'body { font-family:-apple-system,BlinkMacSystemFont,San Francisco,Segoe UI,Roboto,Helvetica Neue,sans-serif; font-size:14px; margin: 8px; }',
          promotion: false,
          branding: false,
        }}
      />
    </div>
  );
}

/**
 * ElementEditor — Detailed configuration form for a single template element.
 * Matches the Globo Product Options builder UI.
 */
export default function ElementEditor({ element, allElements = [], onChange, onBack, onDelete }) {
  const [selectedTab, setSelectedTab] = useState(0);

  const typeStr = element.type || "";
  const isInput = ["Text", "Textarea", "Email", "Phone"].includes(typeStr);
  const isNumber = typeStr === "Number";
  const isStatic = ["Heading", "Paragraph", "HTML", "Divider", "Spacing", "Pop-up Modal"].includes(typeStr);
  const isSwatchType = ["Color Swatch", "Image Swatch"].includes(typeStr);
  
  const showCartLabel = !isStatic;
  const showRequired = !isStatic;
  const showHiddenLabel = !isStatic;
  const showPlaceholder = isInput || isNumber || ["Datetime", "Dropdown", "Color Dropdown"].includes(typeStr);
  const showHelpText = !isStatic;
  
  const showMinMaxChars = ["Text", "Textarea"].includes(typeStr);
  const showDefaultValue = isInput || isNumber;
  const showCharacterCounter = ["Text", "Textarea"].includes(typeStr);

  const tabs = [
    { id: "basic", content: "Basic Settings" },
    { id: "advanced", content: "Advanced Settings" },
  ];

  const handleChange = (field, value) => {
    onChange(element.id, { ...element, [field]: value });
  };

  const handleConfigChange = (field, value) => {
    const currentConfig = element.config || {};
    onChange(element.id, {
      ...element,
      config: { ...currentConfig, [field]: value },
    });
  };

  return (
    <Card padding="0">
      {/* Header */}
      <Box padding="300" borderBlockEndWidth="025" borderColor="border">
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="300" blockAlign="center">
            <Button variant="plain" onClick={onBack}>
              &lt; {element.label || "Element"}
            </Button>
          </InlineStack>
          <InlineStack gap="300" blockAlign="center">
            <Box
              padding="100"
              paddingInlineStart="200"
              paddingInlineEnd="200"
              borderWidth="025"
              borderColor="border"
              borderRadius="100"
            >
              <InlineStack gap="100" blockAlign="center">
                <span style={{ fontSize: "16px" }}>{element.icon || "📄"}</span>
                <Text as="span" variant="bodySm" fontWeight="semibold">
                  {element.type}
                </Text>
              </InlineStack>
            </Box>
          </InlineStack>
        </InlineStack>
      </Box>

      {/* Editor Body */}
      <Box padding="400">
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab} />
            <Button variant="tertiary" size="slim">
              ⭐ Personalizer Settings
            </Button>
          </InlineStack>

          {selectedTab === 0 && (
            <BlockStack gap="400">
              {/* Row 1: Name on product page & cart page */}
              <InlineStack gap="400" align="start" blockAlign="start">
                <Box width={showCartLabel ? "50%" : "100%"}>
                  <TextField
                    label="Name on product page"
                    value={element.label}
                    onChange={(val) => handleChange("label", val)}
                    autoComplete="off"
                    requiredIndicator
                  />
                </Box>
                {showCartLabel && (
                  <Box width="50%">
                    <TextField
                      label="Name on cart page"
                      value={element.config?.cartLabel || ""}
                      onChange={(val) => handleConfigChange("cartLabel", val)}
                      autoComplete="off"
                      requiredIndicator
                    />
                  </Box>
                )}
              </InlineStack>

              {/* Row 2: Checkboxes */}
              {(showRequired || showHiddenLabel) && (
                <InlineStack gap="400">
                  {showRequired && (
                    <Box width="100%">
                      <Checkbox
                        label="Required field"
                        checked={element.required || false}
                        onChange={(val) => handleChange("required", val)}
                      />
                    </Box>
                  )}
                  {showHiddenLabel && (
                    <Box width="100%">
                      <Checkbox
                        label="Hidden label"
                        checked={element.config?.hiddenLabel || false}
                        onChange={(val) => handleConfigChange("hiddenLabel", val)}
                      />
                    </Box>
                  )}
                </InlineStack>
              )}

              {/* Row 3: Placeholder & Help text */}
              {(showPlaceholder || showHelpText) && (
                <InlineStack gap="400">
                  {showPlaceholder && (
                    <Box width={showHelpText ? "100%" : "50%"}>
                      <TextField
                        label="Placeholder"
                        value={element.config?.placeholder || ""}
                        onChange={(val) => handleConfigChange("placeholder", val)}
                        autoComplete="off"
                      />
                    </Box>
                  )}
                  {showHelpText && (
                    <Box width={showPlaceholder ? "100%" : "50%"}>
                      <TextField
                        label="Help text"
                        value={element.config?.helpText || ""}
                        onChange={(val) => handleConfigChange("helpText", val)}
                        autoComplete="off"
                      />
                    </Box>
                  )}
                </InlineStack>
              )}

              <Checkbox
                label="Conditional logic (Show this field when...)"
                checked={element.config?.conditionalLogic || false}
                onChange={(val) => handleConfigChange("conditionalLogic", val)}
              />

              {element.config?.conditionalLogic && (
                <Box paddingBlockStart="400">
                  <ConditionalLogicEditor element={element} allElements={allElements} onUpdate={onChange} />
                </Box>
              )}

              <Checkbox
                label="Target other fields (Actions)"
                checked={element.config?.targetOtherFields || false}
                onChange={(val) => handleConfigChange("targetOtherFields", val)}
              />

              {element.config?.targetOtherFields && (
                <Box paddingBlockStart="400">
                  <TargetedActionsEditor element={element} allElements={allElements} onUpdate={onChange} />
                </Box>
              )}

              {/* Allow Multiple Selections for visually grouped choices */}
              {["Button", "Color Swatch", "Image Swatch"].includes(element.type) && (
                 <Box paddingBlockStart="400">
                   <Checkbox
                     label="Allow multiple selections"
                     checked={element.config?.allowMultiple || false}
                     onChange={(val) => handleConfigChange("allowMultiple", val)}
                     helpText="Customers can select more than one option"
                   />
                 </Box>
              )}

              {/* Choice Settings (Only for Dropdown, Checkbox, Radio, Swatch etc) */}
              {[
                "Dropdown", "Color Dropdown", "Image Dropdown", "Select",
                "Radio Button", "Checkbox", "Button", "Color Swatch", "Image Swatch"
              ].includes(element.type) && (
                <Box paddingBlockStart="400" paddingBlockEnd="400">
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h3">Values / Options</Text>
                    <BlockStack gap="200">
                      {(element.config?.choices || []).map((choice, index) => {
                        const isDuplicate = (element.config?.choices || []).findIndex(c => 
                          c.label.trim() && c.label.trim().toLowerCase() === choice.label.trim().toLowerCase()
                        ) !== index;
                        
                        return (
                          <InlineStack gap="200" blockAlign="start" key={choice.id || index}>
                            <Box paddingBlockStart="100">
                              <Button variant="tertiary" size="slim" disabled>⋮⋮</Button>
                            </Box>
                            <Box width="200px">
                              <TextField
                                value={choice.label}
                                onChange={(val) => {
                                  const newChoices = [...(element.config.choices || [])];
                                  newChoices[index] = { ...choice, label: val };
                                  handleConfigChange("choices", newChoices);
                                }}
                                placeholder="Option label"
                                autoComplete="off"
                                labelHidden
                                error={isDuplicate ? "Duplicate option" : false}
                              />
                            </Box>
                            <Box width="200px">
                              <TextField
                                value={choice.value || ""}
                                onChange={(val) => {
                                  const newChoices = [...(element.config.choices || [])];
                                  newChoices[index] = { ...choice, value: val };
                                  handleConfigChange("choices", newChoices);
                                }}
                                placeholder="Option value (optional)"
                                autoComplete="off"
                                labelHidden
                              />
                            </Box>
                            {["Color Dropdown", "Color Swatch"].includes(element.type) && (
                              <Box width="120px">
                                <ColorPickerInput 
                                  value={choice.color || "#000000"} 
                                  onChange={(val) => {
                                    const newChoices = [...(element.config.choices || [])];
                                    newChoices[index] = { ...choice, color: val };
                                    handleConfigChange("choices", newChoices);
                                  }}
                                />
                              </Box>
                            )}
                            {["Image Dropdown", "Image Swatch"].includes(element.type) && (
                              <Box width="100px">
                                <ImageUploadInput
                                  value={choice.image || ""}
                                  onChange={(val) => {
                                    const newChoices = [...(element.config.choices || [])];
                                    newChoices[index] = { ...choice, image: val };
                                    handleConfigChange("choices", newChoices);
                                  }}
                                />
                              </Box>
                            )}
                          <Box width="100px">
                            <TextField
                              value={choice.price || ""}
                              onChange={(val) => {
                                const newChoices = [...(element.config.choices || [])];
                                newChoices[index] = { ...choice, price: val };
                                handleConfigChange("choices", newChoices);
                              }}
                              placeholder="+ $0.00"
                              autoComplete="off"
                              labelHidden
                            />
                          </Box>
                          {element.type !== "Color Dropdown" && (
                            <Checkbox
                              label="Default"
                              checked={choice.default || false}
                              onChange={(val) => {
                                const newChoices = [...(element.config.choices || [])].map((c, i) => ({
                                  ...c,
                                  default: element.type === "Checkbox" ? (i === index ? val : c.default) : (i === index ? val : false)
                                }));
                                handleConfigChange("choices", newChoices);
                              }}
                            />
                          )}
                          <Button
                            variant="tertiary"
                            tone="critical"
                            size="slim"
                            onClick={() => {
                              const newChoices = [...(element.config.choices || [])];
                              newChoices.splice(index, 1);
                              handleConfigChange("choices", newChoices);
                            }}
                          >
                            🗑️
                          </Button>
                        </InlineStack>
                      );
                    })}
                      <Box paddingBlockStart="200">
                        <Button
                          variant="tertiary"
                          onClick={() => {
                            const newChoices = [...(element.config?.choices || [])];
                            newChoices.push({
                              id: `opt-${Date.now()}`,
                              label: `Option ${newChoices.length + 1}`,
                              price: "",
                              default: false,
                            });
                            handleConfigChange("choices", newChoices);
                          }}
                        >
                          + Add option
                        </Button>
                      </Box>
                    </BlockStack>
                  </BlockStack>
                </Box>
              )}

              {/* Heading Settings */}
              {element.type === "Heading" && (
                <Box paddingBlockStart="400" paddingBlockEnd="400">
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h3">Heading Settings</Text>
                    <TextField label="Heading Content" value={element.config?.content || element.label} onChange={(val) => handleConfigChange("content", val)} autoComplete="off" />
                  </BlockStack>
                </Box>
              )}

              {/* Divider Settings */}
              {element.type === "Divider" && (
                <Box paddingBlockStart="400" paddingBlockEnd="400">
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h3">Divider Settings</Text>
                    <InlineGrid columns={2} gap="400">
                      <Box>
                        <Text as="p" paddingBlockEnd="100">Color</Text>
                        <ColorPickerInput 
                          value={element.config?.color || "#bbbbbb"} 
                          onChange={(val) => handleConfigChange("color", val)}
                        />
                      </Box>
                      <Box>
                        <Text as="p" paddingBlockEnd="100">Style</Text>
                        <ButtonGroup variant="segmented" fullWidth>
                          <Button pressed={element.config?.style === "solid" || !element.config?.style} onClick={() => handleConfigChange("style", "solid")}>Solid</Button>
                          <Button pressed={element.config?.style === "double"} onClick={() => handleConfigChange("style", "double")}>Double</Button>
                          <Button pressed={element.config?.style === "dashed"} onClick={() => handleConfigChange("style", "dashed")}>Dashed</Button>
                          <Button pressed={element.config?.style === "dotted"} onClick={() => handleConfigChange("style", "dotted")}>Dotted</Button>
                        </ButtonGroup>
                      </Box>
                    </InlineGrid>
                    <Box width="50%">
                      <TextField 
                        label="Thickness" 
                        type="number" 
                        value={element.config?.thickness || "1"} 
                        onChange={(val) => handleConfigChange("thickness", val)} 
                        suffix="px" 
                        autoComplete="off" 
                      />
                    </Box>
                  </BlockStack>
                </Box>
              )}

              {/* Paragraph / HTML Settings */}
              {["Paragraph", "HTML"].includes(element.type) && (
                <Box paddingBlockStart="400" paddingBlockEnd="400">
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h3">{element.type} Content</Text>
                    {element.type === "Paragraph" ? (
                      <ClientRichTextEditor 
                        value={element.config?.content || ""} 
                        onChange={(val) => handleConfigChange("content", val)} 
                      />
                    ) : (
                      <TextField label="Content" value={element.config?.content || ""} onChange={(val) => handleConfigChange("content", val)} multiline={4} autoComplete="off" />
                    )}
                  </BlockStack>
                </Box>
              )}

              {/* Pop-up Modal Settings */}
              {element.type === "Pop-up Modal" && (
                <Box paddingBlockStart="400" paddingBlockEnd="400">
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h3">Pop-up Modal Settings</Text>
                    <InlineGrid columns={2} gap="400">
                      <Box>
                        <TextField 
                          label="Modal width" 
                          value={element.config?.modalWidth !== undefined ? String(element.config.modalWidth) : ""} 
                          onChange={(val) => handleConfigChange("modalWidth", val)} 
                          placeholder="auto"
                          suffix="px" 
                          autoComplete="off" 
                        />
                      </Box>
                      <Box>
                        <TextField 
                          label="Modal height" 
                          value={element.config?.modalHeight !== undefined ? String(element.config.modalHeight) : ""} 
                          onChange={(val) => handleConfigChange("modalHeight", val)} 
                          placeholder="auto"
                          suffix="px" 
                          autoComplete="off" 
                        />
                      </Box>
                    </InlineGrid>
                    <Box>
                      <InlineStack align="start" blockAlign="center" gap="200" paddingBlockEnd="100">
                        <Text as="p" variant="bodyMd">Modal content</Text>
                        <div style={{ background: '#f4f6f8', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', color: '#5c6ac4' }}>en</div>
                      </InlineStack>
                      <ClientRichTextEditor 
                         value={element.config?.content || ""} 
                         onChange={(val) => handleConfigChange("content", val)} 
                      />
                    </Box>
                  </BlockStack>
                </Box>
              )}

              {/* Switch Settings */}
              {element.type === "Switch" && (
                <Box paddingBlockStart="400" paddingBlockEnd="400">
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h3">Switch Settings</Text>
                    <InlineStack gap="400">
                      <Box width="100%">
                        <TextField label="Label ON" value={element.config?.labelOn || "ON"} onChange={(val) => handleConfigChange("labelOn", val)} autoComplete="off" />
                      </Box>
                      <Box width="100%">
                        <TextField label="Label OFF" value={element.config?.labelOff || "OFF"} onChange={(val) => handleConfigChange("labelOff", val)} autoComplete="off" />
                      </Box>
                    </InlineStack>
                  </BlockStack>
                </Box>
              )}

              {/* Google Font Selector Settings */}
              {element.type === "Google Font Selector" && (
                <Box paddingBlockStart="400" paddingBlockEnd="400">
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h3">Font Selection</Text>
                    <TextField label="Fonts (comma separated)" value={(element.config?.fonts || ["Inter", "Roboto", "Open Sans"]).join(", ")} onChange={(val) => handleConfigChange("fonts", val.split(",").map(f => f.trim()))} autoComplete="off" />
                  </BlockStack>
                </Box>
              )}

              {/* Tabs Settings */}
              {element.type === "Tabs" && (
                <Box paddingBlockStart="400" paddingBlockEnd="400">
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h3">Tabs Content</Text>
                    <BlockStack gap="200">
                      {(element.config?.tabs || [{label: "Tab 1", content: "Content"}]).map((tab, index) => (
                        <Box key={index} padding="300" borderWidth="025" borderColor="border" borderRadius="200">
                           <BlockStack gap="200">
                             <InlineStack align="space-between">
                               <Text variant="bodySm" fontWeight="bold">Tab {index + 1}</Text>
                               <Button variant="tertiary" tone="critical" size="slim" onClick={() => { const newTabs = [...(element.config.tabs || [])]; newTabs.splice(index, 1); handleConfigChange("tabs", newTabs); }}>🗑️ Remove</Button>
                             </InlineStack>
                             <TextField label="Tab Label" value={tab.label} onChange={(val) => { const newTabs = [...(element.config.tabs || [])]; newTabs[index] = { ...tab, label: val }; handleConfigChange("tabs", newTabs); }} autoComplete="off" />
                             <TextField label="Tab Content (HTML)" value={tab.content || ""} onChange={(val) => { const newTabs = [...(element.config.tabs || [])]; newTabs[index] = { ...tab, content: val }; handleConfigChange("tabs", newTabs); }} multiline={3} autoComplete="off" />
                           </BlockStack>
                        </Box>
                      ))}
                      <Box paddingBlockStart="200">
                        <Button variant="tertiary" onClick={() => { const newTabs = [...(element.config?.tabs || [{label: "Tab 1", content: "Content"}])]; newTabs.push({ label: `Tab ${newTabs.length + 1}`, content: "" }); handleConfigChange("tabs", newTabs); }}>+ Add Tab</Button>
                      </Box>
                    </BlockStack>
                  </BlockStack>
                </Box>
              )}

              {/* File Upload Settings */}
              {element.type === "File Upload" && (
                <Box paddingBlockStart="400" paddingBlockEnd="400">
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h3">File Upload Settings</Text>
                    <InlineStack gap="400">
                      <Box width="100%">
                        <TextField
                          label="Allowed file extensions"
                          placeholder=".png, .jpg, .pdf"
                          value={element.config?.allowedExtensions || ""}
                          onChange={(val) => handleConfigChange("allowedExtensions", val)}
                          autoComplete="off"
                        />
                      </Box>
                      <Box width="100%">
                        <TextField
                          label="Maximum file size (MB)"
                          type="number"
                          value={element.config?.maxSizeMB || ""}
                          onChange={(val) => handleConfigChange("maxSizeMB", val)}
                          autoComplete="off"
                        />
                      </Box>
                    </InlineStack>
                    <InlineStack gap="400">
                      <Box width="100%">
                        <TextField
                          label="Maximum Number of Files"
                          type="number"
                          value={element.config?.maxFiles || "1"}
                          onChange={(val) => handleConfigChange("maxFiles", val)}
                          autoComplete="off"
                        />
                      </Box>
                      <Box width="100%">
                        <TextField
                          label="Button Text"
                          value={element.config?.buttonText || "Upload File"}
                          onChange={(val) => handleConfigChange("buttonText", val)}
                          autoComplete="off"
                        />
                      </Box>
                    </InlineStack>
                    <Box width="100%">
                      <TextField
                        label="Success Message"
                        value={element.config?.successMessage || "File attached successfully!"}
                        onChange={(val) => handleConfigChange("successMessage", val)}
                        autoComplete="off"
                      />
                    </Box>
                  </BlockStack>
                </Box>
              )}

              {/* Color Picker Default Setting */}
              {element.type === "Color Picker" && (
                <Box paddingBlockStart="400" paddingBlockEnd="400">
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h3">Color Picker Settings</Text>
                    <Box width="100px">
                      <Text as="p" paddingBlockEnd="100">Default color</Text>
                      <ColorPickerInput 
                        value={element.config?.defaultColor || "#000000"} 
                        onChange={(val) => handleConfigChange("defaultColor", val)}
                      />
                    </Box>
                  </BlockStack>
                </Box>
              )}

              {/* Datetime Restrictions */}
              {element.type === "Datetime" && (
                <Box paddingBlockStart="400" paddingBlockEnd="400">
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h3">Datetime Restrictions</Text>
                    <InlineStack gap="400">
                      <Box width="100%">
                        <Checkbox
                          label="Enable time selection"
                          checked={element.config?.enableTime !== false}
                          onChange={(val) => handleConfigChange("enableTime", val)}
                        />
                      </Box>
                    </InlineStack>
                    <InlineStack gap="400">
                      <Box width="100%">
                        <Checkbox
                          label="Disable past dates"
                          checked={element.config?.disablePast || false}
                          onChange={(val) => handleConfigChange("disablePast", val)}
                        />
                      </Box>
                      <Box width="100%">
                        <Checkbox
                          label="Disable today"
                          checked={element.config?.disableToday || false}
                          onChange={(val) => handleConfigChange("disableToday", val)}
                        />
                      </Box>
                    </InlineStack>
                    <InlineStack gap="400">
                      <Box width="100%">
                        <Checkbox
                          label="Disable future dates"
                          checked={element.config?.disableFuture || false}
                          onChange={(val) => handleConfigChange("disableFuture", val)}
                        />
                      </Box>
                      <Box width="100%">
                        <TextField
                          label="Maximum days in future"
                          type="number"
                          value={element.config?.maxFutureDays || ""}
                          onChange={(val) => handleConfigChange("maxFutureDays", val)}
                          autoComplete="off"
                          helpText="e.g. 30"
                        />
                      </Box>
                    </InlineStack>
                  </BlockStack>
                </Box>
              )}

              {/* Bundle Settings */}
              {(element.type === "Bundle" || element.type === "bundle") && (
                <Box paddingBlockStart="400" paddingBlockEnd="400">
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h3">Bundle Products</Text>
                    <Text as="p" tone="subdued" variant="bodySm">
                      Select products from your store. Customers will be able to choose variants for each bundled product.
                    </Text>
                    <InlineStack>
                      <Button
                        onClick={async () => {
                          const currentIds = (element.config?.bundleProducts || []).map((p) => ({ id: p.id }));
                          const selected = await window.shopify.resourcePicker({
                            type: "product",
                            multiple: true,
                            action: "select",
                            selectionIds: currentIds,
                          });
                          if (selected) {
                            const mapped = selected.map((p) => ({
                              id: p.id,
                              title: p.title,
                              handle: p.handle,
                              image: p.images?.[0]?.originalSrc || p.images?.[0]?.url || "",
                              variants: (p.variants || []).map((v) => ({
                                id: v.id,
                                title: v.title,
                                price: v.price,
                              })),
                            }));
                            handleConfigChange("bundleProducts", mapped);
                          }
                        }}
                      >
                        {(element.config?.bundleProducts || []).length > 0 ? "Edit products" : "Select products"}
                      </Button>
                    </InlineStack>

                    {(element.config?.bundleProducts || []).length > 0 && (
                      <BlockStack gap="200">
                        {(element.config.bundleProducts).map((product, idx) => (
                          <Box key={product.id || idx} padding="300" borderWidth="025" borderColor="border" borderRadius="200" background="bg-surface-secondary">
                            <InlineStack align="space-between" blockAlign="center">
                              <InlineStack gap="300" blockAlign="center">
                                {product.image ? (
                                  <img
                                    src={product.image}
                                    alt={product.title}
                                    style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--p-color-border)" }}
                                  />
                                ) : (
                                  <div style={{ width: "40px", height: "40px", borderRadius: "6px", background: "var(--p-color-bg-surface-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>📦</div>
                                )}
                                <BlockStack gap="0">
                                  <Text variant="bodyMd" fontWeight="bold" as="p">{product.title}</Text>
                                  <Text variant="bodySm" tone="subdued" as="p">
                                    {(product.variants || []).length} variant{(product.variants || []).length !== 1 ? "s" : ""}
                                  </Text>
                                </BlockStack>
                              </InlineStack>
                              <Button
                                variant="tertiary"
                                tone="critical"
                                size="slim"
                                onClick={() => {
                                  const updated = [...(element.config.bundleProducts || [])];
                                  updated.splice(idx, 1);
                                  handleConfigChange("bundleProducts", updated);
                                }}
                              >
                                Remove
                              </Button>
                            </InlineStack>
                          </Box>
                        ))}
                      </BlockStack>
                    )}
                  </BlockStack>
                </Box>
              )}

              {/* Variant Fetcher Settings */}
              {(element.type === "Variant Fetcher" || element.type === "variant_fetcher") && (
                <Box paddingBlockStart="400" paddingBlockEnd="400">
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h3">Variant Fetcher Settings</Text>
                    <Banner tone="info">
                      <p>This element will automatically fetch and display the options (like Size, Color) of the product this template is assigned to. No product selection is needed — variants are detected from the product page.</p>
                    </Banner>
                    <Select
                      label="Display style"
                      options={[
                        { label: "Button swatches", value: "button" },
                        { label: "Dropdown", value: "dropdown" },
                      ]}
                      value={element.config?.displayStyle || "button"}
                      onChange={(val) => handleConfigChange("displayStyle", val)}
                    />
                    <Checkbox
                      label="Hide original variant selectors on the product page"
                      checked={element.config?.hideOriginalSelectors !== false}
                      onChange={(val) => handleConfigChange("hideOriginalSelectors", val)}
                      helpText="When enabled, the theme's native variant selectors (size, color pickers) will be hidden to prevent duplicates"
                    />
                    <Checkbox
                      label="Hide variant properties in cart"
                      checked={element.config?.hideVariantPropertiesInCart || false}
                      onChange={(val) => handleConfigChange("hideVariantPropertiesInCart", val)}
                      helpText="When enabled, the selected variant options won't be shown as separate line item properties in the cart."
                    />
                    <TextField
                      label="Specific option to fetch (Optional)"
                      value={element.config?.specificOptionName || ""}
                      onChange={(val) => handleConfigChange("specificOptionName", val)}
                      helpText="Enter the exact name of the option to fetch (e.g., 'Size'). If empty, all options will be fetched."
                      autoComplete="off"
                    />
                    <Checkbox
                      label="Do not pre-select any option"
                      checked={element.config?.noDefaultSelection || false}
                      onChange={(val) => handleConfigChange("noDefaultSelection", val)}
                      helpText="When enabled, the customer will be forced to select an option before they can add to cart."
                    />
                  </BlockStack>
                </Box>
              )}

              <Box paddingBlockStart="400">
                <BlockStack gap="400">
                  <Text variant="headingSm" as="h3">Advanced Features (Unlocked)</Text>


                  {/* Google Font Selector Display Style */}
                  {element.type === "Google Font Selector" && (
                    <Box paddingBlockEnd="400">
                      <Select 
                        label="Display Style"
                        options={["Dropdown", "Swatch"]}
                        value={element.config?.fontDisplayStyle || "Dropdown"}
                        onChange={(val) => handleConfigChange("fontDisplayStyle", val)}
                      />
                    </Box>
                  )}
                  
                  {/* Min / Max Characters */}
                  {showMinMaxChars && (
                    <InlineStack gap="400">
                      <Box width="100%">
                        <TextField
                          label="Min character"
                          type="number"
                          value={element.config?.minCharacter || ""}
                          onChange={(val) => handleConfigChange("minCharacter", val)}
                          autoComplete="off"
                        />
                      </Box>
                      <Box width="100%">
                        <TextField
                          label="Max character"
                          type="number"
                          value={element.config?.maxCharacter || ""}
                          onChange={(val) => handleConfigChange("maxCharacter", val)}
                          autoComplete="off"
                        />
                      </Box>
                    </InlineStack>
                  )}

                  {/* Default Value & Price */}
                  <InlineStack gap="400">
                    {showDefaultValue && (
                      <Box width="100%">
                        <TextField
                          label="Default value"
                          value={element.config?.defaultValue || ""}
                          onChange={(val) => handleConfigChange("defaultValue", val)}
                          autoComplete="off"
                        />
                      </Box>
                    )}
                    <Box width={showDefaultValue ? "100%" : "50%"}>
                      <TextField
                        label="Add-on Price"
                        type="number"
                        prefix="$"
                        value={element.config?.price || ""}
                        onChange={(val) => handleConfigChange("price", val)}
                        autoComplete="off"
                        helpText="Leave blank for no extra cost"
                      />
                      {["Text", "Textarea"].includes(element.type) && (
                        <Box paddingBlockStart="200">
                          <Checkbox
                            label="Charge per character"
                            checked={element.config?.chargePerCharacter || false}
                            onChange={(val) => handleConfigChange("chargePerCharacter", val)}
                          />
                        </Box>
                      )}
                    </Box>
                  </InlineStack>

                  {/* Checkboxes */}
                  <InlineStack gap="400">
                    {showCharacterCounter && (
                      <Box width="100%">
                        <Checkbox
                          label="Show character counter"
                          checked={element.config?.characterCounter || false}
                          onChange={(val) => handleConfigChange("characterCounter", val)}
                        />
                      </Box>
                    )}
                    <Box width={showCharacterCounter ? "100%" : "50%"}>
                      <Checkbox
                        label="Enable Add-on Settings"
                        checked={element.config?.addonSettings || false}
                        onChange={(val) => handleConfigChange("addonSettings", val)}
                      />
                    </Box>
                  </InlineStack>
                </BlockStack>
              </Box>
            </BlockStack>
          )}

          {selectedTab === 1 && (
            <BlockStack gap="400">
              {/* Scroll Settings */}
              {["Radio Button", "Checkbox", "Button", "Color Swatch", "Image Swatch"].includes(typeStr) && (
                <BlockStack gap="400">
                  <Box>
                    <Text as="p" paddingBlockEnd="200">Scroll type</Text>
                    <ButtonGroup variant="segmented" fullWidth>
                      <Button
                        pressed={element.config?.scrollType === "Default" || !element.config?.scrollType}
                        onClick={() => handleConfigChange("scrollType", "Default")}
                      >
                        Default
                      </Button>
                      <Button
                        pressed={element.config?.scrollType === "By fixed height"}
                        onClick={() => handleConfigChange("scrollType", "By fixed height")}
                      >
                        By fixed height
                      </Button>
                      <Button
                        pressed={element.config?.scrollType === "By number of option values"}
                        onClick={() => handleConfigChange("scrollType", "By number of option values")}
                      >
                        By number of option values
                      </Button>
                    </ButtonGroup>
                  </Box>
                  
                  {element.config?.scrollType === "By fixed height" && (
                    <Box>
                      <TextField
                        label="Scroll height"
                        type="number"
                        min={1}
                        value={element.config?.scrollHeight || ""}
                        onChange={(val) => handleConfigChange("scrollHeight", val)}
                        suffix="px"
                        autoComplete="off"
                      />
                    </Box>
                  )}

                  {element.config?.scrollType === "By number of option values" && (
                    <Box>
                      <TextField
                        label="Number of option values"
                        type="number"
                        min={1}
                        value={element.config?.scrollVisibleItems || ""}
                        onChange={(val) => handleConfigChange("scrollVisibleItems", val)}
                        autoComplete="off"
                      />
                    </Box>
                  )}
                </BlockStack>
              )}

              {/* Layout and Dimensions for Swatches & Buttons */}
              {(isSwatchType || typeStr === "Button") && (
                <BlockStack gap="400">
                  <Box>
                    <Text as="p" paddingBlockEnd="200">Direction style</Text>
                    <InlineGrid columns={2} gap="400">
                      {/* Vertical */}
                      <div
                        onClick={() => handleConfigChange("directionStyle", "vertical")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleConfigChange("directionStyle", "vertical");
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        style={{
                          border: element.config?.directionStyle === "vertical" ? "2px solid #000" : "1px solid #c9cccf",
                          borderRadius: "8px", padding: "16px", cursor: "pointer", display: "flex", flexDirection: "column",
                          alignItems: "center", gap: "8px", minHeight: "134px", justifyContent: "center"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "30px", height: "30px", background: "#f4f6f8", border: "2px solid #e11d48", borderRadius: "2px" }}></div>
                          <span style={{ fontSize: "12px" }}>Option_1</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "30px", height: "30px", background: "#f4f6f8", border: "1px solid #c9cccf", borderRadius: "2px" }}></div>
                          <span style={{ fontSize: "12px" }}>Option_2</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "30px", height: "30px", background: "#f4f6f8", border: "1px solid #c9cccf", borderRadius: "2px" }}></div>
                          <span style={{ fontSize: "12px" }}>Option_3</span>
                        </div>
                      </div>
                      {/* Horizontal */}
                      <div
                        onClick={() => handleConfigChange("directionStyle", "horizontal")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleConfigChange("directionStyle", "horizontal");
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        style={{
                          border: element.config?.directionStyle !== "vertical" ? "2px solid #000" : "1px solid #c9cccf",
                          borderRadius: "8px", padding: "16px", cursor: "pointer", display: "flex", justifyContent: "center",
                          alignItems: "center", gap: "8px", minHeight: "134px"
                        }}
                      >
                        <div style={{ width: "40px", height: "40px", background: "#f4f6f8", border: "2px solid #e11d48", borderRadius: "2px" }}></div>
                        <div style={{ width: "40px", height: "40px", background: "#f4f6f8", border: "1px solid #c9cccf", borderRadius: "2px" }}></div>
                        <div style={{ width: "40px", height: "40px", background: "#f4f6f8", border: "1px solid #c9cccf", borderRadius: "2px" }}></div>
                      </div>
                    </InlineGrid>
                  </Box>
                </BlockStack>
              )}

              {/* Item dimensions and Shape for Swatches, Buttons, and Dropdowns */}
              {(isSwatchType || typeStr === "Button" || typeStr === "Color Dropdown" || typeStr === "Image Dropdown") && (
                <BlockStack gap="400">
                  <Box>
                    <Text as="p" paddingBlockEnd="200">Item dimensions</Text>
                    <InlineGrid columns={2} gap="400">
                      <Box>
                        <TextField
                          label="Width"
                          type="number"
                          min={1}
                          value={element.config?.swatchWidth || ""}
                          onChange={(val) => handleConfigChange("swatchWidth", val)}
                          suffix="px"
                          autoComplete="off"
                        />
                      </Box>
                      <Box>
                        <TextField
                          label="Height"
                          type="number"
                          min={1}
                          value={element.config?.swatchHeight || ""}
                          onChange={(val) => handleConfigChange("swatchHeight", val)}
                          suffix="px"
                          autoComplete="off"
                        />
                      </Box>
                    </InlineGrid>
                  </Box>

                  <Box>
                    <Select
                      label="Shape"
                      options={["Square", "Round"]}
                      value={element.config?.swatchShape || "Square"}
                      onChange={(val) => handleConfigChange("swatchShape", val)}
                    />
                  </Box>
                </BlockStack>
              )}

              {/* Allowed value */}
              <Box>
                <Text as="p" variant="bodySm" tone="subdued" paddingBlockEnd="100">
                  Allowed value
                </Text>
                <ButtonGroup variant="segmented" fullWidth>
                  <Button
                    pressed={element.config?.allowedValue === "Default" || !element.config?.allowedValue}
                    onClick={() => handleConfigChange("allowedValue", "Default")}
                  >
                    Default
                  </Button>
                  <Button
                    pressed={element.config?.allowedValue === "Letters"}
                    onClick={() => handleConfigChange("allowedValue", "Letters")}
                  >
                    Letters
                  </Button>
                  <Button
                    pressed={element.config?.allowedValue === "Letters & numbers"}
                    onClick={() => handleConfigChange("allowedValue", "Letters & numbers")}
                  >
                    Letters & numbers
                  </Button>
                </ButtonGroup>
              </Box>

              {/* Text transform */}
              <Select
                label="Text transform"
                options={["Default", "Uppercase", "Lowercase", "Capitalize"]}
                value={element.config?.textTransform || "Default"}
                onChange={(val) => handleConfigChange("textTransform", val)}
              />

              {/* Help text position */}
              <Select
                label="Help text position"
                options={["Below option element", "Tooltip"]}
                value={element.config?.helpTextPosition || "Below option element"}
                onChange={(val) => handleConfigChange("helpTextPosition", val)}
              />

              {/* Suffix & Prefix */}
              <InlineStack gap="400" align="start" blockAlign="start">
                <Box width="100%">
                  <TextField
                    label="Suffix"
                    value={element.config?.suffix || ""}
                    onChange={(val) => handleConfigChange("suffix", val)}
                    autoComplete="off"
                  />
                </Box>
                <Box width="100%">
                  <Text as="p" variant="bodySm" tone="subdued" paddingBlockEnd="100">
                    Prefix
                  </Text>
                  <ButtonGroup variant="segmented" fullWidth>
                    <Button
                      pressed={element.config?.prefixType === "Icon" || !element.config?.prefixType}
                      onClick={() => handleConfigChange("prefixType", "Icon")}
                    >
                      Icon
                    </Button>
                    <Button
                      pressed={element.config?.prefixType === "Text"}
                      onClick={() => handleConfigChange("prefixType", "Text")}
                    >
                      Text
                    </Button>
                  </ButtonGroup>
                </Box>
              </InlineStack>

              {/* Prefix icon or Prefix text based on selection */}
              <Box>
                <Text as="p" variant="bodySm" tone="subdued" paddingBlockEnd="100">
                  Prefix {element.config?.prefixType === "Text" ? "text" : "icon"}
                </Text>
                {element.config?.prefixType === "Text" ? (
                  <TextField
                    value={element.config?.prefixText || ""}
                    onChange={(val) => handleConfigChange("prefixText", val)}
                    autoComplete="off"
                    labelHidden
                  />
                ) : (
                  <Box
                    padding="300"
                    borderWidth="025"
                    borderColor="border"
                    borderRadius="200"
                    background="bg-surface"
                    style={{ borderStyle: "dashed" }}
                  >
                    <InlineStack align="center">
                      <Button size="slim">Select icon</Button>
                    </InlineStack>
                  </Box>
                )}
              </Box>

              {/* HTML class & Column width */}
              <InlineStack gap="400" align="start" blockAlign="end">
                <Box width="100%">
                  <TextField
                    label={
                      <InlineStack gap="100" blockAlign="center">
                        <Text as="span">HTML class</Text>
                        <Text as="span" tone="subdued">ⓘ</Text>
                      </InlineStack>
                    }
                    placeholder="e.g. custom-selector"
                    value={element.config?.htmlClass || ""}
                    onChange={(val) => handleConfigChange("htmlClass", val)}
                    autoComplete="off"
                  />
                </Box>
                <Box width="100%">
                  <Text as="p" variant="bodySm" tone="subdued" paddingBlockEnd="100">
                    <InlineStack gap="100" blockAlign="center">
                      <Text as="span">Column width</Text>
                      <Text as="span" tone="subdued">ⓘ</Text>
                    </InlineStack>
                  </Text>
                  <ButtonGroup variant="segmented" fullWidth>
                    {["25%", "33%", "50%", "66%", "75%", "100%"].map((width) => (
                      <Button
                        key={width}
                        size="slim"
                        pressed={(element.config?.columnWidth || "100%") === width}
                        onClick={() => handleConfigChange("columnWidth", width)}
                      >
                        {width}
                      </Button>
                    ))}
                  </ButtonGroup>
                </Box>
              </InlineStack>

              {/* Banner */}
              <Banner tone="info">
                Chat with us to customize to fit your theme.{" "}
                <Button variant="plain">💬 Chat now!</Button>
              </Banner>
            </BlockStack>
          )}
        </BlockStack>
      </Box>

      {/* Footer */}
      <Box padding="300" background="bg-surface-secondary" borderBlockStartWidth="025" borderColor="border">
        <Button variant="tertiary" tone="critical" onClick={() => onDelete(element.id)}>
          🗑️ Remove this element
        </Button>
      </Box>
    </Card>
  );
}
