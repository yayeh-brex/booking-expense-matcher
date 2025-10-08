import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Pagination } from 'react-bootstrap';
import { MatchResult } from '../types/ExpenseData';
import { BookingData } from '../types/BookingData';
import { ExpenseData } from '../types/ExpenseData';
import { SimpleFlightMatcher } from '../services/matchers/SimpleFlightMatcher';
import styles from './FlightsEval.module.css';

// Props interface for the FlightsEval component
interface FlightsEvalProps {
  matches: MatchResult[]; // Original matches from MatchingService
  bookings: BookingData[];
  expenses: ExpenseData[];
  getBookingById: (id: string) => BookingData | undefined;
  getExpenseById: (id: string) => ExpenseData | undefined;
}

const FlightsEval: React.FC<FlightsEvalProps> = ({
  matches: originalMatches, // Rename to make clear we're not using directly
  bookings,
  expenses,
  getBookingById,
  getExpenseById
}) => {
  // State to store our own flight-specific matches using the simple matcher
  const [flightMatches, setFlightMatches] = useState<MatchResult[]>([]);

  // Initialize the simple flight matcher when component loads
  useEffect(() => {
    // Create matcher instance
    const flightMatcher = new SimpleFlightMatcher();

    // Find matches using our simplified approach
    const matches = flightMatcher.findMatches(bookings, expenses);

    // Update state with matches
    setFlightMatches(matches);

    console.log(`[FlightsEval] Found ${matches.length} matches using SimpleFlightMatcher`);
  }, [bookings, expenses]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage] = useState<number>(10);

  // Filter only flight bookings
  console.log(`DEBUG: [FlightsEval] Filtering flight bookings from ${bookings.length} total bookings`);
  const flightBookings = bookings.filter(booking => (
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
  ));

  console.log(`DEBUG: [FlightsEval] Found ${flightBookings.length} flight bookings`);

  // Create maps for looking up matches by different IDs
  const matchesByBookingRef = new Map<string, MatchResult>();
  const matchesByExpenseId = new Map<string, MatchResult>();

  flightMatches.forEach(match => {
    // Map by booking ref (booking ID in the original booking data)
    matchesByBookingRef.set(match.bookingId, match);

    // Map by expense ID
    matchesByExpenseId.set(match.expenseId, match);
  });

  // Statistics about matches
  const matchedFlightBookingsCount = flightBookings.filter(booking =>
    booking.id && matchesByBookingRef.has(booking.id)
  ).length;

  const unmatchedFlightBookingsCount = flightBookings.length - matchedFlightBookingsCount;
  const matchRate = flightBookings.length > 0
    ? (matchedFlightBookingsCount / flightBookings.length) * 100
    : 0;

  // Function to get confidence badge color
  const getConfidenceBadgeVariant = (confidence: number | undefined): string => {
    if (confidence === undefined) return 'secondary';
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.5) return 'warning';
    return 'danger';
  };

  return (
    <div>
      {/* Flight Bookings Statistics */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className={`h-100 ${styles.statCard}`}>
            <Card.Header className="bg-primary text-white">
              <h6 className="mb-0">Flight Bookings Overview</h6>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className={styles.statLabel}>Total Flight Bookings</div>
                <div className={styles.statValue}>{flightBookings.length}</div>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className={styles.statLabel}>Matched Bookings</div>
                <div className={styles.statValue}>{matchedFlightBookingsCount}</div>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className={styles.statLabel}>Unmatched Bookings</div>
                <div className={styles.statValue}>{unmatchedFlightBookingsCount}</div>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <div className={styles.statLabel}>Match Rate</div>
                <div className={styles.statValue}>{matchRate.toFixed(1)}%</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Flight Bookings Table with Match Information */}
      <div className="table-responsive">
        <Table striped bordered hover className="mt-3">
          <thead>
            <tr>
              <th>Match Confidence</th>
              <th>Booking Ref</th>
              <th>Booking_ID_Normalized</th>
              <th>BookingType_Normalized</th>
              <th>Booking_Merchant_Normalized</th>
              <th>Booking_CARD_Normalized</th>
              <th>Booking_Last4_Normalized</th>
              <th>Booking_NameonCard_Normalized</th>
              <th>Booking_Currency_Normalized</th>
              <th>Booking_Amount_Normalized</th>
              <th>Booking_Expect_Tx_Time_Normalized</th>
              <th>Booking_Traveler_Normalized</th>
              {/* Expense Data Columns */}
              <th>Expense ID</th>
              <th>Expense User</th>
              <th>Expense Category</th>
              <th>Expense Merchant</th>
              <th>Expense Amount</th>
              <th>Swipe Time</th>
            </tr>
          </thead>
          <tbody>
            {flightBookings
              .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
              .map((booking, index) => {
                // Find matching result if any using the booking ref
                const bookingRef = booking.id || `booking-${index}`;
                const matchResult = bookingRef ? matchesByBookingRef.get(bookingRef) : undefined;

                // Get expense data if there's a match
                const expense = matchResult?.expenseId ? getExpenseById(matchResult.expenseId) : undefined;

                return (
                  <tr key={index} className={!matchResult ? styles.unmatchedRow : ''}>
                    <td className="text-center">
                      {matchResult ? (
                        <Badge bg={getConfidenceBadgeVariant(matchResult.matchConfidence)}>
                          {(matchResult.matchConfidence * 100).toFixed(0)}%
                        </Badge>
                      ) : (
                        <Badge bg="secondary">Unmatched</Badge>
                      )}
                    </td>
                    <td className={styles.textHighlight}>{bookingRef}</td>
                    <td>{booking.bookingIdNormalized || '[No booking ID found]'}</td>
                    <td>{booking.bookingTypeNormalized || 'Flight'}</td>
                    <td>{booking.merchantNormalized || booking.vendor || '[No merchant found]'}</td>
                    <td>{booking.cardTypeNormalized || '[No card type found]'}</td>
                    <td className={matchResult ? styles.textHighlight : ''}>
                      {booking.cardLast4Normalized || '[No card last 4 found]'}
                    </td>
                    <td>{booking.cardHolderNameNormalized || '[No card holder name found]'}</td>
                    <td>{booking.currencyNormalized || '[No currency found]'}</td>
                    <td className={matchResult ? styles.textHighlight : ''}>
                      {booking.amountNormalized !== undefined ? booking.amountNormalized.toFixed(2) : '[No amount found]'}
                    </td>
                    <td>{booking.bookingExpectTxTimeNormalized || '[No booking time found]'}</td>
                    <td>{booking.travelerNameNormalized || booking.travelerName || '[No traveler name found]'}</td>

                    {/* Expense Data - Show if matched, otherwise show placeholders */}
                    <td className={matchResult ? styles.textHighlight : ''}>
                      {matchResult ? matchResult.expenseId : '-'}
                    </td>
                    <td>{expense?.employeeName || '-'}</td>
                    <td>{expense?.expenseType || '-'}</td>
                    <td className={matchResult ? styles.textHighlight : ''}>
                      {expense?.vendor || '-'}
                    </td>
                    <td className={matchResult ? styles.textHighlight : ''}>
                      {expense?.amount !== undefined
                        ? `${expense.amount.toFixed(2)} ${expense.currency || ''}`
                        : '-'
                      }
                    </td>
                    <td>{expense?.expenseDate || '-'}</td>
                  </tr>
                );
              })}
          </tbody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {flightBookings.length > rowsPerPage && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div>
            <strong>Current Page:</strong> Showing {Math.min((currentPage - 1) * rowsPerPage + 1, flightBookings.length)} to {Math.min(currentPage * rowsPerPage, flightBookings.length)} of {flightBookings.length} entries
          </div>
          <Pagination>
            <Pagination.First
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            />
            <Pagination.Prev
              onClick={() => setCurrentPage(currentPage > 1 ? currentPage - 1 : 1)}
              disabled={currentPage === 1}
            />

            {/* Page numbers */}
            {Array.from({ length: Math.min(5, Math.ceil(flightBookings.length / rowsPerPage)) }, (_, i) => {
              const pageNum = currentPage > 3 && Math.ceil(flightBookings.length / rowsPerPage) > 5
                ? currentPage - 3 + i + (currentPage > Math.ceil(flightBookings.length / rowsPerPage) - 2
                  ? Math.ceil(flightBookings.length / rowsPerPage) - 5 - (currentPage - Math.ceil(flightBookings.length / rowsPerPage) - 2)
                  : 0)
                : i + 1;

              if (pageNum <= Math.ceil(flightBookings.length / rowsPerPage)) {
                return (
                  <Pagination.Item
                    key={pageNum}
                    active={pageNum === currentPage}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Pagination.Item>
                );
              }
              return null;
            })}

            <Pagination.Next
              onClick={() => setCurrentPage(currentPage < Math.ceil(flightBookings.length / rowsPerPage) ? currentPage + 1 : currentPage)}
              disabled={currentPage >= Math.ceil(flightBookings.length / rowsPerPage)}
            />
            <Pagination.Last
              onClick={() => setCurrentPage(Math.ceil(flightBookings.length / rowsPerPage))}
              disabled={currentPage >= Math.ceil(flightBookings.length / rowsPerPage)}
            />
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default FlightsEval;