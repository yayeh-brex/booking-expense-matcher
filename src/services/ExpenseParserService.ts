import { ExpenseData } from '../types/ExpenseData';

// Basic function to parse expense data from CSV
export function parseExpenseData(rawData: Record<string, any>[]): ExpenseData[] {
  return rawData.map((row, index) => {
    // Basic expense data
    const expense: ExpenseData = {
      // Generate an ID for the expense
      id: `expense-${index}`,

      // Try to map common expense fields
      expenseDate: findField(row, ['expense_date', 'date', 'transaction_date', 'posted_date']),
      expenseType: findField(row, ['expense_type', 'category', 'type', 'expense_category']),
      vendor: findField(row, ['merchant', 'vendor', 'merchant_name', 'vendor_name']),
      amount: parseAmount(findField(row, ['amount', 'total', 'expense_amount', 'transaction_amount'])),
      currency: findField(row, ['currency', 'currency_code']),
      employeeName: findField(row, ['employee', 'employee_name', 'cardholder', 'cardholder_name']),
      expenseReportId: findField(row, ['report_id', 'expense_report', 'report_number']),
      description: findField(row, ['description', 'memo', 'notes', 'purpose']),
      origin: findField(row, ['origin', 'from', 'departure']),
      destination: findField(row, ['destination', 'to', 'arrival']),
      startDate: findField(row, ['start_date', 'from_date', 'departure_date']),
      endDate: findField(row, ['end_date', 'to_date', 'return_date']),
      receiptAttached: parseBoolean(findField(row, ['receipt', 'has_receipt', 'receipt_attached'])),
      status: findField(row, ['status', 'expense_status']),
      rawData: row
    };

    // Extract booking reference from description or reference fields
    if (expense.description) {
      const bookingRef = extractBookingReference(expense);
      if (bookingRef) {
        expense.bookingRefNormalized = bookingRef;
      }
    }

    // Extract card type information
    expense.cardTypeNormalized = extractCardType(expense);

    // Extract card last 4 digits
    expense.cardLast4Normalized = extractCardLast4(expense);

    return expense;
  });
}

/**
 * Extract booking reference from expense description or reference fields
 */
