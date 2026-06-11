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
  const collectionGid = "gid://shopify/Collection/332710183083";

  // 1. Get collection products
  const getProductsQuery = `
    query GetCollectionProducts($id: ID!) {
      collection(id: $id) {
        products(first: 50) {
          edges {
            node {
              id
              title
              metafield(namespace: "pistalix", key: "product_options") {
                id
                value
              }
            }
          }
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
    body: JSON.stringify({ query: getProductsQuery, variables: { id: collectionGid } })
  });

  const data = await res.json();
  const products = data.data?.collection?.products?.edges || [];

  console.log("Collection products and their metafield state:");
  for (const p of products) {
    console.log(`- Product: ${p.node.title} (${p.node.id}) | Metafield: ${p.node.metafield ? 'SET' : 'MISSING'}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
