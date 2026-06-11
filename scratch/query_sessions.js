const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.session.findMany();
  console.log("Sessions:", sessions.map(s => ({
    id: s.id,
    shop: s.shop,
    isOnline: s.isOnline,
    accessToken: s.accessToken ? s.accessToken.substring(0, 10) + '...' : null,
    expires: s.expires
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
