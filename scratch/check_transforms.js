import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const shop = 'follow-docs.myshopify.com';
  
  // Find session
  const session = await prisma.session.findFirst({
    where: { shop }
  });

  if (!session) {
    console.log("No session found");
    return;
  }

  const response = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': session.accessToken
    },
    body: JSON.stringify({
      query: `
        query {
          cartTransforms(first: 10) {
            nodes {
              id
              functionId
            }
          }
        }
      `
    })
  });

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
