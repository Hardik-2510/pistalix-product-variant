import { cartTransformRun } from './cart_transform_run.js';

const mockInput = {
  cart: {
    lines: [
      {
        id: 'gid://shopify/CartLine/123',
        quantity: 1,
        finalPrice: {
          value: '35.00'
        },
        cost: {
          amountPerQuantity: {
            amount: '20.00',
            currencyCode: 'USD'
          }
        }
      }
    ]
  }
};

const result = cartTransformRun(mockInput);
console.log("Cart Transform Result:", JSON.stringify(result, null, 2));
