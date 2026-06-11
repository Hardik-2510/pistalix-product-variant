import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const os = await prisma.optionSet.findMany({
    include: { productRules: true }
  });
  console.log(JSON.stringify(os, null, 2));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
