import { redirect, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import OptionSetBuilder from "../components/OptionSetBuilder";
import { syncOptionSetToMetafields } from "../lib/metafields.server";
import { getShopFeatures, validateOptionSetLimit } from "../lib/features.server";
import process from "process";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const templateId = url.searchParams.get("templateId");
  
  if (templateId) {
    const template = await prisma.optionSet.findUnique({
      where: { id: templateId },
      include: {
        sections: true,
        elements: { orderBy: { order: "asc" } },
        productRules: true,
      },
    });
    // Double check it belongs to the shop or is a global template. We'll just return it.
    if (template && (template.shopId === session.shop || template.status === "TEMPLATE")) {
      return { template };
    }
  }

  const predefinedId = url.searchParams.get("predefinedId");
  if (predefinedId) {
    const fs = await import("fs");
    const path = await import("path");
    let predefinedTemplates = [];
    try { predefinedTemplates = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app', 'lib', 'predefinedTemplates.json'), 'utf-8')); } catch(e){ /* ignore */ }
    let personalizedTemplates = [];
    try { personalizedTemplates = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app', 'lib', 'personalizedTemplates.json'), 'utf-8')); } catch(e){ /* ignore */ }

    const template = predefinedTemplates.find(t => t.id === predefinedId) || personalizedTemplates.find(t => t.id === predefinedId);
    if (template) {
      return { template };
    }
  }
  
  const { tier: currentTier, features } = await getShopFeatures(session.shop);
  
  return { template: null, currentTier, features };
};

/**
 * Action — handles Save, Delete, and Duplicate for new option sets.
 * Uses a Prisma transaction to create the OptionSet with all its Elements
 * and ProductRules atomically.
 */
export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("_action");

  if (actionType === "save") {
    // Check combined option-set + template limit
    const limitCheck = await validateOptionSetLimit(session.shop);
    if (!limitCheck.allowed) {
      return { error: `You have reached your plan limit of ${limitCheck.limit} option sets & templates (currently using ${limitCheck.current}). Please upgrade to create more.` };
    }

    const name = formData.get("name") || "New Option Set";
    const status = formData.get("status") || "active";

    let parsedElements = [];
    let parsedRules = [];
    try {
      parsedElements = JSON.parse(formData.get("elements") || "[]");
    } catch { parsedElements = []; }
    try {
      parsedRules = JSON.parse(formData.get("productRules") || "[]");
    } catch { parsedRules = []; }

    let parsedSections = [];
    try {
      parsedSections = JSON.parse(formData.get("sections") || "[]");
    } catch { parsedSections = []; }

    const { features } = await getShopFeatures(session.shop);
    const maxSections = features.maxSectionsPerOptionSet || 1;
    if (parsedSections.length > maxSections) {
      return { error: `Your plan limits you to ${maxSections} section${maxSections > 1 ? 's' : ''} per option set. Please upgrade to Premium for unlimited sections.` };
    }

    try {
      const optionSet = await prisma.$transaction(async (tx) => {
        // Guarantee the Shop row exists (OptionSet.shopId FKs to Shop.shopDomain).
        await tx.shop.upsert({
          where: { shopDomain: session.shop },
          update: {},
          create: { shopDomain: session.shop },
        });
        const created = await tx.optionSet.create({
          data: {
            shopId: session.shop,
            name,
            status,
          },
        });

        if (parsedSections.length === 0) {
           parsedSections = [{ id: "section-1", collapsed: false }];
        }

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
          await tx.section.create({
            data: {
              id: newSecId,
              optionSetId: created.id,
              title: sec.title || `Section ${idx + 1}`,
              order: idx,
              visible: sec.visible !== false,
              styles: JSON.stringify(sec.styles || {})
            }
          });

          const sectionElements = parsedElements.filter(el => el.sectionId === sec.id);

          if (sectionElements.length > 0) {
            await tx.element.createMany({
              data: sectionElements.map((el, elIdx) => ({
                id: el.newId,
                optionSetId: created.id,
                sectionId: newSecId,
                type: el.type || "Text",
                label: el.label || "Option",
                subtext: el.placeholder || el.config?.subtext || null,
                required: el.required || false,
                order: elIdx,
                config: JSON.stringify(el.config || {}),
              })),
            });
          }
        }

        if (parsedRules.length > 0) {
          await tx.productRule.createMany({
            data: parsedRules.map((r) => ({
              optionSetId: created.id,
              targetType: r.ruleType,
              targetValues: r.value ? String(r.value) : "[]",
            })),
          });
        }

        return created;
      });

      try {
        await syncOptionSetToMetafields(optionSet.id, admin);
      } catch (e) {
        console.error("Failed to sync new option set to metafields:", e);
      }

      return redirect(`/app/option-sets/${optionSet.id}`);
    } catch (error) {
      return { error: "Failed to create option set. Please try again." };
    }
  }

  return { error: "Unknown action" };
};

/**
 * OptionSetNew — Create new option set page.
 * Uses the shared OptionSetBuilder component with no initial data.
 */
export default function OptionSetNew() {
  const { template, currentTier } = useLoaderData();
  return <OptionSetBuilder initialData={template} isEdit={false} hasConditionalLogic={true} currentTier={currentTier} />;
}
