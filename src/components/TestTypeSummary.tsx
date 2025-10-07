import React from 'react';
import { Table, Badge } from 'react-bootstrap';

/**
 * A simplified test component that displays fixed values regardless of props
 * This helps us determine if the issue is with the component logic or data flow
 */
const TestTypeSummary = () => {
  // Hard-coded values for testing
  const totalBookings = 100;
  const totalMastercardBookings = 45;
  const flightCount = 20;
  const hotelCount = 15;
  const carCount = 7;
  const railCount = 3;

  // Fixed percentages
  const flightPercent = 44;
  const hotelPercent = 33;
  const carPercent = 16;
  const railPercent = 7;

  return (
    <>
      <div className="mb-4 p-3 border rounded bg-white">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">
            TEST SUMMARY - FIXED VALUES
            <Badge bg="danger" className="ms-2">Test</Badge>
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
          <div className="progress-bar bg-primary" style={{ width: `${flightPercent}%` }}
               title={`Flight: ${flightCount} (${flightPercent}%)`}>
            {flightPercent}%
          </div>
          <div className="progress-bar bg-success" style={{ width: `${hotelPercent}%` }}
               title={`Hotel: ${hotelCount} (${hotelPercent}%)`}>
            {hotelPercent}%
          </div>
          <div className="progress-bar bg-info" style={{ width: `${carCount}%` }}
               title={`Car: ${carCount} (${carCount}%)`}>
            {carCount}%
          </div>
          <div className="progress-bar bg-warning" style={{ width: `${railPercent}%` }}
               title={`Rail: ${railCount} (${railPercent}%)`}>
            {railPercent}%
          </div>
        </div>
      </div>

      <div className="alert alert-warning mb-4">
        <strong>This is a test component!</strong> It displays fixed values regardless of input data.
      </div>
    </>
  );
};

export default TestTypeSummary;