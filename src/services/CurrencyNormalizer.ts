/**
 * Currency normalization functionality
 * Uses both built-in mappings and data from world_currency.csv
 */

/**
 * Normalizes a currency string or symbol to standard 3-letter ISO code
 * First tries the CSV-based mapping, then falls back to built-in rules
 *
 * @param currency Currency string or symbol to normalize
 * @param csvMappings Currency mappings from the CSV file
 * @returns Normalized 3-letter ISO currency code
 */
export function normalizeCurrency(currency: string, csvMappings: Record<string, string> = {}): string {
  if (!currency) return '';

  // Convert to string if it's not already
  const currencyStr = String(currency).trim();

  // First try the original input against CSV mappings
  const originalInput = currencyStr.toUpperCase();
  if (Object.keys(csvMappings).length > 0) {
    // Check for exact match
    if (csvMappings[originalInput]) {
      return csvMappings[originalInput];
    }

    // Try with cleaned input (no spaces, punctuation)
    const cleaned = originalInput.replace(/[^a-zA-Z0-9]/g, '');
    if (csvMappings[cleaned]) {
      return csvMappings[cleaned];
    }

    // Look for partial matches in country or currency names
    for (const [key, value] of Object.entries(csvMappings)) {
      // Only use keys that are 4+ characters to avoid false matches with short codes
      if (key.length >= 4 && originalInput.includes(key)) {
        return value;
      }
    }
  }

  // If no match from CSV mappings, use built-in logic
  return fallbackNormalizeCurrency(currencyStr);
}

/**
 * Built-in currency normalization logic as a fallback
 * @param currencyStr Currency string to normalize
 */
