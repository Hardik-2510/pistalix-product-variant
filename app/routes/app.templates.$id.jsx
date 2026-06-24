import { useState, useCallback, useEffect, useMemo } from "react";
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
  Modal,
  Popover,
  ActionList,
} from "@shopify/polaris";
import { useNavigate, useFetcher, redirect, useRouteError, isRouteErrorResponse, useLoaderData, data } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import crypto from "crypto";

import SectionBlock from "../components/SectionBlock";
import TemplateBuilderPreview from "../components/TemplateBuilderPreview";
import ElementEditor from "../components/ElementEditor";
import ProductRuleBuilder from "../components/ProductRuleBuilder";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";
import { syncOptionSetToMetafields } from "../lib/metafields.server";
import { getShopFeatures } from "../lib/features.server";

export function ColorSwatchItem({ label, value, onChange }) {
  return (
    <Box>
      <InlineStack align="start" blockAlign="center" gap="300">
        <div style={{ position: 'relative' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: value,
            border: '1px solid var(--p-color-border-strong)',
            cursor: 'pointer'
          }} />
          <input 
            type="color" 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            style={{
              opacity: 0,
              position: 'absolute',
              top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer',
              padding: 0, margin: 0, border: 'none'
            }}
          />
        </div>
        <BlockStack gap="0">
          <Text as="span">{label}</Text>
          <Text as="p" tone="subdued">{value}</Text>
        </BlockStack>
      </InlineStack>
    </Box>
  );
}

/**
 * Loader — fetches option set or pre-fills a template.
 */
export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const { tier: currentTier, features } = await getShopFeatures(session.shop);

  if (params.id === "new") {
    const url = new URL(request.url);
    const predefinedId = url.searchParams.get("predefinedId");
    
    let optionSet = null;
    if (predefinedId) {
      let predefinedTemplates = [];
      let personalizedTemplates = [];
      
      try { 
        const path = await import("path");
        const fs = await import("fs/promises");
        // eslint-disable-next-line no-undef
        const preDefPath = path.join(process.cwd(), 'app', 'lib', 'predefinedTemplates.json');
        const preDefData = await fs.readFile(preDefPath, 'utf-8');
        predefinedTemplates = JSON.parse(preDefData); 
      } catch (e) { /* ignore */ }
      
      try { 
        const path = await import("path");
        const fs = await import("fs/promises");
        // eslint-disable-next-line no-undef
        const persPath = path.join(process.cwd(), 'app', 'lib', 'personalizedTemplates.json');
        const persData = await fs.readFile(persPath, 'utf-8');
        personalizedTemplates = JSON.parse(persData); 
      } catch (e) { /* ignore */ }

      const template = predefinedTemplates.find(t => t.id === predefinedId) || personalizedTemplates.find(t => t.id === predefinedId);
      
      if (template) {
        optionSet = {
          name: template.name,
          sections: template.sections || [],
          elements: template.elements || [],
          productRules: template.productRules || []
        };
      }
    }
    
    return { optionSet, currentTier, features };
  }
  
  const optionSet = await prisma.optionSet.findUnique({
    where: { id: params.id },
    include: { sections: true, elements: true, productRules: true },
  });

  if (!optionSet) {
    throw new Response("Not Found", { status: 404 });
  }
  
  return { optionSet, currentTier, features };
};

export function ErrorBoundary() {
  const error = useRouteError();
  console.error("Template Builder Error:", error);

  let title = "Error loading template builder";
  let message = "An unexpected error occurred. Please try again.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "Template not found";
      message = "This template does not exist or has been deleted.";
    } else if (error.status === 403) {
      title = "Access denied";
      message = "You do not have permission to view this template.";
    } else if (error.status >= 500) {
      title = "Server error";
      message = "The server encountered an error. Please try again in a moment.";
    } else {
      message = error.data || `Error ${error.status}`;
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <Page>
      <Banner tone="critical" title={title}>
        <p>{message}</p>
      </Banner>
    </Page>
  );
}

/**
 * Server action — saves the template and all its elements to the database.
 */
