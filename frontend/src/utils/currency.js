/**
 * Currency Conversion Utilities
 * 
 * Handles display-only price conversion based on exchange rates
 */

// Currencies that don't use decimal places
const ZERO_DECIMAL_CURRENCIES = ['JPY', 'KRW', 'VND', 'CLP'];

/**
 * Format currency amount with proper decimals and symbol
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - ISO 4217 currency code (EUR, USD, JPY, etc.)
 * @param {object} currencies - Currency configuration from backend
 * @returns {string} Formatted currency string (e.g., "$12.40", "¥1,610")
 */
export function formatCurrency(amount, currencyCode, currencies = {}) {
  const currency = currencies[currencyCode] || {};
  const symbol = currency.symbol || currencyCode;
  
  // Determine decimal places
  const decimals = ZERO_DECIMAL_CURRENCIES.includes(currencyCode) ? 0 : 2;
  
  // Format the number
  const formatted = amount.toFixed(decimals);
  
  // Add thousand separators for readability
  const parts = formatted.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const withSeparators = parts.join('.');
  
  return `${symbol}${withSeparators}`;
}

/**
 * Convert price from one currency to another
 * @param {number} amount - Amount in source currency
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @param {object} exchangeRates - Exchange rates with EUR as base
 * @returns {number} Converted amount
 */
export function convertPrice(amount, fromCurrency, toCurrency, exchangeRates) {
  if (!exchangeRates || !exchangeRates.rates) {
    return amount; // Fallback: no conversion
  }
  
  // If same currency, no conversion needed
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  const rates = exchangeRates.rates;
  const baseCurrency = exchangeRates.base || 'EUR';
  
  // Convert to base currency (EUR) first
  let amountInBase = amount;
  if (fromCurrency !== baseCurrency) {
    const fromRate = rates[fromCurrency];
    if (!fromRate) {
      console.warn(`Exchange rate not found for ${fromCurrency}`);
      return amount;
    }
    amountInBase = amount / fromRate;
  }
  
  // Convert from base to target currency
  if (toCurrency === baseCurrency) {
    return amountInBase;
  }
  
  const toRate = rates[toCurrency];
  if (!toRate) {
    console.warn(`Exchange rate not found for ${toCurrency}`);
    return amount;
  }
  
  return amountInBase * toRate;
}

/**
 * Get exchange rate between two currencies
 * @param {string} fromCurrency
 * @param {string} toCurrency
 * @param {object} exchangeRates
 * @returns {number|null} Exchange rate or null if not available
 */
export function getExchangeRate(fromCurrency, toCurrency, exchangeRates) {
  if (!exchangeRates || !exchangeRates.rates) {
    return null;
  }
  
  if (fromCurrency === toCurrency) {
    return 1;
  }
  
  const rates = exchangeRates.rates;
  const baseCurrency = exchangeRates.base || 'EUR';
  
  // Calculate rate
  if (fromCurrency === baseCurrency) {
    return rates[toCurrency] || null;
  } else if (toCurrency === baseCurrency) {
    return rates[fromCurrency] ? 1 / rates[fromCurrency] : null;
  } else {
    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];
    if (!fromRate || !toRate) return null;
    return toRate / fromRate;
  }
}
