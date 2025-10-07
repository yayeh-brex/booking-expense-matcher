import { BookingData } from '../types/BookingData';
import { ExpenseData, MatchResult } from '../types/ExpenseData';
import { FlightMatcher, MatchScore } from './matchers/FlightMatcher';

/**
 * Optimized matching service with batch processing to prevent UI freezing
 */

// Constants
const BATCH_SIZE = 50; // Number of expenses to process in each batch
const MINIMUM_CONFIDENCE = 0.15; // Minimum confidence threshold for matches

/**
 * Progress tracking interface for batch processing
 */
export interface MatchingProgress {
  totalExpenses: number;
  processedExpenses: number;
  matches: MatchResult[];
  isComplete: boolean;
}

/**
 * Process a batch of expenses against all bookings
 */
function processExpenseBatch(
  bookings: BookingData[],
  expenses: ExpenseData[],
  startIdx: number,
  batchSize: number,
  flightMatcher: FlightMatcher
): MatchResult[] {
  const matches: MatchResult[] = [];
  const endIdx = Math.min(startIdx + batchSize, expenses.length);

  // Process only a batch of expenses
  for (let i = startIdx; i < endIdx; i++) {
    const expense = expenses[i];
    const expenseId = expense.id || `expense-${i}`;

    // Score each booking against this expense
    const scoredBookings = bookings.map((booking, bookingIdx) => {
      const bookingId = booking.id || `booking-${bookingIdx}`;

      // Determine if this is a flight booking
      const isFlightBooking = (
        booking.bookingTypeNormalized?.toLowerCase() === 'flight' ||
        booking.travelType?.toLowerCase()?.includes('flight') ||
        booking.travelType?.toLowerCase()?.includes('air') ||
        booking.merchantNormalized?.toLowerCase()?.includes('airline') ||
        booking.merchantNormalized?.toLowerCase()?.includes('airways') ||
        booking.vendor?.toLowerCase()?.includes('airline') ||
        booking.vendor?.toLowerCase()?.includes('airways') ||
        booking.merchantNormalized?.toLowerCase()?.includes('delta') ||
        booking.merchantNormalized?.toLowerCase()?.includes('united') ||
        booking.merchantNormalized?.toLowerCase()?.includes('american') ||
        (booking.origin && booking.destination)
      );

      // Use appropriate matcher
      let matchScore: MatchScore;

      if (isFlightBooking) {
        matchScore = flightMatcher.calculateFlightMatchScore(booking, expense);
      } else {
        matchScore = calculateGenericMatchScore(booking, expense);
      }

      return {
        bookingId,
        score: matchScore.score,
        reasons: matchScore.reasons
      };
    });

    // Sort by score descending
    scoredBookings.sort((a, b) => b.score - a.score);

    // Add best match if it meets threshold
    const bestMatch = scoredBookings[0];
    if (bestMatch && bestMatch.score >= MINIMUM_CONFIDENCE) {
      matches.push({
        expenseId,
        bookingId: bestMatch.bookingId,
        matchConfidence: bestMatch.score,
        matchReason: bestMatch.reasons
      });
    }
  }

  return matches;
}

/**
 * Simplified generic match score calculation for non-flight bookings
 * Optimized version of the original calculateMatchScore function
 */
function calculateGenericMatchScore(
  booking: BookingData,
  expense: ExpenseData
): MatchScore {
  let totalScore = 0;
  let maxPossibleScore = 0;
  const reasons: string[] = [];

  // Card last 4 matching (highest weight)
  const expenseCardLast4 = expense.cardLast4Normalized;
  const bookingCardLast4 = booking.cardLast4Normalized;

  if (bookingCardLast4 && expenseCardLast4 &&
      bookingCardLast4 !== '[No card last 4 found]' &&
      expenseCardLast4 !== '[No card last 4 found]') {
    maxPossibleScore += 30;
    if (bookingCardLast4 === expenseCardLast4) {
      totalScore += 30;
      reasons.push(`Card last 4 match: ${bookingCardLast4}`);
    }
  }

  // Amount matching (high weight)
  if (booking.amount !== undefined && expense.amount !== undefined) {
    maxPossibleScore += 15;
    const amountScore = fuzzyAmountMatch(booking.amount, expense.amount);
    if (amountScore > 0.8) {
      totalScore += 15 * amountScore;
      reasons.push(`Amount match: ${booking.amount} vs ${expense.amount}`);
    }
  }

  // Name matching (high weight)
  if (booking.travelerName && expense.employeeName) {
    maxPossibleScore += 15;
    const nameScore = fuzzyNameMatch(booking.travelerName, expense.employeeName);
    if (nameScore > 0.7) {
      totalScore += 15 * nameScore;
      reasons.push(`Name match: ${booking.travelerName} / ${expense.employeeName}`);
    }
  }

  // Reference matching
  if (booking.bookingReference && expense.description) {
    maxPossibleScore += 20;
    if (normalizeString(expense.description).includes(normalizeString(booking.bookingReference))) {
      totalScore += 20;
      reasons.push(`Reference match: ${booking.bookingReference}`);
    }
  }

  // Vendor matching
  if (booking.vendor && expense.vendor) {
    maxPossibleScore += 10;
    const vendorScore = fuzzyStringMatch(booking.vendor, expense.vendor);
    if (vendorScore > 0.6) {
      totalScore += 10 * vendorScore;
      reasons.push(`Vendor match: ${booking.vendor} / ${expense.vendor}`);
    }
  }

  // Normalize final score
  const normalizedScore = maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;

  return {
    score: Math.round(normalizedScore * 100) / 100,
    reasons
  };
}

/**
 * Helper functions from the original matching service
 */
function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\\w\\s]/g, '')
    .replace(/\\s+/g, ' ');
}

