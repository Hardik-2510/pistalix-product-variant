const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const session = await prisma.session.findFirst({
    where: { shop: 'follow-docs.myshopify.com' }
  });

  if (!session) {
    console.error("No session found!");
    return;
  }

  const url = `https://${session.shop}/admin/api/2026-04/graphql.json`;
  const productGid = "gid://shopify/Product/8785993629867";

  console.log(`Querying metafields for product: ${productGid}`);
  
  const query = `
    query GetProductMetafields($id: ID!) {
      product(id: $id) {
        title
        metafield(namespace: "pistalix", key: "product_options") {
          id
          namespace
          key
          value
        }
      }
    }
  `;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': session.accessToken
    },
    body: JSON.stringify({
      query,
      variables: { id: productGid }
    })
  });

  const data = await res.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
