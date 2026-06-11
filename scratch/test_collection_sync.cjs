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

  console.log(`Querying products for collection: ${collectionGid}`);
  
  const query = `
    query GetCollectionProducts($id: ID!, $cursor: String) {
      collection(id: $id) {
        products(first: 50, after: $cursor) {
          edges {
            cursor
            node {
              id
              title
            }
          }
          pageInfo {
            hasNextPage
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
    body: JSON.stringify({
      query,
      variables: { id: collectionGid, cursor: null }
    })
  });

  const data = await res.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
