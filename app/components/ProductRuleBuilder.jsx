import { useState, useCallback } from "react";
import {
  Card,
  Button,
  InlineStack,
  BlockStack,
  Box,
  Text,
  EmptyState,
  Thumbnail,
  Icon,
} from "@shopify/polaris";
import { CollectionIcon } from "@shopify/polaris-icons";

export default function ProductRuleBuilder({ rules = [], onUpdate }) {
  const initialMode = rules.length > 0 ? rules[0].ruleType : null;
  const [ruleType, setRuleType] = useState(initialMode);

  // --- Manual Selection State ---
  // (no extra state needed; manualRules derived from props)

  // --- Collection State ---
  // Initialize from existing collection rules if any
  const initialCollections = rules
    .filter((r) => r.ruleType === "collection" && r.value)
    .map((r) => ({ id: r.value, title: r.title || r.value }));
  const [selectedCollections, setSelectedCollections] = useState(initialCollections);

  // ─── Emit Rules ─────────────────────────────────────────────────────────────
  const emitRules = useCallback(
    (type, data = null) => {
      if (!type) {
        onUpdate([]);
        return;
      }
      let newRules = [];
      switch (type) {
        case "all":
          newRules = [{ ruleType: "all", value: "[]" }];
          break;

        case "collection":
          newRules = (data || selectedCollections).map((c) => ({
            ruleType: "collection",
            value: c.id,
            title: c.title,
          }));
          break;

        case "manual":
          newRules = (data || rules.filter((r) => r.ruleType === "manual")).map((p) => ({
            ruleType: "manual",
            value: p.id || p.value,
            title: p.title,
            image: p.image || p.images?.[0]?.originalSrc || "",
          }));
          break;
      }
      onUpdate(newRules);
    },
    [onUpdate, selectedCollections, rules]
  );

  // ─── Toggle Mode ─────────────────────────────────────────────────────────────
  const toggleMode = (mode) => {
    if (ruleType === mode) {
      setRuleType(null);
      emitRules(null);
    } else {
      setRuleType(mode);
      emitRules(mode);
    }
  };

  // ─── ToggleBlock Component ────────────────────────────────────────────────────
  const ToggleBlock = ({ title, description, active, onClick, children }) => (
    <Box
      padding="400"
      background={active ? "bg-surface" : "bg-surface-secondary"}
      borderWidth="025"
      borderColor={active ? "border" : "transparent"}
      borderRadius="200"
    >
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="100">
            <Text variant="headingSm" as="h6">{title}</Text>
            <Text tone="subdued" as="p" variant="bodySm">{description}</Text>
          </BlockStack>
          <div
            onClick={onClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e);
              }
            }}
            role="button"
            tabIndex={0}
            style={{
              width: "36px", height: "20px", borderRadius: "10px",
              background: active ? "var(--p-color-bg-fill-inverse)" : "var(--p-color-bg-surface-tertiary)",
              position: "relative", cursor: "pointer",
              transition: "background 0.2s",
              flexShrink: 0,
            }}
          >
            <div style={{
              width: "16px", height: "16px", borderRadius: "50%",
              background: "white",
              position: "absolute", top: "2px",
              left: active ? "18px" : "2px",
              transition: "left 0.2s"
            }} />
          </div>
        </InlineStack>
        {active && children && (
          <Box paddingBlockStart="400">
            {children}
          </Box>
        )}
      </BlockStack>
    </Box>
  );

  // ─── Manual Selection Handlers ────────────────────────────────────────────────
  const handleSelectProducts = async () => {
    const currentSelectionIds = rules
      .filter((r) => r.ruleType === "manual" && r.value)
      .map((r) => ({ id: r.value }));

    const selected = await window.shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
      selectionIds: currentSelectionIds,
    });
    if (selected) {
      emitRules("manual", selected);
    }
  };

  const handleRemoveManualItem = (id) => {
    const remaining = rules.filter((r) => r.ruleType === "manual" && r.value !== id);
    if (remaining.length === 0) {
      // All products removed — deactivate manual mode
      setRuleType(null);
      onUpdate([]);
    } else {
      onUpdate(remaining);
    }
  };

  // ─── Collection Handlers ──────────────────────────────────────────────────────
  const handleSelectCollection = async () => {
    const currentSelectionIds = selectedCollections.map((c) => ({ id: c.id }));

    const selected = await window.shopify.resourcePicker({
      type: "collection",
      multiple: true,
      action: "select",
      selectionIds: currentSelectionIds,
    });

    if (selected && selected.length > 0) {
      const mapped = selected.map((c) => ({
        id: c.id,
        title: c.title,
        image: c.image?.originalSrc || "",
      }));
      setSelectedCollections(mapped);
      emitRules("collection", mapped);
    }
  };

  const handleRemoveCollection = (id) => {
    const remaining = selectedCollections.filter((c) => c.id !== id);
    setSelectedCollections(remaining);
    if (remaining.length === 0) {
      onUpdate([]);
    } else {
      emitRules("collection", remaining);
    }
  };

  // ─── Derived State ────────────────────────────────────────────────────────────
  const manualRules = rules.filter((r) => r.ruleType === "manual");

  return (
    <BlockStack gap="400">

      {/* ── Manual Selection ─────────────────────────────────────────────── */}
      <ToggleBlock
        title="Manual Selection"
        description="Choose specific products to apply this option set."
        active={ruleType === "manual"}
        onClick={() => toggleMode("manual")}
      >
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <Text variant="headingSm" as="h6">Selected products</Text>
            {manualRules.length > 0 && (
              <Button variant="plain" onClick={handleSelectProducts}>
                Edit selection
              </Button>
            )}
          </InlineStack>

          {manualRules.length === 0 ? (
            <EmptyState
              heading="No products selected"
              action={{
                content: "Select products",
                onAction: handleSelectProducts,
              }}
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <Text as="p" variant="bodySm">
                Choose one or more products to apply this option set
              </Text>
            </EmptyState>
          ) : (
            <Card padding="0">
              <BlockStack gap="0">
                {manualRules.map((item, index) => (
                  <Box
                    key={item.value}
                    padding="300"
                    borderBlockEnd={index < manualRules.length - 1 ? "025" : "0"}
                    borderColor="border"
                  >
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="300" blockAlign="center">
                        <Thumbnail
                          source={item.image || "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"}
                          alt={item.title || "Product"}
                          size="small"
                        />
                        <Text variant="bodyMd" fontWeight="bold" as="h3">
                          {item.title || item.value}
                        </Text>
                      </InlineStack>
                      <Button
                        variant="tertiary"
                        tone="critical"
                        onClick={() => handleRemoveManualItem(item.value)}
                      >
                        Remove
                      </Button>
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            </Card>
          )}
        </BlockStack>
      </ToggleBlock>

      {/* ── Apply to Collection ──────────────────────────────────────────── */}
      <ToggleBlock
        title="Apply to Collection"
        description="Automatically apply this option set to all products in a specific collection."
        active={ruleType === "collection"}
        onClick={() => {
          if (ruleType === "collection") {
            setRuleType(null);
            setSelectedCollections([]);
            emitRules(null);
          } else {
            setRuleType("collection");
            // If we already have collections from DB, emit them immediately
            if (selectedCollections.length > 0) {
              emitRules("collection", selectedCollections);
            } else {
              // Open picker straight away
              handleSelectCollection();
            }
          }
        }}
      >
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <Text variant="headingSm" as="h6">Selected collections</Text>
            {selectedCollections.length > 0 && (
              <Button variant="plain" onClick={handleSelectCollection}>
                Edit selection
              </Button>
            )}
          </InlineStack>

          {selectedCollections.length === 0 ? (
            <EmptyState
              heading="No collection selected"
              action={{
                content: "Select collection",
                onAction: handleSelectCollection,
              }}
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <Text as="p" variant="bodySm">
                All products in the selected collection will receive this option set
              </Text>
            </EmptyState>
          ) : (
            <Card padding="0">
              <BlockStack gap="0">
                {selectedCollections.map((col, index) => (
                  <Box
                    key={col.id}
                    padding="300"
                    borderBlockEnd={index < selectedCollections.length - 1 ? "025" : "0"}
                    borderColor="border"
                  >
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="300" blockAlign="center">
                        <div style={{
                          width: "40px", height: "40px",
                          background: "var(--p-color-bg-surface-secondary)",
                          borderRadius: "6px",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          {col.image ? (
                            <img
                              src={col.image}
                              alt={col.title}
                              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px" }}
                            />
                          ) : (
                            <Icon source={CollectionIcon} tone="subdued" />
                          )}
                        </div>
                        <BlockStack gap="0">
                          <Text variant="bodyMd" fontWeight="bold" as="p">
                            {col.title}
                          </Text>
                          <Text variant="bodySm" tone="subdued" as="p">
                            {col.id.replace("gid://shopify/Collection/", "Collection #")}
                          </Text>
                        </BlockStack>
                      </InlineStack>
                      <Button
                        variant="tertiary"
                        tone="critical"
                        onClick={() => handleRemoveCollection(col.id)}
                      >
                        Remove
                      </Button>
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            </Card>
          )}
        </BlockStack>
      </ToggleBlock>

      {/* ── Apply to All Products ────────────────────────────────────────── */}
      <ToggleBlock
        title="Apply to All Products"
        description="Automatically apply this option set to every product in the store."
        active={ruleType === "all"}
        onClick={() => toggleMode("all")}
      />

    </BlockStack>
  );
}
