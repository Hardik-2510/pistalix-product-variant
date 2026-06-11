import { useState, useCallback } from "react";
import {
  Button,
  InlineStack,
  BlockStack,
  Box,
  Text,
  TextField,
  Checkbox,
  Select,
  Tooltip,
  Tabs,
} from "@shopify/polaris";
import ConditionalLogicEditor from "./ConditionalLogicEditor";
import ElementConfigForm from "./ElementConfigForm";

/**
 * ElementCard — Collapsible card for one element in the Option Set builder.
 *
 * Collapsed: drag handle | type icon | label | expand chevron | delete icon
 * Expanded: 4 Tabs (General, Add-on Price, Conditional Logic, Style)
 */
export default function ElementCard({
  element,
  allElements = [],
  onUpdate,
  onDelete,
  onDuplicate,
  dragHandleProps = {},
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);

  const toggleExpanded = useCallback(() => setExpanded((prev) => !prev), []);

  const config = element.config || {};

  const updateField = useCallback(
    (field, value) => {
      onUpdate(element.id, { ...element, [field]: value });
    },
    [element, onUpdate]
  );

  const updateConfig = useCallback(
    (key, value) => {
      onUpdate(element.id, {
        ...element,
        config: { ...config, [key]: value },
      });
    },
    [element, config, onUpdate]
  );

  const tabs = [
    { id: "general", content: "General" },
    { id: "addon", content: "Add-on Price" },
    { id: "logic", content: "Conditional Logic" },
    { id: "style", content: "Style" },
  ];

  return (
    <Box
      borderWidth="025"
      borderColor="border"
      borderRadius="200"
      background="bg-surface"
    >
      {/* ─── Collapsed Header ─── */}
      <Box padding="300">
        <div
          onClick={toggleExpanded}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpanded(); } }}
          role="button"
          tabIndex={0}
          style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <InlineStack gap="200" blockAlign="center">
            {/* Drag Handle */}
            <div
              {...dragHandleProps}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="button"
              tabIndex={0}
              style={{
                cursor: "grab",
                fontSize: "14px",
                padding: "4px 8px",
                color: "var(--p-color-text-secondary)",
                touchAction: "none",
              }}
            >
              ⋮⋮
            </div>
            {/* Type Icon */}
            <span style={{ fontSize: "16px", width: "20px", textAlign: "center" }}>
              {element.icon || "📄"}
            </span>
            {/* Label */}
            <Text as="p" fontWeight="semibold" variant="bodySm">
              {element.label}
            </Text>
            {/* Type tag */}
            <Text as="p" tone="subdued" variant="bodySm">
              ({element.type})
            </Text>
          </InlineStack>
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
            <InlineStack gap="100" blockAlign="center">
              {element.required && (
                <Text as="span" tone="critical" variant="bodySm">*</Text>
              )}
              <Tooltip content={expanded ? "Collapse" : "Expand settings"}>
                <Button variant="tertiary" size="slim" onClick={toggleExpanded}>
                  {expanded ? "▾" : "▸"}
                </Button>
              </Tooltip>
              <Tooltip content="Duplicate element">
                <Button
                  variant="tertiary"
                  size="slim"
                  onClick={() => onDuplicate && onDuplicate(element)}
                >
                  ⧉
                </Button>
              </Tooltip>
              <Tooltip content="Delete element">
                <Button
                  variant="tertiary"
                  size="slim"
                  tone="critical"
                  onClick={() => onDelete(element.id)}
                >
                  ✕
                </Button>
              </Tooltip>
            </InlineStack>
          </div>
        </div>
      </Box>

      {/* ─── Expanded Config Panel ─── */}
      {expanded && (
        <Box
          padding="300"
          borderBlockStartWidth="025"
          borderColor="border"
          background="bg-surface-secondary"
        >
          <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
            <Box paddingBlockStart="400">
              {selectedTab === 0 && (
                 <ElementConfigForm element={element} updateField={updateField} updateConfig={updateConfig} />
              )}
              {selectedTab === 1 && (
                 <AddOnPriceEditor element={element} updateConfig={updateConfig} />
              )}
              {selectedTab === 2 && (
                 <ConditionalLogicEditor element={element} allElements={allElements} onUpdate={onUpdate} />
              )}
              {selectedTab === 3 && (
                 <StyleEditor element={element} updateConfig={updateConfig} />
              )}
            </Box>
          </Tabs>
        </Box>
      )}
    </Box>
  );
}

function AddOnPriceEditor({ element, updateConfig }) {
  const config = element.config || {};
  return (
    <BlockStack gap="400">
      <Checkbox
        label="Enable add-on price"
        checked={config.addOnEnabled || false}
        onChange={(v) => updateConfig("addOnEnabled", v)}
      />
      {config.addOnEnabled && (
        <BlockStack gap="300">
          <InlineStack gap="300">
            <Box width="50%">
              <Select
                label="Add-on type"
                options={[{label: "Fixed amount", value: "fixed"}, {label: "Percentage", value: "percent"}]}
                value={config.addOnType || "fixed"}
                onChange={(v) => updateConfig("addOnType", v)}
              />
            </Box>
            <Box width="50%">
              <TextField
                label="Amount"
                type="number"
                value={config.addOnValue?.toString() || ""}
                onChange={(v) => updateConfig("addOnValue", v ? parseFloat(v) : null)}
                prefix={config.addOnType === "percent" ? "" : "$"}
                suffix={config.addOnType === "percent" ? "%" : ""}
                autoComplete="off"
              />
            </Box>
          </InlineStack>
          <Checkbox
            label="One-time charge"
            helpText="(Don't multiply by item quantity)"
            checked={config.addOnOneTime || false}
            onChange={(v) => updateConfig("addOnOneTime", v)}
          />
          <TextField
            label="Label shown to customer"
            helpText="(Leave blank to auto-generate: '+$X.XX')"
            value={config.addOnLabel || ""}
            onChange={(v) => updateConfig("addOnLabel", v)}
            placeholder="+$5.00 engraving"
            autoComplete="off"
          />
        </BlockStack>
      )}
    </BlockStack>
  );
}

function StyleEditor({ element, updateConfig }) {
  const config = element.config || {};
  return (
    <BlockStack gap="400">
      <Select
        label="Width"
        options={[
          { label: "Full width", value: "100%" },
          { label: "Half (1/2)", value: "50%" },
          { label: "Third (1/3)", value: "33%" },
        ]}
        value={config.width || "100%"}
        onChange={(v) => updateConfig("width", v)}
      />
      <TextField
        label="Custom CSS"
        value={config.customCss || ""}
        onChange={(v) => updateConfig("customCss", v)}
        placeholder=".option-label { font-weight: bold; }"
        multiline={4}
        autoComplete="off"
      />
    </BlockStack>
  );
}
