import { matchBookingsWithExpenses, getUnmatchedBookings, getUnmatchedExpenses } from './MatchingService';
import { BookingData } from '../types/BookingData';
import { ExpenseData, MatchResult } from '../types/ExpenseData';

describe('MatchingService', () => {
  // Sample booking data
  const createBookings = (): BookingData[] => [
    // Flight booking
    {
      id: 'booking-1',
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
      bookingTypeNormalized: 'Flight',
      merchantNormalized: 'Delta Air Lines',
      cardTypeNormalized: 'Mastercard',
      cardLast4Normalized: '1234',
      cardHolderNameNormalized: 'John Smith',
      currencyNormalized: 'USD',
      amountNormalized: 450.75,
      travelerNameNormalized: 'John Smith',
      rawData: { Type: 'FLIGHT' },
      tmc: 'Navan'
    },
    // Hotel booking
    {
      id: 'booking-2',
      bookingDate: '2023-10-16',
      travelerName: 'Jane Doe',
      travelType: 'Hotel',
      vendor: 'Marriott',
      departureDate: '2023-11-01',
      returnDate: '2023-11-04',
      bookingReference: 'HTL5678',
      amount: 350.25,
      currency: 'USD',
      bookingTypeNormalized: 'Hotel',
      merchantNormalized: 'Marriott',
      cardTypeNormalized: 'Mastercard',
      cardLast4Normalized: '5678',
      cardHolderNameNormalized: 'Jane Doe',
      currencyNormalized: 'USD',
      amountNormalized: 350.25,
      travelerNameNormalized: 'Jane Doe',
      rawData: { Type: 'HOTEL' },
      tmc: 'Navan'
    },
    // Car rental booking
    {
      id: 'booking-3',
      bookingDate: '2023-10-17',
      travelerName: 'Robert Johnson',
      travelType: 'Car',
      vendor: 'Hertz',
      departureDate: '2023-11-01',
      returnDate: '2023-11-08',
      bookingReference: 'CAR9012',
      amount: 225.50,
      currency: 'USD',
      bookingTypeNormalized: 'Car',
      merchantNormalized: 'Hertz',
      cardTypeNormalized: 'Mastercard',
      cardLast4Normalized: '9012',
      cardHolderNameNormalized: 'Robert Johnson',
      currencyNormalized: 'USD',
      amountNormalized: 225.50,
      travelerNameNormalized: 'Robert Johnson',
      rawData: { Type: 'CAR' },
      tmc: 'Navan'
    }
  ];

  // Sample expense data
  const createExpenses = (): ExpenseData[] => [
    // Flight expense
    {
      id: 'expense-1',
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
      rawData: {}
    },
    // Hotel expense
    {
      id: 'expense-2',
      expenseDate: '2023-10-16',
      employeeName: 'Jane Doe',
      expenseType: 'Lodging',
      description: 'Marriott Hotel 3 nights',
      vendor: 'Marriott',
      amount: 350.25,
      currency: 'USD',
      cardLast4Normalized: '5678',
      rawData: {}
    },
    // Expense without a matching booking
    {
      id: 'expense-3',
      expenseDate: '2023-10-18',
      employeeName: 'Lisa Brown',
      expenseType: 'Meals',
      description: 'Dinner with client',
      vendor: 'Restaurant',
      amount: 75.50,
      currency: 'USD',
      cardLast4Normalized: '3456',
      rawData: {}
    }
  ];

  describe('matchBookingsWithExpenses', () => {
    it('should match bookings with expenses using specialized matchers', () => {
      const bookings = createBookings();
      const expenses = createExpenses();

      const matches = matchBookingsWithExpenses(bookings, expenses);

      // Should find 2 matches (flight and hotel)
      expect(matches).toHaveLength(2);

      // Flight match should be first and have high confidence
      const flightMatch = matches.find(m => m.bookingId === 'booking-1');
      expect(flightMatch).toBeDefined();
      expect(flightMatch?.expenseId).toBe('expense-1');
      expect(flightMatch?.matchConfidence).toBeGreaterThanOrEqual(0.8);
      expect(flightMatch?.matchReason.some(reason =>
        reason.toLowerCase().includes('flight') ||
        reason.toLowerCase().includes('reference')
      )).toBe(true);

      // Hotel match should also exist
      const hotelMatch = matches.find(m => m.bookingId === 'booking-2');
      expect(hotelMatch).toBeDefined();
      expect(hotelMatch?.expenseId).toBe('expense-2');
    });

    it('should not match bookings below minimum confidence threshold', () => {
      const bookings = createBookings();

      // Create expenses that are very different from bookings
      const expenses = [
        {
          id: 'expense-1',
          expenseDate: '2023-10-20',
          employeeName: 'Different Name',
          expenseType: 'Misc',
          description: 'Random expense',
          vendor: 'Other Vendor',
          amount: 100.00,
          currency: 'USD',
          cardLast4Normalized: '9999',
          rawData: {}
        }
      ];

      const matches = matchBookingsWithExpenses(bookings, expenses);

      // Should find 0 matches since none meet the minimum threshold
      expect(matches).toHaveLength(0);
    });

    it('should filter out non-Mastercard bookings', () => {
      // Create a mixed set of bookings with different card types
      const bookings = [
        // Mastercard booking - should be included
        {
          id: 'booking-1',
          bookingDate: '2023-10-15',
          travelerName: 'John Smith',
          travelType: 'Flight',
          vendor: 'Delta Airlines',
          origin: 'SFO',
          destination: 'JFK',
          bookingReference: 'DL1234',
          amount: 450.75,
          currency: 'USD',
          bookingTypeNormalized: 'Flight',
          merchantNormalized: 'Delta Air Lines',
          cardTypeNormalized: 'Mastercard', // This one should be kept
          cardLast4Normalized: '1234',
          cardHolderNameNormalized: 'John Smith',
          currencyNormalized: 'USD',
          amountNormalized: 450.75,
          travelerNameNormalized: 'John Smith',
          rawData: { Type: 'FLIGHT' },
          tmc: 'Navan'
        },
        // Visa booking - should be filtered out
        {
          id: 'booking-visa',
          bookingDate: '2023-10-15',
          travelerName: 'John Smith',
          travelType: 'Flight',
          vendor: 'Delta Airlines',
          origin: 'SFO',
          destination: 'JFK',
          bookingReference: 'DL5678',
          amount: 450.75,
          currency: 'USD',
          bookingTypeNormalized: 'Flight',
          merchantNormalized: 'Delta Air Lines',
          cardTypeNormalized: 'Visa', // This one should be filtered out
          cardLast4Normalized: '5678',
          cardHolderNameNormalized: 'John Smith',
          currencyNormalized: 'USD',
          amountNormalized: 450.75,
          travelerNameNormalized: 'John Smith',
          rawData: { Type: 'FLIGHT' },
          tmc: 'Navan'
        },
        // Amex booking - should be filtered out
        {
          id: 'booking-amex',
          bookingDate: '2023-10-15',
          travelerName: 'John Smith',
          travelType: 'Flight',
          vendor: 'Delta Airlines',
          origin: 'SFO',
          destination: 'JFK',
          bookingReference: 'DL9012',
          amount: 450.75,
          currency: 'USD',
          bookingTypeNormalized: 'Flight',
          merchantNormalized: 'Delta Air Lines',
          cardTypeNormalized: 'American Express', // This one should be filtered out
          cardLast4Normalized: '9012',
          cardHolderNameNormalized: 'John Smith',
          currencyNormalized: 'USD',
          amountNormalized: 450.75,
          travelerNameNormalized: 'John Smith',
          rawData: { Type: 'FLIGHT' },
          tmc: 'Navan'
        }
      ];

      // Create a matching expense
      const expenses = [
        {
          id: 'expense-1',
          expenseDate: '2023-10-15',
          employeeName: 'John Smith',
          expenseType: 'Airfare',
          description: 'Flight DL1234 SFO-JFK', // Matches booking-1 (Mastercard)
          vendor: 'Delta Airlines',
          amount: 450.75,
          currency: 'USD',
          origin: 'SFO',
          destination: 'JFK',
          cardLast4Normalized: '1234',
          rawData: {}
        }
      ];

      const matches = matchBookingsWithExpenses(bookings, expenses);

      // Should find 1 match (only with the Mastercard booking)
      expect(matches).toHaveLength(1);
      expect(matches[0].bookingId).toBe('booking-1');
      expect(matches[0].expenseId).toBe('expense-1');
    });
  });

  describe('getUnmatchedBookings', () => {
    it('should return bookings that were not matched', () => {
      const bookings = createBookings();
      const matches: MatchResult[] = [
        {
          expenseId: 'expense-1',
          bookingId: 'booking-1',
          matchConfidence: 0.9,
          matchReason: ['Test match']
        }
      ];

      const unmatched = getUnmatchedBookings(bookings, matches);

      // Should return 2 unmatched bookings (booking-2 and booking-3)
      expect(unmatched).toHaveLength(2);
      expect(unmatched[0].id).toBe('booking-2');
      expect(unmatched[1].id).toBe('booking-3');
    });
  });

  describe('getUnmatchedExpenses', () => {
    it('should return expenses that were not matched', () => {
      const expenses = createExpenses();
      const matches: MatchResult[] = [
        {
          expenseId: 'expense-1',
          bookingId: 'booking-1',
          matchConfidence: 0.9,
          matchReason: ['Test match']
        },
        {
          expenseId: 'expense-2',
          bookingId: 'booking-2',
          matchConfidence: 0.8,
          matchReason: ['Test match']
        }
      ];

      const unmatched = getUnmatchedExpenses(expenses, matches);

      // Should return 1 unmatched expense (expense-3)
      expect(unmatched).toHaveLength(1);
      expect(unmatched[0].id).toBe('expense-3');
    });
  });
});