export const action = async ({ request, params }) => {
  const { session, admin } = await authenticate.admin(request);
  
  try {
    const formData = await request.formData();
    const name = formData.get("name") || "New Option Set";
    
    let parsedElements = [];
    let parsedSections = [];
    let parsedRules = [];

    try {
      parsedElements = JSON.parse(formData.get("elements") || "[]");
      parsedSections = JSON.parse(formData.get("sections") || "[]");
      parsedRules = JSON.parse(formData.get("productRules") || "[]");
    } catch {
      return data({ error: "Invalid data format received." }, { status: 400 });
    }

    const { features } = await getShopFeatures(session.shop);
    const maxSections = features.maxSectionsPerOptionSet || 1;
    if (parsedSections.length > maxSections) {
      return data({ error: `Your plan limits you to ${maxSections} section(s) per template. Please upgrade to Premium.` }, { status: 400 });
    }

    // Ensure Shop exists
    await prisma.shop.upsert({
      where: { shopDomain: session.shop },
      update: {},
      create: { shopDomain: session.shop },
    });

    const isUpdate = params.id && params.id !== "new";
    let optionSetId = params.id;

    if (isUpdate) {
      // Clear out existing nested records for rebuild
      await prisma.section.deleteMany({ where: { optionSetId } });
      await prisma.element.deleteMany({ where: { optionSetId } });
      await prisma.productRule.deleteMany({ where: { optionSetId } });

      await prisma.optionSet.update({
        where: { id: optionSetId },
        data: { name, status: "TEMPLATE" }
      });
    } else {
      const newOptionSet = await prisma.optionSet.create({
        data: { shopId: session.shop, name, status: "TEMPLATE" },
      });
      optionSetId = newOptionSet.id;
    }

    // Remap section and element IDs to preserve logical relations
    const secIdMap = {};
    for (const sec of parsedSections) {
      secIdMap[sec.id] = (isUpdate && sec.id.startsWith("sec_")) 
        ? sec.id 
        : `sec_${crypto.randomUUID().replace(/-/g, "")}`;
    }

    const elIdMap = {};
    for (const el of parsedElements) {
      elIdMap[el.id] = (isUpdate && el.id.startsWith("el_")) 
        ? el.id 
        : `el_${crypto.randomUUID().replace(/-/g, "")}`;
    }

    // Clean and link configs based on new ID mappings
    for (const el of parsedElements) {
      el.newId = elIdMap[el.id];
      if (el.config) {
        if (el.config.conditionalLogic === false) el.config.conditions = [];
        if (el.config.targetOtherFields === false) el.config.pushRules = [];
        if (el.config.sectionId && secIdMap[el.config.sectionId]) {
          el.config.sectionId = secIdMap[el.config.sectionId];
        }
        if (el.config.conditions) {
          el.config.conditions.forEach(cond => {
            if (elIdMap[cond.sourceElementId]) cond.sourceElementId = elIdMap[cond.sourceElementId];
          });
        }
        if (el.config.pushRules) {
          el.config.pushRules.forEach(rule => {
            if (elIdMap[rule.targetElementId]) rule.targetElementId = elIdMap[rule.targetElementId];
          });
        }
      }
    }

    // Prepare batch inserts
    const newSectionsData = parsedSections.map((sec, idx) => ({
      id: secIdMap[sec.id],
      optionSetId,
      title: sec.title || `Section ${idx + 1}`,
      order: idx,
      visible: sec.visible !== false,
      styles: JSON.stringify(sec.styles || {})
    }));

    const newElementsData = [];
    parsedSections.forEach((sec) => {
      const newSecId = secIdMap[sec.id];
      const sectionElements = parsedElements.filter(el => el.sectionId === sec.id);
      
      sectionElements.forEach((el, elIdx) => {
        newElementsData.push({
          id: el.newId,
          optionSetId,
          sectionId: newSecId,
          type: el.type || "Text",
          label: el.label || "Option",
          subtext: el.placeholder || el.subtext || el.config?.subtext || null,
          required: el.required || false,
          order: elIdx,
          config: JSON.stringify({ ...(el.config || {}), sectionId: newSecId }),
        });
      });
    });

    const newRulesData = parsedRules.map((r) => ({
      optionSetId,
      targetType: r.ruleType,
      targetValues: r.value ? String(r.value) : "[]",
    }));

    // Execute bulk creations
    if (newRulesData.length > 0) await prisma.productRule.createMany({ data: newRulesData });
    if (newSectionsData.length > 0) await prisma.section.createMany({ data: newSectionsData });
    if (newElementsData.length > 0) await prisma.element.createMany({ data: newElementsData });

    // Background Metafield Sync
    syncOptionSetToMetafields(optionSetId, admin).catch(err => console.error("Metafield Sync Background Error:", err));

    return isUpdate ? { success: true } : redirect("/app/templates");

  } catch (error) {
    console.error("Action Error:", error);
    return data({ error: "Failed to save template. Please try again." }, { status: 500 });
  }
};

