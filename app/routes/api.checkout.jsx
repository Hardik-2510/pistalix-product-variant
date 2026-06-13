import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function action({ request }) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { admin } = await authenticate.public.appProxy(request);

    if (!admin) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { cart } = body;

    if (!cart || !cart.items || cart.items.length === 0) {
      return json({ error: "Cart is empty" }, { status: 400 });
    }

    // Map cart items to Draft Order line items
    const lineItems = cart.items.map((item) => {
      // Find the final price property if it exists
      let finalPrice = null;
      const customAttributes = [];
      
      if (item.properties) {
        for (const [key, value] of Object.entries(item.properties)) {
          if (key === "_final_price") {
            finalPrice = parseFloat(value);
          } else if (key && value && !key.startsWith('_')) {
            // Include visible properties as custom attributes
            // Important: we filter out internal properties starting with '_'
            customAttributes.push({ key, value: String(value) });
          }
        }
      }

      const draftItem = {
        variantId: `gid://shopify/ProductVariant/${item.variant_id}`,
        quantity: item.quantity,
      };

      // Override price if _final_price exists
      if (finalPrice !== null && !isNaN(finalPrice)) {
        draftItem.originalUnitPrice = finalPrice.toString();
      }

      if (customAttributes.length > 0) {
        draftItem.customAttributes = customAttributes;
      }

      return draftItem;
    });

    // Create the Draft Order via GraphQL
    const response = await admin.graphql(`
      mutation draftOrderCreate($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder {
            id
            invoiceUrl
          }
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        input: {
          lineItems,
          // You could optionally apply shop locale or other parameters here
        }
      }
    });

    const data = await response.json();

    if (data.data?.draftOrderCreate?.userErrors?.length > 0) {
      console.error("Draft Order Create Errors:", data.data.draftOrderCreate.userErrors);
      return json({ error: "Failed to create checkout", details: data.data.draftOrderCreate.userErrors }, { status: 500 });
    }

    const draftOrder = data.data?.draftOrderCreate?.draftOrder;

    if (!draftOrder || !draftOrder.invoiceUrl) {
      return json({ error: "Failed to retrieve checkout URL" }, { status: 500 });
    }

    // Return the Draft Order checkout URL
    return json({ invoiceUrl: draftOrder.invoiceUrl });

  } catch (error) {
    console.error("API Checkout Error:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}
