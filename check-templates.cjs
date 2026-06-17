const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTemplates() {
  const templates = await prisma.optionSet.findMany({
    where: { status: 'TEMPLATE' },
    include: { productRules: true }
  });
  
  console.log(JSON.stringify(templates.map(t => ({ id: t.id, name: t.name, rules: t.productRules })), null, 2));
}

checkTemplates().finally(() => prisma.$disconnect());
