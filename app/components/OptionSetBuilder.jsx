import { useState, useCallback, useEffect } from "react";
import {
  Page,
  Card,
  Button,
  InlineStack,
  InlineGrid,
  BlockStack,
  Box,
  Text,
  TextField,
  Badge,
  Tabs,
  Divider,
  Banner,
  Toast,
  Popover,
  ActionList,
} from "@shopify/polaris";
import { useNavigate, useFetcher } from "react-router";
import SectionBlock from "./SectionBlock";
import TemplateBuilderPreview from "./TemplateBuilderPreview";
import ElementEditor from "./ElementEditor";
import ProductRuleBuilder from "./ProductRuleBuilder";

// eslint-disable-next-line react/prop-types
export default function OptionSetBuilder({ initialData = null }) {
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const isSaving = fetcher.state !== "idle";

  // Template metadata
  const [name, setName] = useState(initialData?.name || "New Option Set");
  const [status] = useState(initialData?.status || "active");

  // Builder tabs
  const [builderTab, setBuilderTab] = useState(0);

  // Sections & elements state
  const [sections, setSections] = useState(() => {
    if (initialData?.sections?.length > 0) {
      return initialData.sections.map(s => ({
        id: s.id,
        collapsed: false,
        visible: s.visible,
        styles: s.styles ? JSON.parse(s.styles) : {}
      }));
    }
    return [{ id: "section-1", collapsed: false }];
  });
  
  const [elements, setElements] = useState(() => {
    if (initialData?.elements) {
      return initialData.elements.map((el) => {
        let config = typeof el.config === "string" ? JSON.parse(el.config) : el.config || {};
        return {
          ...el,
          config,
          sectionId: el.sectionId || config.sectionId || "section-1",
          subtext: config.subtext || el.placeholder || null,
          icon: config.icon || el.icon || "📄",
        };
      });
    }
    return [];
  });
  
  const [productRules, setProductRules] = useState(() => {
    if (initialData?.productRules) {
      return initialData.productRules.map(r => ({
        ruleType: r.targetType || r.ruleType, // fallback for legacy
        value: (r.targetValues !== "[]" && r.targetValues !== undefined) ? r.targetValues : (r.value || null),
      }));
    }
    return [];
  });
  const [activeElementId, setActiveElementId] = useState(null);

  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastError, setToastError] = useState(false);

  useEffect(() => {
    if (initialData) {
      if (initialData.name) {
        setName(initialData.name);
      }
      if (initialData.sections?.length > 0) {
        setSections(initialData.sections.map(s => ({
          id: s.id,
          collapsed: false,
          visible: s.visible,
          styles: s.styles ? JSON.parse(s.styles) : {}
        })));
      }
      if (initialData.elements) {
        setElements(initialData.elements.map((el) => {
          let config = typeof el.config === "string" ? JSON.parse(el.config) : el.config || {};
          return {
            ...el,
            config,
            sectionId: el.sectionId || config.sectionId || "section-1",
            subtext: config.subtext || el.placeholder || null,
            icon: config.icon || el.icon || "📄",
          };
        }));
      }
      if (initialData.productRules) {
        setProductRules(initialData.productRules.map(r => ({
          ruleType: r.targetType || r.ruleType,
          value: (r.targetValues !== "[]" && r.targetValues !== undefined) ? r.targetValues : (r.value || null),
        })));
      }
    }
  }, [initialData]);

  // Header menu states
  const [langPopoverActive, setLangPopoverActive] = useState(false);
  const [menuPopoverActive, setMenuPopoverActive] = useState(false);

  // ─── Section Management ─────────────────────────────────────────────
  const handleAddSection = useCallback(() => {
    const newSection = {
      id: `section-${Date.now()}`,
      collapsed: false,
    };
    setSections((prev) => [...prev, newSection]);
  }, []);

  const handleDeleteSection = useCallback((sectionId) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    setElements((prev) => prev.filter((el) => el.sectionId !== sectionId));
  }, []);

  const handleToggleCollapse = useCallback((sectionId) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s
      )
    );
  }, []);

  // ─── Element Management ─────────────────────────────────────────────
  const handleAddElement = useCallback((sectionId, item) => {
    const newElementId = `el-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newElement = {
      id: newElementId,
      sectionId,
      type: item.type,
      label: item.label,
      subtext: item.subtext,
      icon: item.icon,
      position: 0,
      config: {},
    };
    setElements((prev) => {
      const sectionElements = prev.filter((el) => el.sectionId === sectionId);
      newElement.position = sectionElements.length;
      return [...prev, newElement];
    });
    setActiveElementId(newElementId);
  }, []);

  const handleDeleteElement = useCallback((elementId) => {
    setElements((prev) => prev.filter((el) => el.id !== elementId));
    setActiveElementId((prev) => (prev === elementId ? null : prev));
  }, []);

  const handleUpdateElement = useCallback((elementId, newElementData) => {
    setElements((prev) =>
      prev.map((el) => (el.id === elementId ? newElementData : el))
    );
  }, []);

  const handleDuplicateSection = useCallback((sectionId) => {
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;
    const originalSection = sections[sectionIndex];
    const newSectionId = `section-${Date.now()}`;
    const newSection = { ...originalSection, id: newSectionId };
    
    setSections(prev => {
      const newArray = [...prev];
      newArray.splice(sectionIndex + 1, 0, newSection);
      return newArray;
    });

    setElements(prev => {
      const sectionElements = prev.filter(el => el.sectionId === sectionId);
      const newElements = sectionElements.map(el => ({
        ...el,
        id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        sectionId: newSectionId,
      }));
      return [...prev, ...newElements];
    });
  }, [sections]);

  const handleDuplicateElement = useCallback((elementId) => {
    const elementIndex = elements.findIndex(el => el.id === elementId);
    if (elementIndex === -1) return;
    const originalElement = elements[elementIndex];
    const newElement = {
      ...originalElement,
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    
    setElements(prev => {
      const newArray = [...prev];
      newArray.splice(elementIndex + 1, 0, newElement);
      return newArray;
    });
  }, [elements]);

  const handleMoveSectionUp = useCallback((sectionId) => {
    setSections(prev => {
      const idx = prev.findIndex(s => s.id === sectionId);
      if (idx <= 0) return prev;
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  }, []);

  const handleMoveSectionDown = useCallback((sectionId) => {
    setSections(prev => {
      const idx = prev.findIndex(s => s.id === sectionId);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  }, []);

  const handleMoveElementUp = useCallback((elementId) => {
    setElements(prev => {
      const idx = prev.findIndex(el => el.id === elementId);
      if (idx === -1) return prev;
      const element = prev[idx];
      let prevIdx = -1;
      for (let i = idx - 1; i >= 0; i--) {
        if (prev[i].sectionId === element.sectionId) {
          prevIdx = i;
          break;
        }
      }
      if (prevIdx === -1) return prev;
      const arr = [...prev];
      [arr[idx], arr[prevIdx]] = [arr[prevIdx], arr[idx]];
      return arr;
    });
  }, []);

  const handleMoveElementDown = useCallback((elementId) => {
    setElements(prev => {
      const idx = prev.findIndex(el => el.id === elementId);
      if (idx === -1) return prev;
      const element = prev[idx];
      let nextIdx = -1;
      for (let i = idx + 1; i < prev.length; i++) {
        if (prev[i].sectionId === element.sectionId) {
          nextIdx = i;
          break;
        }
      }
      if (nextIdx === -1) return prev;
      const arr = [...prev];
      [arr[idx], arr[nextIdx]] = [arr[nextIdx], arr[idx]];
      return arr;
    });
  }, []);

  // ─── Product Rules ──────────────────────────────────────────────────
  const handleUpdateRules = useCallback((newRules) => {
    setProductRules(newRules);
  }, []);

  // ─── Save Handler ───────────────────────────────────────────────────
  const handleSave = useCallback((exit = false) => {
    if (!name.trim()) {
      setToastMessage("Name is required");
      setToastError(true);
      setToastActive(true);
      return;
    }

    const formData = new FormData();
    formData.append("_action", "save");
    formData.append("name", name);
    formData.append("status", status);
    
    const elementsToSave = elements.map((el, idx) => ({
      id: el.id,
      type: el.type,
      label: el.label,
      placeholder: el.subtext || null,
      required: el.required || false,
      position: idx,
      config: {
        ...(el.config || {}),
        sectionId: el.sectionId,
        subtext: el.subtext,
        icon: el.icon
      }
    }));
    
    formData.append("sections", JSON.stringify(sections));
    formData.append("elements", JSON.stringify(elementsToSave));
    formData.append("productRules", JSON.stringify(productRules));

    fetcher.submit(formData, { method: "POST" });
    if (typeof shopify !== 'undefined' && shopify.toast) {
      shopify.toast.show("Option set saved!");
    } else {
      setToastMessage("Option set saved!");
      setToastError(false);
      setToastActive(true);
    }

    if (exit) {
      setTimeout(() => navigate("/app/option-sets"), 500);
    }
  }, [name, status, sections, elements, productRules, fetcher, navigate]);

  // ─── Tab Definitions ────────────────────────────────────────────────
  const tabs = [
    {
      id: "elements",
      content: (
        <InlineStack gap="200" blockAlign="center">
          <span>Elements</span>
          <Badge tone="info">{elements.length}</Badge>
        </InlineStack>
      ),
    },
    { id: "product-rules", content: "Product rules" },
  ];

  // ─── Discard Handler ────────────────────────────────────────────────
  const handleDiscard = useCallback(() => {
    if (initialData) {
      setName(initialData.name);
      // Simplify logic to keep example concise...
    } else {
      setName("New Option Set");
      setElements([]);
      setSections([{ id: "section-1", collapsed: false }]);
      setProductRules([]);
    }
  }, [initialData]);

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <Page>
      {/* ═══ Header Bar ═══ */}
      <Box paddingBlockEnd="400">
        <InlineStack align="space-between" blockAlign="center" gap="300">
          {/* Left: Back + Title + Badge */}
          <InlineStack gap="300" blockAlign="center">
            <Button
              variant="tertiary"
              onClick={() => navigate("/app/option-sets")}
            >
              ← Back
            </Button>
            <TextField
              label="Option set name"
              value={name}
              onChange={setName}
              autoComplete="off"
              labelHidden
            />
            <Badge tone={status === "active" ? "success" : "attention"}>
              {status === "active" ? "Active" : "Inactive"}
            </Badge>
          </InlineStack>

          {/* Right: Actions */}
          <InlineStack gap="200" blockAlign="center">
            {/* Language */}
            <Popover
              active={langPopoverActive}
              activator={<Button disclosure onClick={() => setLangPopoverActive(prev => !prev)}>English</Button>}
              onClose={() => setLangPopoverActive(false)}
              autofocusTarget="none"
            >
              <ActionList items={[{ content: 'English' }, { content: 'French' }]} />
            </Popover>

            {/* Mobile preview */}
            <Button icon={<span style={{fontSize: "18px", lineHeight: "20px"}}>📱</span>} />

            {/* More Menu */}
            <Popover
              active={menuPopoverActive}
              activator={<Button onClick={() => setMenuPopoverActive(prev => !prev)}>•••</Button>}
              onClose={() => setMenuPopoverActive(false)}
              autofocusTarget="none"
            >
              <ActionList
                actionRole="menuitem"
                items={[
                  { 
                    content: 'Use template', 
                    prefix: <span style={{fontSize: "16px"}}>📄</span>,
                    onAction: () => {
                      if (initialData?.id) {
                        navigate(`/app/option-sets/new?templateId=${initialData.id}`);
                      } else {
                        if (typeof shopify !== 'undefined' && shopify.toast) {
                          shopify.toast.show("Please save first to use as template");
                        }
                      }
                      setMenuPopoverActive(false);
                    }
                  },
                  { content: 'Sync Add-on data', prefix: <span style={{fontSize: "16px"}}>🔄</span> }
                ]}
              />
            </Popover>

            <Button variant="tertiary" onClick={handleDiscard}>
              Discard
            </Button>
            <Button
              variant="primary"
              loading={isSaving}
              onClick={() => handleSave(false)}
            >
              Save
            </Button>
          </InlineStack>
        </InlineStack>
      </Box>

      {fetcher.data?.error && (
        <Box paddingBlockEnd="400">
          <Banner tone="critical" onDismiss>
            <p>{fetcher.data.error}</p>
          </Banner>
        </Box>
      )}

      {/* ═══ Main Workspace ═══ */}
      <InlineGrid columns={{ xs: 1, md: ["twoThirds", "oneThird"] }} gap="400">
        {/* ─── Left Column: Builder ─── */}
        <Box>
          {activeElementId ? (
            <ElementEditor
              element={elements.find((el) => el.id === activeElementId)}
              allElements={elements}
              onChange={handleUpdateElement}
              onBack={() => setActiveElementId(null)}
              onDelete={handleDeleteElement}
            />
          ) : (
            <Card padding="0">
              <Tabs tabs={tabs} selected={builderTab} onSelect={setBuilderTab}>
                <Box padding="400">
                  {/* Elements Tab */}
                  {builderTab === 0 && (
                    <BlockStack gap="400">
                      {/* Option Set Title Input */}
                      <Box>
                        <Text
                          as="p"
                          variant="bodySm"
                          fontWeight="semibold"
                          tone="subdued"
                        >
                          OPTION SET TITLE
                        </Text>
                        <Box paddingBlockStart="200">
                          <TextField
                            value={name}
                            onChange={setName}
                            placeholder="e.g. Size & Color"
                            autoComplete="off"
                            labelHidden
                            label="Option set title"
                          />
                        </Box>
                      </Box>

                      <Divider />

                      {/* Section Blocks */}
                      <BlockStack gap="400">
                        {sections.map((section, idx) => (
                          <SectionBlock
                            key={section.id}
                            section={section}
                            sectionIndex={idx}
                            elements={elements.filter(
                              (el) => el.sectionId === section.id
                            )}
                            onAddElement={handleAddElement}
                            onDeleteElement={handleDeleteElement}
                            onDeleteSection={handleDeleteSection}
                            onDuplicateElement={handleDuplicateElement}
                            onDuplicateSection={handleDuplicateSection}
                            onMoveSectionUp={handleMoveSectionUp}
                            onMoveSectionDown={handleMoveSectionDown}
                            onMoveElementUp={handleMoveElementUp}
                            onMoveElementDown={handleMoveElementDown}
                            onToggleCollapse={handleToggleCollapse}
                            isCollapsed={section.collapsed}
                            onEditElement={setActiveElementId}
                          />
                        ))}
                      </BlockStack>

                      {/* Add Section Button */}
                      <Button variant="plain" onClick={handleAddSection}>
                        <InlineStack gap="200" blockAlign="center">
                          <Text as="span" fontWeight="semibold">📄</Text>
                          <Text as="span" fontWeight="medium">
                            Add section
                          </Text>
                        </InlineStack>
                      </Button>
                    </BlockStack>
                  )}

                  {/* Product Rules Tab */}
                  {builderTab === 1 && (
                    <ProductRuleBuilder
                      rules={productRules}
                      onUpdate={handleUpdateRules}
                    />
                  )}
                </Box>
              </Tabs>
            </Card>
          )}
        </Box>

        {/* ─── Right Column: Live Preview ─── */}
        <Box>
          <Card padding="400">
            <BlockStack gap="300">
              <Text variant="headingSm" as="h3" alignment="center">
                Live Preview
              </Text>
              <Divider />
              <TemplateBuilderPreview
                elements={elements}
                templateName={name}
              />
            </BlockStack>
          </Card>
        </Box>
      </InlineGrid>

      {toastActive && (
        <Toast
          content={toastMessage}
          error={toastError}
          onDismiss={() => setToastActive(false)}
          duration={3000}
        />
      )}
    </Page>
  );
}
