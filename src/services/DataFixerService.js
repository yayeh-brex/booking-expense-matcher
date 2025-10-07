/**
 * DataFixerService - Utility functions to fix data issues in booking data
 */

/**
 * Applies fixes to booking data
 * @param {Array} bookings - The array of booking objects to fix
 * @returns {Object} Object containing fixed bookings and stats
 */
export const applyDataFixes = (bookings) => {
  if (!bookings || bookings.length === 0) return { fixedBookings: [], stats: null };

  // Make a deep copy of the bookings array
  const fixedBookings = JSON.parse(JSON.stringify(bookings));

  let masterCardFixed = 0;
  let typeFixed = 0;

  // Fix issues in each booking
  fixedBookings.forEach(booking => {
    // Fix 1: Force cardTypeNormalized to be 'Mastercard' for the expected number of bookings
    // This is based on our analysis showing there should be 934 Mastercard bookings
    if (booking.rawData && booking.rawData['Credit Card Network'] === 'MasterCard') {
      booking.cardTypeNormalized = 'Mastercard';
      masterCardFixed++;
    }

    // Fix 2: Ensure booking types are correctly set
    if (booking.rawData && booking.rawData['Type']) {
      const type = booking.rawData['Type'];

      if (type.toLowerCase().includes('flight')) {
        booking.bookingTypeNormalized = 'Flight';
        typeFixed++;
      } else if (type.toLowerCase().includes('hotel')) {
        booking.bookingTypeNormalized = 'Hotel';
        typeFixed++;
      } else if (type.toLowerCase().includes('car')) {
        booking.bookingTypeNormalized = 'Car';
        typeFixed++;
      } else if (type.toLowerCase().includes('rail')) {
        booking.bookingTypeNormalized = 'Rail';
        typeFixed++;
      }
    }
  });

  // Calculate stats after fixing
  const totalMastercard = fixedBookings.filter(
    b => b.cardTypeNormalized === 'Mastercard'
  ).length;

  const flightCount = fixedBookings.filter(
    b => b.cardTypeNormalized === 'Mastercard' && b.bookingTypeNormalized === 'Flight'
  ).length;

  const hotelCount = fixedBookings.filter(
    b => b.cardTypeNormalized === 'Mastercard' && b.bookingTypeNormalized === 'Hotel'
  ).length;

  const carCount = fixedBookings.filter(
    b => b.cardTypeNormalized === 'Mastercard' && b.bookingTypeNormalized === 'Car'
  ).length;

  const railCount = fixedBookings.filter(
    b => b.cardTypeNormalized === 'Mastercard' && b.bookingTypeNormalized === 'Rail'
  ).length;

  // Return stats and fixed bookings
  return {
    fixedBookings,
    stats: {
      totalMastercard,
      flightCount,
      hotelCount,
      carCount,
      railCount,
      masterCardFixed,
      typeFixed
    }
  };
};