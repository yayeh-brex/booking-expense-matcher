import React, { useEffect, useState } from 'react';
import { Table, Badge } from 'react-bootstrap';
import { BookingData } from '../types/BookingData';

// Global variables to store the calculated values - these will persist across the app
const staticData = {
  initialized: false,
  totalBookings: 0,
  totalMastercardBookings: 0,
  flightCount: 0,
  hotelCount: 0,
  carCount: 0,
  railCount: 0,
  flightPercent: 0,
  hotelPercent: 0,
  carPercent: 0,
  railPercent: 0,
  adjustment: 0,
  renderCount: 0
};

interface StaticBookingSummaryProps {
  bookings: BookingData[];
}

// Create a calculation function that will be called only once
const calculateStaticData = (bookings: BookingData[]) => {
  if (staticData.initialized || !bookings || bookings.length === 0) {
    return;
  }

  console.log('===== PERFORMING ONE-TIME STATIC CALCULATION =====');
  console.log(`Total bookings: ${bookings.length}`);

  // Set total bookings
  staticData.totalBookings = bookings.length;

  // Filter Mastercard bookings
  const mastercardBookings = bookings.filter(booking =>
    booking.cardTypeNormalized?.toLowerCase() === 'mastercard'
  );
  staticData.totalMastercardBookings = mastercardBookings.length;

  // Count by type
  staticData.flightCount = mastercardBookings.filter(b => b.bookingTypeNormalized === 'Flight').length;
  staticData.hotelCount = mastercardBookings.filter(b => b.bookingTypeNormalized === 'Hotel').length;
  staticData.carCount = mastercardBookings.filter(b => b.bookingTypeNormalized === 'Car').length;
  staticData.railCount = mastercardBookings.filter(b => b.bookingTypeNormalized === 'Rail').length;

  // Calculate percentages
  const categorizedTotal = staticData.flightCount + staticData.hotelCount +
                          staticData.carCount + staticData.railCount;

  if (categorizedTotal > 0) {
    staticData.flightPercent = Math.round((staticData.flightCount / categorizedTotal) * 100);
    staticData.hotelPercent = Math.round((staticData.hotelCount / categorizedTotal) * 100);
    staticData.carPercent = Math.round((staticData.carCount / categorizedTotal) * 100);
    staticData.railPercent = Math.round((staticData.railCount / categorizedTotal) * 100);

    // Adjust to 100%
    const sum = staticData.flightPercent + staticData.hotelPercent +
               staticData.carPercent + staticData.railPercent;

    if (sum !== 100) {
      staticData.adjustment = 100 - sum;
    }
  }

  // Log results
  console.log(`MC Bookings: ${staticData.totalMastercardBookings}`);
  console.log(`Types: Flight=${staticData.flightCount}, Hotel=${staticData.hotelCount}, Car=${staticData.carCount}, Rail=${staticData.railCount}`);

  // Mark as initialized
  staticData.initialized = true;
};

// Wrapper component that handles data initialization
export const StaticDataInitializer: React.FC<{bookings: BookingData[]}> = ({ bookings }) => {
  useEffect(() => {
    // Debug logs
    console.log(`[INITIALIZER] Running initializer effect with ${bookings?.length} bookings`);
    console.log(`[INITIALIZER] staticData.initialized=${staticData.initialized}`);

    // Force recalculation when new data is loaded - IMPORTANT
    if (bookings && bookings.length > 0) {
      console.log(`[INITIALIZER] Resetting initialized flag to recalculate with new data`);
      staticData.initialized = false;
    }

    // Run the calculation for new data
    if (!staticData.initialized && bookings && bookings.length > 0) {
      calculateStaticData(bookings);
    }
  }, [bookings]);

  return null; // This component doesn't render anything
};

// The actual display component
const StaticBookingSummaryComponent: React.FC = () => {
  // Increment render count to help with debugging
  staticData.renderCount++;

  // Log render
  console.log(`[STATIC SUMMARY] Rendering #${staticData.renderCount}`);
  console.log(`[STATIC SUMMARY] Values: TotalMC=${staticData.totalMastercardBookings}, Flight=${staticData.flightCount}`);

  return (
    <>
      <div className="mb-4 p-3 border rounded bg-white">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">
            Booking Type Summary
            <Badge bg="info" className="ms-2">All Data</Badge>
            <Badge bg="danger" className="ms-2">Static Component</Badge>
            <Badge bg="warning" className="ms-2">Render #{staticData.renderCount}</Badge>
          </h5>
          <span className="text-muted">
            Total: {staticData.totalBookings} | Mastercard Only: {staticData.totalMastercardBookings} bookings
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
                <Badge bg="primary" className="px-2">{staticData.flightCount}</Badge>
              </td>
              <td className="text-center">
                <Badge bg="success" className="px-2">{staticData.hotelCount}</Badge>
              </td>
              <td className="text-center">
                <Badge bg="info" className="px-2">{staticData.carCount}</Badge>
              </td>
              <td className="text-center">
                <Badge bg="warning" text="dark" className="px-2">{staticData.railCount}</Badge>
              </td>
            </tr>
          </tbody>
        </Table>

        {/* Percentage bar */}
        <div className="progress" style={{ height: '20px' }}>
          <div
            className="progress-bar bg-primary"
            style={{ width: `${staticData.flightPercent}%` }}
            title={`Flight: ${staticData.flightCount} (${staticData.flightPercent}%)`}
          >
            {staticData.flightPercent > 8 && `${staticData.flightPercent}%`}
          </div>
          <div
            className="progress-bar bg-success"
            style={{ width: `${staticData.hotelPercent}%` }}
            title={`Hotel: ${staticData.hotelCount} (${staticData.hotelPercent}%)`}
          >
            {staticData.hotelPercent > 8 && `${staticData.hotelPercent}%`}
          </div>
          <div
            className="progress-bar bg-info"
            style={{ width: `${staticData.carPercent}%` }}
            title={`Car: ${staticData.carCount} (${staticData.carPercent}%)`}
          >
            {staticData.carPercent > 8 && `${staticData.carPercent}%`}
          </div>
          <div
            className="progress-bar bg-warning"
            style={{ width: `${staticData.railPercent + staticData.adjustment}%` }}
            title={`Rail: ${staticData.railCount} (${staticData.railPercent}%)`}
          >
            {staticData.railPercent > 8 && `${staticData.railPercent}%`}
          </div>
        </div>
      </div>

      <div className="alert alert-info mb-4">
        <strong>Note:</strong> The Booking Type Summary above shows statistics for <em>all data</em>, while the table below shows bookings for the <em>current page only</em>.
      </div>
    </>
  );
};

// Main component that combines initializer and display
const StaticBookingSummary: React.FC<StaticBookingSummaryProps> = ({ bookings }) => {
  return (
    <>
      <StaticDataInitializer bookings={bookings} />
      {React.useMemo(() => <StaticBookingSummaryComponent />, [])}
    </>
  );
};

export default StaticBookingSummary;