import { useCallback } from "react";
import {
  Card,
  Button,
  InlineStack,
  BlockStack,
  Box,
  Text,
  Tooltip,
} from "@shopify/polaris";
import AddOptionMegaMenu from "./AddOptionMegaMenu";

/**
 * SectionBlock — A draggable section container that holds template elements.
 * Each section has a collapsible header with controls and a list of elements
 * with add/delete capabilities.
 */
export default function SectionBlock({
  section,
  elements = [],
  onAddElement,
  onDeleteElement,
  onDeleteSection,
  onDuplicateElement,
  onDuplicateSection,
  onMoveSectionUp,
  onMoveSectionDown,
  onMoveElementUp,
  onMoveElementDown,
  onToggleCollapse,
  onToggleVisibility,
  isCollapsed = false,
  isVisible = true,
  sectionIndex = 0,
  onEditElement,
  onEditStyle,
  currentTier = "free",
}) {
  const handleAddOption = useCallback(
    (item) => {
      onAddElement(section.id, item);
    },
    [onAddElement, section.id]
  );

  return (
    <div style={{ opacity: isVisible ? 1 : 0.5, transition: 'opacity 0.2s' }}>
      <Card padding="0">
        {/* Section Header */}
        <Box
          padding="300"
          background="bg-surface-secondary"
          borderBlockEndWidth="025"
          borderColor="border"
        >
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="200" blockAlign="center">
              <Button
                variant="tertiary"
                size="slim"
                onClick={() => onToggleCollapse(section.id)}
              >
                {isCollapsed ? "▸" : "▾"}
              </Button>
              <Tooltip content="Move section up">
                <Button variant="tertiary" size="slim" onClick={() => onMoveSectionUp && onMoveSectionUp(section.id)}>↑</Button>
              </Tooltip>
              <Tooltip content="Move section down">
                <Button variant="tertiary" size="slim" onClick={() => onMoveSectionDown && onMoveSectionDown(section.id)}>↓</Button>
              </Tooltip>
              <Text as="p" tone="subdued" fontWeight="medium">
                Section {sectionIndex + 1}
              </Text>
            </InlineStack>
            <InlineStack gap="100">
              <Tooltip content="Style settings">
                <Button variant="tertiary" size="slim" onClick={() => onEditStyle && onEditStyle(section.id)}>🎨</Button>
              </Tooltip>
              <Tooltip content={isVisible ? "Hide section" : "Show section"}>
                <Button variant="tertiary" size="slim" onClick={() => onToggleVisibility && onToggleVisibility(section.id)}>
                  {isVisible ? "👁️" : "🙈"}
                </Button>
              </Tooltip>
              <Tooltip content="Duplicate section">
                <Button
                  variant="tertiary"
                  size="slim"
                  onClick={() => onDuplicateSection && onDuplicateSection(section.id)}
                >
                  ⧉
                </Button>
              </Tooltip>
              <Tooltip content="Delete section">
                <Button
                  variant="tertiary"
                  size="slim"
                  tone="critical"
                  onClick={() => onDeleteSection(section.id)}
                >
                  🗑️
                </Button>
              </Tooltip>
            </InlineStack>
          </InlineStack>
        </Box>

      {/* Section Body (Collapsible) */}
      {!isCollapsed && (
        <Box padding="300">
          <BlockStack gap="200">
            {/* Element List */}
            {elements.length > 0 && (
              <BlockStack gap="200">
                {elements.map((el) => (
                  <div
                    key={el.id}
                    onClick={() => onEditElement && onEditElement(el.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onEditElement && onEditElement(el.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    style={{ cursor: "pointer" }}
                  >
                    <Box
                      padding="300"
                      borderWidth="025"
                      borderColor="border"
                      borderRadius="200"
                      background="bg-surface"
                    >
                      <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="200" blockAlign="center">
                          <Tooltip content="Move up">
                            <Button variant="tertiary" size="slim" onClick={(e) => { e.stopPropagation(); onMoveElementUp && onMoveElementUp(el.id); }}>↑</Button>
                          </Tooltip>
                          <Tooltip content="Move down">
                            <Button variant="tertiary" size="slim" onClick={(e) => { e.stopPropagation(); onMoveElementDown && onMoveElementDown(el.id); }}>↓</Button>
                          </Tooltip>
                          <span style={{ fontSize: "18px", width: "24px", textAlign: "center" }}>
                            {el.icon || "📄"}
                          </span>
                          <BlockStack gap="050">
                            <Text as="p" fontWeight="semibold" variant="bodySm">
                              {el.label}
                            </Text>
                            <Text as="p" tone="subdued" variant="bodySm">
                              {el.subtext}
                            </Text>
                          </BlockStack>
                        </InlineStack>
                        <InlineStack gap="100" blockAlign="center">
                          <Text as="p" tone="subdued" variant="bodySm">
                            {el.type}
                          </Text>
                          <Tooltip content="Duplicate element">
                            <Button
                              variant="tertiary"
                              size="slim"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDuplicateElement && onDuplicateElement(el.id);
                              }}
                            >
                              ⧉
                            </Button>
                          </Tooltip>
                          <Button
                            variant="tertiary"
                            size="slim"
                            tone="critical"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteElement(el.id);
                            }}
                          >
                            🗑️
                          </Button>
                        </InlineStack>
                      </InlineStack>
                    </Box>
                  </div>
                ))}
              </BlockStack>
            )}

            {/* Add Option Button */}
            <Box paddingBlockStart="100">
              <AddOptionMegaMenu onSelect={handleAddOption} currentTier={currentTier} />
            </Box>
          </BlockStack>
        </Box>
      )}
      </Card>
    </div>
  );
}
