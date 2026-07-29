/**
 * =============================================================
 * formatCurrency.js
 * -------------------------------------------------------------
 * Pure currency-formatting helpers. No knowledge of the business's
 * actual currency symbol lives here — callers pass it in (usually
 * sourced from config/businessConfig.js), which keeps this file
 * reusable for any business/currency.
 * =============================================================
 */

/**
 * Format a numeric amount as a currency string, e.g. 1234 → "₹1,234".
 * Uses Indian-style digit grouping by default (2,3,3...), since
 * that's the target market for this deployment, but the locale is
 * a parameter, not a hardcoded assumption.
 *
 * @param {number} amount
 * @param {Object} [options]
 * @param {string} [options.symbol='₹'] - currency symbol/prefix
 * @param {string} [options.locale='en-IN'] - locale used for digit grouping
 * @param {boolean} [options.showDecimals=false] - whether to show ".00" for whole numbers
 * @returns {string}
 */
export function formatCurrency(amount, options = {}) {
  const {
    symbol = '₹',
    locale = 'en-IN',
    showDecimals = false
  } = options;

  const numericAmount = Number(amount) || 0;

  const formatted = numericAmount.toLocaleString(locale, {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0
  });

  return `${symbol}${formatted}`;
}

/**
 * Sum an array of { price, qty } (or similarly-shaped) line items
 * into a single total. Generic — does not know what "items" means
 * beyond these two numeric fields.
 *
 * @param {Array<{price:number, qty:number}>} lineItems
 * @returns {number}
 */
export function sumLineItems(lineItems) {
  if (!Array.isArray(lineItems)) return 0;
  return lineItems.reduce((total, item) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.qty) || 0;
    return total + price * qty;
  }, 0);
}