function extractBookingReference(expense: ExpenseData): string | null {
  // Common patterns for booking references in descriptions
  const patterns = [
    // General formats
    /(?:booking|confirmation|reservation|pnr|reference)(?:\s*(?:id|number|code|#))?\s*[:#]?\s*([a-z0-9]{5,10})/i,
    /(?:ticket|itinerary|trip)(?:\s*(?:id|number|#))?\s*[:#]?\s*([a-z0-9]{5,10})/i,

    // Specific airline formats
    /(?:record locator|locator code|record)\s*[:#]?\s*([a-z0-9]{5,8})/i,

    // Common alphanumeric patterns that look like booking refs
    /\b([a-z]{2}[0-9]{4,6})\b/i,  // 2 letters + 4-6 digits
    /\b([a-z0-9]{6})\b/i,         // 6 alphanumeric characters
  ];

  // Check description field first
  if (expense.description) {
    for (const pattern of patterns) {
      const match = expense.description.match(pattern);
      if (match && match[1]) {
        return match[1].toUpperCase();
      }
    }
  }

  // Check in raw data for potential booking reference fields
  const refFieldNames = [
    'booking_ref', 'bookingRef', 'booking_reference', 'booking_id',
    'confirmation_number', 'confirmationNumber', 'confirmation_code',
    'ticket_number', 'ticketNumber', 'reservation_number'
  ];

  if (expense.rawData) {
    for (const fieldName of refFieldNames) {
      for (const [key, value] of Object.entries(expense.rawData)) {
        if (!value) continue;

        if (key.toLowerCase().replace(/[_\s-]/g, '') === fieldName.toLowerCase().replace(/[_\s-]/g, '')) {
          const stringValue = String(value).trim();
          if (stringValue.length >= 4 && stringValue.length <= 12) {
            return stringValue.toUpperCase();
          }
        }
      }
    }
  }

  return null;
}

/**
 * Extract credit card type from expense data
 */
function extractCardType(expense: ExpenseData): string {
  // Define card types to look for
  const cardTypes = [
    { name: 'Visa', patterns: ['visa', 'vi'] },
    { name: 'Mastercard', patterns: ['mastercard', 'master card', 'mc'] },
    { name: 'American Express', patterns: ['american express', 'amex', 'ax'] },
    { name: 'Diners Club', patterns: ['diners', 'diners club'] },
    { name: 'Discover', patterns: ['discover', 'disc'] },
    { name: 'JCB', patterns: ['jcb'] }
  ];

  // Look for fields that might contain card information
  const possibleCardFields = [
    'payment_method', 'paymentMethod', 'payment_type', 'paymentType',
    'card_type', 'cardType', 'credit_card', 'creditCard',
    'card', 'payment', 'form_of_payment', 'fop'
  ];

  // Check in raw data
  if (expense.rawData) {
    const rawData = expense.rawData;

    // First, check specific fields
    for (const fieldName of possibleCardFields) {
      for (const key of Object.keys(rawData)) {
        if (key.toLowerCase().replace(/[_\s-]/g, '') === fieldName.toLowerCase().replace(/[_\s-]/g, '')) {
          const fieldValue = String(rawData[key] || '').toLowerCase();

          for (const cardType of cardTypes) {
            if (cardType.patterns.some(pattern => fieldValue.includes(pattern))) {
              return cardType.name;
            }
          }
        }
      }
    }

    // If not found in specific fields, try description field
    if (expense.description) {
      const description = expense.description.toLowerCase();

      for (const cardType of cardTypes) {
        if (cardType.patterns.some(pattern => description.includes(pattern))) {
          return cardType.name;
        }
      }
    }

    // If still not found, search all fields
    for (const [key, value] of Object.entries(rawData)) {
      if (!value) continue;

      const stringValue = String(value).toLowerCase();

      for (const cardType of cardTypes) {
        if (cardType.patterns.some(pattern => stringValue.includes(pattern))) {
          return cardType.name;
        }
      }
    }
  }

  return '[No card type found]';
}

/**
 * Extract last 4 digits of credit card from expense data
 */
function extractCardLast4(expense: ExpenseData): string {
  // Debug: Mark the start of extraction for this expense
  const expenseId = expense.id || 'unknown';
  console.log(`[ExpenseParser] Extracting card last 4 for expense ${expenseId}`);

  // Enhanced list of field names for credit card information
  const possibleCardNumberFields = [
    'card_number', 'cardNumber', 'last4', 'last_four', 'last_digits',
    'payment_method', 'paymentMethod', 'payment_details', 'payment_card',
    'credit_card', 'creditCard', 'card_details', 'cardDetails',
    'card', 'account', 'account_number', 'accountNumber',
    'card_id', 'cardId', 'payment_id', 'paymentId',
    'card_last4', 'cardLast4', 'pan', 'maskedPan',
    'payment_instrument', 'paymentInstrument'
  ];

  // More specific expense report field names
  const expenseReportFields = [
    'card_last_four', 'last_four_digits', 'expense_card',
    'expense_payment_method', 'transaction_card',
    'masked_card', 'masked_number', 'payment_instrument_id'
  ];

  // Combine all field patterns
  const allCardFields = [...possibleCardNumberFields, ...expenseReportFields];

  let foundLast4: string | null = null;

  if (expense.rawData) {
    const rawData = expense.rawData;

    // STRATEGY 1: Direct match on explicit last 4 fields
    // This is the most reliable method
    const directMatchFields = ['last4', 'last_four', 'last_four_digits', 'card_last4', 'cardLast4'];

    for (const fieldName of directMatchFields) {
      for (const key of Object.keys(rawData)) {
        // More flexible matching to catch variations
        if (key.toLowerCase().replace(/[_\s-]/g, '').includes(fieldName.toLowerCase().replace(/[_\s-]/g, ''))) {
          const fieldValue = String(rawData[key] || '').trim();

          // Extract just the digits if there's other text
          const digitsOnly = fieldValue.replace(/\D/g, '');

          // If it's exactly 4 digits, perfect!
          if (/^\d{4}$/.test(digitsOnly)) {
            console.log(`[ExpenseParser] Found direct last4 match in field ${key}: ${digitsOnly}`);
            return digitsOnly;
          }

          // If we have more digits, take the last 4
          if (digitsOnly.length > 4) {
            const last4 = digitsOnly.slice(-4);
            console.log(`[ExpenseParser] Extracted last 4 from longer number in field ${key}: ${last4}`);
            foundLast4 = last4;
          }
        }
      }
    }

    // STRATEGY 2: Check for masked card patterns in all card-related fields
    if (!foundLast4) {
      for (const fieldName of allCardFields) {
        for (const key of Object.keys(rawData)) {
          if (key.toLowerCase().replace(/[_\s-]/g, '').includes(fieldName.toLowerCase().replace(/[_\s-]/g, ''))) {
            const fieldValue = String(rawData[key] || '');

            // Enhanced regex for various masked card formats:
            // - XXXX-XXXX-XXXX-1234
            // - **** **** **** 1234
            // - ...1234
            // - ending in 1234
            // - XXXXXXXXXXXX1234
            const maskedPatterns = [
              // Standard masked format with separators
              /[X\*\.]+[\s-]*[X\*\.]+[\s-]*[X\*\.]+[\s-]*(\d{4})/,
              // Continuous masked format
              /[\*\.X]+(\d{4})/,
              // "ending in/with" format
              /(?:ending|last|final)\s+(?:in|with|digits|4)?\s*[-:\s]*(\d{4})/i,
              // Last 4 digits at end of string after non-digit
              /[^0-9](\d{4})$/,
              // PAN format where only last 4 are visible
              /(?:pan|card).*?(?:\d{0,6}|\*+|\X+)(\d{4})$/i
            ];

            for (const pattern of maskedPatterns) {
              const match = fieldValue.match(pattern);
              if (match && match[1]) {
                console.log(`[ExpenseParser] Found masked pattern in field ${key}: ${match[1]}`);
                return match[1];
              }
            }
          }
        }
      }
    }

    // STRATEGY 3: Check description field for card patterns
    if (expense.description) {
      // Look for patterns like "XXXX1234" or "ending in 1234" in description
      const descriptionPatterns = [
        /(?:card|account|payment)\D+(\d{4})(?:\s|$|\.)/i,
        /(?:ending|last|final)\s+(?:in|with|digits|4)?\s*[-:\s]*(\d{4})/i,
        /[X\*\.]+[\s-]*[X\*\.]+[\s-]*[X\*\.]+[\s-]*(\d{4})/,
        /[\*\.X]+(\d{4})/,
        /\D(\d{4})(?:\s|$|\.)/
      ];

      for (const pattern of descriptionPatterns) {
        const match = expense.description.match(pattern);
        if (match && match[1]) {
          console.log(`[ExpenseParser] Found card last 4 in description: ${match[1]}`);
          return match[1];
        }
      }
    }

    // STRATEGY 4: Aggressive search in ANY field that contains certain key terms
    for (const [key, value] of Object.entries(rawData)) {
      if (!value) continue;

      const keyLower = key.toLowerCase();
      const stringValue = String(value);

      // Look for fields that might relate to cards, payments, or accounts
      const isPaymentRelated =
        keyLower.includes('card') ||
        keyLower.includes('payment') ||
        keyLower.includes('transaction') ||
        keyLower.includes('account') ||
        keyLower.includes('credit') ||
        keyLower.includes('expense');

      if (isPaymentRelated) {
        // Extract all 4-digit sequences from the string
        const digitMatches = stringValue.match(/\b\d{4}\b/g);
        if (digitMatches && digitMatches.length > 0) {
          // Prefer the last 4-digit sequence in the string (most likely to be card last 4)
          const last4 = digitMatches[digitMatches.length - 1];
          console.log(`[ExpenseParser] Found potential last 4 in payment-related field ${key}: ${last4}`);
          foundLast4 = foundLast4 || last4;
        }

        // Try the masked patterns again
        const maskedMatch = stringValue.match(/[X\*\.]+[\s-]*[X\*\.]+[\s-]*[X\*\.]+[\s-]*(\d{4})|[\*\.X]+(\d{4})/);
        if (maskedMatch) {
          const last4 = maskedMatch[1] || maskedMatch[2];
          console.log(`[ExpenseParser] Found masked pattern in payment field ${key}: ${last4}`);
          return last4;
        }
      }

      // Last resort: Check for stand-alone 4 digit numbers in key fields
      if (/^\d{4}$/.test(stringValue)) {
        if (isPaymentRelated || keyLower.includes('last')) {
          console.log(`[ExpenseParser] Found standalone 4 digits in relevant field ${key}: ${stringValue}`);
          foundLast4 = foundLast4 || stringValue;
        }
      }
    }
  }

  if (foundLast4) {
    return foundLast4;
  }

  console.log(`[ExpenseParser] No card last 4 found for expense ${expenseId}`);
  return '[No card last 4 found]';
}

// Helper function to find a field in the raw data using multiple possible column names
function findField(row: Record<string, any>, possibleFields: string[]): string {
  // Case insensitive search for fields
  const rowKeys = Object.keys(row).map(key => key.toLowerCase());

  for (const field of possibleFields) {
    const matchKey = rowKeys.find(key => key.includes(field.toLowerCase()));
    if (matchKey) {
      const originalKey = Object.keys(row).find(key => key.toLowerCase() === matchKey);
      if (originalKey && row[originalKey]) {
        return row[originalKey].toString();
      }
    }
  }

  return '';
}

// Parse amount values from string to number
function parseAmount(value: string): number | undefined {
  if (!value) return undefined;

  // Remove any currency symbols and commas
  const cleanValue = value.replace(/[^\d.-]/g, '');
  const number = parseFloat(cleanValue);

  return isNaN(number) ? undefined : number;
}

// Parse boolean values
function parseBoolean(value: string): boolean | undefined {
  if (!value) return undefined;

  const lowercaseValue = value.toLowerCase();
  if (['yes', 'true', '1', 'y'].includes(lowercaseValue)) {
    return true;
  }
  if (['no', 'false', '0', 'n'].includes(lowercaseValue)) {
    return false;
  }

  return undefined;
}