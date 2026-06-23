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
 * Parses raw storefront pricing attribute to float value.
 * Supports: decimal strings ("851.00"), raw cents ("85100"), currency codes, and base amount comparisons.
 *
 * @param {string} value
 * @param {string} currencyCode
 * @param {number} baseAmount
 * @returns {number | null}
 */
function parsePrice(value, currencyCode, baseAmount) {
  const floatVal = parseFloat(value);
  if (isNaN(floatVal)) return null;

  const isZeroDecimal = zeroDecimalCurrencies.has(currencyCode);
  if (isZeroDecimal) {
    return floatVal;
  }

  // If value explicitly includes decimal point, it is already a dollar float
  if (value.indexOf('.') !== -1) {
    return floatVal;
  }

  // If we have a valid non-zero baseAmount, compare scale
  if (baseAmount > 0) {
    if (floatVal > 10 * baseAmount) {
      return floatVal / 100;
    } else {
      return floatVal;
    }
  }

  // Fallback if baseAmount is 0 (e.g. free product)
  if (floatVal >= 100) {
    return floatVal / 100;
  }

  return floatVal;
}

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function cartTransformRun(input) {
  /** @type {any[]} */
  const operations = [];

  for (const line of input.cart.lines) {
    if (!line.finalPrice || !line.finalPrice.value) continue;

    const baseAmount = line.cost && line.cost.amountPerQuantity
      ? parseFloat(line.cost.amountPerQuantity.amount)
      : 0;
    const currencyCode = line.cost && line.cost.amountPerQuantity
      ? line.cost.amountPerQuantity.currencyCode
      : 'USD';

    const parsedPrice = parsePrice(line.finalPrice.value, currencyCode, baseAmount);
    
    if (parsedPrice === null || parsedPrice <= 0) continue;

    const isZeroDecimal = zeroDecimalCurrencies.has(currencyCode);
    const amountStr = parsedPrice.toFixed(isZeroDecimal ? 0 : 2);

    // Apply price override using Cart Transform
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

  if (operations.length === 0) {
    return NO_CHANGES;
  }

  return { operations };
}