/**
 * NewTemplate — Full-featured option template builder interface.
 */
export default function NewTemplate() {
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const { optionSet, currentTier } = useLoaderData();
  const isSaving = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      if (typeof shopify !== 'undefined' && shopify.toast) {
        shopify.toast.show("Template saved");
      }
    }
  }, [fetcher.state, fetcher.data]);

  const [name, setName] = useState(optionSet?.name || "New Option Set");
  const [builderTab, setBuilderTab] = useState(0);

  const initialSections = optionSet?.sections ? optionSet.sections.map(s => ({
    id: s.id,
    collapsed: false,
    visible: s.visible,
    styles: s.styles ? JSON.parse(s.styles) : {}
  })) : [{ id: "section-1", collapsed: false, visible: true }];

  const initialElements = optionSet?.elements ? optionSet.elements.map(e => ({
    id: e.id,
    sectionId: e.sectionId,
    type: e.type,
    label: e.label,
    subtext: e.subtext,
    required: e.required,
    config: e.config ? JSON.parse(e.config) : {}
  })) : [];

  const [sections, setSections] = useState(initialSections);
  const [elements, setElements] = useState(initialElements);
  const [productRules, setProductRules] = useState(() => {
    return optionSet?.productRules ? optionSet.productRules.map(r => ({
      ruleType: r.targetType,
      value: r.targetValues !== "[]" ? r.targetValues : null,
    })) : [];
  });
  
  const [activeElementId, setActiveElementId] = useState(null);

  const currentState = JSON.stringify({ name, sections, elements, productRules });
  const [initialStateStr, setInitialStateStr] = useState(currentState);
  const isDirty = currentState !== initialStateStr;

  useUnsavedChanges(isDirty);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && !fetcher.data.error) {
      setInitialStateStr(currentState);
    }
  }, [fetcher.state, fetcher.data, currentState]);

  const handleUpdateRules = useCallback((newRules) => setProductRules(newRules), []);

  const [langPopoverActive, setLangPopoverActive] = useState(false);
  const [menuPopoverActive, setMenuPopoverActive] = useState(false);

  // Style Modal state
  const [styleModalOpen, setStyleModalOpen] = useState(false);
  const [activeStyleSectionId, setActiveStyleSectionId] = useState(null);
  const [modalStyles, setModalStyles] = useState({
    backgroundColor: "#ffffff",
    padding: "16",
    textColor: "#000000",
  });

  const generateLocalId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  // ─── Section Management ─────────────────────────────────────────────
  const handleAddSection = useCallback(() => {
    const maxSections = currentTier === "premium" ? Infinity : (currentTier === "standard" ? 3 : 1);
    if (sections.length >= maxSections) {
      const msg = `Your plan limits you to ${maxSections} section(s). Upgrade to Premium for unlimited sections.`;
      if (typeof shopify !== 'undefined' && shopify.toast) {
        shopify.toast.show(msg, { isError: true });
      } else {
        alert(msg);
      }
      return;
    }
    setSections((prev) => [...prev, { id: generateLocalId("section"), collapsed: false }]);
  }, [currentTier, sections.length]);

  const handleDeleteSection = useCallback((sectionId) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    setElements((prev) => prev.filter((el) => el.sectionId !== sectionId));
  }, []);

  const handleToggleCollapse = useCallback((sectionId) => {
    setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s));
  }, []);

  const handleToggleVisibility = useCallback((sectionId) => {
    setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, visible: !s.visible } : s));
  }, []);

  const handleDuplicateSection = useCallback((sectionId) => {
    const maxSections = currentTier === "premium" ? Infinity : (currentTier === "standard" ? 3 : 1);
    if (sections.length >= maxSections) {
      const msg = `Your plan limits you to ${maxSections} section(s). Upgrade to Premium for unlimited sections.`;
      if (typeof shopify !== 'undefined' && shopify.toast) shopify.toast.show(msg, { isError: true });
      else alert(msg);
      return;
    }

    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;
    
    const newSectionId = generateLocalId("section");
    const newSection = { ...sections[sectionIndex], id: newSectionId };
    
    setSections(prev => {
      const newArray = [...prev];
      newArray.splice(sectionIndex + 1, 0, newSection);
      return newArray;
    });

    setElements(prev => {
      const newElements = prev.filter(el => el.sectionId === sectionId).map(el => ({
        ...el,
        id: generateLocalId("el"),
        sectionId: newSectionId,
      }));
      return [...prev, ...newElements];
    });
  }, [currentTier, sections]);

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

  // ─── Element Management ─────────────────────────────────────────────
  const handleAddElement = useCallback((sectionId, item) => {
    const newElementId = generateLocalId("el");
    setElements((prev) => {
      const position = prev.filter((el) => el.sectionId === sectionId).length;
      return [...prev, {
        id: newElementId,
        sectionId,
        type: item.type,
        label: item.label,
        subtext: item.subtext,
        icon: item.icon,
        position,
        config: {},
      }];
    });
    setActiveElementId(newElementId);
  }, []);

  const handleDeleteElement = useCallback((elementId) => {
    setElements((prev) => prev.filter((el) => el.id !== elementId));
    setActiveElementId((prev) => (prev === elementId ? null : prev));
  }, []);

  const handleUpdateElement = useCallback((elementId, newElementData) => {
    setElements((prev) => prev.map((el) => (el.id === elementId ? newElementData : el)));
  }, []);

  const handleDuplicateElement = useCallback((elementId) => {
    const elementIndex = elements.findIndex(el => el.id === elementId);
    if (elementIndex === -1) return;
    
    const newElement = { ...elements[elementIndex], id: generateLocalId("el") };
    setElements(prev => {
      const newArray = [...prev];
      newArray.splice(elementIndex + 1, 0, newElement);
      return newArray;
    });
  }, [elements]);

  const handleMoveElementUp = useCallback((elementId) => {
    setElements(prev => {
      const idx = prev.findIndex(el => el.id === elementId);
      if (idx <= 0) return prev;
      
      const element = prev[idx];
      const prevIdx = prev.slice(0, idx).findLastIndex(el => el.sectionId === element.sectionId);
      if (prevIdx === -1) return prev;
      
      const arr = [...prev];
      [arr[idx], arr[prevIdx]] = [arr[prevIdx], arr[idx]];
      return arr;
    });
  }, []);

  const handleMoveElementDown = useCallback((elementId) => {
    setElements(prev => {
      const idx = prev.findIndex(el => el.id === elementId);
      if (idx === -1 || idx === prev.length - 1) return prev;
      
      const element = prev[idx];
      const nextRelativeIdx = prev.slice(idx + 1).findIndex(el => el.sectionId === element.sectionId);
      if (nextRelativeIdx === -1) return prev;
      
      const nextIdx = idx + 1 + nextRelativeIdx;
      const arr = [...prev];
      [arr[idx], arr[nextIdx]] = [arr[nextIdx], arr[idx]];
      return arr;
    });
  }, []);

  // ─── Modal & Action Handlers ────────────────────────────────────────
  const handleDiscard = useCallback(() => {
    setName("New Option Set");
    setElements([]);
    setSections([{ id: "section-1", collapsed: false }]);
    setProductRules([]);
    setInitialStateStr(JSON.stringify({
      name: "New Option Set",
      sections: [{ id: "section-1", collapsed: false }],
      elements: [],
      productRules: []
    }));
  }, []);

  const handleOpenStyleModal = useCallback((sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      setModalStyles({
        backgroundColor: section.styles?.backgroundColor || "#ffffff",
        padding: section.styles?.padding || "16",
        textColor: section.styles?.textColor || "#000000",
      });
    }
    setActiveStyleSectionId(sectionId);
    setStyleModalOpen(true);
  }, [sections]);

  const handleCloseStyleModal = useCallback(() => {
    if (activeStyleSectionId) {
      setSections(prev => prev.map(s => 
        s.id === activeStyleSectionId ? { ...s, styles: modalStyles } : s
      ));
    }
    setStyleModalOpen(false);
    setActiveStyleSectionId(null);
  }, [activeStyleSectionId, modalStyles]);

  const handleSave = () => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("elements", JSON.stringify(elements));
    formData.append("sections", JSON.stringify(sections));
    formData.append("productRules", JSON.stringify(productRules));
    fetcher.submit(formData, { method: "POST" });
  };

  const tabs = useMemo(() => [
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
  ], [elements.length]);

  return (
    <Page>
      {/* ═══ Header Bar ═══ */}
      <Box paddingBlockEnd="400">
        <InlineStack align="space-between" blockAlign="center" gap="300">
          <InlineStack gap="300" blockAlign="center">
            <Button variant="tertiary" onClick={() => navigate("/app/templates")}>← Back</Button>
            <div style={{ background: "var(--p-color-bg-fill-magic)", borderRadius: "var(--p-border-radius-200)", minWidth: "32px", minHeight: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Text as="span" fontWeight="bold" variant="headingSm">T</Text>
            </div>
            <TextField label="Template name" value={name} onChange={setName} autoComplete="off" labelHidden />
            <Badge tone="info">Template</Badge>
          </InlineStack>

          <InlineStack gap="200" blockAlign="center">
            <Popover
              active={langPopoverActive}
              activator={<Button disclosure onClick={() => setLangPopoverActive(prev => !prev)}>English</Button>}
              onClose={() => setLangPopoverActive(false)}
              autofocusTarget="none"
            >
              <ActionList items={[{ content: 'English' }, { content: 'French' }]} />
            </Popover>

            <Button icon={<span style={{fontSize: "18px", lineHeight: "20px"}}>📱</span>} />

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
                      if (optionSet?.id) {
                        navigate(`/app/option-sets/new?templateId=${optionSet.id}`);
                      } else if (typeof shopify !== 'undefined' && shopify.toast) {
                        shopify.toast.show("Please save the template first");
                      }
                      setMenuPopoverActive(false);
                    }
                  },
                  { content: 'Sync Add-on data', prefix: <span style={{fontSize: "16px"}}>🔄</span> }
                ]}
              />
            </Popover>

            <Button variant="tertiary" onClick={handleDiscard}>Discard</Button>
            <Button variant="primary" loading={isSaving} onClick={handleSave}>Save</Button>
          </InlineStack>
        </InlineStack>
      </Box>

      {fetcher.data?.error && (
        <Box paddingBlockEnd="400">
          <Banner tone="critical"><p>{fetcher.data.error}</p></Banner>
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
              currentTier={currentTier}
            />
          ) : (
            <Card padding="0">
              <Tabs tabs={tabs} selected={builderTab} onSelect={setBuilderTab}>
                <Box padding="400">
                  {builderTab === 0 && (
                    <BlockStack gap="400">
                      <Box>
                        <Text as="p" variant="bodySm" fontWeight="semibold" tone="subdued">OPTION SET TITLE</Text>
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
                      <BlockStack gap="400">
                        {sections.map((section, idx) => (
                          <SectionBlock
                            key={section.id}
                            section={section}
                            sectionIndex={idx}
                            elements={elements.filter((el) => el.sectionId === section.id)}
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
                            onToggleVisibility={handleToggleVisibility}
                            onEditStyle={handleOpenStyleModal}
                            isCollapsed={section.collapsed}
                            isVisible={section.visible !== false}
                            onEditElement={setActiveElementId}
                          />
                        ))}
                      </BlockStack>
                      <Button variant="plain" onClick={handleAddSection}>
                        <InlineStack gap="200" blockAlign="center">
                          <Text as="span" fontWeight="semibold">📄</Text>
                          <Text as="span" fontWeight="medium">
                            Add section {currentTier !== "premium" ? "⭐" : ""}
                          </Text>
                        </InlineStack>
                      </Button>
                    </BlockStack>
                  )}
                  {builderTab === 1 && (
                    <ProductRuleBuilder rules={productRules} onUpdate={handleUpdateRules} />
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
              <Text variant="headingSm" as="h3" alignment="center">Live Preview</Text>
              <Divider />
              <TemplateBuilderPreview
                elements={elements}
                sections={sections}
                templateName={name}
              />
            </BlockStack>
          </Card>
        </Box>
      </InlineGrid>

      {/* ═══ Style Settings Modal ═══ */}
      <Modal
        open={styleModalOpen}
        onClose={handleCloseStyleModal}
        title="Section Style Settings"
        primaryAction={{
          content: 'Save',
          onAction: handleCloseStyleModal,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: handleCloseStyleModal,
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <TextField
              label="Background Color"
              value={modalStyles.backgroundColor}
              onChange={(val) => setModalStyles(prev => ({ ...prev, backgroundColor: val }))}
              autoComplete="off"
            />
            <TextField
              label="Text Color"
              value={modalStyles.textColor}
              onChange={(val) => setModalStyles(prev => ({ ...prev, textColor: val }))}
              autoComplete="off"
            />
            <TextField
              label="Padding"
              type="number"
              value={modalStyles.padding}
              onChange={(val) => setModalStyles(prev => ({ ...prev, padding: val }))}
              autoComplete="off"
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}