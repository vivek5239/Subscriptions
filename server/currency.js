
const RATES = {
  '₹': 1,
  'INR': 1,
  '$': 85.5, // Approx rate
  'USD': 85.5,
  '€': 93.0,
  'EUR': 93.0,
  '£': 108.0,
  'GBP': 108.0
};

export function parsePrice(priceStr) {
  if (!priceStr) return { value: 0, currency: 'INR' };
  
  // Clean string
  const cleanStr = priceStr.toString().trim();
  
  // Find currency symbol/code
  let currency = 'INR';
  let valueStr = cleanStr;

  // Check symbols
  for (const symbol in RATES) {
    if (cleanStr.includes(symbol)) {
      currency = symbol; // Keep symbol or code
      valueStr = cleanStr.replace(symbol, '');
      break;
    }
  }

  // Parse value
  const value = parseFloat(valueStr.replace(/,/g, ''));
  return { value: isNaN(value) ? 0 : value, currency };
}

export function convertToINR(priceStr) {
  const { value, currency } = parsePrice(priceStr);
  const rate = RATES[currency] || RATES['$']; // Default to USD rate if unknown, or maybe 1? Safe to assume 1 if really unknown but usually it's major currencies.
  
  // If currency key not found directly, try to map symbols
  let finalRate = 1;
  if (RATES[currency]) {
    finalRate = RATES[currency];
  } else {
      // Fallback logic
      finalRate = 1;
  }

  return value * finalRate;
}
