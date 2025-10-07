import React, { useState, useEffect } from 'react';
import { Table, Badge } from 'react-bootstrap';
import { BookingData } from '../types/BookingData';

// DEBUGGING: Counter to track component renders
let renderCount = 0;

// Static variables to hold calculated values - these will persist between re-renders
// and won't be affected by pagination changes
let staticTotalBookings = 0;
let staticTotalMastercardBookings = 0;
let staticFlightCount = 0;
let staticHotelCount = 0;
let staticCarCount = 0;
let staticRailCount = 0;
let staticFlightPercent = 0;
let staticHotelPercent = 0;
let staticCarPercent = 0;
let staticRailPercent = 0;
let staticAdjustment = 0;
let calculationsPerformed = false;

interface BookingTypeSummaryProps {
  bookings: BookingData[];
}

const BookingTypeSummary: React.FC<BookingTypeSummaryProps> = ({ bookings }) => {
  // Use local state just for triggering initial render
  const [calculationsComplete, setCalculationsComplete] = useState(false);

  // DEBUGGING: Increment render counter and log each time component renders
  renderCount++;
  console.log(`[RENDER ${renderCount}] BookingTypeSummary rendering with ${bookings?.length} bookings`);
  console.log(`[RENDER ${renderCount}] Current values before effect: TotalMC=${staticTotalMastercardBookings}, Flight=${staticFlightCount}, Hotel=${staticHotelCount}`);

  // Run calculations only once on component mount
  useEffect(() => {
    console.log(`[EFFECT] useEffect running - calculationsPerformed=${calculationsPerformed}`);
    console.log(`[EFFECT] bookings array reference: ${bookings ? bookings.toString().substring(0, 50) : 'undefined'}...`);

    // Only perform calculations if they haven't been done already
    if (!calculationsPerformed && bookings && bookings.length > 0) {
      console.log('=== PERFORMING BOOKING TYPE SUMMARY CALCULATIONS (ONCE ONLY) ===');
      console.log(`[EFFECT] Initial data: ${bookings.length} total bookings`);

      // Calculate total bookings
      staticTotalBookings = bookings.length;

      // Filter to include only Mastercard bookings
      const allMastercardBookings = bookings.filter(booking =>
        booking.cardTypeNormalized?.toLowerCase() === 'mastercard'
      );
      staticTotalMastercardBookings = allMastercardBookings.length;

      console.log(`[EFFECT] Found ${staticTotalMastercardBookings} Mastercard bookings out of ${staticTotalBookings} total`);

      // Count bookings by type using the Mastercard-filtered bookings
      staticFlightCount = allMastercardBookings.filter(b => b.bookingTypeNormalized === 'Flight').length;
      staticHotelCount = allMastercardBookings.filter(b => b.bookingTypeNormalized === 'Hotel').length;
      staticCarCount = allMastercardBookings.filter(b => b.bookingTypeNormalized === 'Car').length;
      staticRailCount = allMastercardBookings.filter(b => b.bookingTypeNormalized === 'Rail').length;

      // Log the first few Mastercard bookings for debugging
      console.log(`[EFFECT] First few Mastercard bookings types:`);
      allMastercardBookings.slice(0, 5).forEach((b, i) => {
        console.log(`  Booking ${i}: type=${b.bookingTypeNormalized}, id=${b.id}`);
      });

      // Calculate total of just the main categories for percentage calculations
      const categorizedTotal = staticFlightCount + staticHotelCount + staticCarCount + staticRailCount;

      // Calculate percentages based on categorized total
      staticFlightPercent = categorizedTotal > 0 ? Math.round((staticFlightCount / categorizedTotal) * 100) : 0;
      staticHotelPercent = categorizedTotal > 0 ? Math.round((staticHotelCount / categorizedTotal) * 100) : 0;
      staticCarPercent = categorizedTotal > 0 ? Math.round((staticCarCount / categorizedTotal) * 100) : 0;
      staticRailPercent = categorizedTotal > 0 ? Math.round((staticRailCount / categorizedTotal) * 100) : 0;

      // Adjust to ensure they add up to 100%
      const sum = staticFlightPercent + staticHotelPercent + staticCarPercent + staticRailPercent;
      staticAdjustment = 0;
      if (sum !== 100 && sum > 0) {
        staticAdjustment = 100 - sum;
      }

      // Debug logs
      console.log(`[EFFECT] Calculations complete: TotalMC=${staticTotalMastercardBookings}, Flight=${staticFlightCount}, Hotel=${staticHotelCount}, Car=${staticCarCount}, Rail=${staticRailCount}`);

      // Mark calculations as performed so we don't run them again
      calculationsPerformed = true;
      setCalculationsComplete(true);
      console.log(`[EFFECT] Set calculationsPerformed=true and calculationsComplete=true`);
    } else {
      console.log(`[EFFECT] Skipped calculations - already performed or no data`);
    }
  }, [bookings]); // Only run on initial mount and if bookings change completely

  // DEBUGGING: Log values just before rendering
  console.log(`[RENDER ${renderCount}] RENDER VALUES: TotalMC=${staticTotalMastercardBookings}, Flight=${staticFlightCount}, Hotel=${staticHotelCount}`);

  return (
    <>
      <div className="mb-4 p-3 border rounded bg-white">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">
            Booking Type Summary
            <Badge bg="info" className="ms-2">All Data</Badge>
            <Badge bg="success" className="ms-2">Static Variables</Badge>
            <Badge bg="warning" className="ms-2">Render #{renderCount}</Badge>
          </h5>
          <span className="text-muted">
            Total: {staticTotalBookings} | Mastercard Only: {staticTotalMastercardBookings} bookings
          </span>
        </div>

        <Table size="sm" className="mb-3" bordered>
          <thead className="bg-light">
            <tr>
              <th className="text-center">Flight</th>
              <th className="text-center">Hotel</th>
              <th className="text-center">Car</th>
              <th className="text-center">Rail</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-center">
                <Badge bg="primary" className="px-2">{staticFlightCount}</Badge>
              </td>
              <td className="text-center">
                <Badge bg="success" className="px-2">{staticHotelCount}</Badge>
              </td>
              <td className="text-center">
                <Badge bg="info" className="px-2">{staticCarCount}</Badge>
              </td>
              <td className="text-center">
                <Badge bg="warning" text="dark" className="px-2">{staticRailCount}</Badge>
              </td>
            </tr>
          </tbody>
        </Table>

        {/* Percentage bar */}
        <div className="progress" style={{ height: '20px' }}>
          <div className="progress-bar bg-primary" style={{ width: `${staticFlightPercent}%` }}
               title={`Flight: ${staticFlightCount} (${staticFlightPercent}%)`}>
            {staticFlightPercent > 8 && `${staticFlightPercent}%`}
          </div>
          <div className="progress-bar bg-success" style={{ width: `${staticHotelPercent}%` }}
               title={`Hotel: ${staticHotelCount} (${staticHotelPercent}%)`}>
            {staticHotelPercent > 8 && `${staticHotelPercent}%`}
          </div>
          <div className="progress-bar bg-info" style={{ width: `${staticCarPercent}%` }}
               title={`Car: ${staticCarCount} (${staticCarPercent}%)`}>
            {staticCarPercent > 8 && `${staticCarPercent}%`}
          </div>
          <div className="progress-bar bg-warning" style={{ width: `${staticRailPercent + staticAdjustment}%` }}
               title={`Rail: ${staticRailCount} (${staticRailPercent}%)`}>
            {staticRailPercent > 8 && `${staticRailPercent}%`}
          </div>
        </div>
      </div>

      {/* Explanation for users */}
      <div className="alert alert-info mb-4">
        <strong>Note:</strong> The Booking Type Summary above shows statistics for <em>all data</em>, while the table below shows bookings for the <em>current page only</em>.
      </div>
    </>
  );
};

export default BookingTypeSummary;