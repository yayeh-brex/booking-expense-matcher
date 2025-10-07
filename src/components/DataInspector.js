import React, { useState } from 'react';
import { Card, Button, Table } from 'react-bootstrap';

/**
 * Component to directly inspect and analyze the parsed data
 */
const DataInspector = ({ data, title = 'Data Inspector' }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  if (!data || data.length === 0) {
    return (
      <Card className="mb-4">
        <Card.Header>{title}</Card.Header>
        <Card.Body>
          <p>No data available to inspect.</p>
        </Card.Body>
      </Card>
    );
  }

  // Count by fields
  const cardTypeCounts = {};
  const bookingTypeCounts = {};

  data.forEach(item => {
    const cardType = (item.cardTypeNormalized || 'undefined').toLowerCase();
    cardTypeCounts[cardType] = (cardTypeCounts[cardType] || 0) + 1;

    const bookingType = item.bookingTypeNormalized || 'undefined';
    bookingTypeCounts[bookingType] = (bookingTypeCounts[bookingType] || 0) + 1;
  });

  // Count Mastercard by booking type
  const mastercardItems = data.filter(item =>
    (item.cardTypeNormalized?.toLowerCase() === 'mastercard') ||
    (item.cardType?.toLowerCase()?.includes('master'))
  );

  const mastercardByType = {};
  mastercardItems.forEach(item => {
    const type = item.bookingTypeNormalized || 'undefined';
    mastercardByType[type] = (mastercardByType[type] || 0) + 1;
  });

  return (
    <Card className="mb-4">
      <Card.Header>
        {title}
        <span className="text-muted ms-2">({data.length} records)</span>
      </Card.Header>
      <Card.Body>
        <h5>Summary</h5>
        <p>
          Total records: <strong>{data.length}</strong><br />
          Records with "mastercard" in card type: <strong>{mastercardItems.length}</strong>
        </p>

        <div className="d-flex mb-3">
          <Button
            variant="outline-primary"
            size="sm"
            className="me-2"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </Button>

          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setShowRaw(!showRaw)}
          >
            {showRaw ? 'Hide Raw Data' : 'Show Raw Data'}
          </Button>
        </div>

        {showDetails && (
          <>
            <h6>Card Types:</h6>
            <Table striped bordered size="sm" className="mb-3">
              <thead>
                <tr>
                  <th>Card Type</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(cardTypeCounts).map(([type, count]) => (
                  <tr key={type}>
                    <td>{type}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <h6>Booking Types:</h6>
            <Table striped bordered size="sm" className="mb-3">
              <thead>
                <tr>
                  <th>Booking Type</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(bookingTypeCounts).map(([type, count]) => (
                  <tr key={type}>
                    <td>{type}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <h6>Mastercard Bookings by Type:</h6>
            <Table striped bordered size="sm" className="mb-3">
              <thead>
                <tr>
                  <th>Booking Type</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(mastercardByType).map(([type, count]) => (
                  <tr key={type}>
                    <td>{type}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        )}

        {showRaw && (
          <>
            <h6>Sample Records (first 5):</h6>
            <pre className="bg-light p-2" style={{ maxHeight: '300px', overflow: 'auto' }}>
              {JSON.stringify(data.slice(0, 5), null, 2)}
            </pre>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default DataInspector;