function fuzzyNameMatch(name1: string, name2: string): number {
  const norm1 = normalizeString(name1);
  const norm2 = normalizeString(name2);

  // Exact match
  if (norm1 === norm2) return 1.0;

  // Check if one contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;

  // Split names into parts and check for matches
  const parts1 = norm1.split(/\\s+/);
  const parts2 = norm2.split(/\\s+/);

  let matchingParts = 0;
  const totalParts = Math.max(parts1.length, parts2.length);

  // Simplified check - just count matching parts
  for (const part1 of parts1) {
    if (parts2.includes(part1)) {
      matchingParts++;
    }
  }

  return matchingParts / totalParts;
}

function fuzzyAmountMatch(amount1: number, amount2: number): number {
  const diff = Math.abs(amount1 - amount2);
  const avgAmount = (amount1 + amount2) / 2;

  // Exact match
  if (diff === 0) return 1.0;

  // Calculate percentage difference
  const percentDiff = (diff / avgAmount) * 100;

  // Within 1% - very close
  if (percentDiff <= 1) return 0.98;

  // Within 5% - close
  if (percentDiff <= 5) return 0.9;

  // Within 10% - acceptable
  if (percentDiff <= 10) return 0.85;

  // Within 15% - possible match
  if (percentDiff <= 15) return 0.8;

  // Too different
  return 0;
}

function fuzzyStringMatch(str1: string, str2: string): number {
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);

  if (norm1 === norm2) return 1.0;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;

  // Simple overlap score to avoid expensive Levenshtein calculation
  const words1 = new Set(norm1.split(/\\s+/));
  const words2 = new Set(norm2.split(/\\s+/));

  let overlap = 0;
  for (const word of words1) {
    if (words2.has(word)) {
      overlap++;
    }
  }

  const totalWords = words1.size + words2.size - overlap;
  return totalWords > 0 ? overlap / totalWords : 0;
}

/**
 * Main function to start batch processing match operation
 */
export function startMatchingProcess(
  bookings: BookingData[],
  expenses: ExpenseData[],
  onProgress: (progress: MatchingProgress) => void
): void {
  // Filter bookings to include Mastercard and other recognized card types
  const filteredBookings = bookings.filter(booking => {
    // Include Mastercard bookings
    if (booking.cardTypeNormalized?.toLowerCase() === 'mastercard') {
      return true;
    }

    // Include other valid card types as fallback
    if (booking.cardTypeNormalized &&
        booking.cardTypeNormalized !== '[No card type found]' &&
        booking.cardLast4Normalized &&
        booking.cardLast4Normalized !== '[No card last 4 found]') {
      return true;
    }

    return false;
  });

  // Initialize batch processing state
  let processedExpenses = 0;
  let allMatches: MatchResult[] = [];
  const totalExpenses = expenses.length;
  const flightMatcher = new FlightMatcher();

  // Schedule the first batch
  scheduleNextBatch();

  function scheduleNextBatch() {
    // Schedule batch processing using setTimeout to give UI time to update
    setTimeout(() => {
      if (processedExpenses < totalExpenses) {
        // Process next batch
        const batchMatches = processExpenseBatch(
          filteredBookings,
          expenses,
          processedExpenses,
          BATCH_SIZE,
          flightMatcher
        );

        // Update progress
        processedExpenses += BATCH_SIZE;
        if (processedExpenses > totalExpenses) {
          processedExpenses = totalExpenses;
        }

        // Merge new matches
        allMatches = [...allMatches, ...batchMatches];

        // Report progress
        onProgress({
          totalExpenses,
          processedExpenses,
          matches: allMatches,
          isComplete: processedExpenses >= totalExpenses
        });

        // Schedule next batch if not done
        if (processedExpenses < totalExpenses) {
          scheduleNextBatch();
        }
      } else {
        // Final progress report when complete
        onProgress({
          totalExpenses,
          processedExpenses: totalExpenses,
          matches: allMatches,
          isComplete: true
        });
      }
    }, 0); // Using 0 delay still yields to the UI thread
  }
}

/**
 * Utility functions for statistics
 */
export function getUnmatchedBookings(
  bookings: BookingData[],
  matches: MatchResult[]
): BookingData[] {
  const matchedBookingIds = new Set(matches.map(m => m.bookingId));
  return bookings.filter((booking, idx) => {
    const bookingId = booking.id || `booking-${idx}`;
    return !matchedBookingIds.has(bookingId);
  });
}

export function getUnmatchedExpenses(
  expenses: ExpenseData[],
  matches: MatchResult[]
): ExpenseData[] {
  const matchedExpenseIds = new Set(matches.map(m => m.expenseId));
  return expenses.filter((expense, idx) => {
    const expenseId = expense.id || `expense-${idx}`;
    return !matchedExpenseIds.has(expenseId);
  });
}

export function getMatchStatistics(
  bookings: BookingData[],
  expenses: ExpenseData[],
  matches: MatchResult[]
) {
  const highConfidenceMatches = matches.filter(m => m.matchConfidence >= 0.8);
  const mediumConfidenceMatches = matches.filter(m => m.matchConfidence >= 0.5 && m.matchConfidence < 0.8);
  const lowConfidenceMatches = matches.filter(m => m.matchConfidence < 0.5);

  return {
    totalBookings: bookings.length,
    totalExpenses: expenses.length,
    totalMatches: matches.length,
    matchRate: ((matches.length / Math.max(expenses.length, 1)) * 100).toFixed(1) + '%',
    highConfidence: highConfidenceMatches.length,
    mediumConfidence: mediumConfidenceMatches.length,
    lowConfidence: lowConfidenceMatches.length,
    unmatchedBookings: bookings.length - matches.length,
    unmatchedExpenses: expenses.length - matches.length
  };
}