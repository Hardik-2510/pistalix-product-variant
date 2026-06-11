import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const elements = await prisma.element.findMany({
    where: {
      optionSetId: "cmpuq2oio0002vhz8refula7j"
    }
  });

  console.log(`Found ${elements.length} elements for Sample template`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
