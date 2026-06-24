/**
 * One-time script: Force-sync ALL existing templates in the DB
 * to Shopify product metafields so the storefront Liquid block
 * can serve them directly without any API call.
 *
 * Usage: node scratch/sync_all_templates.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SHOP = 'varify-pov.myshopify.com';

async function run() {
  // 1. Get session/access token
  const session = await prisma.session.findFirst({ where: { shop: SHOP } });
  if (!session?.accessToken) {
    console.error('No session found for', SHOP);
    return;
  }
  const token = session.accessToken;

  // 2. Fetch all option sets
  const optionSets = await prisma.optionSet.findMany({
    where: { shopId: SHOP },
    include: {
      productRules: true,
      sections: {
        include: { elements: { orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' }
      }
    }
  });

  console.log(`Found ${optionSets.length} option sets to sync.`);

  for (const os of optionSets) {
    console.log(`\n─── Syncing: "${os.name}" (${os.id}) ───`);

    const elements = os.sections.flatMap(sec =>
      sec.elements.map(el => ({
        id: el.id,
        type: el.type,
        label: el.label,
        subtext: el.subtext,
        required: el.required,
        order: el.order,
        config: el.config ? JSON.parse(el.config) : {}
      }))
    );

    const payload = JSON.stringify({ id: os.id, name: os.name, elements });
    const payloadKB = (new TextEncoder().encode(payload).length / 1024).toFixed(1);
    console.log(`  Payload size: ${payloadKB} KB`);

    if (payloadKB > 120) {
      console.warn(`  ⚠️  SKIPPING — payload exceeds 128KB Shopify limit (${payloadKB} KB)`);
      console.warn('     This template likely has base64 images. Remove them and re-upload via the CDN uploader.');
      continue;
    }

    // Collect target product GIDs from manual rules
    const manualTargets = [];
    let isGlobal = false;

    for (const rule of os.productRules) {
      if (rule.targetType === 'manual') {
        try {
          const vals = JSON.parse(rule.targetValues || '[]');
          if (Array.isArray(vals)) manualTargets.push(...vals);
          else if (typeof vals === 'string') manualTargets.push(vals);
        } catch {
          if (rule.targetValues) manualTargets.push(rule.targetValues);
        }
      } else if (['all', 'all_products'].includes((rule.targetType || '').toLowerCase())) {
        isGlobal = true;
      }
    }

    const gql = async (query, variables = {}) => {
      const res = await fetch(`https://${SHOP}/admin/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token
        },
        body: JSON.stringify({ query, variables })
      });
      return res.json();
    };

    // Write to product metafields
    if (manualTargets.length > 0) {
      for (const gid of manualTargets) {
        const result = await gql(`
          mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields { id key namespace }
              userErrors { field message }
            }
          }
        `, {
          metafields: [{
            ownerId: gid,
            namespace: 'pistalix',
            key: 'product_options',
            type: 'json',
            value: payload
          }]
        });

        const errors = result?.data?.metafieldsSet?.userErrors;
        if (errors?.length) {
          console.error(`  ❌ Error syncing to ${gid}:`, errors);
        } else {
          console.log(`  ✅ Synced to product ${gid}`);
        }
      }
    }

    // Write to shop-level metafield for "all products" rules
    if (isGlobal) {
      const shopRes = await gql(`query { shop { id } }`);
      const shopId = shopRes?.data?.shop?.id;
      if (shopId) {
        const result = await gql(`
          mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields { id key namespace }
              userErrors { field message }
            }
          }
        `, {
          metafields: [{
            ownerId: shopId,
            namespace: 'pistalix',
            key: 'global_product_options',
            type: 'json',
            value: payload
          }]
        });
        const errors = result?.data?.metafieldsSet?.userErrors;
        if (errors?.length) {
          console.error('  ❌ Global metafield error:', errors);
        } else {
          console.log('  ✅ Synced as global (shop-level) metafield');
        }
      }
    }

    if (!isGlobal && manualTargets.length === 0) {
      console.log('  ⏭  No product rules assigned — skipping');
    }
  }

  console.log('\n🎉 Sync complete!');
  console.log('Hard-refresh your storefront product pages — templates should now appear instantly from metafields.');
}

run().catch(console.error).finally(() => prisma.$disconnect());
