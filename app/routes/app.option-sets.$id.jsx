import { redirect } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import crypto from "crypto";
import OptionSetBuilder from "../components/OptionSetBuilder";
import { syncOptionSetToMetafields, clearOptionSetMetafields } from "../lib/metafields.server";

/**
 * Loader — fetches existing option set with all elements and product rules.
 */
export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const optionSet = await prisma.optionSet.findUnique({
    where: { id: params.id },
    include: {
      sections: true,
      elements: { orderBy: { order: "asc" } },
      productRules: true,
    },
  });

  if (!optionSet || optionSet.shopId !== session.shop) {
    throw new Response("Not found", { status: 404 });
  }

  return { optionSet };
};

/**
 * Action — handles Save, Delete, and Duplicate for existing option sets.
 * Save uses a Prisma transaction: deletes old elements/rules, creates new ones.
 */
export const action = async ({ request, params }) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("_action");

  // Verify ownership
  const existing = await prisma.optionSet.findUnique({
    where: { id: params.id },
  });
  if (!existing || existing.shopId !== session.shop) {
    return { error: "Option set not found." };
  }

  // ─── DELETE ─────────────────────────────────────────────────────────
  if (actionType === "delete") {
    try {
      await clearOptionSetMetafields(params.id, admin);
    } catch (e) {
      console.error("Failed to clear metafields on delete:", e);
    }
    await prisma.optionSet.delete({ where: { id: params.id } });
    return redirect("/app/option-sets");
  }

  // ─── DUPLICATE ──────────────────────────────────────────────────────
  if (actionType === "duplicate") {
    const original = await prisma.optionSet.findUnique({
      where: { id: params.id },
      include: { sections: true, elements: true, productRules: true },
    });

    const duplicated = await prisma.$transaction(async (tx) => {
      const newSet = await tx.optionSet.create({
        data: {
          shopId: session.shop,
          name: `${original.name} (Copy)`,
          status: original.status,
        },
      });

      const secIdMap = {};
      if (original.sections) {
        for (const sec of original.sections) {
          secIdMap[sec.id] = `sec_${crypto.randomUUID().replace(/-/g, "")}`;
        }
      }

      const elIdMap = {};
      if (original.elements) {
        for (const el of original.elements) {
          elIdMap[el.id] = `el_${crypto.randomUUID().replace(/-/g, "")}`;
        }
      }

      if (original.sections && original.sections.length > 0) {
        for (const sec of original.sections) {
          const newSecId = secIdMap[sec.id];
          await tx.section.create({
            data: {
              id: newSecId,
              optionSetId: newSet.id,
              title: sec.title,
              order: sec.order,
              visible: sec.visible,
              styles: sec.styles
            }
          });
          const secEls = original.elements.filter(el => el.sectionId === sec.id);
          if (secEls.length > 0) {
            await tx.element.createMany({
              data: secEls.map((el) => {
                let parsedConfig = {};
                try {
                  parsedConfig = typeof el.config === "string" ? JSON.parse(el.config) : el.config || {};
                } catch { parsedConfig = {}; }

                if (parsedConfig.sectionId && secIdMap[parsedConfig.sectionId]) {
                  parsedConfig.sectionId = secIdMap[parsedConfig.sectionId];
                }
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
                  id: elIdMap[el.id],
                  optionSetId: newSet.id,
                  sectionId: newSecId,
                  type: el.type,
                  label: el.label,
                  subtext: el.subtext,
                  required: el.required,
                  order: el.order,
                  config: JSON.stringify(parsedConfig),
                };
              }),
            });
          }
        }
      }

      if (original.productRules.length > 0) {
        await tx.productRule.createMany({
          data: original.productRules.map((r) => ({
            optionSetId: newSet.id,
            targetType: r.targetType,
            targetValues: r.targetValues,
          })),
        });
      }

      return newSet;
    });

    return redirect(`/app/option-sets/${duplicated.id}`);
  }

  // ─── SAVE ───────────────────────────────────────────────────────────
  if (actionType === "save") {
    const name = formData.get("name") || "New Option Set";
    const status = formData.get("status") || "active";

    let parsedSections = [];
    let parsedElements = [];
    let parsedRules = [];
    try {
      parsedSections = JSON.parse(formData.get("sections") || "[]");
    } catch { parsedSections = []; }
    try {
      parsedElements = JSON.parse(formData.get("elements") || "[]");
    } catch { parsedElements = []; }
    try {
      parsedRules = JSON.parse(formData.get("productRules") || "[]");
    } catch { parsedRules = []; }

    try {
      await prisma.$transaction(async (tx) => {
        // Update the option set
        await tx.optionSet.update({
          where: { id: params.id },
          data: { name, status },
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

        // Delete old elements, sections and rules, then recreate
        await tx.element.deleteMany({ where: { optionSetId: params.id } });
        await tx.section.deleteMany({ where: { optionSetId: params.id } });
        await tx.productRule.deleteMany({ where: { optionSetId: params.id } });

        if (parsedSections.length === 0) {
           parsedSections = [{ id: "section-1", collapsed: false }];
        }

        for (let idx = 0; idx < parsedSections.length; idx++) {
          const sec = parsedSections[idx];
          const newSecId = secIdMap[sec.id];
          await tx.section.create({
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
            await tx.element.createMany({
              data: sectionElements.map((el, elIdx) => ({
                id: el.newId,
                optionSetId: params.id,
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
              optionSetId: params.id,
              targetType: r.ruleType,
              targetValues: r.value ? String(r.value) : "[]",
            })),
          });
        }
      });

      try {
        await syncOptionSetToMetafields(params.id, admin);
      } catch (e) {
        console.error("Failed to sync updated option set to metafields:", e);
      }

      return { success: true };
    } catch (error) {
      return { error: "Failed to save option set. Please try again." };
    }
  }

  return { error: "Unknown action" };
};

/**
 * OptionSetEdit — Edit existing option set page.
 * Uses the shared OptionSetBuilder component with pre-loaded data.
 */
export default function OptionSetEdit() {
  const { optionSet } = useLoaderData();
  return <OptionSetBuilder initialData={optionSet} isEdit={true} />;
}
