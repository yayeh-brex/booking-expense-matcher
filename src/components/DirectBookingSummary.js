import React from 'react';
import { Table, Badge } from 'react-bootstrap';

/**
 * A completely direct booking summary component with no tricks
 * Just calculates everything directly and displays it
 */
const DirectBookingSummary = ({ allBookings }) => {
  console.log('DirectBookingSummary rendering with', allBookings.length, 'bookings');

  // DIRECT calculation, no memoization, no static variables
  const totalBookings = allBookings.length;

  // Calculate Mastercard bookings with extensive logging
  console.log('ANALYZING CARD TYPES:');

  // Log the first 10 bookings' card types to see what we're working with
  allBookings.slice(0, 10).forEach((b, i) => {
    console.log(`Booking ${i+1} card type: '${b.cardTypeNormalized}', raw: '${b.cardType || "N/A"}'`);
  });

  // Count all card types for diagnostics
  const cardTypes = {};
  allBookings.forEach(b => {
    const cardType = b.cardTypeNormalized || 'undefined';
    cardTypes[cardType] = (cardTypes[cardType] || 0) + 1;
  });
  console.log('All card types found:', cardTypes);

  // Try different matching approaches
  const mastercardBookings1 = allBookings.filter(booking =>
    booking.cardTypeNormalized?.toLowerCase() === 'mastercard'
  );

  const mastercardBookings2 = allBookings.filter(booking =>
    booking.cardTypeNormalized && booking.cardTypeNormalized.toLowerCase().includes('master')
  );

  const mastercardBookings3 = allBookings.filter(booking =>
    (booking.cardTypeNormalized && booking.cardTypeNormalized.toLowerCase().includes('master')) ||
    (booking.cardType && booking.cardType.toLowerCase().includes('master'))
  );

  console.log('Mastercard count (exact match):', mastercardBookings1.length);
  console.log('Mastercard count (includes match):', mastercardBookings2.length);
  console.log('Mastercard count (any field match):', mastercardBookings3.length);

  // Use the most permissive matching for now
  const mastercardBookings = mastercardBookings3;
  const totalMastercardBookings = mastercardBookings.length;

  // Count by type
  const flightCount = mastercardBookings.filter(b => b.bookingTypeNormalized === 'Flight').length;
  const hotelCount = mastercardBookings.filter(b => b.bookingTypeNormalized === 'Hotel').length;
  const carCount = mastercardBookings.filter(b => b.bookingTypeNormalized === 'Car').length;
  const railCount = mastercardBookings.filter(b => b.bookingTypeNormalized === 'Rail').length;

  // Calculate percentages
  const categorizedTotal = flightCount + hotelCount + carCount + railCount;

  // Default all to 0 if there are no bookings
  let flightPercent = 0;
  let hotelPercent = 0;
  let carPercent = 0;
  let railPercent = 0;
  let adjustment = 0;

  if (categorizedTotal > 0) {
    flightPercent = Math.round((flightCount / categorizedTotal) * 100);
    hotelPercent = Math.round((hotelCount / categorizedTotal) * 100);
    carPercent = Math.round((carCount / categorizedTotal) * 100);
    railPercent = Math.round((railCount / categorizedTotal) * 100);

    // Adjust to ensure they add up to 100%
    const sum = flightPercent + hotelPercent + carPercent + railPercent;
    if (sum !== 100) {
      adjustment = 100 - sum;
    }
  }

  // Log calculated values for debugging
  console.log('DIRECT CALCULATION RESULTS:', {
    totalBookings,
    totalMastercardBookings,
    flightCount,
    hotelCount,
    carCount,
    railCount,
    flightPercent,
    hotelPercent,
    carPercent,
    railPercent
  });

  return (
    <>
      <div className="mb-4 p-3 border rounded bg-white booking-type-summary">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">
            Booking Type Summary
            <Badge bg="danger" className="ms-2">Direct Calculation</Badge>
          </h5>
          <span className="text-muted">
            Total: {totalBookings} | Mastercard Only: {totalMastercardBookings} bookings
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
                <Badge bg="primary" className="px-2">{flightCount}</Badge>
              </td>
              <td className="text-center">
                <Badge bg="success" className="px-2">{hotelCount}</Badge>
              </td>
              <td className="text-center">
                <Badge bg="info" className="px-2">{carCount}</Badge>
              </td>
              <td className="text-center">
                <Badge bg="warning" text="dark" className="px-2">{railCount}</Badge>
              </td>
            </tr>
          </tbody>
        </Table>

        {/* Percentage bar */}
        <div className="progress" style={{ height: '20px' }}>
          <div
            className="progress-bar bg-primary"
            style={{ width: `${flightPercent}%` }}
            title={`Flight: ${flightCount} (${flightPercent}%)`}
          >
            {flightPercent > 8 && `${flightPercent}%`}
          </div>
          <div
            className="progress-bar bg-success"
            style={{ width: `${hotelPercent}%` }}
            title={`Hotel: ${hotelCount} (${hotelPercent}%)`}
          >
            {hotelPercent > 8 && `${hotelPercent}%`}
          </div>
          <div
            className="progress-bar bg-info"
            style={{ width: `${carPercent}%` }}
            title={`Car: ${carCount} (${carPercent}%)`}
          >
            {carPercent > 8 && `${carPercent}%`}
          </div>
          <div
            className="progress-bar bg-warning"
            style={{ width: `${railPercent + adjustment}%` }}
            title={`Rail: ${railCount} (${railPercent}%)`}
          >
            {railPercent > 8 && `${railPercent}%`}
          </div>
        </div>
      </div>

      <div className="alert alert-info mb-4">
        <strong>Note:</strong> The Booking Type Summary above shows statistics for <em>all data</em>, while the table below shows bookings for the <em>current page only</em>.
      </div>
    </>
  );
};

export default DirectBookingSummary;