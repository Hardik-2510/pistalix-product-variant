/**
 * Daily SQLite → DigitalOcean Spaces backup.
 *
 * Runs INSIDE the app container (it already has Prisma + the AWS SDK and the
 * /data volume mounted), so no extra images or host tools are needed:
 *
 *   docker compose exec -T app node scripts/backup-db.mjs
 *
 * Produces a consistent point-in-time snapshot with `VACUUM INTO` (safe while
 * the app is running) and uploads it PRIVATELY — the DB holds Shopify access
 * tokens and must never be public.
 */
import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFile, unlink, copyFile } from "node:fs/promises";

const {
  SPACES_KEY,
  SPACES_SECRET,
  SPACES_REGION,
  SPACES_ENDPOINT,
  SPACES_BUCKET,
  SPACES_FOLDER = "varify-product-options",
} = process.env;

const DB_PATH = (process.env.DATABASE_URL || "file:/data/prod.sqlite").replace(/^file:/, "");
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19); // 2026-06-27T03-00-00
const snapshotPath = `/data/backup-${stamp}.sqlite`;

async function main() {
  if (!SPACES_KEY || !SPACES_SECRET || !SPACES_REGION || !SPACES_ENDPOINT || !SPACES_BUCKET) {
    throw new Error("Spaces env vars missing — cannot upload backup.");
  }

  // ── 1. Create a consistent snapshot ──────────────────────────────────────
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`VACUUM INTO '${snapshotPath}'`);
  } catch (err) {
    // Fallback for environments where VACUUM INTO is unavailable.
    console.warn(`VACUUM INTO failed (${err.message}); falling back to file copy.`);
    await copyFile(DB_PATH, snapshotPath);
  } finally {
    await prisma.$disconnect();
  }

  // ── 2. Upload privately to Spaces ────────────────────────────────────────
  const body = await readFile(snapshotPath);

  const s3 = new S3Client({
    region: SPACES_REGION,
    endpoint: SPACES_ENDPOINT,
    forcePathStyle: false,
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
  });

  const folder = SPACES_FOLDER.replace(/^\/+|\/+$/g, "");
  const key = `${folder}/backups/prod-${stamp}.sqlite`;

  await s3.send(
    new PutObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: key,
      Body: body,
      ContentType: "application/x-sqlite3",
      ACL: "private", // backups contain access tokens — never public
    })
  );

  // ── 3. Clean up the local snapshot ───────────────────────────────────────
  await unlink(snapshotPath).catch(() => {});

  console.log(`Backup uploaded: s3://${SPACES_BUCKET}/${key} (${body.length} bytes)`);
}

main().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
