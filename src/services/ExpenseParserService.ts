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
  // Common field names for credit card information
  const possibleCardNumberFields = [
    'card_number', 'cardNumber', 'last4', 'last_four',
    'payment_method', 'paymentMethod', 'payment_details',
    'credit_card', 'creditCard'
  ];

  if (expense.rawData) {
    const rawData = expense.rawData;

    // First check specific fields for last 4
    for (const fieldName of possibleCardNumberFields) {
      for (const key of Object.keys(rawData)) {
        if (key.toLowerCase().replace(/[_\s-]/g, '') === fieldName.toLowerCase().replace(/[_\s-]/g, '')) {
          const fieldValue = String(rawData[key] || '');

          // Direct match for fields that already contain just last 4
          if (/^\d{4}$/.test(fieldValue)) {
            return fieldValue;
          }

          // Try to extract last 4 from masked credit card pattern
          const last4Match = fieldValue.match(/[X\*\.]+[\s-]*[X\*\.]+[\s-]*[X\*\.]+[\s-]*(\d{4})|[\*\.X]+(\d{4})|[^0-9](\d{4})$/);
          if (last4Match) {
            return last4Match[1] || last4Match[2] || last4Match[3];
          }
        }
      }
    }

    // Check description field for card patterns
    if (expense.description) {
      // Look for patterns like "XXXX1234" or "ending in 1234" in description
      const descriptionMatch = expense.description.match(/(?:ending|last|final)\s+(?:in|with|digits|4)?\s*[-:\s]*(\d{4})|\D(\d{4})(?:\s|$)/i);
      if (descriptionMatch) {
        return descriptionMatch[1] || descriptionMatch[2];
      }
    }

    // If still not found, search all fields
    for (const [key, value] of Object.entries(rawData)) {
      if (!value) continue;

      const stringValue = String(value);

      // Look for masked credit card patterns
      const last4Match = stringValue.match(/[X\*\.]+[\s-]*[X\*\.]+[\s-]*[X\*\.]+[\s-]*(\d{4})|[\*\.X]+(\d{4})|(?:ending|last|final)\s+(?:in|with|digits|4)?\s*[-:\s]*(\d{4})/i);
      if (last4Match) {
        return last4Match[1] || last4Match[2] || last4Match[3];
      }

      // Look for strings that are just 4 digits in card-related fields
      if (/^\d{4}$/.test(stringValue)) {
        if (key.toLowerCase().includes('card') ||
            key.toLowerCase().includes('payment') ||
            key.toLowerCase().includes('last')) {
          return stringValue;
        }
      }
    }
  }

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