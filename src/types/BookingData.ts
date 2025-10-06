export interface BookingData {
  // Common fields that might exist across different TMCs
  // These will be expanded as we learn more about each TMC's data structure
  id?: string;
  bookingDate?: string;
  travelerName?: string;
  travelType?: string; // Flight, Hotel, Car, etc.
  vendor?: string; // Airline, Hotel chain, Car rental company
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  bookingReference?: string;
  amount?: number;
  currency?: string;

  // Normalized fields for matching
  bookingIdNormalized?: string;
  bookingTypeNormalized?: string;
  merchantNormalized?: string;
  cardTypeNormalized?: string;
  cardLast4Normalized?: string;
  cardHolderNameNormalized?: string; // New field for name on card
  currencyNormalized?: string;
  amountNormalized?: number;
  bookingExpectTxTimeNormalized?: string;
  travelerNameNormalized?: string;

  // Raw data for debugging and TMC-specific parsing
  rawData: Record<string, any>;

  // Metadata
  tmc: string;
}

// TMC-specific parsers will be added as we learn more about each format
export interface TMCParser {
  name: string;
  parseBooking: (rawData: Record<string, any>) => BookingData;
  detectFormat?: (headers: string[]) => boolean;
}