// Simple script to analyze sample data and get exact counts
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Parse the Navan CSV file
function parseBookingCSV(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true
  });

  console.log('Total bookings loaded:', records.length);

  // Normalize the data to match app's processing
  const normalizedBookings = records.map(record => {
    return {
      id: record['Booking UUID'] || '',
      travelType: record['Type'] || '',
      bookingTypeNormalized: normalizeBookingType(record['Type'] || ''),
      cardTypeNormalized: record['Credit Card Network'] || '',
      vendor: record['Vendor'] || ''
    };
  });

  return normalizedBookings;
}

// Simple function to normalize booking types
function normalizeBookingType(type) {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('flight')) return 'Flight';
  if (lowerType.includes('hotel')) return 'Hotel';
  if (lowerType.includes('car')) return 'Car';
  if (lowerType.includes('rail')) return 'Rail';
  return 'Other';
}

// Analyze the data
function analyzeData(bookings) {
  // Count all bookings by type
  const typeCount = {};
  bookings.forEach(booking => {
    const type = booking.bookingTypeNormalized || 'Unknown';
    typeCount[type] = (typeCount[type] || 0) + 1;
  });

  // Count Mastercard bookings
  const mastercardBookings = bookings.filter(b =>
    b.cardTypeNormalized?.toLowerCase() === 'mastercard'
  );

  // Count Mastercard bookings by type
  const mastercardTypeCount = {};
  mastercardBookings.forEach(booking => {
    const type = booking.bookingTypeNormalized || 'Unknown';
    mastercardTypeCount[type] = (mastercardTypeCount[type] || 0) + 1;
  });

  // Count all card types
  const cardTypeCount = {};
  bookings.forEach(booking => {
    const cardType = booking.cardTypeNormalized?.toLowerCase() || 'unknown';
    cardTypeCount[cardType] = (cardTypeCount[cardType] || 0) + 1;
  });

  // Return analysis
  return {
    totalBookings: bookings.length,
    totalMastercardBookings: mastercardBookings.length,
    bookingTypeCount: typeCount,
    mastercardTypeCount,
    cardTypeCount
  };
}

// Main function
function main() {
  const bookingFilePath = path.join(__dirname, '..', 'sample_data', 'booking_report', 'Navan Bookings Report March 1 - Aug 31 2025 (1).csv');

  try {
    const bookings = parseBookingCSV(bookingFilePath);
    const analysis = analyzeData(bookings);

    console.log('====== BOOKING DATA ANALYSIS ======');
    console.log(`Total bookings: ${analysis.totalBookings}`);
    console.log(`Mastercard bookings: ${analysis.totalMastercardBookings}`);
    console.log('All booking types:', analysis.bookingTypeCount);
    console.log('Mastercard booking types:', analysis.mastercardTypeCount);
    console.log('Card types:', analysis.cardTypeCount);
    console.log('=================================');

  } catch (error) {
    console.error('Error analyzing data:', error);
  }
}

// Run the analysis
main();