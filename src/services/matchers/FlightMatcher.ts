import { BookingData } from '../../types/BookingData';
import { ExpenseData } from '../../types/ExpenseData';

/**
 * Specialized matcher for flight bookings
 * Contains flight-specific matching criteria and algorithms
 */
export interface MatchScore {
  score: number;
  reasons: string[];
}

/**
 * Flight matcher class containing specialized logic for matching flight bookings to expenses
 */
export class FlightMatcher {
  // Helper functions from MatchingService
  private normalizeString(str: string): string {
    if (!str) return '';

    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[len1][len2];
  }

  private fuzzyStringMatch(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    const norm1 = this.normalizeString(str1);
    const norm2 = this.normalizeString(str2);

    if (norm1 === norm2) return 1.0;
    if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;

    const distance = this.levenshteinDistance(norm1, norm2);
    const maxLength = Math.max(norm1.length, norm2.length);

    return 1 - (distance / maxLength);
  }

  /**
   * Specialized fuzzy amount matching for flight expenses
   * Flights often have multiple charges or variations that can affect the final amount
   */
  private fuzzyFlightAmountMatch(bookingAmount: number, expenseAmount: number): { score: number; reason?: string } {
    if (bookingAmount === undefined || expenseAmount === undefined) {
      return { score: 0 };
    }

    const diff = Math.abs(bookingAmount - expenseAmount);
    const avgAmount = (bookingAmount + expenseAmount) / 2;

    // Exact match
    if (diff === 0) return { score: 1.0, reason: 'Exact amount match' };

    // Calculate percentage difference
    const percentDiff = (diff / avgAmount) * 100;

    // Within 1% - very close (likely just rounding differences)
    if (percentDiff <= 1) return {
      score: 0.98,
      reason: `Very close amount match (within 1%): ${bookingAmount.toFixed(2)} vs ${expenseAmount.toFixed(2)}`
    };

    // Within 5% - close (may include minor fees or tax adjustments)
    if (percentDiff <= 5) return {
      score: 0.9,
      reason: `Close amount match (within 5%): ${bookingAmount.toFixed(2)} vs ${expenseAmount.toFixed(2)}`
    };

    // Within 10% - acceptable (may include service fees, exchange rate differences)
    if (percentDiff <= 10) return {
      score: 0.85,
      reason: `Good amount match (within 10%): ${bookingAmount.toFixed(2)} vs ${expenseAmount.toFixed(2)}`
    };

    // Within 15% - possible match (may have seat upgrades or baggage fees)
    if (percentDiff <= 15) return {
      score: 0.75,
      reason: `Possible amount match (within 15%): ${bookingAmount.toFixed(2)} vs ${expenseAmount.toFixed(2)}`
    };

    // Flight expenses sometimes have partial payments
    // Check if expense is ~50% of booking (partial payment or one-way charged separately)
    if (Math.abs((expenseAmount / bookingAmount) - 0.5) < 0.05) {
      return {
        score: 0.7,
        reason: `Possible partial payment match (expense is ~50% of booking): ${bookingAmount.toFixed(2)} vs ${expenseAmount.toFixed(2)}`
      };
    }

    // Too different
    return { score: 0 };
  }

  /**
   * Parse and extract airline carrier codes from booking and expense data
   * This is helpful for flight-specific matching
   */
  private extractCarrierCode(text: string): string | null {
    if (!text) return null;

    // Common 2-letter airline carrier codes (IATA)
    const carrierCodePattern = /\b([A-Z]{2})\b\s*\d+/;
    const match = text.match(carrierCodePattern);

    if (match && match[1]) {
      return match[1];
    }

    return null;
  }

