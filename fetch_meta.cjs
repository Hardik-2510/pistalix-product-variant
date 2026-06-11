const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const session = await prisma.session.findFirst({ where: { shop: 'follow-docs.myshopify.com' } });
  const response = await fetch('https://follow-docs.myshopify.com/admin/api/2024-04/graphql.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': session.accessToken },
    body: JSON.stringify({
      query: `query { products(first: 10, query: "handle:18k-interlinked-earrings") { edges { node { id, metafield(namespace: "pistalix", key: "product_options") { value } } } } }`
    })
  });
  const data = await response.json();
  console.log("Full response:", JSON.stringify(data, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
