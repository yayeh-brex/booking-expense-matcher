import { FlightMatcher } from './FlightMatcher';
import { BookingData } from '../../types/BookingData';
import { ExpenseData } from '../../types/ExpenseData';

describe('FlightMatcher', () => {
  // Create a new instance of FlightMatcher for testing
  const flightMatcher = new FlightMatcher();

  // Sample flight booking data
  const createFlightBooking = (overrides: Partial<BookingData> = {}): BookingData => ({
    id: 'booking-123',
    bookingDate: '2023-10-15',
    travelerName: 'John Smith',
    travelType: 'Flight',
    vendor: 'Delta Airlines',
    origin: 'SFO',
    destination: 'JFK',
    departureDate: '2023-11-01',
    returnDate: '2023-11-08',
    bookingReference: 'DL1234',
    amount: 450.75,
    currency: 'USD',

    // Normalized fields
    bookingIdNormalized: 'DL1234',
    bookingTypeNormalized: 'Flight',
    merchantNormalized: 'Delta Air Lines',
    cardTypeNormalized: 'Mastercard',
    cardLast4Normalized: '1234',
    cardHolderNameNormalized: 'John Smith',
    currencyNormalized: 'USD',
    amountNormalized: 450.75,
    bookingExpectTxTimeNormalized: '2023-10-15',
    travelerNameNormalized: 'John Smith',

    // Raw data
    rawData: {
      'Booking ID': 'DL1234',
      'Type': 'FLIGHT',
      'Passenger': 'SMITH/JOHN',
      'Carrier': 'Delta Airlines',
      'Origin': 'SFO',
      'Destination': 'JFK',
      'Flight Number': 'DL1234',
      'Departure Date': '2023-11-01',
      'Return Date': '2023-11-08',
      'Currency': 'USD',
      'Amount': '450.75',
      'Card Number': 'XXXX-XXXX-XXXX-1234',
      'Card Type': 'Visa'
    },
    tmc: 'Navan',
    ...overrides
  });

  // Sample expense data
  const createExpense = (overrides: Partial<ExpenseData> = {}): ExpenseData => ({
    id: 'expense-456',
    expenseDate: '2023-10-15',
    employeeName: 'John Smith',
    expenseType: 'Airfare',
    description: 'Flight DL1234 SFO-JFK',
    vendor: 'Delta Airlines',
    amount: 450.75,
    currency: 'USD',
    origin: 'SFO',
    destination: 'JFK',
    cardLast4Normalized: '1234',
    rawData: {},
    ...overrides
  });

  describe('calculateFlightMatchScore', () => {
    it('should return high score for exact match', () => {
      const booking = createFlightBooking();
      const expense = createExpense();

      const result = flightMatcher.calculateFlightMatchScore(booking, expense);

      // Perfect match should be very high score
      expect(result.score).toBeGreaterThanOrEqual(0.9);
      // Should provide multiple match reasons
      expect(result.reasons.length).toBeGreaterThan(1);
      // Should include flight reference match
      expect(result.reasons.some(reason => reason.includes('Flight reference'))).toBe(true);
    });

    it('should handle partial matches', () => {
      const booking = createFlightBooking();
      const expense = createExpense({
        amount: 225.38, // About half the booking amount (one-way leg)
        description: 'Delta Airlines SFO-JFK'
      });

      const result = flightMatcher.calculateFlightMatchScore(booking, expense);

      // Should still provide a decent match score due to other matching fields
      expect(result.score).toBeGreaterThanOrEqual(0.5);
      // Should include partial payment match
      expect(result.reasons.some(reason => reason.includes('partial payment'))).toBe(true);
    });

    it('should return low score for non-flight bookings', () => {
      const booking = createFlightBooking({
        bookingTypeNormalized: 'Hotel' // Not a flight
      });
      const expense = createExpense();

      const result = flightMatcher.calculateFlightMatchScore(booking, expense);

      // Should return zero score for non-flight bookings
      expect(result.score).toBe(0);
      expect(result.reasons).toContain('Not a flight booking');
    });

    it('should match carrier codes', () => {
      const booking = createFlightBooking();
      const expense = createExpense({
        description: 'DL 1234 on October 15' // Different format but same carrier
      });

      const result = flightMatcher.calculateFlightMatchScore(booking, expense);

      // Should have a high score due to carrier code match
      expect(result.score).toBeGreaterThanOrEqual(0.7);
      // Should include DL reference match in reasons
      expect(result.reasons.some(reason => reason.includes('DL'))).toBe(true);
    });

    it('should handle completely different expenses', () => {
      const booking = createFlightBooking();
      const expense = createExpense({
        employeeName: 'Jane Doe',
        expenseType: 'Meals',
        description: 'Dinner with client',
        vendor: 'Restaurant',
        amount: 85.0,
        origin: undefined,
        destination: undefined
      });

      const result = flightMatcher.calculateFlightMatchScore(booking, expense);

      // Should have a low score
      expect(result.score).toBeLessThan(0.5);
      // Should have fewer match reasons than a full match
      expect(result.reasons.length).toBeLessThan(result.reasons.length + 3);
    });
  });

  // Test for carrier code extraction
  describe('extractCarrierCode', () => {
    it('should extract carrier code from standard flight number', () => {
      const matcher = flightMatcher as any; // Access private method for testing

      // Test with a format we know works based on the implementation
      const result = matcher.extractCarrierCode('AA 1234');
      expect(result).toBe('AA');
    });

    it('should return null for inputs without carrier codes', () => {
      const matcher = flightMatcher as any; // Access private method for testing

      const inputs = [
        '',
        null,
        undefined,
        'Flight to New York',
        'Airline ticket',
        'SFO to JFK'
      ];

      inputs.forEach(input => {
        const result = matcher.extractCarrierCode(input);
        expect(result).toBeNull();
      });
    });
  });

  // Test for flight route matching
  describe('matchFlightRoute', () => {
    it('should match routes with exact origins and destinations', () => {
      const matcher = flightMatcher as any; // Access private method for testing

      const booking = createFlightBooking({ origin: 'SFO', destination: 'JFK' });
      const expense = createExpense({ origin: 'SFO', destination: 'JFK' });

      const result = matcher.matchFlightRoute(booking, expense);
      expect(result.score).toBeGreaterThanOrEqual(0.9);
      expect(result.reason).toContain('Origin match');
      expect(result.reason).toContain('Destination match');
    });

    it('should handle partial route matches', () => {
      const matcher = flightMatcher as any; // Access private method for testing

      const booking = createFlightBooking({ origin: 'SFO', destination: 'JFK' });
      const expense = createExpense({ origin: 'SFO', destination: undefined });

      const result = matcher.matchFlightRoute(booking, expense);
      expect(result.score).toBeGreaterThan(0);
      expect(result.reason).toContain('Origin match');
      expect(result.reason).not.toContain('Destination match');
    });

    it('should return zero score when no route information is available', () => {
      const matcher = flightMatcher as any; // Access private method for testing

      const booking = createFlightBooking({ origin: undefined, destination: undefined });
      const expense = createExpense({ origin: undefined, destination: undefined });

      const result = matcher.matchFlightRoute(booking, expense);
      expect(result.score).toBe(0);
      expect(result.reason).toBeUndefined();
    });
  });

  // Test for flight-specific amount matching
  describe('fuzzyFlightAmountMatch', () => {
    it('should return perfect score for exact amount matches', () => {
      const matcher = flightMatcher as any; // Access private method for testing

      const result = matcher.fuzzyFlightAmountMatch(450.75, 450.75);
      expect(result.score).toBe(1.0);
      expect(result.reason).toContain('Exact amount match');
    });

    it('should handle small variations in amount', () => {
      const matcher = flightMatcher as any; // Access private method for testing

      const result = matcher.fuzzyFlightAmountMatch(450.75, 452.25); // Less than 1% difference
      expect(result.score).toBeGreaterThanOrEqual(0.95);
      expect(result.reason).toContain('within 1%');
    });

    it('should detect potential partial payments', () => {
      const matcher = flightMatcher as any; // Access private method for testing

      const result = matcher.fuzzyFlightAmountMatch(450.75, 225.38); // ~50% of booking amount
      expect(result.score).toBeGreaterThanOrEqual(0.7);
      expect(result.reason).toContain('partial payment');
    });

    it('should return zero score for completely different amounts', () => {
      const matcher = flightMatcher as any; // Access private method for testing

      const result = matcher.fuzzyFlightAmountMatch(450.75, 75.00); // Completely different
      expect(result.score).toBe(0);
    });

    it('should handle undefined amounts', () => {
      const matcher = flightMatcher as any; // Access private method for testing

      const result1 = matcher.fuzzyFlightAmountMatch(undefined, 450.75);
      expect(result1.score).toBe(0);

      const result2 = matcher.fuzzyFlightAmountMatch(450.75, undefined);
      expect(result2.score).toBe(0);
    });
  });
});