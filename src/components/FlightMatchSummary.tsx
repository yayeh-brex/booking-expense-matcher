import React from 'react';
import { Card, Row, Col, Table, Badge, ListGroup } from 'react-bootstrap';
import { MatchResult } from '../types/ExpenseData';
import { BookingData } from '../types/BookingData';
import { ExpenseData } from '../types/ExpenseData';
import styles from './FlightMatchSummary.module.css';

// Props interface for the FlightMatchSummary component
interface FlightMatchSummaryProps {
  matches: MatchResult[];
  bookings: BookingData[];
  expenses: ExpenseData[];
  getBookingById: (id: string) => BookingData | undefined;
  getExpenseById: (id: string) => ExpenseData | undefined;
}

const FlightMatchSummary: React.FC<FlightMatchSummaryProps> = ({
  matches,
  bookings,
  expenses,
  getBookingById,
  getExpenseById
}) => {
  // Filter only flight matches
  console.log(`DEBUG: [FlightMatchSummary] Filtering flight matches from ${matches.length} total matches`);
  const flightMatches = matches.filter(match => {
    const booking = getBookingById(match.bookingId);
    // Use expanded criteria to identify flight bookings
    const isFlightBooking = booking && (
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

    if (booking) {
      console.log(`DEBUG: [FlightMatchSummary] Booking ${match.bookingId}: type=${booking.bookingTypeNormalized}, isFlightBooking=${isFlightBooking}`);
      if (isFlightBooking) {
        console.log(`  - Flight match identified: merchant=${booking.merchantNormalized}, traveler=${booking.travelerNameNormalized}`);
      }
    } else {
      console.log(`DEBUG: [FlightMatchSummary] Could not find booking with ID ${match.bookingId}`);
    }
    return isFlightBooking;
  });
  console.log(`DEBUG: [FlightMatchSummary] Found ${flightMatches.length} flight matches`);

  // Calculate statistics for flight matches - using expanded flight detection logic
  const totalFlightBookings = bookings.filter(booking => (
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
  )).length;
  const matchRate = totalFlightBookings > 0 ? (flightMatches.length / totalFlightBookings) * 100 : 0;

  // Categorize matches by confidence level
  const highConfidenceMatches = flightMatches.filter(match => match.matchConfidence >= 0.8);
  const mediumConfidenceMatches = flightMatches.filter(match => match.matchConfidence >= 0.5 && match.matchConfidence < 0.8);
  const lowConfidenceMatches = flightMatches.filter(match => match.matchConfidence < 0.5);

  // Function to get confidence badge color
  const getConfidenceBadgeVariant = (confidence: number): string => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.5) return 'warning';
    return 'danger';
  };

  // Find the match with the highest confidence
  const bestMatch = [...flightMatches].sort((a, b) => b.matchConfidence - a.matchConfidence)[0];

  // Check if there are any flight matches
  if (flightMatches.length === 0) {
    // Log additional debug information before showing the no matches message
    console.log(`DEBUG: [FlightMatchSummary] No flight matches found in ${matches.length} total matches`);

    // Count how many total flight bookings we have using expanded flight detection logic
    const totalFlightBookings = bookings.filter(booking => (
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
    )).length;
    console.log(`DEBUG: [FlightMatchSummary] Total flight bookings: ${totalFlightBookings}`);

    // Get details about the flight bookings using expanded flight detection logic
    const flightBookingsDetails = bookings
      .filter(booking => (
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
      ))
      .slice(0, 5) // Limit to first 5 for logging
      .map((booking, idx) => ({
        id: booking.id,
        vendor: booking.merchantNormalized || booking.vendor,
        cardType: booking.cardTypeNormalized,
        cardLast4: booking.cardLast4Normalized,
        amount: booking.amountNormalized
      }));

    if (flightBookingsDetails.length > 0) {
      console.log(`DEBUG: [FlightMatchSummary] First few flight bookings: ${JSON.stringify(flightBookingsDetails, null, 2)}`);
    }

    return (
      <Card className={`mt-4 ${styles.flightMatchCard}`}>
        <Card.Header className={styles.flightHeader}>
          <h5 className="mb-0">Flight Match Summary</h5>
        </Card.Header>
        <Card.Body>
          <p>No flight matches found.</p>
          <p className="text-muted small">
            Debug info: {totalFlightBookings} flight bookings, {matches.length} total matches.
            Check console logs for more details.
          </p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className={`mt-4 ${styles.flightMatchCard}`}>
      <Card.Header className={styles.flightHeader}>
        <h5 className="mb-0">Flight Match Summary</h5>
      </Card.Header>
      <Card.Body>
        {/* Flight Match Statistics */}
        <Row className="mb-4">
          <Col md={6}>
            <Card className={`h-100 ${styles.statCard}`}>
              <Card.Header className="bg-light">
                <h6 className="mb-0">Statistics</h6>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <div className="mb-3">
                      <div className={styles.statLabel}>Total Flight Bookings</div>
                      <div className={styles.statValue}>{totalFlightBookings}</div>
                    </div>
                    <div className="mb-3">
                      <div className={styles.statLabel}>Flight Matches</div>
                      <div className={styles.statValue}>{flightMatches.length}</div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="mb-3">
                      <div className={styles.statLabel}>Match Rate</div>
                      <div className={styles.statValue}>{matchRate.toFixed(1)}%</div>
                    </div>
                    <div className="mb-3">
                      <div className={styles.statLabel}>Confidence Breakdown</div>
                      <div>
                        <Badge bg="success" className="me-1">{highConfidenceMatches.length} High</Badge>
                        <Badge bg="warning" className="me-1">{mediumConfidenceMatches.length} Medium</Badge>
                        <Badge bg="danger">{lowConfidenceMatches.length} Low</Badge>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Best Match Highlight */}
          {bestMatch && (
            <Col md={6}>
              <Card className={`h-100 ${styles.bestMatchCard}`}>
                <Card.Header className="bg-light">
                  <h6 className="mb-0">Best Flight Match</h6>
                </Card.Header>
                <Card.Body>
                  {(() => {
                    const booking = getBookingById(bestMatch.bookingId);
                    const expense = getExpenseById(bestMatch.expenseId);

                    if (!booking || !expense) return <p>Match data not available</p>;

                    return (
                      <Row>
                        <Col xs={12} className="mb-2">
                          <Badge bg={getConfidenceBadgeVariant(bestMatch.matchConfidence)} className={styles.confidenceBadge}>
                            {(bestMatch.matchConfidence * 100).toFixed(0)}% Confidence
                          </Badge>
                        </Col>
                        <Col sm={6}>
                          <div className={styles.fieldLabel}>Traveler</div>
                          <div className={styles.fieldValue}>{booking.travelerNameNormalized || booking.travelerName || 'N/A'}</div>

                          <div className={styles.fieldLabel}>Flight Route</div>
                          <div className={`${styles.fieldValue} ${styles.flightRoute}`}>
                            {booking.origin}
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                              <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z"/>
                            </svg>
                            {booking.destination}
                          </div>

                          <div className={styles.fieldLabel}>Airline</div>
                          <div className={styles.fieldValue}>{booking.merchantNormalized || booking.vendor || 'N/A'}</div>
                        </Col>
                        <Col sm={6}>
                          <div className={styles.fieldLabel}>Card Last 4</div>
                          <div className={styles.fieldValue}>{booking.cardLast4Normalized || 'N/A'}</div>

                          <div className={styles.fieldLabel}>Amount</div>
                          <div className={styles.fieldValue}>
                            {booking.amountNormalized !== undefined
                              ? `${booking.amountNormalized.toFixed(2)} ${booking.currencyNormalized || ''}`
                              : 'N/A'
                            }
                          </div>

                          <div className={styles.fieldLabel}>Match Reasons</div>
                          <div className={`${styles.fieldValue} small`}>
                            {bestMatch.matchReason.length > 0
                              ? bestMatch.matchReason[0]
                              : 'No specific reason provided'
                            }
                            {bestMatch.matchReason.length > 1 && '...'}
                          </div>
                        </Col>
                      </Row>
                    );
                  })()}
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>

        {/* Flight Matches Table */}
        <h6 className="mt-4 mb-3">Flight Matches ({flightMatches.length}) - Showing top 10</h6>
        <div className="table-responsive">
          <Table striped bordered hover size="sm" className={styles.matchTable}>
            <thead>
              <tr>
                <th>Confidence</th>
                <th>Traveler</th>
                <th>Route</th>
                <th>Airline</th>
                <th>Card Last 4</th>
                <th>Booking Amount</th>
                <th>Expense Amount</th>
              </tr>
            </thead>
            <tbody>
              {flightMatches.slice(0, 10).map((match, index) => {
                const booking = getBookingById(match.bookingId);
                const expense = getExpenseById(match.expenseId);

                if (!booking || !expense) return null;

                return (
                  <tr key={index}>
                    <td>
                      <Badge bg={getConfidenceBadgeVariant(match.matchConfidence)}>
                        {(match.matchConfidence * 100).toFixed(0)}%
                      </Badge>
                    </td>
                    <td>{booking.travelerNameNormalized || booking.travelerName || 'N/A'}</td>
                    <td>
                      {booking.origin && booking.destination ? (
                        <span className={styles.flightRoute}>
                          {booking.origin}
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z"/>
                          </svg>
                          {booking.destination}
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td>{booking.merchantNormalized || booking.vendor || 'N/A'}</td>
                    <td>{booking.cardLast4Normalized || 'N/A'}</td>
                    <td>
                      {booking.amountNormalized !== undefined
                        ? `${booking.amountNormalized.toFixed(2)} ${booking.currencyNormalized || ''}`
                        : 'N/A'
                      }
                    </td>
                    <td>
                      {expense.amount !== undefined
                        ? `${expense.amount.toFixed(2)} ${expense.currency || ''}`
                        : 'N/A'
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>

        {/* Match Reasons Breakdown */}
        <h6 className="mt-4 mb-3">Common Match Factors</h6>
        <Row>
          <Col md={12}>
            <Card className={styles.statCard}>
              <Card.Body className="p-0">
                <ListGroup variant="flush" className={styles.factorsList}>
                  {(() => {
                    // Collect and count all match reasons
                    const reasonCounts: Record<string, number> = {};

                    flightMatches.forEach(match => {
                      match.matchReason.forEach(reason => {
                        const normalizedReason = reason.toLowerCase();

                        // Group similar reasons together
                        let categoryKey: string;

                        if (normalizedReason.includes('card last 4')) {
                          categoryKey = 'Card Last 4 Match';
                        } else if (normalizedReason.includes('flight reference') || normalizedReason.includes('carrier code')) {
                          categoryKey = 'Flight Reference/Carrier Code Match';
                        } else if (normalizedReason.includes('route') || normalizedReason.includes('origin') || normalizedReason.includes('destination')) {
                          categoryKey = 'Route Match (Origin/Destination)';
                        } else if (normalizedReason.includes('amount')) {
                          categoryKey = 'Amount Match';
                        } else if (normalizedReason.includes('name')) {
                          categoryKey = 'Name Match';
                        } else if (normalizedReason.includes('date')) {
                          categoryKey = 'Date Match';
                        } else if (normalizedReason.includes('airline') || normalizedReason.includes('vendor')) {
                          categoryKey = 'Airline/Vendor Match';
                        } else {
                          categoryKey = 'Other Match Factors';
                        }

                        reasonCounts[categoryKey] = (reasonCounts[categoryKey] || 0) + 1;
                      });
                    });

                    // Sort by frequency
                    const sortedReasons = Object.entries(reasonCounts)
                      .sort(([, countA], [, countB]) => countB - countA);

                    return sortedReasons.map(([reason, count], index) => (
                      <ListGroup.Item key={index} className={styles.factorsList}>
                        <span>{reason}</span>
                        <Badge bg="primary" pill className={styles.factorCount}>{count}</Badge>
                      </ListGroup.Item>
                    ));
                  })()}
                </ListGroup>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default FlightMatchSummary;