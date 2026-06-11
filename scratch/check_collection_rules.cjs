const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rules = await prisma.productRule.findMany();
  console.log("All Product Rules:", JSON.stringify(rules, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
