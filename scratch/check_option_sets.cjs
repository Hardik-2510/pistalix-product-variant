const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sets = await prisma.optionSet.findMany({
    include: { productRules: true }
  });
  console.log("All Option Sets:", JSON.stringify(sets, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
