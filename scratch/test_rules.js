import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const shop = 'varify-pov.myshopify.com';
  const productId = '8785993892011';
  const productGid = `gid://shopify/Product/${productId}`;

  const optionSets = await prisma.optionSet.findMany({
    where: {
      shopId: shop,
      status: { in: ["ACTIVE", "active", "TEMPLATE", "template"] }
    },
    include: {
      productRules: true,
      sections: {
        include: { elements: true }
      },
      elements: {
        orderBy: { order: "asc" },
      },
    },
  });

  console.log("Found optionSets:", optionSets.length);
  if (optionSets.length > 0) {
    console.log("Elements count:", optionSets[0].elements.length);
    console.log("Sections count:", optionSets[0].sections.length);
  }

  let matchedOptionSet = null;

  for (const os of optionSets) {
    for (const rule of os.productRules) {
      if (rule.targetType === "manual") {
        try {
          const values = JSON.parse(rule.targetValues || "[]");
          if (Array.isArray(values) && values.includes(productGid)) {
            matchedOptionSet = os;
            break;
          } else if (typeof rule.targetValues === 'string' && rule.targetValues === productGid) {
            matchedOptionSet = os;
            break;
          }
        } catch (e) {
          if (rule.targetValues === productGid) {
            matchedOptionSet = os;
            break;
          }
        }
      }
    }
    if (matchedOptionSet) break;
  }

  if (matchedOptionSet) {
    console.log("Matched!", matchedOptionSet.name);
  } else {
    console.log("No match found for", productGid);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
