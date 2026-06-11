import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sets = await prisma.optionSet.findMany({
    include: {
      sections: {
        orderBy: { order: 'asc' }
      },
      elements: {
        orderBy: { order: 'asc' }
      }
    }
  });
  console.log("OPTION SETS IN DB:");
  sets.forEach(set => {
    console.log(`\n=== OPTION SET: "${set.name}" (ID: ${set.id}, Status: ${set.status}) ===`);
    console.log("Sections:");
    set.sections.forEach(sec => {
      console.log(`  - Section ID: ${sec.id}, Title: "${sec.title}", Order: ${sec.order}`);
    });
    console.log("Elements:");
    set.elements.forEach(el => {
      console.log(`  - Element ID: ${el.id}, Label: "${el.label}", Type: "${el.type}", Order: ${el.order}, SectionId: ${el.sectionId}`);
    });
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
