import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Migrating tier names...");
  
  const shops = await prisma.shop.findMany();
  let updatedCount = 0;

  for (const shop of shops) {
    if (shop.planTier === 'free' || shop.planTier === 'basic' || shop.planTier === 'pro') {
      let newTier = 'basic';
      if (shop.planTier === 'basic') newTier = 'standard';
      if (shop.planTier === 'pro') newTier = 'premium';

      await prisma.shop.update({
        where: { id: shop.id },
        data: { planTier: newTier }
      });
      updatedCount++;
    }
  }

  console.log(`Migrated ${updatedCount} shops.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
