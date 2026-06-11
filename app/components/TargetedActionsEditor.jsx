import { Box, BlockStack, InlineStack, Select, Button, Text, TextField } from "@shopify/polaris";

export default function TargetedActionsEditor({ element, allElements, onUpdate }) {
  const config = element.config || {};
  const pushRules = config.pushRules || [];
  
  const otherElements = allElements.filter(el => el.id !== element.id);
  
  const addRule = () => {
    const newRule = { value: "", targetElementId: otherElements[0]?.id || "" };
    onUpdate(element.id, { ...element, config: { ...config, pushRules: [...pushRules, newRule] } });
  };
  
  const updateRule = (idx, key, val) => {
    const newRules = [...pushRules];
    newRules[idx] = { ...newRules[idx], [key]: val };
    onUpdate(element.id, { ...element, config: { ...config, pushRules: newRules } });
  };
  
  const removeRule = (idx) => {
    const newRules = [...pushRules];
    newRules.splice(idx, 1);
    onUpdate(element.id, { ...element, config: { ...config, pushRules: newRules } });
  };

  if (otherElements.length === 0) {
    return (
      <Box padding="300" borderWidth="025" borderColor="border" borderRadius="200">
        <Text tone="subdued">Add more elements first to configure target actions.</Text>
      </Box>
    );
  }

  // Determine possible values for THIS element to act as a trigger
  let valOptions = [];
  const typeLower = (element.type || "").toLowerCase();
  let isChoice = false;
  
  if (typeLower === "switch") {
    isChoice = true;
    valOptions = [{ label: "Yes (On)", value: "true" }, { label: "No (Off)", value: "false" }];
  } else if (config.choices?.length) {
    isChoice = true;
    valOptions = config.choices.map((c, i) => ({ label: c.label, value: c.id || c.value || c.label || String(i) }));
  }

  const targetOptions = otherElements.map(el => ({ label: el.label || `Element ${el.type}`, value: el.id }));

  if (pushRules.length === 0) {
    return (
      <Box padding="400" borderWidth="025" borderColor="border" borderRadius="200" background="bg-surface-secondary">
        <BlockStack gap="300" inlineAlign="center">
          <Text variant="bodyMd">Show other fields when this option is selected</Text>
          <Button onClick={addRule}>+ Add Action</Button>
        </BlockStack>
      </Box>
    );
  }

  return (
    <Box padding="400" borderWidth="025" borderColor="border" borderRadius="200" background="bg-surface-secondary">
      <BlockStack gap="400">
        <Text variant="bodyMd" fontWeight="bold">When this field is:</Text>
        
        <BlockStack gap="300">
          {pushRules.map((rule, idx) => (
            <InlineStack key={idx} gap="200" blockAlign="center" wrap={false}>
              <Box width="40%">
                {isChoice && valOptions.length > 0 ? (
                  <Select
                    label="When value is"
                    labelHidden
                    options={[{label: "Select value...", value: ""}, ...valOptions]}
                    value={rule.value}
                    onChange={(v) => updateRule(idx, "value", v)}
                  />
                ) : (
                  <TextField
                    label="When value is"
                    labelHidden
                    value={rule.value}
                    onChange={(v) => updateRule(idx, "value", v)}
                    autoComplete="off"
                    placeholder="Value..."
                  />
                )}
              </Box>
              <Text as="span" variant="bodyMd" fontWeight="semibold">show</Text>
              <Box width="40%">
                <Select
                  label="Target"
                  labelHidden
                  options={targetOptions}
                  value={rule.targetElementId}
                  onChange={(v) => updateRule(idx, "targetElementId", v)}
                />
              </Box>
              <Button variant="tertiary" tone="critical" onClick={() => removeRule(idx)}>✕</Button>
            </InlineStack>
          ))}
        </BlockStack>
        
        <Box paddingBlockStart="200" borderBlockStartWidth="025" borderColor="border">
          <Button size="slim" onClick={addRule}>+ Add Action</Button>
        </Box>
      </BlockStack>
    </Box>
  );
}
