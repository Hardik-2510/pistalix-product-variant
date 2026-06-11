import { Box, BlockStack, InlineStack, Select, TextField, Button, Text, RadioButton } from "@shopify/polaris";

const OPERATORS = {
  text:    ["equals", "not_equals", "contains", "not_contains", "is_empty", "is_not_empty"],
  number:  ["equals", "not_equals", "greater_than", "less_than", "is_empty"],
  choice:  ["equals", "not_equals", "contains"],
  boolean: ["equals"],
  default: ["equals", "not_equals", "is_empty", "is_not_empty"],
};

function getOperatorsForType(type) {
  if (!type) return OPERATORS.default;
  const t = type.toLowerCase();
  if (t === "text" || t === "textarea" || t === "email" || t === "phone") return OPERATORS.text;
  if (t === "number") return OPERATORS.number;
  if (t === "dropdown" || t === "radio button" || t === "checkbox" || t === "button" || t === "color swatch" || t === "image swatch" || t === "select" || t === "color dropdown" || t === "image dropdown") return OPERATORS.choice;
  if (t === "switch") return OPERATORS.boolean;
  return OPERATORS.default;
}

function formatOperator(op) {
  return op.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function ConditionalLogicEditor({ element, allElements, onUpdate }) {
  const config = element.config || {};
  const conditions = config.conditions || [];
  const logicGate = conditions.length > 0 ? (conditions[0].logicGate || "and") : "and";
  
  // Filter out self
  const otherElements = allElements.filter(el => el.id !== element.id);
  
  const addCondition = () => {
    const firstOther = otherElements[0];
    const newCond = {
      sourceElementId: firstOther ? firstOther.id : "",
      operator: "equals",
      value: "",
      action: "show",
      logicGate: logicGate
    };
    onUpdate(element.id, { ...element, config: { ...config, conditions: [...conditions, newCond] } });
  };
  
  const updateCondition = (idx, key, val) => {
    const newConds = [...conditions];
    newConds[idx] = { ...newConds[idx], [key]: val };
    // if changing source, reset operator and value
    if (key === "sourceElementId") {
      newConds[idx].operator = "equals";
      newConds[idx].value = "";
    }
    onUpdate(element.id, { ...element, config: { ...config, conditions: newConds } });
  };
  
  const updateLogicGate = (val) => {
    const newConds = conditions.map(c => ({ ...c, logicGate: val }));
    onUpdate(element.id, { ...element, config: { ...config, conditions: newConds } });
  };
  
  const removeCondition = (idx) => {
    const newConds = [...conditions];
    newConds.splice(idx, 1);
    onUpdate(element.id, { ...element, config: { ...config, conditions: newConds } });
  };

  if (otherElements.length === 0) {
    return (
      <Box padding="300" borderWidth="025" borderColor="border" borderRadius="200">
        <Text tone="subdued">Add more elements first to use conditional logic.</Text>
      </Box>
    );
  }

  if (conditions.length === 0) {
    return (
      <Box padding="400" borderWidth="025" borderColor="border" borderRadius="200" background="bg-surface-secondary">
        <BlockStack gap="300" inlineAlign="center">
          <Text variant="bodyMd">Show this field when conditions are met</Text>
          <Button onClick={addCondition}>+ Add condition</Button>
        </BlockStack>
      </Box>
    );
  }

  const fieldOptions = otherElements.map(el => ({ label: el.label || `Element ${el.type}`, value: el.id }));

  return (
    <Box padding="400" borderWidth="025" borderColor="border" borderRadius="200" background="bg-surface-secondary">
      <BlockStack gap="400">
        <Text variant="bodyMd" fontWeight="bold">Show this field when:</Text>
        
        <BlockStack gap="300">
          {conditions.map((cond, idx) => {
            const sourceEl = otherElements.find(e => e.id === cond.sourceElementId);
            const ops = getOperatorsForType(sourceEl?.type);
            const opOptions = ops.map(op => ({ label: formatOperator(op), value: op }));
            
            let isChoice = false;
             let valOptions = [];
             if (sourceEl) {
                const typeLower = (sourceEl.type || "").toLowerCase();
                if (typeLower === "switch") {
                   isChoice = true;
                   valOptions = [{ label: "Yes (On)", value: "true" }, { label: "No (Off)", value: "false" }];
                } else if (["dropdown", "select", "radio button", "checkbox", "button", "color swatch", "image swatch", "color dropdown", "image dropdown"].includes(typeLower)) {
                   isChoice = true;
                   if (sourceEl.config?.choices?.length) {
                     valOptions = sourceEl.config.choices.map((c, i) => ({ label: c.label, value: c.id || c.value || c.label || String(i) }));
                   }
                }
             }
            
            const hideValue = cond.operator === "is_empty" || cond.operator === "is_not_empty";

            return (
              <InlineStack key={idx} gap="200" blockAlign="center" wrap={false}>
                <Box width="30%">
                  <Select
                    label="Field"
                    labelHidden
                    options={fieldOptions}
                    value={cond.sourceElementId}
                    onChange={(v) => updateCondition(idx, "sourceElementId", v)}
                  />
                </Box>
                <Box width="25%">
                  <Select
                    label="Operator"
                    labelHidden
                    options={opOptions}
                    value={cond.operator}
                    onChange={(v) => updateCondition(idx, "operator", v)}
                  />
                </Box>
                <Box width="35%">
                  {!hideValue && (
                    isChoice && valOptions.length > 0 ? (
                      <Select
                        label="Value"
                        labelHidden
                        options={[{label: "Select...", value: ""}, ...valOptions]}
                        value={cond.value}
                        onChange={(v) => updateCondition(idx, "value", v)}
                      />
                    ) : (
                      <TextField
                        label="Value"
                        labelHidden
                        value={cond.value}
                        onChange={(v) => updateCondition(idx, "value", v)}
                        autoComplete="off"
                      />
                    )
                  )}
                </Box>
                <Button variant="tertiary" tone="critical" onClick={() => removeCondition(idx)}>✕</Button>
              </InlineStack>
            );
          })}
        </BlockStack>
        
        <Box paddingBlockStart="200" borderBlockStartWidth="025" borderColor="border">
          <InlineStack gap="400" blockAlign="center" align="space-between">
            <InlineStack gap="400" blockAlign="center">
              <Text variant="bodyMd">Logic:</Text>
              <InlineStack gap="300">
                <RadioButton
                  label="Match ALL"
                  checked={logicGate === "and"}
                  onChange={() => updateLogicGate("and")}
                />
                <RadioButton
                  label="Match ANY"
                  checked={logicGate === "or"}
                  onChange={() => updateLogicGate("or")}
                />
              </InlineStack>
            </InlineStack>
            <Button size="slim" onClick={addCondition}>+ Add condition</Button>
          </InlineStack>
        </Box>
      </BlockStack>
    </Box>
  );
}
