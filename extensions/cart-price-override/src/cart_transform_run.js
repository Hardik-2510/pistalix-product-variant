// @ts-check - trigger rebuild

/**
 * @typedef {import("../generated/api").CartTransformRunInput} RunInput
 * @typedef {import("../generated/api").CartTransformRunResult} FunctionRunResult
 */

/**
 * @type {FunctionRunResult}
 */
const NO_CHANGES = {
  operations: [],
};

const zeroDecimalCurrencies = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'LAK',
  'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
]);


/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function cartTransformRun(input) {
  // console.error("Pistalix Backend Trace [4] - Incoming Cart Transform Input:", JSON.stringify(input.cart.lines));
  
  const operations = [];

  for (const line of input.cart.lines) {
    let customPrice = null;

    // Access the aliased `finalPrice` property defined in your run.graphql
    // The storefront JS always sends this as a dollar float string e.g. "35.00"
    if (line.finalPrice && line.finalPrice.value) {
      const rawValue = line.finalPrice.value.trim();
      const floatVal = parseFloat(rawValue);

      if (!isNaN(floatVal) && floatVal > 0) {
        // The storefront JS (product-options.js line 522) always formats as:
        //   (finalPriceCents / 100).toFixed(2)  →  e.g. "35.00"
        // So it is always a dollar amount. No cents conversion needed.
        customPrice = floatVal;
        // console.error("Pistalix Backend Trace [5] - Detected customPrice for line", line.id, ":", customPrice);
      }
    }

    // If no custom price in properties, skip
    if (customPrice === null || customPrice <= 0) continue;

    const currencyCode = line.cost?.amountPerQuantity?.currencyCode || 'USD';
    const isZeroDecimal = zeroDecimalCurrencies.has(currencyCode);

    const amountStr = String(customPrice.toFixed(isZeroDecimal ? 0 : 2));

    // console.error("Pistalix Backend Trace [5b] - Setting price to:", amountStr, "for line", line.id);

    operations.push({
      lineUpdate: {
        cartLineId: line.id,
        price: {
          adjustment: {
            fixedPricePerUnit: {
              amount: amountStr
            }
          }
        }
      }
    });
  }

  // console.error("Pistalix Backend Trace [6] - Outgoing Operations:", JSON.stringify(operations));
  return operations.length > 0 ? { operations } : NO_CHANGES;
}
