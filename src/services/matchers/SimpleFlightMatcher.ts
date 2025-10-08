import { BookingData } from '../../types/BookingData';
import { ExpenseData, MatchResult } from '../../types/ExpenseData';

/**
 * A simplified flight booking matcher that focuses on three key criteria:
 * 1. Card last 4 digits (primary)
 * 2. Merchant/vendor matching (secondary)
 * 3. Amount matching with tolerance (tertiary)
 */
export class SimpleFlightMatcher {
  /**
   * Find matches between flight bookings and expenses based on card last 4,
   * merchant, and amount.
   *
   * @param bookings All bookings data
   * @param expenses All expenses data
   * @returns Array of match results
   */
  public findMatches(bookings: BookingData[], expenses: ExpenseData[]): MatchResult[] {
    console.log(`[SimpleFlightMatcher] Starting matching process with ${bookings.length} bookings and ${expenses.length} expenses`);

    // Check if we have expenses with card last 4
    const expensesWithCardLast4 = expenses.filter(e =>
      e.cardLast4Normalized && e.cardLast4Normalized !== '[No card last 4 found]'
    );
    console.log(`[SimpleFlightMatcher] Found ${expensesWithCardLast4.length} out of ${expenses.length} expenses with card last 4`);

    // Debug: Show details of expenses with card last 4
    console.log(`[SimpleFlightMatcher] Expenses with card last 4 details:`);
    expensesWithCardLast4.slice(0, 10).forEach((expense, idx) => {
      console.log(`[SimpleFlightMatcher] Expense ${idx}: id=${expense.id}, vendor=${expense.vendor}, amount=${expense.amount}, cardLast4=${expense.cardLast4Normalized}`);
    });

    // Log a sample of expenses to check data quality
    console.log(`[SimpleFlightMatcher] Sampling 5 expenses to check data quality:`);
    expenses.slice(0, 5).forEach((expense, idx) => {
      console.log(`[SimpleFlightMatcher] Expense ${idx}: id=${expense.id}, vendor=${expense.vendor}, amount=${expense.amount}, cardLast4=${expense.cardLast4Normalized}`);
    });

    // Filter using DataFixerService-consistent approach
    const flightBookings = this.filterFlightBookings(bookings);
    console.log(`[SimpleFlightMatcher] Using DataFixerService-consistent approach: Found ${flightBookings.length} bookings`);

    // Count with direct approach for comparison
    const directMatchCount = bookings.filter(booking =>
      booking.cardTypeNormalized === 'Mastercard' &&
      booking.bookingTypeNormalized === 'Flight'
    ).length;
    console.log(`[SimpleFlightMatcher] Direct filtering found ${directMatchCount} bookings`);

    // Also check with case-insensitive matching
    const caseInsensitiveCount = bookings.filter(booking =>
      booking.cardTypeNormalized?.toLowerCase() === 'mastercard' &&
      booking.bookingTypeNormalized === 'Flight'
    ).length;
    console.log(`[SimpleFlightMatcher] Case-insensitive comparison found ${caseInsensitiveCount} bookings`);

    // Matches array to return
    const matches: MatchResult[] = [];

    // Keep track of which expenses have been matched
    const matchedExpenses = new Set<string>();

    // Sample a few bookings to check card last 4
    console.log(`[SimpleFlightMatcher] Sampling 5 bookings to check card last 4:`);
    flightBookings.slice(0, 5).forEach((booking, idx) => {
      console.log(`[SimpleFlightMatcher] Booking ${idx}: id=${booking.id}, vendor=${booking.merchantNormalized || booking.vendor}, amount=${booking.amountNormalized}, cardLast4=${booking.cardLast4Normalized}`);
    });

    // Count bookings with valid card last 4 digits
    const bookingsWithCardLast4 = flightBookings.filter(booking =>
      booking.cardLast4Normalized && booking.cardLast4Normalized !== '[No card last 4 found]'
    );
    console.log(`[SimpleFlightMatcher] Found ${bookingsWithCardLast4.length} out of ${flightBookings.length} flight bookings with valid card last 4`);

    // Show card last 4 distribution
    const cardLast4Distribution = new Map<string, number>();
    bookingsWithCardLast4.forEach(booking => {
      const last4 = booking.cardLast4Normalized || '[unknown]';
      cardLast4Distribution.set(last4, (cardLast4Distribution.get(last4) || 0) + 1);
    });
    console.log(`[SimpleFlightMatcher] Card last 4 distribution in bookings:`);
    Array.from(cardLast4Distribution.entries())
      .sort((a, b) => b[1] - a[1])  // Sort by frequency, highest first
      .slice(0, 10)  // Show top 10
      .forEach(([last4, count]) => {
        console.log(`[SimpleFlightMatcher]   ${last4}: ${count} bookings`);
      });

    // Check for potential matches by card last 4
    console.log(`[SimpleFlightMatcher] Checking for potential matches by card last 4...`);
    const expenseCardLast4Distribution = new Map<string, number>();
    expensesWithCardLast4.forEach(expense => {
      const last4 = expense.cardLast4Normalized || '[unknown]';
      expenseCardLast4Distribution.set(last4, (expenseCardLast4Distribution.get(last4) || 0) + 1);
    });

    // Find card last 4 values that exist in both bookings and expenses
    console.log(`[SimpleFlightMatcher] Common card last 4 digits between bookings and expenses:`);
    let commonLast4Found = false;

    // Convert iterator to array to avoid TypeScript error
    Array.from(cardLast4Distribution.entries()).forEach(([last4, count]) => {
      if (expenseCardLast4Distribution.has(last4)) {
        const expenseCount = expenseCardLast4Distribution.get(last4) || 0;
        console.log(`[SimpleFlightMatcher]   ${last4}: ${count} bookings, ${expenseCount} expenses - POTENTIAL MATCH`);
        commonLast4Found = true;
      }
    });

    if (!commonLast4Found) {
      console.log(`[SimpleFlightMatcher] ⚠️ NO COMMON CARD LAST 4 DIGITS FOUND BETWEEN BOOKINGS AND EXPENSES!`);
    }

    // For each flight booking, try to find the best matching expense
    flightBookings.forEach((booking, bookingIndex) => {
      // Important: We need both identifiers:
      // 1. The booking ref for the Flights Eval Table row
      const bookingRef = booking.id || `booking-${bookingIndex}`;

      // 2. The Booking_ID_Normalized from the original booking data
      const bookingIdNormalized = booking.bookingIdNormalized || '[No booking ID found]';

      console.log(`[SimpleFlightMatcher] Processing booking with Booking Ref: ${bookingRef}, Booking_ID_Normalized: ${bookingIdNormalized}`);

      // Skip if booking doesn't have card last 4 (our primary matching criterion)
      if (!booking.cardLast4Normalized || booking.cardLast4Normalized === '[No card last 4 found]') {
        console.log(`[SimpleFlightMatcher] Booking ${bookingRef} skipped - no card last 4`);
        return;
      }

      // Score each expense against this booking
      console.log(`[SimpleFlightMatcher] Booking ${bookingRef} has card last 4: ${booking.cardLast4Normalized}`);

      // Count how many expenses might be candidates for this booking
      const potentialMatches = expenses.filter(expense =>
        expense.cardLast4Normalized &&
        expense.cardLast4Normalized !== '[No card last 4 found]' &&
        expense.cardLast4Normalized === booking.cardLast4Normalized
      ).length;
      console.log(`[SimpleFlightMatcher] Booking ${bookingRef} has ${potentialMatches} expenses with matching card last 4`);

      const scoredExpenses = expenses
        .filter(expense => {
          // Skip already matched expenses
          const expenseId = expense.id || `expense-${expenses.indexOf(expense)}`;
          if (matchedExpenses.has(expenseId)) {
            console.log(`[SimpleFlightMatcher] Expense ${expenseId} already matched to another booking`);
            return false;
          }

          // Must have card last 4 data
          if (!expense.cardLast4Normalized || expense.cardLast4Normalized === '[No card last 4 found]') {
            return false;
          }

          // Debug: log when we find a potential card last 4 match
          if (expense.cardLast4Normalized === booking.cardLast4Normalized) {
            console.log(`[SimpleFlightMatcher] Found potential match: Booking ${bookingRef} and Expense ${expenseId} both have card last 4: ${expense.cardLast4Normalized}`);
            return true;
          }

          return false;
        })
        .map(expense => {
          const expenseId = expense.id || `expense-${expenses.indexOf(expense)}`;
          const matchScore = this.calculateMatchScore(booking, expense);

          return {
            expenseId,
            score: matchScore.score,
            reasons: matchScore.reasons
          };
        });

      // Sort by score descending
      scoredExpenses.sort((a, b) => b.score - a.score);

      // Get the best match if it meets minimum threshold
      const bestMatch = scoredExpenses[0];
      const MINIMUM_CONFIDENCE = 0.3; // 30% minimum confidence

      if (bestMatch && bestMatch.score >= MINIMUM_CONFIDENCE) {
        // Add to matches - here we store three pieces of information:
        // 1. expenseId: The ID from the expense report
        // 2. bookingId: The Booking Ref from the Flights Eval Table
        // 3. We can include the bookingIdNormalized in the match reasons
        matches.push({
          expenseId: bestMatch.expenseId,
          bookingId: bookingRef,
          matchConfidence: bestMatch.score,
          matchReason: [
            ...bestMatch.reasons,
            `Links to Booking_ID_Normalized: ${bookingIdNormalized}`
          ]
        });

        // Mark expense as matched
        matchedExpenses.add(bestMatch.expenseId);

        console.log(`[SimpleFlightMatcher] Matched booking ${bookingRef} to expense ${bestMatch.expenseId} with confidence ${bestMatch.score.toFixed(2)}`);
        console.log(`[SimpleFlightMatcher] This links to original booking ID: ${bookingIdNormalized}`);
      } else {
        console.log(`[SimpleFlightMatcher] No match found for booking ${bookingRef}`);
      }
    });

    return matches;
  }

