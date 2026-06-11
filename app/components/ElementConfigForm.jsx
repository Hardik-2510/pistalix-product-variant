import { BlockStack, Box, Checkbox, InlineStack, Select, TextField, Text, Button } from "@shopify/polaris";
import ColorPickerInput from "./ColorPickerInput";

export default function ElementConfigForm({ element, updateField, updateConfig }) {
  const config = element.config || {};
  const typeStr = (element.type || "").toLowerCase();

  // Basic types categorization
  const isInputType = ["text", "textarea", "number", "phone", "email", "Text", "Textarea", "Number", "Phone", "Email"].includes(element.type);
  const isChoiceType = ["dropdown", "radio button", "checkbox", "button", "color dropdown", "image dropdown", "select", "Dropdown", "Select", "Radio Button", "Checkbox", "Button", "Color Dropdown", "Image Dropdown"].includes(element.type);
  const isSwatchType = ["color swatch", "image swatch", "Color Swatch", "Image Swatch"].includes(element.type);

  // Reusable option updater
  const addOption = () => {
    const opts = config.options || [];
    updateConfig("options", [
      ...opts,
      { label: `Option ${opts.length + 1}`, value: `option-${opts.length + 1}`, addOnPrice: null },
    ]);
  };

  const updateOption = (idx, field, value) => {
    const opts = [...(config.options || [])];
    opts[idx] = { ...opts[idx], [field]: value };
    updateConfig("options", opts);
  };

  const removeOption = (idx) => {
    const opts = [...(config.options || [])];
    opts.splice(idx, 1);
    updateConfig("options", opts);
  };

  // Switch rendering based on type
  return (
    <BlockStack gap="400">
      {/* Universal label */}
      <TextField
        label="Label"
        value={element.label}
        onChange={(v) => updateField("label", v)}
        autoComplete="off"
      />

      {/* Input Types */}
      {isInputType && (
        <>
          <TextField
            label="Placeholder"
            value={config.placeholder || ""}
            onChange={(v) => updateConfig("placeholder", v)}
            autoComplete="off"
          />
          <Checkbox
            label="Required"
            checked={element.required || false}
            onChange={(v) => updateField("required", v)}
          />
          <InlineStack gap="200">
            <Box width="50%">
              <TextField
                label={typeStr === "number" ? "Min value" : "Min length"}
                type="number"
                value={(typeStr === "number" ? config.min : config.minLength)?.toString() || ""}
                onChange={(v) => updateConfig(typeStr === "number" ? "min" : "minLength", v ? parseInt(v) : null)}
                autoComplete="off"
              />
            </Box>
            <Box width="50%">
              <TextField
                label={typeStr === "number" ? "Max value" : "Max length"}
                type="number"
                value={(typeStr === "number" ? config.max : config.maxLength)?.toString() || ""}
                onChange={(v) => updateConfig(typeStr === "number" ? "max" : "maxLength", v ? parseInt(v) : null)}
                autoComplete="off"
              />
            </Box>
          </InlineStack>
          <TextField
            label="Default value"
            value={config.defaultValue || ""}
            onChange={(v) => updateConfig("defaultValue", v)}
            autoComplete="off"
          />
          <Checkbox
            label="Show character counter"
            checked={config.showCharacterCounter || false}
            onChange={(v) => updateConfig("showCharacterCounter", v)}
          />
        </>
      )}

      {/* Choice Types (Options list) */}
      {isChoiceType && (
        <>
          <Checkbox
            label="Required"
            checked={element.required || false}
            onChange={(v) => updateField("required", v)}
          />
          <Text variant="headingXs" as="h6" fontWeight="bold">Options</Text>
          <BlockStack gap="200">
            {(config.options || []).map((opt, idx) => (
              <InlineStack key={idx} gap="200" blockAlign="end">
                <Box width="40%">
                  <TextField
                    label={idx === 0 ? "Label" : ""}
                    value={opt.label}
                    onChange={(v) => updateOption(idx, "label", v)}
                    autoComplete="off"
                    labelHidden={idx > 0}
                  />
                </Box>
                <Box width="30%">
                  <TextField
                    label={idx === 0 ? "Value" : ""}
                    value={opt.value}
                    onChange={(v) => updateOption(idx, "value", v)}
                    autoComplete="off"
                    labelHidden={idx > 0}
                  />
                </Box>
                <Box width="20%">
                  <TextField
                    label={idx === 0 ? "Add-on Price Override" : ""}
                    value={opt.addOnValue?.toString() || ""}
                    onChange={(v) => updateOption(idx, "addOnValue", v ? parseFloat(v) : null)}
                    autoComplete="off"
                    prefix="+$"
                    labelHidden={idx > 0}
                  />
                </Box>
                <Button variant="tertiary" size="slim" tone="critical" onClick={() => removeOption(idx)}>✕</Button>
              </InlineStack>
            ))}
            <Button size="slim" onClick={addOption}>+ Add option</Button>
          </BlockStack>
        </>
      )}

      {/* Swatch Types */}
      {isSwatchType && (
        <>
          <Text variant="headingXs" as="h6" fontWeight="bold">Swatches</Text>
          <BlockStack gap="200">
            {(config.swatches || []).map((sw, idx) => (
              <InlineStack key={idx} gap="200" blockAlign="end">
                <Box width="35%">
                  <TextField
                    label={idx === 0 ? "Label" : ""}
                    value={sw.label}
                    onChange={(v) => {
                      const swatches = [...(config.swatches || [])];
                      const newSwatch = { ...swatches[idx], label: v };
                      
                      // Dynamically set color based on label name
                      const colorMap = {
                        red: "#ff0000", blue: "#0000ff", green: "#008000", yellow: "#ffff00", 
                        black: "#000000", white: "#ffffff", orange: "#ffa500", purple: "#800080",
                        pink: "#ffc0cb", gray: "#808080", grey: "#808080", brown: "#a52a2a",
                        cyan: "#00ffff", magenta: "#ff00ff", navy: "#000080", teal: "#008080",
                        olive: "#808000", maroon: "#800000", lime: "#00ff00", silver: "#c0c0c0",
                        gold: "#ffd700"
                      };
                      if ((typeStr === "color swatch" || element.type === "Color Swatch") && colorMap[v.toLowerCase()]) {
                        newSwatch.color = colorMap[v.toLowerCase()];
                      }

                      swatches[idx] = newSwatch;
                      updateConfig("swatches", swatches);
                    }}
                    autoComplete="off"
                    labelHidden={idx > 0}
                  />
                </Box>
                {(typeStr === "color swatch" || element.type === "Color Swatch") && (
                  <Box width="25%">
                    <div style={{ marginTop: idx === 0 ? "24px" : "0" }}>
                      <ColorPickerInput 
                        value={sw.color || "#000000"}
                        onChange={(val) => {
                          const swatches = [...(config.swatches || [])];
                          swatches[idx] = { ...swatches[idx], color: val };
                          updateConfig("swatches", swatches);
                        }}
                      />
                    </div>
                  </Box>
                )}
                <Box width="20%">
                  <TextField
                    label={idx === 0 ? "Add-on Override" : ""}
                    value={sw.addOnValue?.toString() || ""}
                    onChange={(v) => {
                      const swatches = [...(config.swatches || [])];
                      swatches[idx] = { ...swatches[idx], addOnValue: v ? parseFloat(v) : null };
                      updateConfig("swatches", swatches);
                    }}
                    autoComplete="off"
                    prefix="+$"
                    labelHidden={idx > 0}
                  />
                </Box>
                <Button variant="tertiary" size="slim" tone="critical" onClick={() => {
                  const swatches = [...(config.swatches || [])];
                  swatches.splice(idx, 1);
                  updateConfig("swatches", swatches);
                }}>✕</Button>
              </InlineStack>
            ))}
            <Button size="slim" onClick={() => {
              const swatches = config.swatches || [];
              updateConfig("swatches", [...swatches, { label: `Swatch ${swatches.length + 1}`, color: "#000000", addOnValue: null }]);
            }}>+ Add swatch</Button>
          </BlockStack>
        </>
      )}

      {/* ─── Type-specific new fields (Task 3.3) ─── */}
      {(typeStr === "hidden field" || element.type === "Hidden Field") && (
        <BlockStack gap="300">
          <TextField label="Hidden Value" value={config.value || ""} onChange={(v) => updateConfig("value", v)} autoComplete="off" />
        </BlockStack>
      )}
      {typeStr === "datetime" && (
        <BlockStack gap="300">
          <Checkbox label="Show time toggle" checked={config.showTime || false} onChange={(v) => updateConfig("showTime", v)} />
          <InlineStack gap="200">
            <Box width="50%"><TextField label="Min date" type="date" value={config.minDate || ""} onChange={(v) => updateConfig("minDate", v)} /></Box>
            <Box width="50%"><TextField label="Max date" type="date" value={config.maxDate || ""} onChange={(v) => updateConfig("maxDate", v)} /></Box>
          </InlineStack>
          <Checkbox label="Disable past dates" checked={config.disablePast || false} onChange={(v) => updateConfig("disablePast", v)} />
          <Checkbox label="Disable future dates" checked={config.disableFuture || false} onChange={(v) => updateConfig("disableFuture", v)} />
          <Checkbox label="Range mode toggle" checked={config.rangeMode || false} onChange={(v) => updateConfig("rangeMode", v)} />
          <Select label="Calendar language" options={["en", "fr", "es", "de"]} value={config.language || "en"} onChange={(v) => updateConfig("language", v)} />
        </BlockStack>
      )}

      {(typeStr === "file_upload" || element.type === "File Upload") && (
        <BlockStack gap="300">
          <Checkbox label="Required" checked={element.required || false} onChange={(v) => updateField("required", v)} />
          <InlineStack gap="200">
            <Box width="50%"><TextField label="Max files (1-20)" type="number" value={config.maxFiles?.toString() || "1"} onChange={(v) => updateConfig("maxFiles", parseInt(v) || 1)} /></Box>
            <Box width="50%"><TextField label="Max size (MB)" type="number" value={config.maxSizeMB?.toString() || "10"} onChange={(v) => updateConfig("maxSizeMB", parseInt(v) || 10)} /></Box>
          </InlineStack>
          <TextField label="Accepted file types (comma separated)" value={(config.acceptedTypes || []).join(", ")} onChange={(v) => updateConfig("acceptedTypes", v.split(",").map(s => s.trim()))} placeholder="image/*, .pdf, .ai" />
          <Checkbox label="Show preview toggle" checked={config.showPreview || false} onChange={(v) => updateConfig("showPreview", v)} />
        </BlockStack>
      )}

      {(typeStr === "color_picker" || element.type === "Color Picker") && (
        <BlockStack gap="300">
          <Checkbox label="Allow alpha toggle" checked={config.allowAlpha || false} onChange={(v) => updateConfig("allowAlpha", v)} />
          <TextField label="Preset hex swatches (comma separated)" value={(config.presetSwatches || []).join(", ")} onChange={(v) => updateConfig("presetSwatches", v.split(",").map(s => s.trim()))} placeholder="#ff0000, #00ff00" />
        </BlockStack>
      )}

      {(typeStr === "heading" || element.type === "Heading") && (
        <BlockStack gap="300">
          <TextField label="Content" value={config.content || ""} onChange={(v) => updateConfig("content", v)} />
          <Select label="Align" options={["left", "center", "right"]} value={config.align || "left"} onChange={(v) => updateConfig("align", v)} />
          <InlineStack gap="200">
            <Box width="50%"><TextField label="Font size (px)" type="number" value={config.fontSize || "24"} onChange={(v) => updateConfig("fontSize", v)} /></Box>
            <Box width="50%"><Select label="Font weight" options={["normal", "bold", "lighter", "bolder"]} value={config.fontWeight || "bold"} onChange={(v) => updateConfig("fontWeight", v)} /></Box>
          </InlineStack>
        </BlockStack>
      )}

      {(typeStr === "divider" || element.type === "Divider") && (
        <BlockStack gap="300">
          <Select label="Style" options={["solid", "dashed", "dotted"]} value={config.styleType || "solid"} onChange={(v) => updateConfig("styleType", v)} />
          <InlineStack gap="200">
            <Box width="50%"><TextField label="Color" value={config.color || "#e1e3e5"} onChange={(v) => updateConfig("color", v)} /></Box>
            <Box width="50%"><TextField label="Thickness (px)" type="number" value={config.thickness || "1"} onChange={(v) => updateConfig("thickness", v)} /></Box>
          </InlineStack>
        </BlockStack>
      )}

      {(typeStr === "spacing" || element.type === "Spacing") && (
        <TextField label="Height (px)" type="number" value={config.height || "20"} onChange={(v) => updateConfig("height", v)} />
      )}

      {(typeStr === "paragraph" || element.type === "Paragraph") && (
        <BlockStack gap="300">
          <TextField label="Content" value={config.content || ""} onChange={(v) => updateConfig("content", v)} multiline={3} />
          <Select label="Align" options={["left", "center", "right", "justify"]} value={config.align || "left"} onChange={(v) => updateConfig("align", v)} />
        </BlockStack>
      )}

      {(typeStr === "html" || element.type === "HTML") && (
        <TextField label="Raw HTML" value={config.content || ""} onChange={(v) => updateConfig("content", v)} multiline={5} />
      )}

      {(typeStr === "popup_modal" || element.type === "Pop-up Modal") && (
        <BlockStack gap="300">
          <TextField label="Trigger text" value={config.triggerText || "Open Modal"} onChange={(v) => updateConfig("triggerText", v)} />
          <TextField label="Modal title" value={config.title || ""} onChange={(v) => updateConfig("title", v)} />
          <TextField label="Modal content" value={config.content || ""} onChange={(v) => updateConfig("content", v)} multiline={4} />
          <Select label="Modal width" options={["small", "medium", "large"]} value={config.modalWidth || "medium"} onChange={(v) => updateConfig("modalWidth", v)} />
        </BlockStack>
      )}

      {(typeStr === "size_chart" || element.type === "Size Chart") && (
        <BlockStack gap="300">
          <TextField label="Trigger text" value={config.triggerText || "Size Chart"} onChange={(v) => updateConfig("triggerText", v)} />
          <TextField label="Chart HTML content" value={config.content || "<table>...</table>"} onChange={(v) => updateConfig("content", v)} multiline={6} />
        </BlockStack>
      )}

      {(typeStr === "switch" || element.type === "Switch") && (
        <BlockStack gap="300">
          <InlineStack gap="200">
            <Box width="50%"><TextField label="Label when ON" value={config.labelOn || "ON"} onChange={(v) => updateConfig("labelOn", v)} /></Box>
            <Box width="50%"><TextField label="Label when OFF" value={config.labelOff || "OFF"} onChange={(v) => updateConfig("labelOff", v)} /></Box>
          </InlineStack>
          <TextField label="Add-on value when ON" type="number" prefix="+$" value={config.addOnValueOn || ""} onChange={(v) => updateConfig("addOnValueOn", v)} />
        </BlockStack>
      )}

      {(typeStr === "range_slider" || element.type === "Range Slider") && (
        <BlockStack gap="300">
          <InlineStack gap="200">
            <Box width="33%"><TextField label="Min" type="number" value={config.min || "0"} onChange={(v) => updateConfig("min", v)} /></Box>
            <Box width="33%"><TextField label="Max" type="number" value={config.max || "100"} onChange={(v) => updateConfig("max", v)} /></Box>
            <Box width="33%"><TextField label="Step" type="number" value={config.step || "1"} onChange={(v) => updateConfig("step", v)} /></Box>
          </InlineStack>
          <TextField label="Unit label (e.g. cm, px)" value={config.unit || ""} onChange={(v) => updateConfig("unit", v)} />
        </BlockStack>
      )}

      {(typeStr === "dimension" || element.type === "Dimension") && (
        <BlockStack gap="300">
          <Select label="Unit" options={["cm", "inch", "px", "mm"]} value={config.unit || "cm"} onChange={(v) => updateConfig("unit", v)} />
          <Checkbox label="Enable Height" checked={config.enableHeight !== false} onChange={(v) => updateConfig("enableHeight", v)} />
        </BlockStack>
      )}

      {(typeStr === "google_font_selector" || typeStr === "font_picker" || element.type === "Font Picker") && (
        <BlockStack gap="300">
          <TextField label="Allowed fonts list (comma separated, blank for all)" value={(config.fonts || []).join(", ")} onChange={(v) => updateConfig("fonts", v.split(",").map(s => s.trim()))} />
          <TextField label="Preview text" value={config.previewText || "The quick brown fox jumps over the lazy dog"} onChange={(v) => updateConfig("previewText", v)} />
        </BlockStack>
      )}

      {(typeStr === "tabs" || element.type === "Tabs") && (
        <BlockStack gap="300">
          <Text variant="headingXs" as="h6" fontWeight="bold">Tab list</Text>
          {(config.tabs || []).map((tab, idx) => (
             <InlineStack key={idx} gap="200" blockAlign="end">
               <Box width="40%">
                  <TextField label={idx === 0 ? "Tab Name" : ""} value={tab.label} onChange={(v) => {
                     const newTabs = [...(config.tabs || [])];
                     newTabs[idx] = { ...tab, label: v };
                     updateConfig("tabs", newTabs);
                  }} labelHidden={idx > 0} />
               </Box>
               <Box width="40%">
                  <TextField label={idx === 0 ? "Element IDs (comma separated)" : ""} value={(tab.elementIds || []).join(", ")} onChange={(v) => {
                     const newTabs = [...(config.tabs || [])];
                     newTabs[idx] = { ...tab, elementIds: v.split(",").map(s => s.trim()) };
                     updateConfig("tabs", newTabs);
                  }} labelHidden={idx > 0} />
               </Box>
               <Button tone="critical" onClick={() => {
                  const newTabs = [...(config.tabs || [])];
                  newTabs.splice(idx, 1);
                  updateConfig("tabs", newTabs);
               }}>✕</Button>
             </InlineStack>
          ))}
          <Button size="slim" onClick={() => {
             updateConfig("tabs", [...(config.tabs || []), { label: `Tab ${(config.tabs || []).length + 1}`, elementIds: [] }]);
          }}>+ Add tab</Button>
        </BlockStack>
      )}

      {(typeStr === "product_links" || element.type === "Product Links") && (
        <BlockStack gap="300">
          <TextField label="Product IDs (comma separated)" value={(config.products || []).join(", ")} onChange={(v) => updateConfig("products", v.split(",").map(s => s.trim()))} helpText="Shopify product IDs" />
          <Select label="Layout" options={["list", "grid"]} value={config.layout || "list"} onChange={(v) => updateConfig("layout", v)} />
        </BlockStack>
      )}
    </BlockStack>
  );
}
