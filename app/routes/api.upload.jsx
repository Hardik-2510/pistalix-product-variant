import { authenticate } from "../shopify.server";
import { uploadToSpaces } from "../lib/spaces.server";

/**
 * POST /api/upload
 *
 * Accepts a multipart FormData body with one or more `file` fields and
 * uploads them to DigitalOcean Spaces. All files upload in parallel.
 *
 * Returns:
 *   { ok: true,  urls: ["https://...cdn.digitaloceanspaces.com/...", ...] }  (multiple)
 *   { ok: true,  url:  "https://...cdn.digitaloceanspaces.com/..." }          (single, backward-compat)
 *   { ok: false, error: "..." }
 */

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per file
const ALLOWED_PREFIX = "image/";

export const action = async ({ request }) => {
  // Authenticated admin request — also gives us the shop for key namespacing.
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;

  // ── 1. Parse all incoming files ──────────────────────────────────────────
  let files;
  try {
    const formData = await request.formData();
    const raw = formData.getAll("file");
    files = raw.filter((f) => f && typeof f !== "string" && f.size > 0);
  } catch {
    return Response.json({ ok: false, error: "Failed to parse form data." }, { status: 400 });
  }

  if (!files.length) {
    return Response.json({ ok: false, error: "No file(s) provided." }, { status: 400 });
  }

  // ── 2. Validate type and size ────────────────────────────────────────────
  for (const file of files) {
    if (file.type && !file.type.startsWith(ALLOWED_PREFIX)) {
      return Response.json({ ok: false, error: "Only image files are allowed." }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return Response.json({ ok: false, error: "Each image must be 10 MB or smaller." }, { status: 400 });
    }
  }

  // ── 3. Upload all files to Spaces in parallel ────────────────────────────
  let urls;
  try {
    urls = await Promise.all(files.map((file) => uploadToSpaces(file, shop)));
  } catch (err) {
    return Response.json(
      { ok: false, error: "Upload failed: " + (err?.message || "unknown error") },
      { status: 500 }
    );
  }

  // Backward-compatible: single file → return `url`, multiple → return `urls`
  if (files.length === 1) {
    return Response.json({ ok: true, url: urls[0] });
  }
  return Response.json({ ok: true, urls });
};
