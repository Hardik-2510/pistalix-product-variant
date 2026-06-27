import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

/**
 * DigitalOcean Spaces client (S3-compatible).
 *
 * Required environment variables:
 *   SPACES_KEY       Spaces access key
 *   SPACES_SECRET    Spaces secret key
 *   SPACES_REGION    e.g. "blr1", "nyc3", "fra1"
 *   SPACES_ENDPOINT  e.g. "https://blr1.digitaloceanspaces.com"
 *   SPACES_BUCKET    the Space name
 *   SPACES_CDN_URL   public base URL used to serve files,
 *                    e.g. "https://<bucket>.<region>.cdn.digitaloceanspaces.com"
 */

const {
  SPACES_KEY,
  SPACES_SECRET,
  SPACES_REGION,
  SPACES_ENDPOINT,
  SPACES_BUCKET,
  SPACES_CDN_URL,
} = process.env;

// Root folder inside the Space that THIS app owns. All uploads live under it,
// so the app's files never mix with other content in a shared Space.
// Override with SPACES_FOLDER; defaults to "varify-product-options".
const APP_FOLDER = (process.env.SPACES_FOLDER || "varify-product-options")
  .replace(/^\/+|\/+$/g, "")
  .trim();

let cachedClient = null;

function getClient() {
  if (cachedClient) return cachedClient;

  if (!SPACES_KEY || !SPACES_SECRET || !SPACES_REGION || !SPACES_ENDPOINT || !SPACES_BUCKET) {
    throw new Error(
      "Spaces is not configured. Set SPACES_KEY, SPACES_SECRET, SPACES_REGION, SPACES_ENDPOINT and SPACES_BUCKET."
    );
  }

  cachedClient = new S3Client({
    region: SPACES_REGION,
    endpoint: SPACES_ENDPOINT,
    forcePathStyle: false, // DO Spaces uses virtual-hosted-style URLs
    credentials: {
      accessKeyId: SPACES_KEY,
      secretAccessKey: SPACES_SECRET,
    },
  });

  return cachedClient;
}

/** Strip anything that could break an object key, keep a readable suffix. */
function safeFilename(name) {
  const cleaned = (name || "upload")
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "upload";
}

/** Build the public URL for a stored object. */
function publicUrl(key) {
  if (SPACES_CDN_URL) {
    return `${SPACES_CDN_URL.replace(/\/+$/, "")}/${key}`;
  }
  // Fallback: origin (non-CDN) URL derived from endpoint + bucket.
  const host = SPACES_ENDPOINT.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `https://${SPACES_BUCKET}.${host}/${key}`;
}

/**
 * Upload a single web File/Blob to Spaces and return its public URL.
 *
 * @param {File}   file   A web File from FormData.
 * @param {string} shop   Shop domain, used to namespace keys.
 * @returns {Promise<string>} public CDN URL
 */
export async function uploadToSpaces(file, shop) {
  const client = getClient();

  const ext = (file.name?.split(".").pop() || "").toLowerCase();
  const base = safeFilename(file.name?.replace(/\.[^.]+$/, ""));
  const shopPrefix = safeFilename(shop || "shared");
  // <app-folder>/<shop>/<uuid>-<name>.<ext>
  const key = `${APP_FOLDER}/${shopPrefix}/${randomUUID()}-${base}${ext ? "." + ext : ""}`;

  const body = Buffer.from(await file.arrayBuffer());

  await client.send(
    new PutObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: key,
      Body: body,
      ContentType: file.type || "application/octet-stream",
      ACL: "public-read",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return publicUrl(key);
}
