import { BookingData, TMCParser } from '../types/BookingData';

// Helper function to normalize header names for matching
function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/[_\s-]+/g, '');
}

// Helper function to find header value with multiple possible names
function findFieldValue(
  rawData: Record<string, any>,
  possibleNames: string[]
): any {
  for (const name of possibleNames) {
    // Try exact match first
    if (rawData[name] !== undefined && rawData[name] !== '') {
      return rawData[name];
    }

    // Try case-insensitive match
    const normalizedName = normalizeHeader(name);
    for (const [key, value] of Object.entries(rawData)) {
      if (normalizeHeader(key) === normalizedName && value !== undefined && value !== '') {
        return value;
      }
    }
  }
  return undefined;
}

// Helper function to parse amount from string
function parseAmount(value: any): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;

  const stringValue = String(value).trim();
  // Remove currency symbols and common formatting
  const cleaned = stringValue.replace(/[£$€¥₹,\s]/g, '');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? undefined : Math.abs(parsed);
}

// Helper function to parse date from various formats
function parseDate(value: any): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;

  const stringValue = String(value).trim();

  // Try to create a valid date
  const date = new Date(stringValue);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  }

  return stringValue; // Return as-is if can't parse
}

// Egencia-specific parser
const egenciaParser: TMCParser = {
  name: 'Egencia',
  detectFormat: (headers) => {
    const normalizedHeaders = headers.map(normalizeHeader);

    // Egencia typically has these unique headers
    const egenciaSignatures = [
      'tripid',
      'recordlocator',
      'travellername',
      'bookingtoolname',
      'egencia'
    ];

    const matches = egenciaSignatures.filter(sig =>
      normalizedHeaders.some(h => h.includes(sig))
    );

    // If we match at least 2 Egencia-specific headers, it's likely Egencia
    return matches.length >= 2;
  },
  parseBooking: (rawData) => {
    const travelerName = findFieldValue(rawData, [
      'Traveler Name',
      'Traveller Name',
      'Employee Name',
      'Passenger Name',
      'TravelerName'
    ]);

    const bookingReference = findFieldValue(rawData, [
      'Record Locator',
      'RecordLocator',
      'Booking Reference',
      'PNR',
      'Confirmation Number',
      'Trip ID',
      'TripID'
    ]);

    const amount = parseAmount(
      findFieldValue(rawData, [
        'Total Price',
        'Total Cost',
        'Price',
        'Amount',
        'Fare Amount',
        'Net Fare',
        'TotalPrice'
      ])
    );

    const currency = findFieldValue(rawData, [
      'Currency',
      'Currency Code',
      'CurrencyCode'
    ]);

    const travelType = findFieldValue(rawData, [
      'Travel Type',
      'Product Type',
      'Service Type',
      'Type',
      'ProductType',
      'TravelType'
    ]);

    const vendor = findFieldValue(rawData, [
      'Vendor',
      'Supplier',
      'Airline',
      'Hotel Name',
      'Car Company',
      'Carrier'
    ]);

    const origin = findFieldValue(rawData, [
      'Origin',
      'Departure City',
      'From',
      'Origin City',
      'DepartureCity'
    ]);

    const destination = findFieldValue(rawData, [
      'Destination',
      'Arrival City',
      'To',
      'Destination City',
      'ArrivalCity'
    ]);

    const departureDate = parseDate(
      findFieldValue(rawData, [
        'Departure Date',
        'Start Date',
        'Travel Date',
        'DepartureDate',
        'CheckIn Date',
        'Pickup Date'
      ])
    );

    const returnDate = parseDate(
      findFieldValue(rawData, [
        'Return Date',
        'End Date',
        'ReturnDate',
        'CheckOut Date',
        'Dropoff Date'
      ])
    );

    const bookingDate = parseDate(
      findFieldValue(rawData, [
        'Booking Date',
        'Created Date',
        'BookingDate',
        'Transaction Date'
      ])
    );

    return {
      travelerName,
      bookingReference,
      amount,
      currency,
      travelType,
      vendor,
      origin,
      destination,
      departureDate,
      returnDate,
      bookingDate,
      rawData,
      tmc: 'Egencia'
    };
  }
};

