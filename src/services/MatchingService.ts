import { BookingData } from '../types/BookingData';
import { ExpenseData, MatchResult } from '../types/ExpenseData';

/**
 * Main matching service to compare bookings with expenses
 */
export function matchBookingsWithExpenses(
  bookings: BookingData[],
  expenses: ExpenseData[]
): MatchResult[] {
  const matches: MatchResult[] = [];

  // For each expense, find potential booking matches
  expenses.forEach((expense, expenseIdx) => {
    const expenseId = expense.id || `expense-${expenseIdx}`;

    // Score each booking against this expense
    const scoredBookings = bookings.map((booking, bookingIdx) => {
      const bookingId = booking.id || `booking-${bookingIdx}`;
      const { score, reasons } = calculateMatchScore(booking, expense);

      return {
        bookingId,
        score,
        reasons
      };
    });

    // Sort by score descending
    scoredBookings.sort((a, b) => b.score - a.score);

    // Get the best match if it meets minimum threshold
    const bestMatch = scoredBookings[0];
    const MINIMUM_CONFIDENCE = 0.3; // 30% minimum confidence

    if (bestMatch && bestMatch.score >= MINIMUM_CONFIDENCE) {
      matches.push({
        expenseId,
        bookingId: bestMatch.bookingId,
        matchConfidence: bestMatch.score,
        matchReason: bestMatch.reasons
      });
    }
  });

  return matches;
}

/**
 * Calculate match score between a booking and an expense
 * Returns a score between 0 and 1, and list of matching reasons
 */
function calculateMatchScore(
  booking: BookingData,
  expense: ExpenseData
): { score: number; reasons: string[] } {
  let totalScore = 0;
  let maxPossibleScore = 0;
  const reasons: string[] = [];

  // 1. Check reference numbers (highest weight if available)
  if (booking.bookingReference && expense.description) {
    maxPossibleScore += 20;
    if (normalizeString(expense.description).includes(normalizeString(booking.bookingReference))) {
      totalScore += 20;
      reasons.push(`Reference match: ${booking.bookingReference}`);
    }
  }

  // 2. Name matching (high weight)
  if (booking.travelerName && expense.employeeName) {
    maxPossibleScore += 15;
    const nameScore = fuzzyNameMatch(booking.travelerName, expense.employeeName);
    if (nameScore > 0.7) {
      totalScore += 15 * nameScore;
      reasons.push(`Name match: ${booking.travelerName} / ${expense.employeeName}`);
    }
  }

  // 3. Amount matching (high weight)
  if (booking.amount !== undefined && expense.amount !== undefined) {
    maxPossibleScore += 15;
    const amountScore = fuzzyAmountMatch(booking.amount, expense.amount);
    if (amountScore > 0.8) {
      totalScore += 15 * amountScore;
      reasons.push(`Amount match: ${booking.amount} vs ${expense.amount}`);
    }
  }

  // 4. Credit card last 4 digits matching (high weight)
  // Extract last 4 digits from expense description or other fields
  const expenseCardLast4 = expense.cardLast4Normalized;
  const bookingCardLast4 = booking.cardLast4Normalized;

  if (bookingCardLast4 && expenseCardLast4 &&
      bookingCardLast4 !== '[No card last 4 found]' &&
      expenseCardLast4 !== '[No card last 4 found]') {
    maxPossibleScore += 20; // Higher weight as this is a strong indicator
    if (bookingCardLast4 === expenseCardLast4) {
      totalScore += 20;
      reasons.push(`Card last 4 match: ${bookingCardLast4}`);
    }
  }

  // 5. Travel type matching (medium weight)
  if (booking.travelType && expense.expenseType) {
    maxPossibleScore += 10;
    if (matchTravelTypes(booking.travelType, expense.expenseType)) {
      totalScore += 10;
      reasons.push(`Travel type match: ${booking.travelType} / ${expense.expenseType}`);
    }
  }

  // 6. Vendor matching (medium weight)
  if (booking.vendor && expense.vendor) {
    maxPossibleScore += 10;
    const vendorScore = fuzzyStringMatch(booking.vendor, expense.vendor);
    if (vendorScore > 0.6) {
      totalScore += 10 * vendorScore;
      reasons.push(`Vendor match: ${booking.vendor} / ${expense.vendor}`);
    }
  }

  // 7. Date matching (medium weight)
  maxPossibleScore += 10;
  const dateScore = matchDates(booking, expense);
  if (dateScore > 0) {
    totalScore += 10 * dateScore;
    reasons.push('Date alignment');
  }

  // 8. Location matching (lower weight)
  if (booking.origin && expense.origin) {
    maxPossibleScore += 5;
    const originScore = fuzzyStringMatch(booking.origin, expense.origin);
    if (originScore > 0.7) {
      totalScore += 5 * originScore;
      reasons.push(`Origin match: ${booking.origin} / ${expense.origin}`);
    }
  }

  if (booking.destination && expense.destination) {
    maxPossibleScore += 5;
    const destScore = fuzzyStringMatch(booking.destination, expense.destination);
    if (destScore > 0.7) {
      totalScore += 5 * destScore;
      reasons.push(`Destination match: ${booking.destination} / ${expense.destination}`);
    }
  }

  // Normalize score to 0-1 range
  const normalizedScore = maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;

  return {
    score: Math.round(normalizedScore * 100) / 100, // Round to 2 decimal places
    reasons
  };
}

