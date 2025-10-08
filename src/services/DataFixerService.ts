import { BookingData } from '../types/BookingData';

interface DataFixStats {
  totalMastercard: number;
  flightCount: number;
  hotelCount: number;
  carCount: number;
  railCount: number;
  masterCardFixed: number;
  typeFixed: number;
}

interface DataFixResult {
  fixedBookings: BookingData[];
  stats: DataFixStats;
}

/**
 * DataFixerService - Utility functions to fix data issues in booking data
 */

/**
 * Applies fixes to booking data
 * @param {BookingData[]} bookings - The array of booking objects to fix
 * @returns {DataFixResult} Object containing fixed bookings and stats
 */
export const applyDataFixes = (bookings: BookingData[]): DataFixResult => {
  if (!bookings || bookings.length === 0) {
    return {
      fixedBookings: [],
      stats: {
        totalMastercard: 0,
        flightCount: 0,
        hotelCount: 0,
        carCount: 0,
        railCount: 0,
        masterCardFixed: 0,
        typeFixed: 0
      }
    };
  }

  // Make a deep copy of the bookings array
  const fixedBookings = JSON.parse(JSON.stringify(bookings)) as BookingData[];

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

    // Fix 2: Ensure booking types are correctly set - ENHANCED version with all checks from App.tsx
    let typeWasFixed = false;

    // Direct check for FLIGHT in Type field
    if (booking.rawData && booking.rawData['Type']) {
      const type = booking.rawData['Type'];

      if (type.toLowerCase().includes('flight')) {
        booking.bookingTypeNormalized = 'Flight';
        typeFixed++;
        typeWasFixed = true;
      } else if (type.toLowerCase().includes('hotel')) {
        booking.bookingTypeNormalized = 'Hotel';
        typeFixed++;
        typeWasFixed = true;
      } else if (type.toLowerCase().includes('car')) {
        booking.bookingTypeNormalized = 'Car';
        typeFixed++;
        typeWasFixed = true;
      } else if (type.toLowerCase().includes('rail')) {
        booking.bookingTypeNormalized = 'Rail';
        typeFixed++;
        typeWasFixed = true;
      }
    }

    // If we haven't fixed the type yet, check for additional flight indicators
    if (!typeWasFixed) {
      // Check travel type for flight-related keywords
      if (booking.travelType &&
          (booking.travelType.toLowerCase().includes('flight') ||
           booking.travelType.toLowerCase().includes('air'))) {
        booking.bookingTypeNormalized = 'Flight';
        typeFixed++;
        typeWasFixed = true;
      }
      // Check vendor for airline names
      else if (booking.vendor) {
        const vendorLower = booking.vendor.toLowerCase();
        const airlineNames = [
          'delta', 'american', 'united', 'southwest', 'alaska', 'jetblue', 'frontier', 'spirit',
          'lufthansa', 'british airways', 'air france', 'klm', 'emirates', 'qatar', 'etihad',
          'singapore airlines', 'cathay pacific', 'air canada', 'virgin', 'qantas',
          'aa', 'dl', 'ua', 'wn', 'as', 'b6', 'f9', 'nk', 'lh', 'ba', 'af', 'kl', 'ek', 'qr', 'ey',
          'sq', 'cx', 'ac', 'vs', 'qf'
        ];
        if (airlineNames.some(airline => vendorLower.includes(airline))) {
          booking.bookingTypeNormalized = 'Flight';
          typeFixed++;
          typeWasFixed = true;
        }
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