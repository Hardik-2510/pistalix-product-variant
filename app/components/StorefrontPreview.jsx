import { useState, useMemo, useCallback } from "react";
import {
  Card,
  Button,
  InlineStack,
  BlockStack,
  Box,
  Text,
  Divider,
  ButtonGroup,
  InlineGrid,
} from "@shopify/polaris";
import ElementRenderer from "./ElementRenderer";
import { evaluateConditions } from "../lib/evaluateConditions";

const VIEWPORT_WIDTHS = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

/**
 * StorefrontPreview — Right-panel mock product page shell.
 */
export default function StorefrontPreview({ elements = [], settings = {} }) {
  const [viewport, setViewport] = useState("desktop");
  const [previewValues, setPreviewValues] = useState({});

  const handleValueChange = (elementId, value) => {
    setPreviewValues((prev) => ({ ...prev, [elementId]: value }));
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

  // Calculate add-on total
  const addOnTotal = useMemo(() => {
    let total = 0;
    visibleElements.forEach(el => {
       const val = previewValues[el.id];
       if (!val) return;
       const config = el.config || {};
       
       // Handle global add on value (like switch)
       if (config.addOnValueOn && val === "true") {
           total += Number(config.addOnValueOn);
       }
       
       // Handle choice options add on value
       const checkChoice = (v) => {
         const opt = (config.options || []).find(o => o.value === v) || 
                     (config.swatches || []).find(s => s.value === v || s.label === v);
         if (opt && opt.addOnValue) total += Number(opt.addOnValue);
       };

       if (Array.isArray(val)) {
         val.forEach(checkChoice);
       } else {
         checkChoice(val);
       }
    });
    return total;
  }, [visibleElements, previewValues]);

  return (
    <Card padding="0">
      {/* ─── Viewport Toggle Bar ─── */}
      <Box
        padding="300"
        borderBlockEndWidth="025"
        borderColor="border"
        background="bg-surface-secondary"
      >
        <InlineStack align="space-between" blockAlign="center">
          <Text variant="headingSm" as="h3">
            Preview
          </Text>
          <ButtonGroup variant="segmented">
            <Button
              size="slim"
              variant={viewport === "desktop" ? "primary" : "secondary"}
              onClick={() => setViewport("desktop")}
            >
              🖥️
            </Button>
            <Button
              size="slim"
              variant={viewport === "tablet" ? "primary" : "secondary"}
              onClick={() => setViewport("tablet")}
            >
              📱
            </Button>
            <Button
              size="slim"
              variant={viewport === "mobile" ? "primary" : "secondary"}
              onClick={() => setViewport("mobile")}
            >
              📲
            </Button>
          </ButtonGroup>
        </InlineStack>
      </Box>

      {/* ─── Preview Content ─── */}
      <Box padding="400">
        <Box
          style={{
            maxWidth: VIEWPORT_WIDTHS[viewport],
            margin: "0 auto",
            transition: "max-width 0.3s ease",
          }}
        >
          {/* Product Image + Info */}
          <InlineGrid
            columns={viewport === "mobile" ? 1 : 2}
            gap="400"
          >
            {/* Product Image Placeholder */}
            <Box
              minHeight={viewport === "mobile" ? "200px" : "300px"}
              background="bg-surface-secondary"
              borderRadius="200"
            />

            {/* Product Info + Options */}
            <BlockStack gap="300">
              {/* Product Title Skeleton */}
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">Product Title</Text>
                <Text variant="headingSm" as="h3">$29.99 {addOnTotal > 0 && `(+$${addOnTotal.toFixed(2)})`}</Text>
              </BlockStack>

              {/* Rendered Option Elements */}
              {elements.length > 0 ? (
                <>
                  <Divider />
                  <Box paddingBlockStart="400">
                    <InlineStack wrap gap="400">
                      {visibleElements.map((el) => {
                        const width = el.config?.width || "100%";
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
                  </Box>
                </>
              ) : (
                <Box paddingBlockStart="400">
                  <Text as="p" tone="subdued" alignment="center">
                    Add elements to see a live preview
                  </Text>
                </Box>
              )}

              {/* Add-on Message */}
              {addOnTotal > 0 && settings?.toggleStates?.showAddonMessage !== false && (
                <Box paddingBlockStart="200" paddingBlockEnd="200" borderBlockStartWidth="025" borderColor="border">
                  <Text as="p" variant="bodyMd" tone="subdued">
                    <span style={{ color: settings?.colors?.totalText || '#202223' }}>Selections will add </span>
                    <span style={{ color: settings?.colors?.totalTextMoney || '#008000', fontWeight: 'bold' }}>${addOnTotal.toFixed(2)} USD</span>
                    <span style={{ color: settings?.colors?.totalText || '#202223' }}> to the price</span>
                  </Text>
                </Box>
              )}

              {/* Add to Cart */}
              <Box paddingBlockStart="300">
                <Button variant="primary" fullWidth>
                  ADD TO CART {addOnTotal > 0 && `• $${(29.99 + addOnTotal).toFixed(2)}`}
                </Button>
              </Box>
            </BlockStack>
          </InlineGrid>
        </Box>
      </Box>
    </Card>
  );
}
