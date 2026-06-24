import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const shop = 'varify-pov.myshopify.com';

  // Find session
  const session = await prisma.session.findFirst({
    where: { shop }
  });

  if (!session) {
    console.log("No session found");
    return;
  }

  const fetchFunctionsResponse = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': session.accessToken
    },
    body: JSON.stringify({
      query: `
        query {
          shopifyFunctions(first: 10) {
            nodes {
              id
              apiType
              title
            }
          }
        }
      `
    })
  });

  const functionsData = await fetchFunctionsResponse.json();
  console.log("Deployed Functions:");
  console.log(JSON.stringify(functionsData, null, 2));

  const nodes = functionsData?.data?.shopifyFunctions?.nodes || [];
  const cartFunction = nodes.find(n => n.apiType === 'cart_transform' || n.title.includes('cart') || n.title.includes('override'));

  if (!cartFunction) {
    console.log("No cart transform function found. Is it deployed?");
    return;
  }

  console.log(`Found Cart Function ID: ${cartFunction.id}`);

  console.log("Creating Cart Transform...");
  const createResponse = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': session.accessToken
    },
    body: JSON.stringify({
      query: `
        mutation cartTransformCreate($functionId: String!) {
          cartTransformCreate(functionId: $functionId) {
            cartTransform {
              id
              functionId
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      variables: {
        functionId: cartFunction.id
      }
    })
  });

  const createData = await createResponse.json();
  console.log("Create Response:");
  console.log(JSON.stringify(createData, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
