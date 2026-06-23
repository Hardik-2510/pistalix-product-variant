const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.shop.findMany().then(shops => {
  console.log(JSON.stringify(shops, null, 2));
}).finally(() => {
  prisma.$disconnect();
});
