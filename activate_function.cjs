const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const session = await prisma.session.findFirst({
    where: { shop: 'varify-pov.myshopify.com' }
  });

  if (!session) {
    console.error("No session found for varify-pov.myshopify.com");
    return;
  }

  const { shop, accessToken } = session;
  console.log(`Found session for ${shop}. Token: ${accessToken.substring(0, 5)}...`);

  const url = `https://${shop}/admin/api/2024-01/graphql.json`;

  const queryFunctions = `
    query {
      shopifyFunctions(first: 10) {
        nodes {
          id
          title
          apiType
        }
      }
    }
  `;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken
    },
    body: JSON.stringify({ query: queryFunctions })
  });

  const data = await response.json();
  console.log("Functions Data:", JSON.stringify(data, null, 2));

  const functions = data.data?.shopifyFunctions?.nodes || [];
  const cartTransformFunc = functions.find(f => f.apiType === 'cart_transform' || f.title.includes('cart-price'));

  if (!cartTransformFunc) {
    console.error("Could not find cart transform function!");
    return;
  }

  console.log(`Found function: ${cartTransformFunc.id}`);

  // Now create the cart transform
  const mutation = `
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
  `;

  const mutRes = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken
    },
    body: JSON.stringify({
      query: mutation,
      variables: { functionId: cartTransformFunc.id }
    })
  });

  const mutData = await mutRes.json();
  console.log("Mutation Result:", JSON.stringify(mutData, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
