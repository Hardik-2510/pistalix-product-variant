import {
  BlockStack,
  Box,
  Text,
  Button,
  InlineStack,
} from "@shopify/polaris";
import ElementRenderer from "./ElementRenderer";
import { useState, useMemo, useCallback } from "react";
import { evaluateConditions } from "../lib/evaluateConditions";

/**
 * TemplateBuilderPreview — Live preview sidebar for the template builder.
 * Renders a simulated product page with dynamic form fields matching
 * the elements added in the builder.
 */
export default function TemplateBuilderPreview({ elements = [], sections = [] }) {
  // We now use ElementRenderer directly instead of a redundant switch statement
  const [previewValues, setPreviewValues] = useState({});

  const handleValueChange = (id, val) => {
    setPreviewValues((prev) => ({ ...prev, [id]: val }));
  };

  const isElementVisible = useCallback((elementId, visited = new Set()) => {
    if (visited.has(elementId)) return false;
    visited.add(elementId);

    const el = elements.find(e => e.id === elementId);
    if (!el) return false;

    const pullConfig = el.config || {};
    const pullConditions = pullConfig.conditions || [];
    let pullResult = true;
    if (pullConfig.conditionalLogic && pullConditions.length > 0) {
      const logicGate = pullConditions[0]?.logicGate || "and";
      pullResult = evaluateConditions(pullConditions, logicGate, previewValues);
    }

    if (!pullResult) return false;

    const pushRulesTargetingMe = elements.flatMap(otherEl => {
       if (otherEl.config?.targetOtherFields) {
         return (otherEl.config?.pushRules || []).map(pr => ({ ...pr, sourceElementId: otherEl.id }));
       }
       return [];
    }).filter(pr => pr.targetElementId === el.id);

    if (pushRulesTargetingMe.length > 0) {
       return pushRulesTargetingMe.some(pr => {
           if (!isElementVisible(pr.sourceElementId, new Set(visited))) return false;

           const sourceVal = previewValues[pr.sourceElementId] || "";
           if (Array.isArray(sourceVal)) {
               return sourceVal.map(String).includes(String(pr.value));
           }
           return String(sourceVal) === String(pr.value);
       });
    }

    return true;
  }, [elements, previewValues]);

  const visibleElements = useMemo(() => {
    return elements.filter((el) => isElementVisible(el.id));
  }, [elements, isElementVisible]);

  return (
    <BlockStack gap="400">
      {/* Skeleton Product Image */}
      <Box
        minHeight="60px"
        background="bg-surface-secondary"
        borderRadius="200"
        maxWidth="180px"
      />

      {/* Skeleton Product Info */}
      <BlockStack gap="200">
        <Box minHeight="16px" background="bg-surface-secondary" borderRadius="100" maxWidth="240px" />
        <Box minHeight="12px" background="bg-surface-secondary" borderRadius="100" maxWidth="180px" />
        <Box minHeight="12px" background="bg-surface-secondary" borderRadius="100" maxWidth="200px" />
      </BlockStack>

      {/* Dynamic Elements */}
      {visibleElements.length > 0 ? (
        <Box paddingBlockStart="400">
          <BlockStack gap="400">
            {sections.length > 0 ? sections.map(section => {
              if (section.visible === false) return null;
              
              const sectionElements = visibleElements.filter(el => el.sectionId === section.id);
              if (sectionElements.length === 0) return null;
              
              const style = section.styles || {};
              const bg = style.backgroundColor || "transparent";
              const paddingStr = style.padding ? `${style.padding}px` : "0";
              const color = style.textColor || "inherit";
              
              return (
                <div key={section.id} style={{ backgroundColor: bg, padding: paddingStr, color: color, borderRadius: '8px' }}>
                  <InlineStack wrap gap="400">
                    {sectionElements.map((el) => {
                      const width = el.config?.columnWidth || "100%";
                      const calculatedWidth = width.includes("%") && width !== "100%" 
                        ? `calc(${width} - 8px)` 
                        : width;
                      return (
                        <Box key={el.id} width={calculatedWidth}>
                          <ElementRenderer 
                            element={el} 
                            value={previewValues[el.id]} 
                            onChange={(val) => handleValueChange(el.id, val)} 
                          />
                        </Box>
                      );
                    })}
                  </InlineStack>
                </div>
              );
            }) : (
              <InlineStack wrap gap="400">
                {visibleElements.map((el) => {
                  const width = el.config?.columnWidth || "100%";
                  const calculatedWidth = width.includes("%") && width !== "100%" 
                    ? `calc(${width} - 8px)` 
                    : width;
                  return (
                    <Box key={el.id} width={calculatedWidth}>
                      <ElementRenderer 
                        element={el} 
                        value={previewValues[el.id]} 
                        onChange={(val) => handleValueChange(el.id, val)} 
                      />
                    </Box>
                  );
                })}
              </InlineStack>
            )}
          </BlockStack>
        </Box>
      ) : (
        <Box paddingBlockStart="400">
          <BlockStack gap="200" inlineAlign="center">
            <Text as="p" tone="subdued" alignment="center">
              Add options to see a live preview
            </Text>
          </BlockStack>
        </Box>
      )}

      {/* Add to Cart Button */}
      <Box paddingBlockStart="400">
        <Button variant="primary" fullWidth>
          Add to cart
        </Button>
      </Box>
    </BlockStack>
  );
}
