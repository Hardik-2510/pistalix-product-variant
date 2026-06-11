import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const optionSets = await prisma.optionSet.findMany({
    include: {
      sections: {
        include: {
          elements: {
            orderBy: { order: "asc" }
          }
        },
        orderBy: { order: "asc" }
      },
      productRules: true
    }
  });

  for (const os of optionSets) {
    console.log(`=== Option Set: ${os.name} (${os.id}) ===`);
    console.log(`Status: ${os.status}`);
    console.log(`Rules:`, os.productRules.map(r => `${r.targetType}: ${r.targetValues}`));
    for (const sec of os.sections) {
      console.log(`  Section: ${sec.title} (Order: ${sec.order})`);
      for (const el of sec.elements) {
        console.log(`    Element: ${el.label} (Type: ${el.type}, Order: ${el.order})`);
      }
    }
    console.log('\n');
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