  /**
   * Calculate a match score between a booking and expense
   * Uses a simple weighted scoring system focused on card, merchant, and amount
   */
  private calculateMatchScore(booking: BookingData, expense: ExpenseData): {
    score: number;
    reasons: string[]
  } {
    let totalScore = 0;
    const maxPossibleScore = 100; // Total possible score
    const reasons: string[] = [];

    // 1. Card last 4 matching - EXACT match required (60% of total score)
    const cardWeight = 60;
    if (booking.cardLast4Normalized === expense.cardLast4Normalized) {
      totalScore += cardWeight;
      reasons.push(`Card last 4 match: ${booking.cardLast4Normalized}`);
    } else {
      // If card doesn't match, no match is possible in this simplified model
      return { score: 0, reasons: [] };
    }

    // 2. Merchant/vendor matching (20% of total score)
    const merchantWeight = 20;
    if (this.merchantMatches(booking, expense)) {
      totalScore += merchantWeight;
      reasons.push(`Merchant match: ${booking.merchantNormalized || booking.vendor} / ${expense.vendor}`);
    }

    // 3. Amount matching with tolerance (20% of total score)
    const amountWeight = 20;
    const amountMatchScore = this.amountMatches(booking, expense);
    if (amountMatchScore > 0) {
      totalScore += amountWeight * amountMatchScore;

      const amountReason = amountMatchScore === 1
        ? `Exact amount match: ${booking.amountNormalized?.toFixed(2)} ${booking.currencyNormalized}`
        : `Close amount match (within ${((1 - amountMatchScore) * 100).toFixed(0)}%): ${booking.amountNormalized?.toFixed(2)} vs ${expense.amount?.toFixed(2)}`;

      reasons.push(amountReason);
    }

    // Normalize score to 0-1 range
    const normalizedScore = totalScore / maxPossibleScore;

    return {
      score: Math.round(normalizedScore * 100) / 100, // Round to 2 decimal places
      reasons
    };
  }