function fallbackNormalizeCurrency(currencyStr: string): string {
  // Check for common currency symbols
  const currencySymbolMap: {[key: string]: string} = {
    '$': 'USD',
    '£': 'GBP',
    '€': 'EUR',
    '¥': 'JPY', // Could be JPY or CNY, default to JPY
    '₹': 'INR',
    '₽': 'RUB',
    'kr': 'SEK', // Could be several Scandinavian currencies
    'Fr': 'CHF',
    '₩': 'KRW',
    '₺': 'TRY',
    'R$': 'BRL',
    'R': 'ZAR',
    'RM': 'MYR',
    '₴': 'UAH',
    '₱': 'PHP',
    '฿': 'THB'
  };

  // If the string contains any currency symbol, return the corresponding code
  for (const [symbol, code] of Object.entries(currencySymbolMap)) {
    if (currencyStr.includes(symbol)) {
      return code;
    }
  }

  // Next, handle common currency text representations
  const originalInput = currencyStr.toUpperCase();

  // Map of currency codes, names, and common variations
  const currencyMap: {[key: string]: string} = {
    // ISO currency codes (most common)
    'USD': 'USD', 'EUR': 'EUR', 'GBP': 'GBP', 'CAD': 'CAD', 'AUD': 'AUD',
    'INR': 'INR', 'JPY': 'JPY', 'CHF': 'CHF', 'NZD': 'NZD', 'SGD': 'SGD',
    'HKD': 'HKD', 'CNY': 'CNY', 'MXN': 'MXN', 'BRL': 'BRL', 'ZAR': 'ZAR',
    'RUB': 'RUB', 'SEK': 'SEK', 'NOK': 'NOK', 'DKK': 'DKK', 'PLN': 'PLN',
    'THB': 'THB', 'KRW': 'KRW', 'AED': 'AED', 'SAR': 'SAR', 'MYR': 'MYR',
    'IDR': 'IDR', 'PHP': 'PHP', 'TRY': 'TRY', 'ILS': 'ILS', 'CLP': 'CLP',

    // Currency names and variations
    'DOLLAR': 'USD', 'DOLLARS': 'USD', 'US': 'USD', 'USDOLLAR': 'USD', 'US$': 'USD',
    'AMERICAN': 'USD', 'UNITEDSTATES': 'USD', 'USDOLLARS': 'USD', 'AMERICAN$': 'USD',
    'EURO': 'EUR', 'EUROS': 'EUR', 'EU': 'EUR', 'EUROPEAN': 'EUR', 'EUROCURRENCY': 'EUR',
    'POUND': 'GBP', 'POUNDS': 'GBP', 'STERLING': 'GBP', 'BRITISH': 'GBP', 'UKKINGDOM': 'GBP',
    'YEN': 'JPY', 'JAPAN': 'JPY', 'JAPANESE': 'JPY', 'JAPANESECURRENCY': 'JPY',
    'YUAN': 'CNY', 'RENMINBI': 'CNY', 'CHINESE': 'CNY', 'CHINAYUAN': 'CNY',
    'CANADIANDOLLAR': 'CAD', 'CANDOLLAR': 'CAD', 'CDN': 'CAD', 'CDNDOLLAR': 'CAD', 'CANAD': 'CAD',
    'AUSTRALIANDOLLAR': 'AUD', 'AUSTL': 'AUD', 'AUSDOLLAR': 'AUD', 'AUSTRALIA': 'AUD',
    'FRANC': 'CHF', 'SWISSFRANC': 'CHF', 'SWISS': 'CHF', 'SWITZERLAND': 'CHF',
    'RUPEE': 'INR', 'RUPEES': 'INR', 'INDIA': 'INR', 'INDIAN': 'INR',
    'PESO': 'MXN', 'PESOS': 'MXN', 'MEXICAN': 'MXN', 'MEXICO': 'MXN',
    'REAL': 'BRL', 'REAIS': 'BRL', 'BRAZILIAN': 'BRL', 'BRAZIL': 'BRL',
    'RAND': 'ZAR', 'RANDS': 'ZAR', 'SOUTHAFRICAN': 'ZAR', 'SOUTHAFRICA': 'ZAR',
    'RUBLE': 'RUB', 'RUBLES': 'RUB', 'RUSSIAN': 'RUB', 'RUSSIA': 'RUB',
    'KRONA': 'SEK', 'KRONOR': 'SEK', 'SWEDISH': 'SEK', 'SWEDEN': 'SEK',
    'KRONE': 'NOK', 'NORWEGIAN': 'NOK', 'NORWAY': 'NOK',
    'DKR': 'DKK', 'DANISH': 'DKK', 'DENMARK': 'DKK',
    'ZLOTY': 'PLN', 'ZLOTYS': 'PLN', 'POLISH': 'PLN', 'POLAND': 'PLN',
    'BAHT': 'THB', 'THAI': 'THB', 'THAILAND': 'THB',
    'WON': 'KRW', 'KOREAN': 'KRW', 'KOREA': 'KRW',
    'DIRHAM': 'AED', 'DIRHAMS': 'AED', 'UAE': 'AED', 'EMIRATE': 'AED', 'EMIRATES': 'AED',
    'RIYAL': 'SAR', 'RIYALS': 'SAR', 'SAUDI': 'SAR', 'SAUDIARABIA': 'SAR',
    'RINGGIT': 'MYR', 'MALAYSIAN': 'MYR', 'MALAYSIA': 'MYR',
    'RUPIAH': 'IDR', 'INDONESIAN': 'IDR', 'INDONESIA': 'IDR',
    'LIRA': 'TRY', 'TURKISH': 'TRY', 'TURKEY': 'TRY',
    'SHEKEL': 'ILS', 'SHEKELS': 'ILS', 'ISRAELI': 'ILS', 'ISRAEL': 'ILS',

    // Country codes that might be used to represent currencies
    'USA': 'USD', 'JPN': 'JPY', 'CHN': 'CNY',
    'CHE': 'CHF', 'IND': 'INR', 'MEX': 'MXN', 'BRA': 'BRL',
    'ZAF': 'ZAR', 'RUS': 'RUB', 'SWE': 'SEK', 'NOR': 'NOK', 'DNK': 'DKK'
  };

  // Direct match from map
  if (currencyMap[originalInput]) {
    return currencyMap[originalInput];
  }

  // Remove any non-alphanumeric characters and try again
  const cleaned = originalInput.replace(/[^a-zA-Z0-9]/g, '');
  if (currencyMap[cleaned]) {
    return currencyMap[cleaned];
  }

  // Check if the input contains any of the currency keys
  for (const [key, value] of Object.entries(currencyMap)) {
    // Only use keys that are 4+ characters to avoid false matches with short codes
    if (key.length >= 4 && originalInput.includes(key)) {
      return value;
    }
  }

  // If it looks like a valid 3-letter currency code, return it
  if (/^[A-Z]{3}$/.test(cleaned)) {
    return cleaned;
  }

  // If it's a single letter followed by numbers (like $100),
  // try to identify the currency symbol
  const currencySymbolMatch = currencyStr.match(/^([^a-zA-Z0-9])[0-9,.]+/);
  if (currencySymbolMatch && currencySymbolMatch[1]) {
    const symbol = currencySymbolMatch[1];
    if (currencySymbolMap[symbol]) {
      return currencySymbolMap[symbol];
    }
  }

  // Look for common patterns like "USD 100" or "100 EUR"
  const currencyCodeMatch = currencyStr.match(/^([A-Z]{3})\s*\d+|\d+\s*([A-Z]{3})$/i);
  if (currencyCodeMatch) {
    const code = (currencyCodeMatch[1] || currencyCodeMatch[2]).toUpperCase();
    // If it's a valid ISO code, use it
    if (currencyMap[code]) {
      return currencyMap[code];
    }
  }

  // Default for unknown currencies - return original but cleaned
  // If we have something that looks like a currency code, return it
  if (cleaned.length === 3) {
    return cleaned;
  }

  console.log(`Could not normalize currency: ${currencyStr}`);
  // If all else fails, default to USD if nothing better found
  return cleaned || 'USD';
}

