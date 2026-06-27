// @ts-check

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

/**
 * Apply option add-on pricing using the `lineExpand` (bundle) operation.
 *
 * `lineUpdate` (direct price override) is restricted to Shopify Plus, so on
 * standard plans it errors at checkout. `lineExpand` works on ALL plans: we
 * expand the original cart line into a bundle of two components —
 *   1. the original product (keeps its normal price), and
 *   2. a hidden "fee" variant whose price is overridden to the add-on amount.
 * The line then shows the combined price in the cart.
 *
 * The storefront passes two line attributes (computed in product-options.js):
 *   _addon_price     — the add-on amount per unit, already formatted in the
 *                      shop's currency (avoids re-deriving it from base price)
 *   _fee_variant_id  — the GID of the hidden fee variant to use as the component
 *
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function cartTransformRun(input) {
  const operations = [];

  for (const line of input.cart.lines) {
    const addonRaw = line.addonPrice && line.addonPrice.value ? line.addonPrice.value.trim() : null;
    const feeVariantId = line.feeVariantId && line.feeVariantId.value ? line.feeVariantId.value.trim() : null;
    const originalVariantId = line.merchandise && line.merchandise.id ? line.merchandise.id : null;

    if (!addonRaw || !feeVariantId || !originalVariantId) continue;

    const addon = parseFloat(addonRaw);
    if (isNaN(addon) || !(addon > 0)) continue;

    operations.push({
      lineExpand: {
        cartLineId: line.id,
        expandedCartItems: [
          // Original product — keep its normal price (no adjustment).
          {
            merchandiseId: originalVariantId,
            quantity: 1,
          },
          // Hidden fee variant — priced to the add-on amount.
          {
            merchandiseId: feeVariantId,
            quantity: 1,
            price: {
              adjustment: {
                fixedPricePerUnit: {
                  amount: addonRaw,
                },
              },
            },
          },
        ],
      },
    });
  }

  return operations.length > 0 ? { operations } : NO_CHANGES;
}