  /**
   * Match flight route information between booking and expense
   */
  private matchFlightRoute(booking: BookingData, expense: ExpenseData): { score: number; reason?: string } {
    const bookingOrigin = booking.origin;
    const bookingDest = booking.destination;
    const expenseOrigin = expense.origin;
    const expenseDest = expense.destination;

    // If either has no route info, we can't score this
    if (!bookingOrigin && !bookingDest && !expenseOrigin && !expenseDest) {
      return { score: 0 };
    }

    let originScore = 0;
    let destScore = 0;
    let routeScore = 0;
    let routeReason = '';

    // Check origin matching
    if (bookingOrigin && expenseOrigin) {
      originScore = this.fuzzyStringMatch(bookingOrigin, expenseOrigin);
      if (originScore > 0.7) {
        routeReason += `Origin match: ${bookingOrigin} - ${expenseOrigin}. `;
      }
    }

    // Check destination matching
    if (bookingDest && expenseDest) {
      destScore = this.fuzzyStringMatch(bookingDest, expenseDest);
      if (destScore > 0.7) {
        routeReason += `Destination match: ${bookingDest} - ${expenseDest}. `;
      }
    }

    // Calculate overall route score - average of origin and destination scores
    if (originScore > 0 && destScore > 0) {
      routeScore = (originScore + destScore) / 2;
    } else if (originScore > 0) {
      routeScore = originScore * 0.8; // Partial match
    } else if (destScore > 0) {
      routeScore = destScore * 0.8; // Partial match
    }

    return {
      score: routeScore,
      reason: routeScore > 0 ? routeReason.trim() : undefined
    };
  }

