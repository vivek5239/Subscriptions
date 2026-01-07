import axios from 'axios';

let RATES = {
  '₹': 1,
  'INR': 1,
  '$': 85.5, // Fallback rate
  'USD': 85.5,
  '€': 93.0,
  'EUR': 93.0,
  '£': 108.0,
  'GBP': 108.0
};

export async function updateRates() {
  try {
    // Frankfurter API uses EUR as default base.
    const response = await axios.get('https://api.frankfurter.app/latest');
    const { rates } = response.data;
    const inrPerEur = rates.INR;
    
    if (inrPerEur) {
      RATES['€'] = inrPerEur;
      RATES['EUR'] = inrPerEur;
      
      for (const [code, value] of Object.entries(rates)) {
        if (code === 'INR') continue;
        const inrPerCode = inrPerEur / value;
        RATES[code] = inrPerCode;
      }
      
      // Map common symbols to their codes' rates
      if (RATES['USD']) RATES['$'] = RATES['USD'];
      if (RATES['GBP']) RATES['£'] = RATES['GBP'];

      console.log(`[Currency] Rates updated. USD: ₹${RATES.USD?.toFixed(2)}, EUR: ₹${RATES.EUR?.toFixed(2)}, GBP: ₹${RATES.GBP?.toFixed(2)}`);
    }
  } catch (error) {
    console.error('[Currency] Failed to update rates:', error.message);
  }
}

export function parsePrice(priceStr) {
  if (!priceStr) return { value: 0, currency: 'INR' };
  
  // Clean string
  const cleanStr = priceStr.toString().trim();
  
  // Find currency symbol/code
  let currency = 'INR';
  let valueStr = cleanStr;

  // Check symbols - order matters (longer first or specific)
  // We sort keys by length descending to match 'USD' before '$' if both present (though unlikely)
  const sortedSymbols = Object.keys(RATES).sort((a, b) => b.length - a.length);

  for (const symbol of sortedSymbols) {
    if (cleanStr.includes(symbol)) {
      currency = symbol;
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
  const rate = RATES[currency] || 1; 
  
  return value * rate;
}
