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
  Modal,
  Popover,
  ActionList,
} from "@shopify/polaris";
import { useNavigate, useFetcher, redirect, useRouteError, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import crypto from "crypto";
import SectionBlock from "../components/SectionBlock";
import TemplateBuilderPreview from "../components/TemplateBuilderPreview";
import ElementEditor from "../components/ElementEditor";
import ProductRuleBuilder from "../components/ProductRuleBuilder";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";

function ColorSwatchItem({ label, value, onChange }) {
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
 * Server action — saves the template and all its elements to the database.
 */
import { syncOptionSetToMetafields } from "../lib/metafields.server";
import { getShopFeatures } from "../lib/features.server";

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const { tier: currentTier, features } = await getShopFeatures(session.shop);

  if (params.id === "new") {
    const url = new URL(request.url);
    const predefinedId = url.searchParams.get("predefinedId");
    
    let optionSet = null;
    if (predefinedId) {
      const fs = await import("fs");
      const path = await import("path");
      
      let predefinedTemplates = [];
      try { predefinedTemplates = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app', 'lib', 'predefinedTemplates.json'), 'utf-8')); } catch(e){ /* ignore */ }
      
      let personalizedTemplates = [];
      try { personalizedTemplates = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app', 'lib', 'personalizedTemplates.json'), 'utf-8')); } catch(e){ /* ignore */ }

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
  return (
    <Page>
      <Banner tone="critical" title="Error loading template builder">
        <p>{error.message || "Unknown error occurred"}</p>
      </Banner>
    </Page>
  );
}

export const action = async ({ request, params }) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const name = formData.get("name") || "New Option Set";
  const elementsJson = formData.get("elements") || "[]";
  const sectionsJson = formData.get("sections") || "[]";

  let parsedElements = [];
  let parsedSections = [];
  try {
    parsedElements = JSON.parse(elementsJson);
    parsedSections = JSON.parse(sectionsJson);
  } catch {
    parsedElements = [];
    parsedSections = [];
  }

  const { features } = await getShopFeatures(session.shop);
  const maxSections = features.maxSectionsPerOptionSet || 1;
  if (parsedSections.length > maxSections) {
    return { error: `Your plan limits you to ${maxSections} section${maxSections > 1 ? 's' : ''} per template. Please upgrade to Premium for unlimited sections.` };
  }

  // Ensure Shop exists
  await prisma.shop.upsert({
    where: { shopDomain: session.shop },
    update: {},
    create: { shopDomain: session.shop },
  });

  if (params.id && params.id !== "new") {
    // Clear out existing sections/elements completely to rebuild
    await prisma.section.deleteMany({ where: { optionSetId: params.id } });
    await prisma.element.deleteMany({ where: { optionSetId: params.id } });
    await prisma.productRule.deleteMany({ where: { optionSetId: params.id } });

    let parsedRules = [];
    try {
      parsedRules = JSON.parse(formData.get("productRules") || "[]");
    } catch { parsedRules = []; }

    if (parsedRules.length > 0) {
      await prisma.productRule.createMany({
        data: parsedRules.map((r) => ({
          optionSetId: params.id,
          targetType: r.ruleType,
          targetValues: r.value ? String(r.value) : "[]",
        })),
      });
    }

    await prisma.optionSet.update({
      where: { id: params.id },
      data: { name, status: "TEMPLATE" }
    });

    // Remap section and element IDs to preserve conditional logic and targeted actions
    const secIdMap = {};
    for (const sec of parsedSections) {
      if (sec.id && sec.id.startsWith("sec_")) {
        secIdMap[sec.id] = sec.id;
      } else {
        secIdMap[sec.id] = `sec_${crypto.randomUUID().replace(/-/g, "")}`;
      }
    }

    const elIdMap = {};
    for (const el of parsedElements) {
      if (el.id && el.id.startsWith("el_")) {
        elIdMap[el.id] = el.id;
      } else {
        elIdMap[el.id] = `el_${crypto.randomUUID().replace(/-/g, "")}`;
      }
    }

    for (const el of parsedElements) {
      el.newId = elIdMap[el.id];
      if (el.config) {
        if (el.config.conditionalLogic === false) {
          el.config.conditions = [];
        }
        if (el.config.targetOtherFields === false) {
          el.config.pushRules = [];
        }
        if (el.config.sectionId && secIdMap[el.config.sectionId]) {
          el.config.sectionId = secIdMap[el.config.sectionId];
        }
        if (el.config.conditions) {
          for (const cond of el.config.conditions) {
            if (elIdMap[cond.sourceElementId]) {
              cond.sourceElementId = elIdMap[cond.sourceElementId];
            }
          }
        }
        if (el.config.pushRules) {
          for (const rule of el.config.pushRules) {
            if (elIdMap[rule.targetElementId]) {
              rule.targetElementId = elIdMap[rule.targetElementId];
            }
          }
        }
      }
    }

    for (let idx = 0; idx < parsedSections.length; idx++) {
      const sec = parsedSections[idx];
      const newSecId = secIdMap[sec.id];
      
      await prisma.section.create({
        data: {
          id: newSecId,
          optionSetId: params.id,
          title: sec.title || `Section ${idx + 1}`,
          order: idx,
          visible: sec.visible !== false,
          styles: JSON.stringify(sec.styles || {})
        }
      });

      const sectionElements = parsedElements.filter(el => el.sectionId === sec.id);
      if (sectionElements.length > 0) {
        await prisma.element.createMany({
          data: sectionElements.map((el, elIdx) => {
            const updatedConfig = { ...(el.config || {}), sectionId: newSecId };
            return {
              id: el.newId,
              optionSetId: params.id,
              sectionId: newSecId,
              type: el.type || "Text",
              label: el.label || "Option",
              subtext: el.placeholder || el.config?.subtext || null,
              required: el.required || false,
              order: elIdx,
              config: JSON.stringify(updatedConfig),
            };
          }),
        });
      }
    }

    // Trigger Metafield Sync
    try {
      await syncOptionSetToMetafields(params.id, admin);
    } catch (err) {
      console.error("Metafield Sync Failed:", err);
    }

    return { success: true };
  }

  let parsedRules = [];
  try {
    parsedRules = JSON.parse(formData.get("productRules") || "[]");
  } catch { parsedRules = []; }

  const optionSet = await prisma.optionSet.create({
    data: {
      shopId: session.shop,
      name,
      status: "TEMPLATE",
    },
  });

  if (parsedRules.length > 0) {
    await prisma.productRule.createMany({
      data: parsedRules.map((r) => ({
        optionSetId: optionSet.id,
        targetType: r.ruleType,
        targetValues: r.value ? String(r.value) : "[]",
      })),
    });
  }
  // Generate new IDs for all sections and elements to avoid conflicts
  const secIdMap = {};
  for (const sec of parsedSections) {
    secIdMap[sec.id] = `sec_${crypto.randomUUID().replace(/-/g, "")}`;
  }

  const elIdMap = {};
  for (const el of parsedElements) {
    elIdMap[el.id] = `el_${crypto.randomUUID().replace(/-/g, "")}`;
  }

  for (const el of parsedElements) {
    el.newId = elIdMap[el.id];
    if (el.config) {
      if (el.config.conditionalLogic === false) {
        el.config.conditions = [];
      }
      if (el.config.targetOtherFields === false) {
        el.config.pushRules = [];
      }
      if (el.config.sectionId && secIdMap[el.config.sectionId]) {
        el.config.sectionId = secIdMap[el.config.sectionId];
      }
      if (el.config.conditions) {
        for (const cond of el.config.conditions) {
          if (elIdMap[cond.sourceElementId]) {
            cond.sourceElementId = elIdMap[cond.sourceElementId];
          }
        }
      }
      if (el.config.pushRules) {
        for (const rule of el.config.pushRules) {
          if (elIdMap[rule.targetElementId]) {
            rule.targetElementId = elIdMap[rule.targetElementId];
          }
        }
      }
    }
  }

  for (let idx = 0; idx < parsedSections.length; idx++) {
    const sec = parsedSections[idx];
    const newSecId = secIdMap[sec.id];
    await prisma.section.create({
      data: {
        id: newSecId,
        optionSetId: optionSet.id,
        title: `Section ${idx + 1}`,
        order: idx,
        visible: sec.visible !== false,
        styles: JSON.stringify(sec.styles || {})
      }
    });

    const sectionElements = parsedElements.filter(el => el.sectionId === sec.id);
    for (let elIdx = 0; elIdx < sectionElements.length; elIdx++) {
      const el = sectionElements[elIdx];
      const updatedConfig = { ...(el.config || {}), sectionId: newSecId };
      await prisma.element.create({
        data: {
          id: el.newId,
          optionSetId: optionSet.id,
          sectionId: newSecId,
          type: el.type || "Text",
          label: el.label || "Option",
          subtext: el.subtext || null,
          required: el.required || false,
          order: elIdx,
          config: JSON.stringify(updatedConfig),
        }
      });
    }
  }

  // Trigger Metafield Sync
  try {
    await syncOptionSetToMetafields(optionSet.id, admin);
  } catch (err) {
    console.error("Metafield Sync Failed:", err);
  }

  return redirect("/app/templates");
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

  // Template metadata
  const [name, setName] = useState(optionSet?.name || "New Option Set");

  // Builder tabs
  const [builderTab, setBuilderTab] = useState(0);

  // Parse server data if editing
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

  // Sections & elements state
  const [sections, setSections] = useState(initialSections);
  const [elements, setElements] = useState(initialElements);
  const [productRules, setProductRules] = useState(() => {
    if (optionSet?.productRules) {
      return optionSet.productRules.map(r => ({
        ruleType: r.targetType,
        value: r.targetValues !== "[]" ? r.targetValues : null,
      }));
    }
    return [];
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

  const handleUpdateRules = useCallback((newRules) => {
    setProductRules(newRules);
  }, []);

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

  // ─── Section Management ─────────────────────────────────────────────

  const handleAddSection = useCallback(() => {
    const maxSections = currentTier === "premium" ? Infinity : (currentTier === "standard" ? 3 : 1);
    if (sections.length >= maxSections) {
      if (typeof shopify !== 'undefined' && shopify.toast) {
        shopify.toast.show(`Your plan limits you to ${maxSections} section${maxSections > 1 ? 's' : ''}. Upgrade to Premium for unlimited sections.`, { isError: true });
      } else {
        alert(`Your plan limits you to ${maxSections} section${maxSections > 1 ? 's' : ''}. Upgrade to Premium for unlimited sections.`);
      }
      return;
    }

    const newSection = {
      id: `section-${Date.now()}`,
      collapsed: false,
    };
    setSections((prev) => [...prev, newSection]);
  }, [currentTier, sections.length]);

  const handleDeleteSection = useCallback((sectionId) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    // Also remove all elements belonging to this section
    setElements((prev) => prev.filter((el) => el.sectionId !== sectionId));
  }, []);

  const handleToggleCollapse = useCallback((sectionId) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s
      )
    );
  }, []);

  const handleToggleVisibility = useCallback((sectionId) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, visible: s.visible === false ? true : false } : s
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
    const maxSections = currentTier === "premium" ? Infinity : (currentTier === "standard" ? 3 : 1);
    if (sections.length >= maxSections) {
      if (typeof shopify !== 'undefined' && shopify.toast) {
        shopify.toast.show(`Your plan limits you to ${maxSections} section${maxSections > 1 ? 's' : ''}. Upgrade to Premium for unlimited sections.`, { isError: true });
      } else {
        alert(`Your plan limits you to ${maxSections} section${maxSections > 1 ? 's' : ''}. Upgrade to Premium for unlimited sections.`);
      }
      return;
    }

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
  }, [currentTier, sections]);

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
              onClick={() => navigate("/app/templates")}
            >
              ← Back
            </Button>
            <Box
              background="bg-fill-magic"
              borderRadius="200"
              minWidth="32px"
              minHeight="32px"
              padding="100"
            >
              <Text as="span" fontWeight="bold" alignment="center" variant="headingSm">
                T
              </Text>
            </Box>
            <TextField
              label="Template name"
              value={name}
              onChange={setName}
              autoComplete="off"
              labelHidden
            />
            <Badge tone="info">Template</Badge>
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
                      if (optionSet?.id) {
                        navigate(`/app/option-sets/new?templateId=${optionSet.id}`);
                      } else {
                        if (typeof shopify !== 'undefined' && shopify.toast) {
                          shopify.toast.show("Please save the template first");
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
              onClick={() => {
                const formData = new FormData();
                formData.append("name", name);
                formData.append("elements", JSON.stringify(elements));
                formData.append("sections", JSON.stringify(sections));
                formData.append("productRules", JSON.stringify(productRules));
                fetcher.submit(formData, { method: "POST" });
              }}
            >
              Save
            </Button>
          </InlineStack>
        </InlineStack>
      </Box>

      {fetcher.data?.error && (
        <Box paddingBlockEnd="400">
          <Banner tone="critical">
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
              currentTier={currentTier}
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
                            onToggleVisibility={handleToggleVisibility}
                            onEditStyle={handleOpenStyleModal}
                            isCollapsed={section.collapsed}
                            isVisible={section.visible !== false}
                            onEditElement={setActiveElementId}
                          />
                        ))}
                      </BlockStack>

                    {/* Add Section Button */}
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
        title="Section style settings"
        primaryAction={{
          content: 'Done',
          onAction: handleCloseStyleModal,
        }}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <ColorSwatchItem 
              label="Background color" 
              value={modalStyles.backgroundColor} 
              onChange={(val) => setModalStyles(prev => ({ ...prev, backgroundColor: val }))} 
            />
            
            <Box>
              <Text as="p" fontWeight="bold">Padding</Text>
              <Box paddingBlockStart="200">
                <TextField 
                  type="number" 
                  value={modalStyles.padding} 
                  onChange={(val) => setModalStyles(prev => ({ ...prev, padding: val }))} 
                  suffix="px" 
                  autoComplete="off" 
                />
              </Box>
            </Box>

            <ColorSwatchItem 
              label="Text color" 
              value={modalStyles.textColor} 
              onChange={(val) => setModalStyles(prev => ({ ...prev, textColor: val }))} 
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}