import React, { useEffect } from 'react';
import { Badge } from 'react-bootstrap';

/**
 * This is a special component that checks the rendered values against expected values
 * and reports the results in the browser console and DOM
 */
const TestReportValues = () => {
  // Expected values based on sample data analysis
  const expected = {
    totalBookings: 1670,
    mastercard: 934,
    flight: 705,
    hotel: 217,
    car: 4,
    rail: 8
  };

  // Results state
  const results = {
    passed: 0,
    failed: 0,
    details: []
  };

  useEffect(() => {
    // Wait for DOM to be fully rendered
    setTimeout(() => {
      console.log('===== TESTING RENDERED VALUES =====');

      try {
        // Find the booking summary section
        const summary = document.querySelector('.booking-type-summary');
        if (!summary) {
          console.error('Could not find booking summary section');
          results.failed++;
          results.details.push('Could not find booking summary section');
          return;
        }

        // Extract values from the DOM
        const headerText = summary.querySelector('span.text-muted').textContent;
        const badgeValues = Array.from(summary.querySelectorAll('td .badge')).map(badge => badge.textContent);

        // Parse the total and mastercard counts
        const totalMatch = headerText.match(/Total:\s*(\d+)/);
        const mastercardMatch = headerText.match(/Mastercard Only:\s*(\d+)/);

        // Verify total bookings
        if (totalMatch && parseInt(totalMatch[1]) === expected.totalBookings) {
          console.log('✓ Total bookings match:', totalMatch[1]);
          results.passed++;
          results.details.push(`✓ Total bookings: ${totalMatch[1]} (expected ${expected.totalBookings})`);
        } else {
          console.error('✗ Total bookings mismatch:', totalMatch ? totalMatch[1] : 'not found', 'expected', expected.totalBookings);
          results.failed++;
          results.details.push(`✗ Total bookings: ${totalMatch ? totalMatch[1] : 'not found'} (expected ${expected.totalBookings})`);
        }

        // Verify mastercard bookings
        if (mastercardMatch && parseInt(mastercardMatch[1]) === expected.mastercard) {
          console.log('✓ Mastercard bookings match:', mastercardMatch[1]);
          results.passed++;
          results.details.push(`✓ Mastercard bookings: ${mastercardMatch[1]} (expected ${expected.mastercard})`);
        } else {
          console.error('✗ Mastercard bookings mismatch:', mastercardMatch ? mastercardMatch[1] : 'not found', 'expected', expected.mastercard);
          results.failed++;
          results.details.push(`✗ Mastercard bookings: ${mastercardMatch ? mastercardMatch[1] : 'not found'} (expected ${expected.mastercard})`);
        }

        // Verify booking type counts
        const expectedBadges = [expected.flight, expected.hotel, expected.car, expected.rail];
        const badgeLabels = ['Flight', 'Hotel', 'Car', 'Rail'];

        badgeValues.forEach((value, index) => {
          const parsedValue = parseInt(value);
          if (parsedValue === expectedBadges[index]) {
            console.log(`✓ ${badgeLabels[index]} count matches:`, parsedValue);
            results.passed++;
            results.details.push(`✓ ${badgeLabels[index]} count: ${parsedValue} (expected ${expectedBadges[index]})`);
          } else {
            console.error(`✗ ${badgeLabels[index]} count mismatch:`, parsedValue, 'expected', expectedBadges[index]);
            results.failed++;
            results.details.push(`✗ ${badgeLabels[index]} count: ${parsedValue} (expected ${expectedBadges[index]})`);
          }
        });
      } catch (error) {
        console.error('Error during test:', error);
        results.failed++;
        results.details.push(`Error during test: ${error.message}`);
      }

      // Log summary
      console.log('===== TEST SUMMARY =====');
      console.log(`Passed: ${results.passed}, Failed: ${results.failed}`);
      console.log('=======================');

      // Force a re-render
      document.querySelector('#test-report-values').innerText = 'Test Complete';
    }, 2000); // Wait 2 seconds for everything to render
  }, []);

  return (
    <div className="mt-4 p-3 border rounded bg-light">
      <h5>
        DOM Values Test
        <Badge bg="info" className="ms-2">Checking rendered values</Badge>
      </h5>
      <div id="test-report-values">Running test...</div>
      <div className="mt-3">
        <strong>Expected Values:</strong>
        <ul>
          <li>Total Bookings: {expected.totalBookings}</li>
          <li>Mastercard Bookings: {expected.mastercard}</li>
          <li>Flight: {expected.flight}</li>
          <li>Hotel: {expected.hotel}</li>
          <li>Car: {expected.car}</li>
          <li>Rail: {expected.rail}</li>
        </ul>
        <p className="text-muted small">
          Check browser console (F12 {'>>'} Console) for detailed test results
        </p>
      </div>
    </div>
  );
};

export default TestReportValues;