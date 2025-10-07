export interface ExpenseData {
  // Common fields for expense data
  id?: string;
  expenseDate?: string;
  expenseType?: string; // e.g., 'Air', 'Hotel', 'Car', 'Train', etc.
  vendor?: string;
  amount?: number;
  currency?: string;
  employeeName?: string;
  expenseReportId?: string;
  description?: string;
  origin?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  receiptAttached?: boolean;
  status?: string;

  // Normalized fields for matching
  bookingRefNormalized?: string;
  cardTypeNormalized?: string;
  cardLast4Normalized?: string;

  // Raw data for debugging and format-specific parsing
  rawData: Record<string, any>;
}

// Interface for matching results between bookings and expenses
export interface MatchResult {
  expenseId: string;
  bookingId: string;
  matchConfidence: number; // 0-1 score indicating confidence level
  matchReason: string[];   // Reasons why these were matched
}