import Papa from 'papaparse';

export interface CurrencyData {
  country: string;
  name: string;
  symbol: string;
  acronym: string;
}

// Global cache for currency data
let currencyCache: CurrencyData[] | null = null;

/**
 * Loads currency data from the CSV file
 * @returns Promise that resolves to an array of currency data objects
 */
export async function loadCurrencyData(): Promise<CurrencyData[]> {
  // Return from cache if already loaded
  if (currencyCache) {
    return currencyCache;
  }

  try {
    const response = await fetch('/currency/world_currency.csv');
    const csvText = await response.text();

    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true
    });

    // Convert parsed data to CurrencyData interface
    const currencyData = (result.data as any[]).map(item => ({
      country: item.Country,
      name: item['Currency Name'],
      symbol: item.Symbol,
      acronym: item.Acronym
    }));

    // Save to cache
    currencyCache = currencyData;
    console.log(`Loaded ${currencyData.length} currencies from CSV file`);
    return currencyData;
  } catch (error) {
    console.error('Error loading currency data:', error);
    return [];
  }
}

/**
 * Creates a mapping of various currency identifiers to their standardized 3-letter codes
 * @returns An object mapping currency names, symbols, and countries to standard currency codes
 */
export async function getCurrencyMappings(): Promise<Record<string, string>> {
  const currencyData = await loadCurrencyData();
  const mappings: Record<string, string> = {};

  currencyData.forEach(currency => {
    // Add the acronym itself
    mappings[currency.acronym] = currency.acronym;

    // Add the country name - uppercase and no spaces
    mappings[currency.country.toUpperCase().replace(/\s+/g, '')] = currency.acronym;

    // Add the currency name - uppercase and no spaces
    mappings[currency.name.toUpperCase().replace(/\s+/g, '')] = currency.acronym;

    // Add symbol if it's a single character (to avoid too generic mappings)
    if (currency.symbol && currency.symbol.length === 1) {
      mappings[currency.symbol] = currency.acronym;
    }

    // Add specific variations based on country
    switch(currency.country) {
      case 'United States':
        mappings['US'] = currency.acronym;
        mappings['USA'] = currency.acronym;
        mappings['DOLLAR'] = currency.acronym;
        mappings['DOLLARS'] = currency.acronym;
        mappings['USDOLLAR'] = currency.acronym;
        mappings['US$'] = currency.acronym;
        mappings['AMERICAN'] = currency.acronym;
        mappings['UNITEDSTATES'] = currency.acronym;
        break;
      case 'European Union':
        mappings['EU'] = currency.acronym;
        mappings['EURO'] = currency.acronym;
        mappings['EUROS'] = currency.acronym;
        mappings['EUROPEAN'] = currency.acronym;
        break;
      case 'United Kingdom':
        mappings['UK'] = currency.acronym;
        mappings['GB'] = currency.acronym;
        mappings['POUND'] = currency.acronym;
        mappings['POUNDS'] = currency.acronym;
        mappings['STERLING'] = currency.acronym;
        mappings['BRITISH'] = currency.acronym;
        break;
      case 'Canada':
        mappings['CA'] = currency.acronym;
        mappings['CAN'] = currency.acronym;
        mappings['CANADIANDOLLAR'] = currency.acronym;
        mappings['CANDOLLAR'] = currency.acronym;
        mappings['CDN'] = currency.acronym;
        mappings['CDNDOLLAR'] = currency.acronym;
        break;
      case 'Australia':
        mappings['AU'] = currency.acronym;
        mappings['AUS'] = currency.acronym;
        mappings['AUSTRALIANDOLLAR'] = currency.acronym;
        break;
      case 'Japan':
        mappings['JP'] = currency.acronym;
        mappings['JPN'] = currency.acronym;
        mappings['YEN'] = currency.acronym;
        break;
      case 'China':
        mappings['CN'] = currency.acronym;
        mappings['CHN'] = currency.acronym;
        mappings['YUAN'] = currency.acronym;
        mappings['RENMINBI'] = currency.acronym;
        break;
      // Add more specific mappings for common currencies as needed
    }
  });

  return mappings;
}