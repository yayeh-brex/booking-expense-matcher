import React from 'react';
import { Table, Badge } from 'react-bootstrap';
import { BookingData } from '../types/BookingData';

interface SimpleBookingSummaryProps {
  bookings: BookingData[];
}

/**
 * A simple booking summary component that directly calculates and displays stats
 * without any complex memoization or static variables
 */
const SimpleBookingSummary: React.FC<SimpleBookingSummaryProps> = ({ bookings }) => {
  console.log('SimpleBookingSummary rendering with', bookings.length, 'bookings');

  // Calculate total bookings
  const totalBookings = bookings.length;

  // Filter to include only Mastercard bookings
  const mastercardBookings = bookings.filter(booking =>
    booking.cardTypeNormalized?.toLowerCase() === 'mastercard'
  );
  const totalMastercardBookings = mastercardBookings.length;

  // Count bookings by type using the Mastercard-filtered bookings
  const flightCount = mastercardBookings.filter(b => b.bookingTypeNormalized === 'Flight').length;
  const hotelCount = mastercardBookings.filter(b => b.bookingTypeNormalized === 'Hotel').length;
  const carCount = mastercardBookings.filter(b => b.bookingTypeNormalized === 'Car').length;
  const railCount = mastercardBookings.filter(b => b.bookingTypeNormalized === 'Rail').length;

  // Calculate percentages
  const categorizedTotal = flightCount + hotelCount + carCount + railCount;

  // Calculate percentages based on categorized total
  const flightPercent = categorizedTotal > 0 ? Math.round((flightCount / categorizedTotal) * 100) : 0;
  const hotelPercent = categorizedTotal > 0 ? Math.round((hotelCount / categorizedTotal) * 100) : 0;
  const carPercent = categorizedTotal > 0 ? Math.round((carCount / categorizedTotal) * 100) : 0;
  const railPercent = categorizedTotal > 0 ? Math.round((railCount / categorizedTotal) * 100) : 0;

  // Adjust to ensure they add up to 100%
  const sum = flightPercent + hotelPercent + carPercent + railPercent;
  let adjustment = 0;
  if (sum !== 100 && sum > 0) {
    adjustment = 100 - sum;
  }

  // Log the calculated values
  console.log({
    totalBookings,
    totalMastercardBookings,
    flightCount,
    hotelCount,
    carCount,
    railCount
  });

  return (
    <>
      <div className="mb-4 p-3 border rounded bg-white">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">
            Booking Type Summary
            <Badge bg="danger" className="ms-2">Simple Direct</Badge>
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

export default SimpleBookingSummary;