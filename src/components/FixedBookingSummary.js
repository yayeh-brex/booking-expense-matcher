import React from 'react';
import { Table, Badge } from 'react-bootstrap';

/**
 * A completely simplified booking summary component with hard-coded values
 * This is a last resort to verify the UI is working correctly
 */
const FixedBookingSummary = () => {
  // Hard-coded example values
  const totalBookings = 100;
  const totalMastercardBookings = 45;
  const flightCount = 20;
  const hotelCount = 15;
  const carCount = 7;
  const railCount = 3;

  // Hard-coded percentages (should add to 100)
  const flightPercent = 44;
  const hotelPercent = 33;
  const carPercent = 16;
  const railPercent = 7;

  console.log('RENDERING FIXED SUMMARY WITH HARD-CODED VALUES');
  console.log('HARD-CODED VALUES: ', {
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
            <Badge bg="danger" className="ms-2">FIXED VALUES</Badge>
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
            style={{ width: `${railPercent}%` }}
            title={`Rail: ${railCount} (${railPercent}%)`}
          >
            {railPercent > 8 && `${railPercent}%`}
          </div>
        </div>
      </div>

      <div className="alert alert-info mb-4">
        <strong>Note:</strong> The Booking Type Summary above shows <em>fixed hard-coded values</em> for testing, while the table below shows bookings for the <em>current page only</em>.
      </div>
    </>
  );
};

export default FixedBookingSummary;