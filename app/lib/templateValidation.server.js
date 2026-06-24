/**
 * templateValidation.server.js
 *
 * Zod schemas for validating inbound form data in the template action.
 * All validation is server-side only.
 */

import { z } from "zod";

// ─── Primitives ────────────────────────────────────────────────────────────

const safeString = (maxLen = 500) =>
  z.string().trim().max(maxLen).transform((s) => s.replace(/[<>]/g, ""));

// ─── Element schema ─────────────────────────────────────────────────────────

const ElementSchema = z.object({
  id: z.string().max(64).optional(),
  sectionId: z.string().max(64).optional(),
  type: z.string().max(64).optional(),
  label: safeString(255).optional(),
  placeholder: safeString(255).optional(),
  required: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
  config: z.record(z.unknown()).optional(),
}).passthrough();

// ─── Section schema ──────────────────────────────────────────────────────────

const SectionSchema = z.object({
  id: z.string().max(64).optional(),
  title: safeString(255).optional(),
  visible: z.boolean().optional(),
  collapsed: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
  styles: z.record(z.unknown()).optional(),
}).passthrough();

// ─── Product rule schema ──────────────────────────────────────────────────────

const ProductRuleSchema = z.object({
  ruleType: z.string().max(64).optional(),
  value: z.union([z.string().max(2048), z.number(), z.null()]).optional(),
}).passthrough();

// ─── Top-level action payload schema ─────────────────────────────────────────

export const TemplateActionSchema = z.object({
  name: safeString(255).default("New Option Set"),
  elements: z.array(ElementSchema).max(500).default([]),
  sections: z.array(SectionSchema).max(50).default([]),
  productRules: z.array(ProductRuleSchema).max(100).default([]),
});

/**
 * Parse and validate raw formData fields into a typed payload.
 *
 * @param {FormData} formData
 * @returns {{ data: import("./templateValidation.server.js").TemplatePayload, error: null }
 *          |{ data: null, error: string }}
 */
export function validateTemplateFormData(formData) {
  let elements, sections, productRules;

  try {
    elements = JSON.parse(formData.get("elements") || "[]");
  } catch {
    return { data: null, error: "Invalid JSON in 'elements' field." };
  }

  try {
    sections = JSON.parse(formData.get("sections") || "[]");
  } catch {
    return { data: null, error: "Invalid JSON in 'sections' field." };
  }

  try {
    productRules = JSON.parse(formData.get("productRules") || "[]");
  } catch {
    return { data: null, error: "Invalid JSON in 'productRules' field." };
  }

  const result = TemplateActionSchema.safeParse({
    name: formData.get("name") ?? "New Option Set",
    elements,
    sections,
    productRules,
  });

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return {
      data: null,
      error: `Validation error at '${firstIssue.path.join(".")}': ${firstIssue.message}`,
    };
  }

  return { data: result.data, error: null };
}
