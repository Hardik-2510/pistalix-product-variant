import { useState, useCallback, useRef } from "react";
import crypto from "crypto";
import {
  Button,
  InlineStack,
  BlockStack,
  Card,
  Modal,
  Page,
  Text,
  Box,
  Tabs,
  InlineGrid,
  EmptyState,
  Badge,
} from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";
import { useNavigate, useLoaderData, useFetcher } from "react-router";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const optionSets = await prisma.optionSet.findMany({
    where: { shopId: session.shop, status: "TEMPLATE" },
    orderBy: { createdAt: "desc" },
    include: { elements: true, sections: true, productRules: true }
  });

  const targetsToFetch = [];
  optionSets.forEach(set => {
    if (set.productRules) {
      for (const rule of set.productRules) {
        if (rule.targetType === 'product' || rule.targetType === 'manual') {
          try {
            let productId = null;
            if (rule.targetValues.startsWith('[')) {
              const values = JSON.parse(rule.targetValues);
              if (values && values.length > 0) productId = values[0];
            } else if (rule.targetValues.includes('gid://shopify/Product/')) {
              productId = rule.targetValues.split(',')[0].trim();
            }
            if (productId) {
              targetsToFetch.push({ setId: set.id, type: 'product', id: productId });
              break;
            }
          } catch (e) {
            console.error("Failed to parse targetValues:", e);
          }
        } else if (rule.targetType === 'collection') {
          try {
            let collectionId = null;
            if (rule.targetValues.startsWith('[')) {
              const values = JSON.parse(rule.targetValues);
              if (values && values.length > 0) collectionId = values[0];
            } else if (rule.targetValues.includes('gid://shopify/Collection/')) {
              collectionId = rule.targetValues.split(',')[0].trim();
            }
            if (collectionId) {
              targetsToFetch.push({ setId: set.id, type: 'collection', id: collectionId });
              break;
            }
          } catch (e) {
            console.error("Failed to parse collection ID:", e);
          }
        } else if (rule.targetType === 'all' || rule.targetType === 'ALL_PRODUCTS') {
          targetsToFetch.push({ setId: set.id, type: 'all', id: 'all' });
          break;
        }
      }
    }
  });

  const setImages = {};
  try {
    if (targetsToFetch.length > 0) {
      const queryParts = targetsToFetch.slice(0, 50).map((item, idx) => {
        if (item.type === 'product') {
          return `
            target_${idx}: product(id: "${item.id}") {
              featuredImage { url }
            }
          `;
        } else if (item.type === 'collection') {
          return `
            target_${idx}: collection(id: "${item.id}") {
              image { url }
            }
          `;
        } else if (item.type === 'all') {
          return `
            target_${idx}: products(first: 1) {
              edges { node { featuredImage { url } } }
            }
          `;
        }
        return '';
      });
      
      if (queryParts.length > 0) {
        const query = `query { ${queryParts.join('\n')} }`;
        const response = await admin.graphql(query);
        const json = await response.json();
        
        targetsToFetch.slice(0, 50).forEach((item, idx) => {
          const result = json.data && json.data[`target_${idx}`];
          if (result) {
            if (item.type === 'product' && result.featuredImage) {
              setImages[item.setId] = result.featuredImage.url;
            } else if (item.type === 'collection' && result.image) {
              setImages[item.setId] = result.image.url;
            } else if (item.type === 'all' && result.edges && result.edges.length > 0 && result.edges[0].node.featuredImage) {
              setImages[item.setId] = result.edges[0].node.featuredImage.url;
            }
          }
        });
      }
    }
  } catch (error) {
    console.error("Critical error during GraphQL image fetch:", error);
  }

  const setsWithImages = optionSets.map(set => ({
    ...set,
    imageUrl: setImages[set.id] || null
  }));

  return { optionSets: setsWithImages };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const id = formData.get("id");

  if (intent === "delete" && id) {
    await prisma.optionSet.delete({ where: { id } });
    return { success: true };
  }

  if (intent === "import") {
    const importData = formData.get("importData");
    if (!importData) return new Response(JSON.stringify({ error: "No data provided" }), { status: 400 });

    try {
      const templates = JSON.parse(importData);
      const templatesToImport = Array.isArray(templates) ? templates : [templates];

      // Ensure the shop record exists before creating OptionSets to prevent Foreign Key constraint errors
      await prisma.shop.upsert({
        where: { shopDomain: session.shop },
        update: {},
        create: { shopDomain: session.shop }
      });

      for (const tpl of templatesToImport) {
        // Remap section and element IDs for the imported template to ensure config consistency
        const secIdMap = {};
        if (tpl.sections) {
          for (const sec of tpl.sections) {
            secIdMap[sec.id] = `sec_${crypto.randomUUID().replace(/-/g, "")}`;
          }
        }

        const elIdMap = {};
        if (tpl.elements) {
          for (const el of tpl.elements) {
            elIdMap[el.id] = `el_${crypto.randomUUID().replace(/-/g, "")}`;
          }
        }

        const createdOptionSet = await prisma.optionSet.create({
          data: {
            shopId: session.shop,
            name: (tpl.name || "Untitled") + (tpl.name && tpl.name.includes("(Imported)") ? "" : " (Imported)"),
            status: "TEMPLATE",
            sections: {
              create: tpl.sections?.map(sec => ({
                id: secIdMap[sec.id],
                title: sec.title,
                order: sec.order ?? 0,
                visible: sec.visible ?? true,
                styles: typeof sec.styles === 'object' ? JSON.stringify(sec.styles) : sec.styles,
              })) || []
            },
            productRules: {
              create: [{
                targetType: "all",
                targetValues: "[]"
              }]
            }
          },
          include: { sections: true }
        });

        if (tpl.elements && tpl.elements.length > 0) {
          const elementsToCreate = tpl.elements.map((e, elIdx) => {
            const newSectionId = secIdMap[e.sectionId];
            
            // Process config to update mapped IDs
            let parsedConfig = {};
            if (typeof e.config === 'object' && e.config !== null) {
              parsedConfig = { ...e.config };
            } else if (typeof e.config === 'string') {
              try { parsedConfig = JSON.parse(e.config); } catch (err) { parsedConfig = {}; }
            }

            parsedConfig.sectionId = newSectionId;

            if (parsedConfig.conditions) {
              for (const cond of parsedConfig.conditions) {
                if (elIdMap[cond.sourceElementId]) {
                  cond.sourceElementId = elIdMap[cond.sourceElementId];
                }
              }
            }

            if (parsedConfig.pushRules) {
              for (const rule of parsedConfig.pushRules) {
                if (elIdMap[rule.targetElementId]) {
                  rule.targetElementId = elIdMap[rule.targetElementId];
                }
              }
            }

            return {
              id: elIdMap[e.id],
              optionSetId: createdOptionSet.id,
              sectionId: newSectionId,
              type: e.type || "text",
              label: e.label || "New Element",
              subtext: e.subtext,
              required: e.required ?? false,
              order: e.order ?? elIdx,
              config: JSON.stringify(parsedConfig)
            };
          }).filter(e => e.sectionId);

          if (elementsToCreate.length > 0) {
            await prisma.element.createMany({ data: elementsToCreate });
          }
        }
      }
      return { success: true };
    } catch (error) {
      console.error("Import error:", error);
      require('fs').writeFileSync('import-error.log', String(error) + '\n' + (error.stack || ''));
      return new Response(JSON.stringify({ error: "Import failed" }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { "Content-Type": "application/json" } });
};

export default function Templates() {
  const { optionSets } = useLoaderData();
  const fetcher = useFetcher();
  const fileInputRef = useRef(null);

  // Download Helper
  const downloadJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const cleanTemplate = (template) => ({
    name: template.name,
    sections: template.sections?.map(s => ({
      id: s.id,
      title: s.title,
      order: s.order,
      visible: s.visible,
      styles: s.styles
    })) || [],
    elements: template.elements?.map(e => ({
      id: e.id,
      sectionId: e.sectionId,
      type: e.type,
      label: e.label,
      subtext: e.subtext,
      required: e.required,
      order: e.order,
      config: e.config
    })) || []
  });

  const exportTemplate = useCallback((id) => {
    const template = optionSets.find(t => t.id === id);
    if (template) {
      downloadJSON(cleanTemplate(template), `${template.name.replace(/\s+/g, '-').toLowerCase()}-template.json`);
    }
  }, [optionSets]);

  const exportAllTemplates = useCallback(() => {
    if (optionSets.length > 0) {
      downloadJSON(optionSets.map(cleanTemplate), "all-templates.json");
    } else {
      if (typeof shopify !== 'undefined' && shopify.toast) shopify.toast.show("No custom templates to export");
    }
  }, [optionSets]);

  const handleImport = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target.result;
        JSON.parse(json); // validate json
        fetcher.submit({ intent: "import", importData: json }, { method: "POST" });
        if (typeof shopify !== 'undefined' && shopify.toast) shopify.toast.show("Importing templates...");
      } catch (error) {
        if (typeof shopify !== 'undefined' && shopify.toast) shopify.toast.show("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = null;
  }, [fetcher]);
  // 1. State for Tabs
  const [selected, setSelected] = useState(0);
  const handleTabChange = useCallback((tabIndex) => setSelected(tabIndex), []);
  const navigate = useNavigate();

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  const confirmDelete = useCallback((id) => {
    setTemplateToDelete(id);
    setDeleteModalOpen(true);
  }, []);

  const executeDelete = useCallback(() => {
    if (templateToDelete) {
      fetcher.submit({ intent: "delete", id: templateToDelete }, { method: "POST" });
      setDeleteModalOpen(false);
      setTemplateToDelete(null);
      if (typeof shopify !== 'undefined' && shopify.toast) {
        shopify.toast.show("Template deleted");
      }
    }
  }, [templateToDelete, fetcher]);

  // 2. Tab Definitions
  const tabs = [
    {
      id: "pre-designed",
      content: (
        <InlineStack gap="200" align="center">
          <span>Pre-Designed Templates</span>
          <Badge tone="new">20</Badge>
        </InlineStack>
      ),
    },
    {
      id: "personalized",
      content: (
        <InlineStack gap="200" align="center">
          <span>Personalized Templates</span>
          <Badge tone="new">20</Badge>
        </InlineStack>
      ),
    },
    {
      id: "custom",
      content: (
        <InlineStack gap="200" align="center">
          <span>Custom Templates</span>
          <Badge>{optionSets.length}</Badge>
        </InlineStack>
      ),
    },
  ];

  // 3. Reusable Template Card Component
  const TemplateItem = ({ id, title, imageUrl, onClick, onExport }) => (
    <div className="template-card-wrapper">
    <Card padding="0">
      <BlockStack>
        {/* Image Container */}
        <Box 
          minHeight="200px" 
          width="100%" 
          overflow="hidden" 
          background="bg-surface-secondary"
          style={{ position: 'relative' }}
        >
          <img 
            src={imageUrl || "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"} 
            alt={title} 
            style={{ width: "100%", height: "200px", objectFit: "cover" }} 
          />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to top, rgba(0,0,0,0.05), transparent)' }} />
        </Box>
        
        {/* Content & Actions */}
        <Box padding="300">
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <Text variant="headingMd" as="h3" fontWeight="bold">{title}</Text>
              <InlineStack gap="100">
                {onExport && (
                  <Button variant="tertiary" onClick={() => onExport(id)}>Export</Button>
                )}
                {onClick && (
                  <Button variant="tertiary" tone="critical" onClick={() => confirmDelete(id)}>Delete</Button>
                )}
              </InlineStack>
            </InlineStack>
            <InlineStack gap="200" align="space-between">
              <div style={{ flex: 1 }}>
                <Button fullWidth variant="primary" onClick={onClick ? onClick : () => {
                  if (id) navigate(`/app/option-sets/new?templateId=${id}`);
                  else if (typeof shopify !== 'undefined' && shopify.toast) shopify.toast.show("This template is not available yet");
                }}>
                  {onClick ? "Edit template" : "+ Use template"}
                </Button>
              </div>
              <Button>View demo</Button>
            </InlineStack>
          </BlockStack>
        </Box>
      </BlockStack>
    </Card>
    </div>
  );

  // 4. Content Logic
  const renderTabContent = () => {
    switch (selected) {
      case 0: // Pre-Designed
        return (
          <Box padding="400">
            <InlineGrid columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} gap="400">
              <TemplateItem title="Glasses" imageUrl="https://burst.shopifycdn.com/photos/black-classic-glasses.jpg?width=400" />
              <TemplateItem title="Keychain" imageUrl="https://burst.shopifycdn.com/photos/keychain-with-keys.jpg?width=400" />
              <TemplateItem title="Bracelet" imageUrl="https://burst.shopifycdn.com/photos/silver-and-gold-bracelets.jpg?width=400" />
              <TemplateItem title="Mug" imageUrl="https://burst.shopifycdn.com/photos/white-ceramic-mug.jpg?width=400" />
            </InlineGrid>
          </Box>
        );
      case 1: // Personalized
        return (
          <Box padding="400">
            <InlineGrid columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} gap="400">
              <TemplateItem title="Photo Frame" imageUrl="https://burst.shopifycdn.com/photos/horse-in-snow.jpg?width=400" />
              <TemplateItem title="Custom Mug" imageUrl="https://burst.shopifycdn.com/photos/coffee-in-bed.jpg?width=400" />
            </InlineGrid>
          </Box>
        );
      case 2: // Custom
        return (
          <Box padding={optionSets.length === 0 ? "800" : "400"}>
            {optionSets.length === 0 ? (
              <EmptyState
                heading="No custom templates found"
                action={{ content: "Create template", variant: "primary", onAction: () => navigate("/app/templates/new") }}
                secondaryAction={{ content: "Learn more", onAction: () => window.open('https://help.shopify.com', '_blank') }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Create a custom template to save your frequently used product option configurations.</p>
              </EmptyState>
            ) : (
              <InlineGrid columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} gap="400">
                {optionSets.map(optSet => (
                  <TemplateItem 
                    key={optSet.id} 
                    id={optSet.id}
                    title={optSet.name} 
                    imageUrl={optSet.imageUrl}
                    onClick={() => navigate(`/app/templates/${optSet.id}`)}
                    onExport={exportTemplate}
                  />
                ))}
              </InlineGrid>
            )}
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Page
      title="Option Templates"
      primaryAction={{
        content: "Create template",
        onAction: () => navigate("/app/templates/new"),
      }}
      secondaryActions={[
        {
          content: "Import template",
          onAction: () => fileInputRef.current?.click(),
        },
        {
          content: "Export templates",
          onAction: exportAllTemplates,
        },
      ]}
    >
      <style>{`
        .template-card-wrapper {
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
          border-radius: var(--p-border-radius-200);
        }
        .template-card-wrapper:hover {
          transform: translateY(-2px);
          box-shadow: var(--p-shadow-300);
        }
      `}</style>
      <input 
        type="file" 
        accept=".json" 
        ref={fileInputRef} 
        style={{ display: "none" }} 
        onChange={handleImport} 
      />

      <BlockStack gap="400">
        <Card padding="0">
          <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange}>
            {renderTabContent()}
          </Tabs>
        </Card>

        <Modal
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete template?"
          primaryAction={{
            content: "Delete",
            destructive: true,
            onAction: executeDelete,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setDeleteModalOpen(false),
            },
          ]}
        >
          <Modal.Section>
            <Text as="p">This can&apos;t be undone.</Text>
          </Modal.Section>
        </Modal>
      </BlockStack>
    </Page>
  );
}