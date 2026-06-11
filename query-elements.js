import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sets = await prisma.optionSet.findMany({
    include: {
      sections: {
        include: { elements: true },
        orderBy: { order: 'asc' }
      },
      elements: {
        orderBy: { order: 'asc' }
      }
    }
  });
  console.log("OPTION SETS:", JSON.stringify(sets, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