  /**
   * Calculate flight-specific match score between a booking and an expense
   * Returns a score between 0 and 1, and list of matching reasons
   */
  public calculateFlightMatchScore(booking: BookingData, expense: ExpenseData): MatchScore {
    // Debug info about the booking and expense being matched
    console.log(`DEBUG: [FlightMatcher] Checking match between booking ${booking.id} and expense ${expense.id || 'unknown'}`);
    console.log(`DEBUG: [FlightMatcher] Booking type: ${booking.bookingTypeNormalized}, Expense type: ${expense.expenseType || 'unknown'}`);
    console.log(`DEBUG: [FlightMatcher] Booking details: ${JSON.stringify({
      vendor: booking.merchantNormalized || booking.vendor,
      traveler: booking.travelerNameNormalized,
      cardLast4: booking.cardLast4Normalized,
      route: `${booking.origin || '?'} -> ${booking.destination || '?'}`,
      amount: booking.amountNormalized,
      currency: booking.currencyNormalized
    })}`);
    console.log(`DEBUG: [FlightMatcher] Expense details: ${JSON.stringify({
      vendor: expense.vendor,
      employee: expense.employeeName,
      cardLast4: expense.cardLast4Normalized,
      route: `${expense.origin || '?'} -> ${expense.destination || '?'}`,
      amount: expense.amount,
      currency: expense.currency
    })}`);


    // Use expanded criteria to identify flight bookings
    const isFlightBooking = (
      // Check normalized type
      booking.bookingTypeNormalized?.toLowerCase() === 'flight' ||
      // Check travel type for flight keywords
      booking.travelType?.toLowerCase()?.includes('flight') ||
      booking.travelType?.toLowerCase()?.includes('air') ||
      // Check merchant/vendor for airline names
      booking.merchantNormalized?.toLowerCase()?.includes('airline') ||
      booking.merchantNormalized?.toLowerCase()?.includes('airways') ||
      booking.vendor?.toLowerCase()?.includes('airline') ||
      booking.vendor?.toLowerCase()?.includes('airways') ||
      // Check for common airline names
      booking.merchantNormalized?.toLowerCase()?.includes('delta') ||
      booking.merchantNormalized?.toLowerCase()?.includes('united') ||
      booking.merchantNormalized?.toLowerCase()?.includes('american') ||
      // Check origin/destination (flights typically have both)
      (booking.origin && booking.destination)
    );

    // Treat as a flight, but with a penalty to the score if it doesn't match our flight criteria
    // This makes matching more inclusive while still preferring proper flight bookings
    if (!isFlightBooking) {
      console.log(`DEBUG: [FlightMatcher] Booking ${booking.id} doesn't match flight criteria, but proceeding with penalty`);
      // We'll apply a 30% penalty to the final score for non-flight bookings
      // This way they can still match but at a reduced confidence
    }

    let totalScore = 0;
    let maxPossibleScore = 0;
    const reasons: string[] = [];

    // 1. Check for flight carrier code in reference numbers or descriptions (highest weight)
    const bookingCarrierCode = this.extractCarrierCode(booking.bookingReference || '');
    const expenseCarrierCode = this.extractCarrierCode(expense.description || '');

    if (bookingCarrierCode && expenseCarrierCode) {
      maxPossibleScore += 25; // Very high weight for carrier code match
      if (bookingCarrierCode === expenseCarrierCode) {
        totalScore += 25;
        reasons.push(`Airline carrier code match: ${bookingCarrierCode}`);
      }
    }

    // 2. Check flight number or booking reference in expense description (high weight)
    if (booking.bookingReference && expense.description) {
      maxPossibleScore += 20;
      const bookingRef = this.normalizeString(booking.bookingReference);
      const expenseDesc = this.normalizeString(expense.description);

      // Common formatting adjustments for flight numbers
      // 'AA1234' might appear as 'AA 1234' or 'AA#1234' in expense systems
      const refVariations = [
        bookingRef,
        bookingRef.replace(/(\D+)(\d+)/, '$1 $2'),
        bookingRef.replace(/(\D+)(\d+)/, '$1#$2')
      ];

      let refFound = false;
      for (const ref of refVariations) {
        if (expenseDesc.includes(ref)) {
          totalScore += 20;
          reasons.push(`Flight reference match: ${booking.bookingReference}`);
          refFound = true;
          break;
        }
      }

      // Check for partial reference match if no exact match found
      if (!refFound) {
        // Extract alphanumeric sequences that could be flight numbers
        const bookingRefParts = bookingRef.match(/[a-z]{1,2}\d{3,4}/g);
        const expenseDescParts = expenseDesc.match(/[a-z]{1,2}\d{3,4}/g);

        if (bookingRefParts && expenseDescParts) {
          for (const bookingPart of bookingRefParts) {
            for (const expensePart of expenseDescParts) {
              if (this.fuzzyStringMatch(bookingPart, expensePart) > 0.8) {
                totalScore += 15; // Slightly lower score for partial match
                reasons.push(`Partial flight reference match: ${bookingPart} in ${expensePart}`);
                refFound = true;
                break;
              }
            }
            if (refFound) break;
          }
        }
      }
    }

    // 3. Route matching (origin/destination) - specific to flights
    const routeMatch = this.matchFlightRoute(booking, expense);
    if (routeMatch.score > 0) {
      maxPossibleScore += 15;
      totalScore += 15 * routeMatch.score;
      if (routeMatch.reason) {
        reasons.push(routeMatch.reason);
      }
    }

    // 4. Name matching (high weight)
    if (booking.travelerNameNormalized && booking.travelerNameNormalized !== '[No valid traveler name found]' &&
        expense.employeeName) {
      maxPossibleScore += 15;
      const nameScore = this.fuzzyStringMatch(booking.travelerNameNormalized, expense.employeeName);
      if (nameScore > 0.7) {
        totalScore += 15 * nameScore;
        reasons.push(`Traveler name match: ${booking.travelerNameNormalized} / ${expense.employeeName}`);
      }
    }

    // 5. Amount matching (high weight with flight-specific logic)
    if (booking.amountNormalized !== undefined && expense.amount !== undefined) {
      maxPossibleScore += 15;
      const amountMatch = this.fuzzyFlightAmountMatch(booking.amountNormalized, expense.amount);
      if (amountMatch.score > 0) {
        totalScore += 15 * amountMatch.score;
        if (amountMatch.reason) {
          reasons.push(amountMatch.reason);
        }
      }
    }

    // 6. Credit card last 4 digits matching (highest weight - most important match criterion)
    const expenseCardLast4 = expense.cardLast4Normalized;
    const bookingCardLast4 = booking.cardLast4Normalized;

    if (bookingCardLast4 && expenseCardLast4 &&
        bookingCardLast4 !== '[No card last 4 found]' &&
        expenseCardLast4 !== '[No card last 4 found]') {
      maxPossibleScore += 30; // Highest weight as this is the most important indicator
      if (bookingCardLast4 === expenseCardLast4) {
        totalScore += 30;
        reasons.push(`Card last 4 match: ${bookingCardLast4}`);
      }
    }

    // 7. Card holder name matching (high weight)
    if (booking.cardHolderNameNormalized &&
        booking.cardHolderNameNormalized !== '[No card holder name found]' &&
        booking.cardHolderNameNormalized !== '[Invalid card holder name format]' &&
        expense.employeeName) {
      maxPossibleScore += 15;
      const cardHolderMatch = this.fuzzyStringMatch(booking.cardHolderNameNormalized, expense.employeeName);
      if (cardHolderMatch > 0.7) {
        totalScore += 15 * cardHolderMatch;
        reasons.push(`Card holder name match: ${booking.cardHolderNameNormalized} / ${expense.employeeName}`);
      }
    }

    // 8. Merchant/vendor matching (medium weight)
    if (booking.merchantNormalized && booking.merchantNormalized !== '[No merchant found]' &&
        expense.vendor) {
      maxPossibleScore += 10;
      const vendorScore = this.fuzzyStringMatch(booking.merchantNormalized, expense.vendor);
      if (vendorScore > 0.6) {
        totalScore += 10 * vendorScore;
        reasons.push(`Airline/vendor match: ${booking.merchantNormalized} / ${expense.vendor}`);
      }
    }

    // 9. Currency matching
    if (booking.currencyNormalized && booking.currencyNormalized !== '[No currency found]' &&
        expense.currency) {
      maxPossibleScore += 10;
      if (this.normalizeString(booking.currencyNormalized) === this.normalizeString(expense.currency)) {
        totalScore += 10;
        reasons.push(`Currency match: ${booking.currencyNormalized}`);
      }
    }

    // 10. Date matching (transaction date vs. flight date)
    // Flight expenses often occur before the actual flight date
    // so we need to be more flexible with date matching
    if (booking.bookingExpectTxTimeNormalized && booking.bookingExpectTxTimeNormalized !== '[No booking time found]' &&
        expense.expenseDate) {
      maxPossibleScore += 10;

      const bookingDate = new Date(booking.bookingExpectTxTimeNormalized);
      const expenseDate = new Date(expense.expenseDate);

      if (!isNaN(bookingDate.getTime()) && !isNaN(expenseDate.getTime())) {
        const daysDiff = Math.abs((bookingDate.getTime() - expenseDate.getTime()) / (1000 * 60 * 60 * 24));

        // Flights are typically booked days or weeks in advance
        // So expense date should be within a reasonable window of the booking date
        let dateScore = 0;
        if (daysDiff === 0) dateScore = 1.0; // Same day
        else if (daysDiff <= 2) dateScore = 0.95; // Within 2 days
        else if (daysDiff <= 7) dateScore = 0.9; // Within a week
        else if (daysDiff <= 30) dateScore = 0.7; // Within a month
        else if (daysDiff <= 90) dateScore = 0.5; // Within 3 months

        if (dateScore > 0) {
          totalScore += 10 * dateScore;
          reasons.push(`Date proximity match: ${daysDiff.toFixed(0)} days difference`);
        }
      }
    }

    // Calculate final normalized score (0-1 range)
    const normalizedScore = maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;

    // Apply a penalty if not a flight booking
    let adjustedScore = normalizedScore;
    if (!isFlightBooking && normalizedScore > 0) {
      adjustedScore = normalizedScore * 0.7; // Apply a 30% penalty
      console.log(`DEBUG: [FlightMatcher] Applied non-flight penalty: ${normalizedScore} -> ${adjustedScore}`);
    }

    const finalScore = Math.round(adjustedScore * 100) / 100; // Round to 2 decimal places

    // Log the final score and reasons
    console.log(`DEBUG: [FlightMatcher] Final score: ${finalScore} (${totalScore}/${maxPossibleScore})`);
    console.log(`DEBUG: [FlightMatcher] Score breakdown for booking ${booking.id}:`);
    console.log(`  - Card type: ${booking.cardTypeNormalized}`);
    console.log(`  - Card last 4: ${booking.cardLast4Normalized}`);
    console.log(`  - Booking type: ${booking.bookingTypeNormalized}`);
    console.log(`  - Travel type: ${booking.travelType}`);
    console.log(`  - Merchant: ${booking.merchantNormalized}`);
    console.log(`  - Amount: ${booking.amountNormalized}`);
    console.log(`  - Traveler name: ${booking.travelerNameNormalized}`);
    if (reasons.length > 0) {
      console.log(`DEBUG: [FlightMatcher] Match reasons: ${reasons.join(', ')}`);
    }

    // Log if this match would meet the minimum confidence threshold
    const meetsThreshold = finalScore >= 0.3; // Same as in MatchingService.ts
    console.log(`DEBUG: [FlightMatcher] Meets minimum threshold (0.3): ${meetsThreshold}`);

    return {
      score: finalScore,
      reasons
    };
  }
}