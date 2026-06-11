import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const shop = 'follow-docs.myshopify.com';
  const productId = '8785993203883';
  const productGid = `gid://shopify/Product/${productId}`;

  const optionSets = await prisma.optionSet.findMany({
    where: {
      shopId: shop,
      status: { in: ["ACTIVE", "TEMPLATE"] }
    },
    include: {
      productRules: true,
      elements: true,
    },
  });

  console.log(`Found ${optionSets.length} Option Sets for shop`);

  let matchedOptionSet = null;

  for (const os of optionSets) {
    for (const rule of os.productRules) {
      console.log(`Evaluating Rule: type=${rule.targetType}, values=${rule.targetValues}`);
      if (rule.targetType === "manual") {
        try {
          const values = JSON.parse(rule.targetValues || "[]");
          if (Array.isArray(values) && values.includes(productGid)) {
            console.log("Matched via JSON array!");
            matchedOptionSet = os;
            break;
          } else if (typeof rule.targetValues === 'string' && rule.targetValues === productGid) {
            console.log("Matched via Exact string in try block!");
             matchedOptionSet = os;
             break;
          }
        } catch (e) {
          if (rule.targetValues === productGid) {
            console.log("Matched via Exact string in catch block!");
            matchedOptionSet = os;
            break;
          }
        }
      }
    }
    if (matchedOptionSet) break;
  }

  if (matchedOptionSet) {
    console.log("MATCHED OPTION SET:", matchedOptionSet.name);
  } else {
    console.log("NO MATCH FOUND!");
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