/**
 * Extract currency information from amount strings like "$100" or "100 EUR"
 * @param value Amount string to extract currency from
 * @param csvMappings Currency mappings from the CSV file
 * @returns Normalized currency code
 */
export function extractCurrencyFromAmount(value: string, csvMappings: Record<string, string> = {}): string {
  if (!value) return '';

  // First check if the value itself looks like a currency code
  const currencyCodeOnly = value.trim().match(/^[A-Za-z]{3}$/i);
  if (currencyCodeOnly) {
    return normalizeCurrency(currencyCodeOnly[0], csvMappings);
  }

  // Look for currency symbols at the start (common in price fields)
  // This handles formats like "$100", "€50.25", "£75", etc.
  const startSymbolMatch = value.match(/^\s*([^\w\s.,])(\d|,|\.|$)/);
  if (startSymbolMatch) {
    const symbol = startSymbolMatch[1];
    return normalizeCurrency(symbol, csvMappings);
  }

  // Look for currency codes before or after the amount
  // This handles formats like "USD 100", "100 EUR", "GBP100", "100USD", etc.
  const currencyCodeMatch = value.match(/(^|\s)([A-Za-z]{3})(\s+\d|\s*$)|\d+(\s+|\s*\.\s*)([A-Za-z]{3})($|\s|\.)/i);
  if (currencyCodeMatch) {
    const code = (currencyCodeMatch[2] || currencyCodeMatch[5])?.toUpperCase();
    if (code) {
      return normalizeCurrency(code, csvMappings);
    }
  }

  // Check for currency names or symbols within the string
  // This will catch phrases like "100 dollars", "paid in euros", etc.
  const currencyTerms = [
    { term: 'dollar', code: 'USD' },
    { term: '$', code: 'USD' },
    { term: 'usd', code: 'USD' },
    { term: 'euro', code: 'EUR' },
    { term: '€', code: 'EUR' },
    { term: 'eur', code: 'EUR' },
    { term: 'pound', code: 'GBP' },
    { term: '£', code: 'GBP' },
    { term: 'gbp', code: 'GBP' },
    { term: 'sterling', code: 'GBP' },
    { term: 'yen', code: 'JPY' },
    { term: '¥', code: 'JPY' },
    { term: 'jpy', code: 'JPY' }
  ];

  const lowercaseValue = value.toLowerCase();
  for (const { term, code } of currencyTerms) {
    if (lowercaseValue.includes(term)) {
      return code;
    }
  }

  // If we still couldn't find anything, try to normalize the whole string
  // as a last resort (may catch some edge cases)
  const normalizedWhole = normalizeCurrency(value, csvMappings);
  if (normalizedWhole && normalizedWhole !== 'USD') { // Avoid defaulting to USD
    return normalizedWhole;
  }

  return '';
}