// BCD Travel-specific parser
const bcdTravelParser: TMCParser = {
  name: 'BCD Travel',
  detectFormat: (headers) => {
    const normalizedHeaders = headers.map(normalizeHeader);

    // BCD Travel typically has these unique headers
    const bcdSignatures = [
      'bcdtravelreference',
      'clientreference',
      'costcenter',
      'bcd',
      'tripnumber'
    ];

    const matches = bcdSignatures.filter(sig =>
      normalizedHeaders.some(h => h.includes(sig))
    );

    // Also check for common BCD Travel combinations
    const hasPnrAndTrip = normalizedHeaders.some(h => h.includes('pnr')) &&
                          normalizedHeaders.some(h => h.includes('trip'));

    return matches.length >= 2 || (matches.length >= 1 && hasPnrAndTrip);
  },
  parseBooking: (rawData) => {
    const travelerName = findFieldValue(rawData, [
      'Traveler Name',
      'Passenger Name',
      'Employee Name',
      'Traveller',
      'TravelerName',
      'Full Name'
    ]);

    const bookingReference = findFieldValue(rawData, [
      'PNR',
      'Record Locator',
      'BCD Travel Reference',
      'Trip Number',
      'Booking Reference',
      'Reference Number',
      'TripNumber'
    ]);

    const amount = parseAmount(
      findFieldValue(rawData, [
        'Total Fare',
        'Total Amount',
        'Net Price',
        'Price',
        'Amount',
        'Total Cost',
        'TotalFare'
      ])
    );

    const currency = findFieldValue(rawData, [
      'Currency',
      'Currency Code',
      'Cur'
    ]);

    const travelType = findFieldValue(rawData, [
      'Type',
      'Service Type',
      'Product',
      'Category',
      'Travel Type',
      'ServiceType'
    ]);

    const vendor = findFieldValue(rawData, [
      'Vendor',
      'Supplier',
      'Airline Code',
      'Hotel',
      'Car Rental',
      'Carrier Name',
      'Provider'
    ]);

    const origin = findFieldValue(rawData, [
      'Origin',
      'From',
      'Departure',
      'Origin City',
      'Departure City',
      'OriginCity'
    ]);

    const destination = findFieldValue(rawData, [
      'Destination',
      'To',
      'Arrival',
      'Destination City',
      'Arrival City',
      'DestinationCity'
    ]);

    const departureDate = parseDate(
      findFieldValue(rawData, [
        'Departure Date',
        'Travel Start Date',
        'Start Date',
        'Check-In',
        'Pickup Date',
        'DepartureDate'
      ])
    );

    const returnDate = parseDate(
      findFieldValue(rawData, [
        'Return Date',
        'Travel End Date',
        'End Date',
        'Check-Out',
        'Dropoff Date',
        'ReturnDate'
      ])
    );

    const bookingDate = parseDate(
      findFieldValue(rawData, [
        'Booking Date',
        'Issued Date',
        'Created Date',
        'Transaction Date',
        'BookingDate'
      ])
    );

    return {
      travelerName,
      bookingReference,
      amount,
      currency,
      travelType,
      vendor,
      origin,
      destination,
      departureDate,
      returnDate,
      bookingDate,
      rawData,
      tmc: 'BCD Travel'
    };
  }
};

// CWT (Carlson Wagonlit Travel) parser
const cwtParser: TMCParser = {
  name: 'CWT (Carlson Wagonlit Travel)',
  detectFormat: (headers) => {
    const normalizedHeaders = headers.map(normalizeHeader);

    // CWT typically has these unique headers
    const cwtSignatures = [
      'cwt',
      'carlson',
      'wagonlit',
      'clientcode',
      'agencyreference'
    ];

    const matches = cwtSignatures.filter(sig =>
      normalizedHeaders.some(h => h.includes(sig))
    );

    // CWT often uses specific combinations
    const hasAgencyAndBooking = normalizedHeaders.some(h => h.includes('agency')) &&
                                 normalizedHeaders.some(h => h.includes('booking'));

    return matches.length >= 1 || hasAgencyAndBooking;
  },
  parseBooking: (rawData) => {
    const travelerName = findFieldValue(rawData, [
      'Passenger Name',
      'Traveler Name',
      'Traveller',
      'Employee',
      'PassengerName',
      'TravelerName'
    ]);

    const bookingReference = findFieldValue(rawData, [
      'PNR',
      'Booking Reference',
      'Record Locator',
      'Agency Reference',
      'Reference',
      'Confirmation',
      'AgencyReference'
    ]);

    const amount = parseAmount(
      findFieldValue(rawData, [
        'Total Fare',
        'Total Price',
        'Amount',
        'Net Amount',
        'Fare',
        'Total',
        'TotalFare',
        'Price'
      ])
    );

    const currency = findFieldValue(rawData, [
      'Currency',
      'Curr',
      'Currency Code',
      'CurrencyCode'
    ]);

    const travelType = findFieldValue(rawData, [
      'Type',
      'Service Type',
      'Product Type',
      'Category',
      'Travel Service',
      'ServiceType'
    ]);

    const vendor = findFieldValue(rawData, [
      'Vendor',
      'Supplier',
      'Airline',
      'Hotel Chain',
      'Car Company',
      'Carrier',
      'Provider Name'
    ]);

    const origin = findFieldValue(rawData, [
      'Origin',
      'From',
      'Departure Point',
      'Origin Airport',
      'Departure',
      'OriginAirport'
    ]);

    const destination = findFieldValue(rawData, [
      'Destination',
      'To',
      'Arrival Point',
      'Destination Airport',
      'Arrival',
      'DestinationAirport'
    ]);

    const departureDate = parseDate(
      findFieldValue(rawData, [
        'Departure Date',
        'Start Date',
        'Travel Date',
        'Outbound Date',
        'DepartureDate',
        'CheckInDate'
      ])
    );

    const returnDate = parseDate(
      findFieldValue(rawData, [
        'Return Date',
        'End Date',
        'Inbound Date',
        'ReturnDate',
        'CheckOutDate'
      ])
    );

    const bookingDate = parseDate(
      findFieldValue(rawData, [
        'Booking Date',
        'Ticketing Date',
        'Issue Date',
        'Created',
        'BookingDate'
      ])
    );

    return {
      travelerName,
      bookingReference,
      amount,
      currency,
      travelType,
      vendor,
      origin,
      destination,
      departureDate,
      returnDate,
      bookingDate,
      rawData,
      tmc: 'CWT (Carlson Wagonlit Travel)'
    };
  }
};