/**
 * Fuzzy name matching using Levenshtein distance
 */
function fuzzyNameMatch(name1: string, name2: string): number {
  const norm1 = normalizeString(name1);
  const norm2 = normalizeString(name2);

  // Exact match
  if (norm1 === norm2) return 1.0;

  // Check if one contains the other (partial match)
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;

  // Split names into parts and check for matches
  const parts1 = norm1.split(/\s+/);
  const parts2 = norm2.split(/\s+/);

  let matchingParts = 0;
  const totalParts = Math.max(parts1.length, parts2.length);

  for (const part1 of parts1) {
    for (const part2 of parts2) {
      if (part1 === part2 || levenshteinDistance(part1, part2) <= 2) {
        matchingParts++;
        break;
      }
    }
  }

  return matchingParts / totalParts;
}

/**
 * Fuzzy amount matching with tolerance for minor differences
 */
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

/**
 * Match travel types between booking and expense
 */
function matchTravelTypes(bookingType: string, expenseType: string): boolean {
  const normBooking = normalizeString(bookingType);
  const normExpense = normalizeString(expenseType);

  // Direct match
  if (normBooking === normExpense) return true;

  // Common mappings
  const travelTypeMap: Record<string, string[]> = {
    'flight': ['air', 'airline', 'airfare', 'plane', 'aviation'],
    'hotel': ['lodging', 'accommodation', 'room'],
    'car': ['vehicle', 'rental', 'auto', 'automobile'],
    'train': ['rail', 'railway', 'railroad'],
    'taxi': ['cab', 'ride', 'uber', 'lyft'],
  };

  // Check if both types belong to the same category
  for (const [category, aliases] of Object.entries(travelTypeMap)) {
    const bookingMatch = normBooking.includes(category) ||
                         aliases.some(alias => normBooking.includes(alias));
    const expenseMatch = normExpense.includes(category) ||
                         aliases.some(alias => normExpense.includes(alias));

    if (bookingMatch && expenseMatch) return true;
  }

  return false;
}

/**
 * Match dates between booking and expense
 * Returns a score based on how close the dates are
 */
function matchDates(booking: BookingData, expense: ExpenseData): number {
  const bookingDates: Date[] = [];
  const expenseDates: Date[] = [];

  // Collect booking dates
  if (booking.bookingDate) bookingDates.push(parseDate(booking.bookingDate));
  if (booking.departureDate) bookingDates.push(parseDate(booking.departureDate));
  if (booking.returnDate) bookingDates.push(parseDate(booking.returnDate));

  // Collect expense dates
  if (expense.expenseDate) expenseDates.push(parseDate(expense.expenseDate));
  if (expense.startDate) expenseDates.push(parseDate(expense.startDate));
  if (expense.endDate) expenseDates.push(parseDate(expense.endDate));

  // Remove invalid dates
  const validBookingDates = bookingDates.filter(d => !isNaN(d.getTime()));
  const validExpenseDates = expenseDates.filter(d => !isNaN(d.getTime()));

  if (validBookingDates.length === 0 || validExpenseDates.length === 0) {
    return 0; // No valid dates to compare
  }

  // Find minimum difference in days between any booking and expense date
  let minDaysDiff = Infinity;

  for (const bookingDate of validBookingDates) {
    for (const expenseDate of validExpenseDates) {
      const daysDiff = Math.abs(
        (bookingDate.getTime() - expenseDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      minDaysDiff = Math.min(minDaysDiff, daysDiff);
    }
  }

  // Score based on date proximity
  if (minDaysDiff === 0) return 1.0; // Same day
  if (minDaysDiff <= 1) return 0.95; // Within 1 day
  if (minDaysDiff <= 3) return 0.9; // Within 3 days
  if (minDaysDiff <= 7) return 0.8; // Within a week
  if (minDaysDiff <= 14) return 0.6; // Within 2 weeks
  if (minDaysDiff <= 30) return 0.4; // Within a month

  return 0; // Too far apart
}

/**
 * Generic fuzzy string matching
 */
function fuzzyStringMatch(str1: string, str2: string): number {
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);

  if (norm1 === norm2) return 1.0;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;

  const distance = levenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);

  return 1 - (distance / maxLength);
}

/**
 * Normalize string for comparison
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Parse date string into Date object
 * Handles multiple common date formats
 */
function parseDate(dateStr: string): Date {
  // Try ISO format first
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date;

  // Try various date formats
  const formats = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY or DD/MM/YYYY
    /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
    /(\d{1,2})-(\d{1,2})-(\d{4})/, // MM-DD-YYYY or DD-MM-YYYY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      date = new Date(dateStr);
      if (!isNaN(date.getTime())) return date;
    }
  }

  return new Date(NaN); // Invalid date
}

/**
 * Calculate Levenshtein distance between two strings
 * (minimum number of single-character edits needed to change one string into another)
 */
function levenshteinDistance(str1: string, str2: string): number {
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

// The extractCardLast4FromBooking and extractCardLast4FromExpense functions have been removed
// as they are no longer needed. The application now uses the normalized fields directly
// from the booking and expense objects.

/**
 * Get unmatched bookings
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

/**
 * Get unmatched expenses
 */
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

/**
 * Get match statistics
 */
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
