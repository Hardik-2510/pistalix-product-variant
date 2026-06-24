import { authenticate } from "../shopify.server";

const MAX_POLL_ATTEMPTS = 20;   // 20 × 500ms = 10s max wait
const POLL_INTERVAL_MS = 500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST /api/upload
 *
 * Accepts a multipart FormData body with one or more `file` fields.
 * All files are staged and pushed to GCS in parallel, then all
 * registered with fileCreate at once, then polled in parallel until READY.
 *
 * Returns:
 *   { ok: true,  urls: ["https://cdn.shopify.com/...", ...] }  (multiple files)
 *   { ok: true,  url:  "https://cdn.shopify.com/..." }          (single file, backward-compat)
 *   { ok: false, error: "..." }
 */
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

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

  // ── 2. Single stagedUploadsCreate call for ALL files ─────────────────────
  let stagedTargets;
  try {
    const stagedRes = await admin.graphql(
      `#graphql
        mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
          stagedUploadsCreate(input: $input) {
            stagedTargets {
              url
              resourceUrl
              parameters { name value }
            }
            userErrors { field message }
          }
        }
      `,
      {
        variables: {
          input: files.map((f) => ({
            resource: "FILE",
            filename:   f.name  || "upload.jpg",
            mimeType:   f.type  || "image/jpeg",
            fileSize:   String(f.size),
            httpMethod: "POST",
          })),
        },
      }
    );

    const stagedJson  = await stagedRes.json();
    const userErrors  = stagedJson?.data?.stagedUploadsCreate?.userErrors;
    if (userErrors?.length) {
      return Response.json({ ok: false, error: userErrors[0].message }, { status: 400 });
    }
    stagedTargets = stagedJson?.data?.stagedUploadsCreate?.stagedTargets;
    if (!stagedTargets?.length) {
      return Response.json({ ok: false, error: "Could not create staged upload targets." }, { status: 500 });
    }
  } catch (err) {
    return Response.json({ ok: false, error: "Staged upload request failed: " + err.message }, { status: 500 });
  }

  // ── 3. Push ALL files to GCS in parallel ─────────────────────────────────
  try {
    await Promise.all(
      files.map((file, i) => {
        const target = stagedTargets[i];
        const uploadFormData = new FormData();
        for (const param of target.parameters) {
          uploadFormData.append(param.name, param.value);
        }
        uploadFormData.append("file", file); // file must be last

        return fetch(target.url, { method: "POST", body: uploadFormData }).then((res) => {
          if (!res.ok) throw new Error(`GCS upload failed for file ${i}: ${res.status}`);
        });
      })
    );
  } catch (err) {
    return Response.json({ ok: false, error: "Binary upload failed: " + err.message }, { status: 500 });
  }

  // ── 4. Register ALL files in Shopify with one fileCreate call ─────────────
  let fileGids;
  try {
    const createRes = await admin.graphql(
      `#graphql
        mutation fileCreate($files: [FileCreateInput!]!) {
          fileCreate(files: $files) {
            files {
              id
              fileStatus
              ... on MediaImage  { id fileStatus image { url } }
              ... on GenericFile { id fileStatus url }
            }
            userErrors { field message }
          }
        }
      `,
      {
        variables: {
          files: stagedTargets.map((t) => ({
            originalSource: t.resourceUrl,
            contentType:    "IMAGE",
          })),
        },
      }
    );

    const createJson   = await createRes.json();
    const createErrors = createJson?.data?.fileCreate?.userErrors;
    if (createErrors?.length) {
      return Response.json({ ok: false, error: createErrors[0].message }, { status: 400 });
    }
    const createdFiles = createJson?.data?.fileCreate?.files;
    if (!createdFiles?.length) {
      return Response.json({ ok: false, error: "File registration returned no files." }, { status: 500 });
    }
    fileGids = createdFiles.map((f) => f.id);
  } catch (err) {
    return Response.json({ ok: false, error: "fileCreate failed: " + err.message }, { status: 500 });
  }

  // ── 5. Poll ALL files in parallel until READY (or FAILED) ────────────────
  const resolvedUrls = await Promise.all(
    fileGids.map(async (gid) => {
      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        await sleep(POLL_INTERVAL_MS);
        try {
          const pollRes  = await admin.graphql(
            `#graphql
              query getFileStatus($id: ID!) {
                node(id: $id) {
                  ... on MediaImage  { id fileStatus image { url } }
                  ... on GenericFile { id fileStatus url }
                }
              }
            `,
            { variables: { id: gid } }
          );
          const pollJson = await pollRes.json();
          const f        = pollJson?.data?.node;
          const status   = f?.fileStatus;

          if (status === "READY") return f?.image?.url || f?.url || null;
          if (status === "FAILED") return null;
        } catch {
          // transient error — keep polling
        }
      }
      return null; // timed out
    })
  );

  const urls = resolvedUrls.filter(Boolean);

  if (!urls.length) {
    return Response.json(
      { ok: false, error: "Shopify failed to process the uploaded image(s). Please try again." },
      { status: 504 }
    );
  }

  // Backward-compatible: single file → return `url`, multiple → return `urls`
  if (files.length === 1) {
    return Response.json({ ok: true, url: urls[0] });
  }
  return Response.json({ ok: true, urls });
};