// Generic parser as fallback
const genericParser: TMCParser = {
  name: 'Generic',
  parseBooking: (rawData) => {
    return {
      ...extractCommonFields(rawData),
      rawData,
      tmc: 'Generic'
    };
  }
};

// This will be expanded as we learn about each TMC's specific format
const parsers: Record<string, TMCParser> = {
  'Egencia': egenciaParser,
  'BCD Travel': bcdTravelParser,
  'CWT (Carlson Wagonlit Travel)': cwtParser,
  'FCM Travel Solutions': genericParser,
  'CTM (Corporate Travel Management) Corporate Traveller': genericParser,
  'Navan': genericParser,
  'TravelPerk': genericParser,
  'TravelBank': genericParser,
  'ITILITE': genericParser,
  'Christopherson Business Travel': genericParser,
  'JTB Business Travel': genericParser,
  'ATPI': genericParser,
  'Solutions Travel': genericParser,
  'AmTrav': genericParser
};

// Helper function to try to extract common fields regardless of TMC
function extractCommonFields(rawData: Record<string, any>): Partial<BookingData> {
  const travelerName = findFieldValue(rawData, [
    'Traveler Name',
    'Traveller Name',
    'Passenger Name',
    'Employee Name',
    'Name',
    'Full Name'
  ]);

  const bookingReference = findFieldValue(rawData, [
    'Booking Reference',
    'Reference',
    'PNR',
    'Record Locator',
    'Confirmation',
    'Booking ID',
    'Trip ID'
  ]);

  const amount = parseAmount(
    findFieldValue(rawData, [
      'Amount',
      'Total',
      'Price',
      'Cost',
      'Total Amount',
      'Total Price',
      'Total Cost',
      'Fare'
    ])
  );

  const currency = findFieldValue(rawData, [
    'Currency',
    'Currency Code',
    'Curr'
  ]);

  const travelType = findFieldValue(rawData, [
    'Type',
    'Travel Type',
    'Service Type',
    'Product Type',
    'Category'
  ]);

  const vendor = findFieldValue(rawData, [
    'Vendor',
    'Supplier',
    'Provider',
    'Airline',
    'Hotel',
    'Car Company',
    'Carrier'
  ]);

  const origin = findFieldValue(rawData, [
    'Origin',
    'From',
    'Departure',
    'Start Location',
    'Departure City'
  ]);

  const destination = findFieldValue(rawData, [
    'Destination',
    'To',
    'Arrival',
    'End Location',
    'Arrival City'
  ]);

  const departureDate = parseDate(
    findFieldValue(rawData, [
      'Departure Date',
      'Start Date',
      'Travel Date',
      'Check-In',
      'Pickup Date'
    ])
  );

  const returnDate = parseDate(
    findFieldValue(rawData, [
      'Return Date',
      'End Date',
      'Check-Out',
      'Dropoff Date'
    ])
  );

  const bookingDate = parseDate(
    findFieldValue(rawData, [
      'Booking Date',
      'Created Date',
      'Issue Date',
      'Transaction Date'
    ])
  );

  return {
    travelerName,
    bookingReference,
    amount,
    currency,
    travelType,
    vendor,
    origin,
    destination,
    departureDate,
    returnDate,
    bookingDate
  };
}

export function parseBookingData(rawData: Record<string, any>[], tmcName: string): BookingData[] {
  const parser = parsers[tmcName];

  if (!parser) {
    throw new Error(`No parser available for TMC: ${tmcName}`);
  }

  return rawData.map(row => parser.parseBooking(row));
}

export function detectTMC(headers: string[]): string | null {
  for (const [tmcName, parser] of Object.entries(parsers)) {
    if (parser.detectFormat && parser.detectFormat(headers)) {
      return tmcName;
    }
  }
  return null;
}

export const TMC_LIST = Object.keys(parsers);