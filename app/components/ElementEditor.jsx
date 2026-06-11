import { useState } from "react";
import ConditionalLogicEditor from "./ConditionalLogicEditor";
import TargetedActionsEditor from "./TargetedActionsEditor";
import ColorPickerInput from "./ColorPickerInput";
import ImageUploadInput from "./ImageUploadInput";
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
} from "@shopify/polaris";

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

              {/* Paragraph / HTML Settings */}
              {["Paragraph", "HTML"].includes(element.type) && (
                <Box paddingBlockStart="400" paddingBlockEnd="400">
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h3">{element.type} Content</Text>
                    <TextField label="Content" value={element.config?.content || ""} onChange={(val) => handleConfigChange("content", val)} multiline={4} autoComplete="off" />
                  </BlockStack>
                </Box>
              )}

              {/* Pop-up Modal Settings */}
              {element.type === "Pop-up Modal" && (
                <Box paddingBlockStart="400" paddingBlockEnd="400">
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h3">Pop-up Modal Settings</Text>
                    <TextField label="Link Text" value={element.config?.triggerText || "View Details"} onChange={(val) => handleConfigChange("triggerText", val)} autoComplete="off" />
                    <TextField label="Modal Content (HTML)" value={element.config?.content || ""} onChange={(val) => handleConfigChange("content", val)} multiline={4} autoComplete="off" />
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
                          value={element.config?.maxFileSize || ""}
                          onChange={(val) => handleConfigChange("maxFileSize", val)}
                          autoComplete="off"
                        />
                      </Box>
                    </InlineStack>
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

              <Box paddingBlockStart="400">
                <BlockStack gap="400">
                  <Text variant="headingSm" as="h3">Advanced Features (Unlocked)</Text>
                  
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