  /**
   * Check if merchant/vendor names match between booking and expense
   */
  private merchantMatches(booking: BookingData, expense: ExpenseData): boolean {
    // If either doesn't have merchant info, can't match
    if ((!booking.merchantNormalized && !booking.vendor) || !expense.vendor) {
      return false;
    }

    const bookingMerchant = this.normalizeString(booking.merchantNormalized || booking.vendor || '');
    const expenseMerchant = this.normalizeString(expense.vendor);

    // For airlines, the merchant names can be quite different between booking and expense
    // So we'll use a more flexible matching approach

    // First, try exact match
    if (bookingMerchant === expenseMerchant) {
      return true;
    }

    // Check if one contains the other
    if (bookingMerchant.includes(expenseMerchant) ||
        expenseMerchant.includes(bookingMerchant)) {
      return true;
    }

    // Check for common airline keywords
    const commonAirlineKeywords = [
      'air', 'airline', 'airways', 'flight'
    ];

    // Check if both merchants contain the same airline keyword
    for (const keyword of commonAirlineKeywords) {
      if (bookingMerchant.includes(keyword) &&
          expenseMerchant.includes(keyword)) {
        return true;
      }
    }

    // Check for specific airline matches (add more as needed)
    const airlineMatches = [
      ['delta', 'dl '],
      ['american', 'aa '],
      ['united', 'ua '],
      ['southwest', 'sw '],
      ['lufthansa', 'lh '],
      ['british airways', 'ba '],
    ];

    for (const [name, code] of airlineMatches) {
      // Check if one has the full name and the other has the code
      if ((bookingMerchant.includes(name) && expenseMerchant.includes(code)) ||
          (expenseMerchant.includes(name) && bookingMerchant.includes(code))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if amounts match between booking and expense within tolerance
   * Returns a score between 0-1 based on how close the match is
   */
  private amountMatches(booking: BookingData, expense: ExpenseData): number {
    if (booking.amountNormalized === undefined || expense.amount === undefined) {
      return 0;
    }

    const bookingAmount = booking.amountNormalized;
    const expenseAmount = expense.amount;

    // If exact match, perfect score
    if (bookingAmount === expenseAmount) {
      return 1.0;
    }

    // Calculate percentage difference
    const diff = Math.abs(bookingAmount - expenseAmount);
    const avgAmount = (bookingAmount + expenseAmount) / 2;
    const percentDiff = (diff / avgAmount) * 100;

    // Within 1% - very close (likely just rounding differences)
    if (percentDiff <= 1) return 0.98;

    // Within 5% - close (may include minor fees or tax adjustments)
    if (percentDiff <= 5) return 0.9;

    // Within 10% - acceptable (may include service fees)
    if (percentDiff <= 10) return 0.8;

    // Within 15% - possible match (may have seat upgrades or baggage fees)
    if (percentDiff <= 15) return 0.7;

    // Too different
    return 0;
  }

  /**
   * Filter bookings to only include Mastercard flight bookings
   * using the EXACT same approach as DataFixerService stats calculation
   */
  private filterFlightBookings(bookings: BookingData[]): BookingData[] {
    // Create a filtered array without modifying the original bookings
    // First, filter for potential candidates
    const filteredBookings = bookings.filter(booking => {
      // Check for required Flight type
      const isFlightType = booking.bookingTypeNormalized === 'Flight';

      // Check for Mastercard, or if needs fixing
      const isMastercardAlready = booking.cardTypeNormalized === 'Mastercard';
      const needsMastercardFix = booking.rawData &&
                                 booking.rawData['Credit Card Network'] === 'MasterCard';

      return isFlightType && (isMastercardAlready || needsMastercardFix);
    });

    // Now create a clean array with just what we need
    return filteredBookings.map(booking => {
      const result = { ...booking };

      // Apply Mastercard fix if needed
      if (result.rawData && result.rawData['Credit Card Network'] === 'MasterCard') {
        result.cardTypeNormalized = 'Mastercard';
      }

      return result;
    });
  }

  /**
   * Normalize string for comparison
   */
  private normalizeString(str: string): string {
    if (!str) return '';

    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  }
}