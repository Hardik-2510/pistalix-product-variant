import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log("Fetching session from DB...");
  const session = await prisma.session.findFirst({
    where: { shop: 'follow-docs.myshopify.com' }
  });

  if (!session) {
    console.error("No session found!");
    return;
  }

  console.log("Found session. Querying shopifyFunctions...");
  
  const shopifyReq = async (query, variables = {}) => {
    const res = await fetch(`https://${session.shop}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': session.accessToken
      },
      body: JSON.stringify({ query, variables })
    });
    return res.json();
  };

  const functionsRes = await shopifyReq(`
    query {
      shopifyFunctions(first: 10) {
        nodes {
          id
          title
          apiType
        }
      }
    }
  `);

  console.log(JSON.stringify(functionsRes, null, 2));

  const nodes = functionsRes.data?.shopifyFunctions?.nodes || [];
  const cartFunction = nodes.find(n => n.apiType === "cart_transform" || n.title.includes("cart-price-override") || n.title.includes("name"));

  if (!cartFunction) {
    console.error("Could not find the cart transform function. Make sure it's deployed.");
    return;
  }

  const functionId = cartFunction.id;
  console.log("Found Cart Transform Function ID:", functionId);

  // Check if it's already a cartTransform
  const ctRes = await shopifyReq(`
    query {
      cartTransforms(first: 10) {
        nodes {
          id
          functionId
        }
      }
    }
  `);

  const ctNodes = ctRes.data?.cartTransforms?.nodes || [];
  if (ctNodes.some(n => n.functionId === functionId)) {
    console.log("Cart Transform is ALREADY active!");
    return;
  }

  console.log("Activating Cart Transform...");
  const createRes = await shopifyReq(`
    mutation cartTransformCreate($functionId: String!) {
      cartTransformCreate(functionId: $functionId) {
        cartTransform {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `, { functionId });

  console.log("Create Result:", JSON.stringify(createRes, null, 2));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
