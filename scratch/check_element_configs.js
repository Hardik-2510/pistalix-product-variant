import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const os = await prisma.optionSet.findFirst({
    where: { name: "Necklace" },
    include: {
      sections: {
        include: {
          elements: {
            orderBy: { order: "asc" }
          }
        },
        orderBy: { order: "asc" }
      }
    }
  });

  if (!os) {
    console.log("Necklace template not found");
    return;
  }

  console.log(`=== Necklace Template Elements and Configs ===`);
  for (const sec of os.sections) {
    console.log(`\nSection: ${sec.title}`);
    for (const el of sec.elements) {
      console.log(`  - Element: ${el.label} (ID: ${el.id}, Type: ${el.type})`);
      console.log(`    Config:`, JSON.stringify(JSON.parse(el.config || "{}"), null, 2));
    }
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
