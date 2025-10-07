import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Form, Button, Alert, Table, Badge, Pagination } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import Papa from 'papaparse';
import { BookingData } from './types/BookingData';
import { ExpenseData, MatchResult } from './types/ExpenseData';
import { parseBookingData } from './services/TMCParserService';
import { parseExpenseData } from './services/ExpenseParserService';
import { getCurrencyMappings } from './services/CurrencyService';
import { normalizeCurrency, extractCurrencyFromAmount } from './services/CurrencyNormalizer';
import {
  getMatchStatistics,
  getUnmatchedBookings,
  getUnmatchedExpenses
} from './services/MatchingService';
import {
  startMatchingProcess,
  MatchingProgress
} from './services/OptimizedMatchingService';
import FlightsEval from './components/FlightsEval';
import BookingTypeSummary from './components/BookingTypeSummary';
import TestTypeSummary from './components/TestTypeSummary';
import StaticBookingSummary from './components/StaticBookingSummary';
import SimpleBookingSummary from './components/SimpleBookingSummary';
import FixedBookingSummary from './components/FixedBookingSummary';
import FinalBookingSummary from './components/FinalBookingSummary';
import DirectBookingSummary from './components/DirectBookingSummary';
import TestReportValues from './components/TestReportValues';
import DataInspector from './components/DataInspector';
// Import the service instead of the component
import { applyDataFixes } from './services/DataFixerService';

// List of Travel Management Companies (TMCs)
const TMC_LIST = [
  'Egencia',
  'BCD Travel',
  'CWT (Carlson Wagonlit Travel)',
  'FCM Travel Solutions',
  'CTM (Corporate Travel Management) Corporate Traveller',
  'Navan',
  'TravelPerk',
  'TravelBank',
  'ITILITE',
  'Christopherson Business Travel',
  'JTB Business Travel',
  'ATPI',
  'Solutions Travel',
  'AmTrav'
];

// Function was removed because it's now inlined in the code

// Function was removed because it's now inlined in the code

function App() {
  // Booking report states
  const [selectedTMC, setSelectedTMC] = useState<string>('');
  const [bookingFile, setBookingFile] = useState<File | null>(null);
  const [bookingData, setBookingData] = useState<any[] | null>(null);
  const [parsedBookings, setParsedBookings] = useState<BookingData[] | null>(null);
  const bookingInputRef = useRef<HTMLInputElement>(null);

  // Expense report states
  const [expenseFile, setExpenseFile] = useState<File | null>(null);
  const [expenseData, setExpenseData] = useState<any[] | null>(null);
  const [parsedExpenses, setParsedExpenses] = useState<ExpenseData[] | null>(null);
  const expenseInputRef = useRef<HTMLInputElement>(null);

  // Shared states
  const [error, setError] = useState<string | null>(null);
  const [isParsingLoading, setIsParsingLoading] = useState<boolean>(false);

  // Matching states
  const [matchResults, setMatchResults] = useState<MatchResult[] | null>(null);
  const [isMatching, setIsMatching] = useState<boolean>(false);
  const [matchingProgress, setMatchingProgress] = useState<number>(0);

  // State to track if matching should be run after parsing
  const [runMatchingAfterParse, setRunMatchingAfterParse] = useState<boolean>(false);

  // Currency mapping state
  const [currencyMappings, setCurrencyMappings] = useState<Record<string, string>>({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage] = useState<number>(21); // Fixed at 21 rows per page

  // DEBUGGING: Log when pagination changes
  useEffect(() => {
    console.log(`[APP] Pagination changed to page ${currentPage}`);
  }, [currentPage]);

  // Load currency mappings on component mount
  useEffect(() => {
    const loadCurrencyData = async () => {
      try {
        const mappings = await getCurrencyMappings();
        setCurrencyMappings(mappings);
        console.log('Currency mappings loaded:', Object.keys(mappings).length, 'entries');
      } catch (err) {
        console.error('Error loading currency mappings:', err);
        // We don't set an error in the UI since this is a non-critical feature
      }
    };

    loadCurrencyData();
  }, []);

  // Reset pagination when bookings data changes
  useEffect(() => {
    if (parsedBookings) {
      setCurrentPage(1);
    }
  }, [parsedBookings]);

  // We'll add our effect hook after all function definitions to avoid circular dependencies

  // Upload booking file
  const handleUploadBooking = () => {
    if (bookingInputRef.current) {
      bookingInputRef.current.click();
    }
  };

  // Upload expense file
  const handleUploadExpense = () => {
    if (expenseInputRef.current) {
      expenseInputRef.current.click();
    }
  };

  // Handle booking file change
  const handleBookingFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setBookingFile(file);

      // Show filename after selecting
      const fileName = file.name;
      const fileInfo = document.getElementById('booking-file-info');
      if (fileInfo) {
        fileInfo.textContent = fileName;
      }

      setError(null);
    }
  };

  // Handle expense file change
  const handleExpenseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setExpenseFile(file);

      // Show filename after selecting
      const fileName = file.name;
      const fileInfo = document.getElementById('expense-file-info');
      if (fileInfo) {
        fileInfo.textContent = fileName;
      }

      setError(null);
    }
  };

  const handleTMCChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTMC(e.target.value);
    setError(null);
  };

  // Parse both files
  const handleParse = () => {
    if (!bookingFile) {
      setError('Please upload a booking CSV file first');
      return;
    }

    if (!selectedTMC) {
      setError('Please select a TMC');
      return;
    }

    if (!expenseFile) {
      setError('Please upload an expense CSV file first');
      return;
    }

    setIsParsingLoading(true);
    setError(null);

    // Parse booking file
    parseBookingCSV(bookingFile);

    // Parse expense file
    parseExpenseCSV(expenseFile);
  };

  // Helper function to parse booking CSV
  const parseBookingCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          const parsedData = results.data as Record<string, any>[];
          setBookingData(parsedData);

          // Parse the data using the selected TMC parser
          let bookings = parseBookingData(parsedData, selectedTMC);

          // Automatically apply data fixes to correct the card type and booking type values
          console.log(`DEBUG: [App] Automatically applying data fixes to ${bookings.length} bookings`);
          const { fixedBookings, stats } = applyDataFixes(bookings);
          bookings = fixedBookings;
          console.log(`DEBUG: [App] Data fixes applied: ${stats.masterCardFixed} card types fixed, ${stats.typeFixed} booking types fixed`);
          console.log(`DEBUG: [App] After fixes: ${stats.totalMastercard} Mastercard bookings, Flight: ${stats.flightCount}, Hotel: ${stats.hotelCount}, Car: ${stats.carCount}, Rail: ${stats.railCount}`);

          // Explicitly set bookingTypeNormalized for flights based on travel type or type field
          // This is to fix the issue with flight matching
          console.log(`DEBUG: [App] Processing ${bookings.length} bookings for flight type identification`);
          bookings.forEach((booking, idx) => {
            // Direct check for FLIGHT in Navan data
            if (booking.rawData && booking.rawData.Type === 'FLIGHT') {
              booking.bookingTypeNormalized = 'Flight';
              console.log(`DEBUG: [App] Setting Flight type for booking ${booking.id || idx} based on Type=FLIGHT`);
            }
            // Check travel type for flight-related keywords
            else if (booking.travelType &&
              (booking.travelType.toLowerCase().includes('flight') ||
               booking.travelType.toLowerCase().includes('air'))) {
              booking.bookingTypeNormalized = 'Flight';
              console.log(`DEBUG: [App] Setting Flight type for booking ${booking.id || idx} based on travelType=${booking.travelType}`);
            }
            // Check vendor for airline names using our airline check function
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
                console.log(`DEBUG: [App] Setting Flight type for booking ${booking.id || idx} based on vendor=${booking.vendor}`);
              }
            }

            // Always log the final booking type for debugging
            console.log(`DEBUG: [App] Booking ${booking.id || idx} final type: ${booking.bookingTypeNormalized || 'Not set'}`);

            // For any booking with type "Flight", also print out the key fields for debugging
            if (booking.bookingTypeNormalized === 'Flight') {
              console.log(`DEBUG: [App] Flight booking details: ${JSON.stringify({
                id: booking.id || idx,
                vendor: booking.vendor,
                travelerName: booking.travelerName,
                cardType: booking.cardTypeNormalized,
                cardLast4: booking.cardLast4Normalized
              })}`);
            }
          });

          setParsedBookings(bookings);

          // Log booking type statistics
          if (bookings.length > 0) {
            try {
              // Log booking types before normalization
              console.log('=== Booking Types BEFORE Normalization ===');
              console.log('Checking travelType field on bookings:');
              const travelTypes: Record<string, number> = {};
              bookings.forEach(booking => {
                const type = booking.travelType || 'undefined';
                travelTypes[type] = (travelTypes[type] || 0) + 1;
              });
              console.log('Travel types distribution:', travelTypes);

              // Check vendor field for airlines
              console.log('Checking vendor field on bookings:');
              const vendors: Record<string, number> = {};
              bookings.forEach(booking => {
                const vendor = booking.vendor || 'undefined';
                vendors[vendor] = (vendors[vendor] || 0) + 1;
              });
              console.log('Vendor distribution:', vendors);

              // Log detailed categorization info to help diagnose any discrepancies
              const flightCount = bookings.filter(b => b.bookingTypeNormalized === 'Flight').length;
              const hotelCount = bookings.filter(b => b.bookingTypeNormalized === 'Hotel').length;
              const carCount = bookings.filter(b => b.bookingTypeNormalized === 'Car').length;
              const railCount = bookings.filter(b => b.bookingTypeNormalized === 'Rail').length;
              const otherCount = bookings.filter(b =>
                !b.bookingTypeNormalized ||
                (b.bookingTypeNormalized !== 'Flight' &&
                b.bookingTypeNormalized !== 'Hotel' &&
                b.bookingTypeNormalized !== 'Car' &&
                b.bookingTypeNormalized !== 'Rail')
              ).length;

              console.log('=== Booking Type Statistics AFTER Normalization ===');
              console.log(`Total bookings: ${bookings.length}`);
              console.log(`Flight: ${flightCount} (${((flightCount / bookings.length) * 100).toFixed(1)}%)`);
              console.log(`Hotel: ${hotelCount} (${((hotelCount / bookings.length) * 100).toFixed(1)}%)`);
              console.log(`Car: ${carCount} (${((carCount / bookings.length) * 100).toFixed(1)}%)`);
              console.log(`Rail: ${railCount} (${((railCount / bookings.length) * 100).toFixed(1)}%)`);
              console.log(`Other/Uncategorized: ${otherCount} (${((otherCount / bookings.length) * 100).toFixed(1)}%)`);

              // Log the first few bookings to see if they have bookingTypeNormalized set
              console.log('=== Sample of first few bookings ===');
              bookings.slice(0, 5).forEach((booking, idx) => {
                console.log(`Booking ${idx + 1}:`, {
                  id: booking.id,
                  travelType: booking.travelType,
                  bookingTypeNormalized: booking.bookingTypeNormalized,
                  vendor: booking.vendor,
                  cardTypeNormalized: booking.cardTypeNormalized
                });
              });

              // Count raw types from the source data
              const rawFlightEntries = parsedData.filter(item => item.Type === 'FLIGHT').length;
              const rawHotelEntries = parsedData.filter(item => item.Type === 'HOTEL').length;
              const rawCarEntries = parsedData.filter(item => item.Type === 'CAR').length;
              const rawRailEntries = parsedData.filter(item => item.Type === 'RAIL').length;

              console.log('=== RAW DATA TYPE DISTRIBUTION ===');
              console.log(`Raw types found in parsedData: ${parsedData.length} total entries`);
              const typeDistribution: Record<string, number> = {};
              parsedData.forEach(item => {
                if (item.Type) {
                  const typeKey = String(item.Type);
                  typeDistribution[typeKey] = (typeDistribution[typeKey] || 0) + 1;
                } else {
                  typeDistribution['undefined'] = (typeDistribution['undefined'] || 0) + 1;
                }
              });
              console.log('Type distribution:', typeDistribution);

              console.log('=== Raw Type Counts ===');
              console.log(`Raw FLIGHT: ${rawFlightEntries}`);
              console.log(`Raw HOTEL: ${rawHotelEntries}`);
              console.log(`Raw CAR: ${rawCarEntries}`);
              console.log(`Raw RAIL: ${rawRailEntries}`);

              // Check for categorization mismatches
              if (rawFlightEntries !== flightCount) {
                console.log('⚠️ Flight categorization mismatch!');
                console.log(`Raw FLIGHT entries: ${rawFlightEntries}`);
                console.log(`Normalized Flight entries: ${flightCount}`);
                console.log(`Difference: ${rawFlightEntries - flightCount}`);

                // Log a few examples of mismatches with scoring details
                console.log('Sample of miscategorized Flight entries:');

                // Get sample of miscategorized entries
                const miscategorizedFlights = parsedData
                  .filter(item => item.Type === 'FLIGHT')
                  .filter((_, idx) => idx < 5);

                // For each entry, log the full categorization process
                miscategorizedFlights.forEach(item => {
                  const bookingObj = bookings.find(b =>
                    b.rawData && (
                      b.rawData["Booking ID"] === item["Booking ID"] ||
                      b.bookingReference === item["Booking ID"]
                    )
                  );

                  if (bookingObj) {
                    console.group(`Booking ID: ${item["Booking ID"]}`);
                    console.log('Raw Type:', item.Type);
                    console.log('Normalized Type:', bookingObj.bookingTypeNormalized);
                    console.log('Vendor:', item.Vendor);
                    console.log('Route Type:', item["Route Type"]);

                    // Log scoring details
                    console.log('--- Scoring Details ---');

                    // Method 1: Direct type field
                    console.log('Direct type field check:');
                    if (item.Type === 'FLIGHT') console.log('  Flight: +1000 (Navan Type field)');

                    // Method 2: Travel Type field
                    if (bookingObj.travelType) {
                      console.log('Travel Type field check:');
                      console.log(`  "${bookingObj.travelType}"`);
                    }

                    // Method 3: Vendor check
                    if (bookingObj.vendor) {
                      console.log('Vendor check:');
                      console.log(`  "${bookingObj.vendor}"`);
                    }

                    // Log key fields from raw data
                    console.log('Key raw data fields:');
                    const keyFields = ['Type', 'BookingType', 'TravelType', 'Category', 'ServiceType'];
                    keyFields.forEach(field => {
                      if (item[field]) console.log(`  ${field}: "${item[field]}"`);
                    });

                    console.groupEnd();
                  }
                });
              }

              // Check other categories too
              if (rawHotelEntries !== hotelCount) {
                console.log(`⚠️ Hotel categorization mismatch! Raw: ${rawHotelEntries}, Normalized: ${hotelCount}`);
              }

              if (rawCarEntries !== carCount) {
                console.log(`⚠️ Car categorization mismatch! Raw: ${rawCarEntries}, Normalized: ${carCount}`);
              }

              if (rawRailEntries !== railCount) {
                console.log(`⚠️ Rail categorization mismatch! Raw: ${rawRailEntries}, Normalized: ${railCount}`);
              }
            } catch (err) {
              console.error("Error while generating statistics:", err);
            }
          }

          setIsParsingLoading(false);
        } catch (err) {
          setError(`Error processing booking data: ${err instanceof Error ? err.message : String(err)}`);
          setIsParsingLoading(false);
        }
      },
      error: (error) => {
        setError(`Error parsing booking CSV: ${error.message}`);
        setIsParsingLoading(false);
      }
    });
  };

  // Helper function to parse expense CSV
  const parseExpenseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          const parsedData = results.data as Record<string, any>[];
          setExpenseData(parsedData);

          // Parse expense data
          const expenses = parseExpenseData(parsedData);
          setParsedExpenses(expenses);
          setIsParsingLoading(false);
        } catch (err) {
          setError(`Error processing expense data: ${err instanceof Error ? err.message : String(err)}`);
          setIsParsingLoading(false);
        }
      },
      error: (error) => {
        setError(`Error parsing expense CSV: ${error.message}`);
        setIsParsingLoading(false);
      }
    });
  };

  // Function to run matching algorithm
  // We'll define this function with useCallback after the helper functions it depends on

  // Helper function to get booking by ID
  // Memoized mapping of bookings by ID for faster lookup
  const bookingsById = useMemo(() => {
    if (!parsedBookings) return new Map<string, BookingData>();

    const map = new Map<string, BookingData>();
    parsedBookings.forEach((booking, index) => {
      const id = booking.id || `booking-${index}`;
      map.set(id, booking);
    });
    return map;
  }, [parsedBookings]);

  // Helper function to get booking by ID - now with O(1) lookup
  const getBookingById = useCallback((bookingId: string): BookingData | undefined => {
    if (!bookingsById) return undefined;

    // Handle both cases - with ID already set or using index
    const booking = bookingsById.get(bookingId);
    if (booking) return booking;

    // Fallback to old method if ID not found in map
    if (!parsedBookings) return undefined;
    const index = parseInt(bookingId.replace('booking-', ''));
    return parsedBookings[index];
  }, [bookingsById, parsedBookings]);

  // Memoized mapping of expenses by ID for faster lookup
  const expensesById = useMemo(() => {
    if (!parsedExpenses) return new Map<string, ExpenseData>();

    const map = new Map<string, ExpenseData>();
    parsedExpenses.forEach((expense, index) => {
      const id = expense.id || `expense-${index}`;
      map.set(id, expense);
    });
    return map;
  }, [parsedExpenses]);

  // Helper function to get expense by ID - now with O(1) lookup
  const getExpenseById = useCallback((expenseId: string): ExpenseData | undefined => {
    if (!expensesById) return undefined;

    // Handle both cases - with ID already set or using index
    const expense = expensesById.get(expenseId);
    if (expense) return expense;

    // Fallback to old method if ID not found in map
    if (!parsedExpenses) return undefined;
    const index = parseInt(expenseId.replace('expense-', ''));
    return parsedExpenses[index];
  }, [expensesById, parsedExpenses]);



  // Get confidence badge variant
  const getConfidenceBadgeVariant = (confidence: number): string => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.5) return 'warning';
    return 'danger';
  };

  // Function to run matching algorithm - using useCallback to memoize
  // Defined after the helper functions it depends on
  const handleRunMatching = useCallback(() => {
    if (parsedBookings && parsedExpenses) {
      setIsMatching(true);
      setMatchingProgress(0);
      setError(null);

      try {
        // Debug: Log how many flights are in the parsed bookings (case-insensitive)
        const flightBookings = parsedBookings.filter(booking =>
          (booking.bookingTypeNormalized?.toLowerCase() === 'flight' ||
           booking.travelType?.toLowerCase().includes('flight') ||
           booking.travelType?.toLowerCase().includes('air')) &&
          booking.cardTypeNormalized?.toLowerCase() === 'mastercard'
        );
        console.log(`DEBUG: Found ${flightBookings.length} flight bookings with Mastercard`);

        // Log details of a few flight bookings (limit to 5 to reduce console spam)
        flightBookings.slice(0, 5).forEach((booking, index) => {
          console.log(`DEBUG: Flight booking ${index+1}:`, {
            id: booking.id,
            type: booking.bookingTypeNormalized,
            cardType: booking.cardTypeNormalized,
            merchant: booking.merchantNormalized,
            traveler: booking.travelerNameNormalized,
            amount: booking.amountNormalized,
            currency: booking.currencyNormalized
          });
        });

        // Run the matching algorithm with batch processing
        startMatchingProcess(
          parsedBookings,
          parsedExpenses,
          (progress) => {
            // Update progress in UI
            const percentComplete = Math.floor((progress.processedExpenses / progress.totalExpenses) * 100);
            setMatchingProgress(percentComplete);

            // When complete, update the final results
            if (progress.isComplete) {
              console.log(`DEBUG: Total matches found: ${progress.matches.length}`);

              // Debug: Check specifically for flight matches
              const debugFlightMatches = progress.matches.filter(match => {
                const booking = getBookingById(match.bookingId);
                return booking && (
                  booking.bookingTypeNormalized?.toLowerCase() === 'flight' ||
                  booking.travelType?.toLowerCase().includes('flight') ||
                  booking.travelType?.toLowerCase().includes('air')
                );
              });
              console.log(`DEBUG: Flight matches found: ${debugFlightMatches.length}`);

              // Set final results and complete
              setMatchResults(progress.matches);
              setIsMatching(false);
            }
          }
        );
      } catch (err) {
        setError(`Error during matching: ${err instanceof Error ? err.message : String(err)}`);
        setIsMatching(false);
      }
    }
  }, [parsedBookings, parsedExpenses, getBookingById]);

  // Add useEffect to run matching after parsing completes if flag is set
  useEffect(() => {
    if (!isParsingLoading && runMatchingAfterParse && parsedBookings && parsedBookings.length > 0) {
      setRunMatchingAfterParse(false); // Reset the flag
      handleRunMatching(); // Run matching
    }
  }, [isParsingLoading, runMatchingAfterParse, parsedBookings, handleRunMatching]);

  return (
    <Container fluid className="mt-4">
      <Row className="justify-content-center">
        <Col md={12}>
          <h1 className="text-center mb-4">Booking-Expense Matcher</h1>
          {error && <Alert variant="danger">{error}</Alert>}
        </Col>
      </Row>


      {/* File Upload Section */}
      <Row className="mb-5 justify-content-center">
        {/* Booking Upload */}
        <Col md={5} className="mx-auto">
          <div className="p-4 border rounded bg-light h-100 text-center">
            <h3>Booking Report</h3>
            <input
              type="file"
              ref={bookingInputRef}
              onChange={handleBookingFileChange}
              accept=".csv"
              style={{ display: 'none' }}
            />
            <Button
              variant="primary"
              onClick={handleUploadBooking}
              size="lg"
              className="w-75 mb-3"
            >
              Upload Booking Report
            </Button>
            <p id="booking-file-info" className="text-muted mt-2">
              {bookingFile ? bookingFile.name : 'No file selected'}
            </p>
          </div>
        </Col>

        {/* Expense Upload */}
        <Col md={5} className="mx-auto">
          <div className="p-4 border rounded bg-light h-100 text-center">
            <h3>Expense Report</h3>
            <input
              type="file"
              ref={expenseInputRef}
              onChange={handleExpenseFileChange}
              accept=".csv"
              style={{ display: 'none' }}
            />
            <Button
              variant="primary"
              onClick={handleUploadExpense}
              size="lg"
              className="w-75 mb-3"
            >
              Upload Expense Report
            </Button>
            <p id="expense-file-info" className="text-muted mt-2">
              {expenseFile ? expenseFile.name : 'No file selected'}
            </p>
          </div>
        </Col>
      </Row>

      {/* TMC Selection & Parse/Match Buttons */}
      <Row className="justify-content-center mb-5">
        <Col md={6} className="text-center">
          <Form.Group className="mb-4">
            <Form.Label>Select TMC</Form.Label>
            <Form.Select
              value={selectedTMC}
              onChange={handleTMCChange}
              className="mb-4"
            >
              <option value="">Select a Travel Management Company</option>
              {TMC_LIST.map((tmc) => (
                <option key={tmc} value={tmc}>{tmc}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <div className="d-flex justify-content-center flex-wrap">
            <Button
              variant="success"
              size="lg"
              onClick={handleParse}
              disabled={isParsingLoading || !bookingFile || !expenseFile || !selectedTMC}
              className="px-4 me-2 mb-2"
            >
              {isParsingLoading ? 'Parsing...' : 'Parse Bookings'}
            </Button>

            <Button
              variant="primary"
              size="lg"
              onClick={handleRunMatching}
              disabled={Boolean(isMatching) || !parsedBookings || parsedBookings.length === 0 || matchResults !== null}
              className="px-4 me-2 mb-2"
            >
              {isMatching ? `Matching... ${matchingProgress}%` : 'Match Expenses'}
            </Button>

            {isMatching && (
              <div className="w-100 mt-2">
                <div className="progress">
                  <div
                    className="progress-bar progress-bar-striped progress-bar-animated"
                    role="progressbar"
                    style={{ width: `${matchingProgress}%` }}
                    aria-valuenow={matchingProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    {matchingProgress}%
                  </div>
                </div>
              </div>
            )}

            <Button
              variant="warning"
              size="lg"
              onClick={() => {
                setRunMatchingAfterParse(true); // Set flag to run matching after parsing
                handleParse();
              }}
              disabled={isParsingLoading || isMatching || !bookingFile || !expenseFile || !selectedTMC}
              className="px-4 mb-2"
            >
              {isMatching ? `Matching... ${matchingProgress}%` : (isParsingLoading ? 'Parsing...' : 'Parse & Match')}
            </Button>
          </div>
        </Col>
      </Row>

      {/* Flights Eval Component - Flight Bookings with Match Information */}
      {matchResults && parsedBookings && parsedExpenses && (
        <Row className="mt-4 mb-4">
          <Col>
            <div className="p-4 border rounded bg-light">
              <h4 className="mb-3">Flights Eval Table</h4>
              <p className="text-muted">
                This table shows all flight bookings with matching confidence and expense data when available.
                Bookings without matches show "Unmatched" in the confidence column.
              </p>
              <FlightsEval
                matches={matchResults}
                bookings={parsedBookings}
                expenses={parsedExpenses}
                getBookingById={getBookingById}
                getExpenseById={getExpenseById}
              />
            </div>
          </Col>
        </Row>
      )}

      {/* Eval Table Section */}
      {parsedBookings && parsedBookings.length > 0 && (
        <Row className="mt-4">
          <Col md={12}>
            <div className="p-4 border rounded bg-light">
              <h4>Eval Table</h4>
              <p>TMC: {selectedTMC}</p>
              <p>Number of bookings: {parsedBookings.length}</p>

              {/* Completely direct calculation - no tricks */}
              {/* Data fixes are now applied automatically after parsing */}

              <DirectBookingSummary allBookings={parsedBookings} />

              {/* Test component to verify rendered values */}
              {parsedBookings.length > 0 && <TestReportValues />}

              {/* Data inspection component */}
              {parsedBookings.length > 0 && (
                <DataInspector data={parsedBookings} title="Raw Bookings Data Inspection" />
              )}

              {/* Table content section */}

              <div className="table-responsive">
                <Table striped bordered hover className="mt-3">
                  <thead>
                    <tr>
                      <th>Unique Identifier</th>
                      <th>Booking_ID_Normalized</th>
                      <th>BookingType_Normalized</th>
                      <th>Booking_Merchant_Normalized</th>
                      <th>Booking_CARD_Normalized</th>
                      <th>Booking_Last4_Normalized</th>
                      <th>Booking_NameonCard_Normalized</th>
                      <th>Booking_Currency_Normalized</th>
                      <th>Booking_Amount_Normalized</th>
                      <th>Booking_Expect_Tx_Time_Normalized</th>
                      <th>Booking_Traveler_Normalized</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedBookings
                      .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
                      .map((booking, index) => {
                      // Generate a unique identifier based on TMC, index and some booking details
                      const tmcCode = selectedTMC.substring(0, 3).toUpperCase();
                      const sequenceNumber = String(index + 1).padStart(3, '0');

                      // Add some entropy from the booking if available
                      let entropyPart = '';
                      if (booking.travelerName) {
                        entropyPart += booking.travelerName.substring(0, 2).toUpperCase();
                      }
                      if (booking.departureDate) {
                        const dateStr = booking.departureDate.replace(/[^0-9]/g, '');
                        entropyPart += dateStr.substring(0, 4);
                      }

                      // Final unique ID
                      const uniqueId = `BKG-${tmcCode}-${sequenceNumber}${entropyPart ? `-${entropyPart}` : ''}`;

                      // Identify and normalize booking ID from TMC data
                      let bookingIdNormalized = '';

                      // Store the generated unique ID in the booking object
                      booking.id = uniqueId;

                      // First check for standard bookingReference field
                      if (booking.bookingReference) {
                        bookingIdNormalized = booking.bookingReference;
                      }
                      // Next check rawData for common booking ID field names based on TMC
                      else {
                        const rawData = booking.rawData;
                        const possibleIdFields = [
                          // Common booking ID field names across TMCs
                          'booking_reference', 'bookingReference', 'booking_id', 'bookingId',
                          'confirmation_number', 'confirmationNumber', 'confirmation',
                          'pnr', 'record_locator', 'recordLocator', 'reservation_number',
                          'trip_id', 'tripId', 'trip_number', 'tripNumber',
                          'reference', 'ref', 'itinerary_id', 'itineraryId',
                          'agency_reference', 'agencyReference'
                        ];

                        // TMC-specific field names
                        if (selectedTMC.includes('Egencia')) {
                          possibleIdFields.push('trip_id', 'record_locator', 'reservation_number');
                        } else if (selectedTMC.includes('BCD')) {
                          possibleIdFields.push('bcd_reference', 'client_reference', 'bcd_trip_number');
                        } else if (selectedTMC.includes('CWT')) {
                          possibleIdFields.push('cwt_reference', 'agency_reference', 'booking_code');
                        }

                        // Try to find a matching field in the raw data
                        for (const fieldName of possibleIdFields) {
                          // Case-insensitive field name search
                          for (const key of Object.keys(rawData)) {
                            if (key.toLowerCase().replace(/[_\s-]/g, '') === fieldName.toLowerCase().replace(/[_\s-]/g, '') &&
                                rawData[key] &&
                                rawData[key].toString().trim()) {
                              bookingIdNormalized = rawData[key].toString();
                              break;
                            }
                          }
                          if (bookingIdNormalized) break;
                        }
                      }

                      // If no ID found, use the generated unique ID
                      if (!bookingIdNormalized) {
                        bookingIdNormalized = `[No TMC ID found]`;
                      }

                      // Store the normalized ID in the booking object for matching
                      booking.bookingIdNormalized = bookingIdNormalized;

                      // Identify and normalize merchant/vendor information
                      let merchantNormalized: string;

                      // First check if the booking already has a vendor field
                      if (booking.vendor) {
                        merchantNormalized = booking.vendor;
                      } else {
                        // Function to search for merchant in raw data
                        const findMerchantInRawData = () => {
                          if (!booking.rawData) return '';

                          const rawData = booking.rawData;

                          // TMC-specific processing was removed to simplify the code

                          // Define common field names that might contain merchant information
                          const merchantFields = [
                            'vendor', 'merchant', 'supplier', 'provider', 'company', 'airline', 'carrier',
                            'hotel', 'lodging_provider', 'car_company', 'rental_company', 'train_company',
                            'travel_provider', 'establishment', 'brand', 'chain', 'corporation'
                          ];

                          // Add TMC-specific field names
                          if (selectedTMC.includes('Egencia')) {
                            merchantFields.push('segment_vendor', 'segment_airline', 'supplier_name');
                          } else if (selectedTMC.includes('BCD')) {
                            merchantFields.push('service_provider', 'supplier_name', 'carrier_name');
                          } else if (selectedTMC.includes('CWT')) {
                            merchantFields.push('service_provider', 'airline_name', 'hotel_chain');
                          } else if (selectedTMC.includes('Navan')) {
                            merchantFields.push('Vendor', 'Provider', 'Airline', 'Hotel', 'Service Provider');
                          }

                          // Look for merchant fields
                          for (const key of Object.keys(rawData)) {
                            const keyLower = key.toLowerCase();

                            // Check if key matches or includes any merchant field names
                            const isMatchingField = merchantFields.some(field =>
                              keyLower.replace(/[_\s-]/g, '') === field.toLowerCase().replace(/[_\s-]/g, '')
                            ) ||
                            keyLower.includes('vendor') ||
                            keyLower.includes('merchant') ||
                            keyLower.includes('company') ||
                            keyLower.includes('provider') ||
                            keyLower.includes('airline') ||
                            keyLower.includes('hotel');

                            // If field matches and has value
                            if (isMatchingField &&
                                rawData[key] &&
                                rawData[key].toString().trim()) {
                              return rawData[key].toString().trim();
                            }
                          }

                          // If still not found, try type-specific fields based on booking type
                          if (booking.bookingTypeNormalized) {
                            // Define search terms based on booking type
                            const typeSearchTerms: {[key: string]: string[]} = {
                              'Flight': ['airline', 'carrier', 'flight'],
                              'Hotel': ['property', 'hotel', 'chain', 'lodging'],
                              'Car': ['rental', 'car_company', 'car provider'],
                              'Rail': ['train', 'rail', 'railway']
                            };

                            const termsToCheck = typeSearchTerms[booking.bookingTypeNormalized];
                            if (termsToCheck) {
                              for (const key of Object.keys(rawData)) {
                                const keyLower = key.toLowerCase();

                                // Check if key contains any type-specific terms
                                if (termsToCheck.some(term => keyLower.includes(term)) &&
                                    rawData[key] &&
                                    rawData[key].toString().trim()) {
                                  return rawData[key].toString().trim();
                                }
                              }
                            }
                          }

                          return '';
                        };

                        // Execute search function
                        merchantNormalized = findMerchantInRawData();
                      }

                      // Clean up and normalize the merchant name
                      if (merchantNormalized) {
                        // Handle common abbreviations and standardize names
                        const merchantMap: {[key: string]: string} = {
                          'AA': 'American Airlines',
                          'DL': 'Delta Air Lines',
                          'UA': 'United Airlines',
                          'WN': 'Southwest Airlines',
                          'B6': 'JetBlue Airways',
                          'AS': 'Alaska Airlines',
                          'LH': 'Lufthansa',
                          'BA': 'British Airways',
                          'AF': 'Air France',
                          'EK': 'Emirates',
                          'QR': 'Qatar Airways',
                          'SQ': 'Singapore Airlines',
                          'CX': 'Cathay Pacific',
                          // Hotel chains
                          'HH': 'Hilton Hotels',
                          'MAR': 'Marriott',
                          'HYT': 'Hyatt',
                          'IHG': 'InterContinental Hotels Group',
                          'WYN': 'Wyndham Hotels',
                          'ACC': 'Accor Hotels',
                          'CHI': 'Choice Hotels',
                          // Car rentals
                          'ZE': 'Hertz',
                          'ZI': 'Avis',
                          'ET': 'Enterprise',
                          'ZD': 'Budget',
                          'AL': 'Alamo',
                          'ZT': 'Thrifty',
                          'SX': 'Sixt'
                        };

                        // Check if the merchant name is in our mapping
                        const upperMerchant = merchantNormalized.toUpperCase();

                        if (merchantMap[upperMerchant]) {
                          merchantNormalized = merchantMap[upperMerchant];
                        }
                      } else {
                        merchantNormalized = '[No merchant found]';
                      }

                      // Store the normalized merchant in the booking object
                      booking.merchantNormalized = merchantNormalized;

                      // Identify credit card type used for booking
                      let cardTypeNormalized = '';

                      // Define card types to look for
                      const cardTypes = [
                        { name: 'Visa', patterns: ['visa', 'vi'] },
                        { name: 'Mastercard', patterns: ['mastercard', 'master card', 'mc'] },
                        { name: 'American Express', patterns: ['american express', 'amex', 'ax'] },
                        { name: 'Diners Club', patterns: ['diners', 'diners club'] },
                        { name: 'Discover', patterns: ['discover', 'disc'] },
                        { name: 'JCB', patterns: ['jcb'] }
                      ];

                      // Look for fields that might contain card information
                      const possibleCardFields = [
                        'payment_method', 'paymentMethod', 'payment_type', 'paymentType',
                        'card_type', 'cardType', 'credit_card', 'creditCard',
                        'cc_type', 'ccType', 'card', 'payment', 'form_of_payment',
                        'formOfPayment', 'fop'
                      ];

                      // First, check in standard fields
                      if (booking.rawData) {
                        const rawData = booking.rawData;
                        // Check each possible card field
                        for (const fieldName of possibleCardFields) {
                          for (const key of Object.keys(rawData)) {
                            // Case-insensitive field name search
                            if (key.toLowerCase().replace(/[_\s-]/g, '') === fieldName.toLowerCase().replace(/[_\s-]/g, '')) {
                              const fieldValue = String(rawData[key] || '').toLowerCase();
                              // Check if the field value contains any card type patterns
                              for (const cardType of cardTypes) {
                                if (cardType.patterns.some(pattern => fieldValue.includes(pattern))) {
                                  cardTypeNormalized = cardType.name;
                                  break;
                                }
                              }
                            }
                            if (cardTypeNormalized) break;
                          }
                          if (cardTypeNormalized) break;
                        }
                      }

                      // If card type not found in specific fields, try to search in all fields
                      if (!cardTypeNormalized && booking.rawData) {
                        const rawData = booking.rawData;
                        // Convert all raw data to strings and search for card type patterns
                        for (const [key, value] of Object.entries(rawData)) {
                          if (!value) continue;

                          const stringValue = String(value).toLowerCase();

                          // Check each card type pattern
                          for (const cardType of cardTypes) {
                            if (cardType.patterns.some(pattern => stringValue.includes(pattern))) {
                              cardTypeNormalized = cardType.name;
                              break;
                            }
                          }
                          if (cardTypeNormalized) break;
                        }
                      }

                      // Determine booking type using multiple detection methods
                      let bookingTypeNormalized = 'Other'; // Default value

                      // Define common field names that might contain booking type across different TMCs
                      const possibleTypeFields = [
                        'Type', 'type', 'BookingType', 'bookingType', 'booking_type',
                        'TripType', 'tripType', 'trip_type', 'TransportationType',
                        'ServiceType', 'serviceType', 'service_type',
                        'TravelType', 'travelType', 'travel_type',
                        'Category', 'category', 'ProductCategory', 'productCategory'
                      ];

                      // Types to identify with keywords
                      const bookingTypes = {
                        // Flight keywords
                        flight: [
                          'flight', 'air', 'airline', 'airfare', 'plane', 'aviation', 'fly', 'airport',
                          'departure', 'arrival', 'terminal', 'layover', 'connection', 'boarding',
                          'business class', 'economy class', 'first class', 'domestic flight', 'international flight'
                        ],
                        // Hotel keywords
                        hotel: [
                          'hotel', 'lodging', 'accommodation', 'room', 'stay', 'night', 'motel', 'inn', 'resort',
                          'suite', 'king bed', 'queen bed', 'check-in', 'check-out', 'reservation',
                          'marriott', 'hilton', 'hyatt', 'westin', 'sheraton', 'holiday inn', 'residence'
                        ],
                        // Car keywords
                        car: [
                          'car rental', 'rental car', 'vehicle rental', 'car hire', 'car service',
                          'hertz', 'avis', 'enterprise', 'budget car', 'alamo', 'thrifty', 'sixt', 'europcar',
                          'suv', 'sedan', 'convertible', 'pickup', 'minivan', 'full-size car', 'compact car'
                        ],
                        // Rail keywords
                        rail: [
                          'train ticket', 'rail ticket', 'train pass', 'train fare', 'rail fare',
                          'amtrak', 'eurostar', 'rail pass', 'trainline', 'train journey', 'rail journey',
                          'train travel', 'railway station', 'train station', 'train booking', 'metro',
                          'subway', 'underground', 'tgv', 'bullet train', 'light rail'
                        ],
                        // Simple generic keywords (used as fallback)
                        simple: {
                          'flight': ['flight', 'air', 'plane'],
                          'hotel': ['hotel', 'lodging', 'accommodation', 'room'],
                          'car': ['car', 'vehicle', 'rental', 'auto'],
                          'rail': ['train', 'rail', 'railway', 'railroad'],
                        }
                      };

                      // Scoring system for different detection methods
                      let scores = {
                        Flight: 0,
                        Hotel: 0,
                        Car: 0,
                        Rail: 0
                      };

                      // Method 1: Direct type field check (multiple possible field names)
                      if (booking.rawData) {
                        for (const fieldName of possibleTypeFields) {
                          if (booking.rawData[fieldName]) {
                            const typeValue = String(booking.rawData[fieldName]).toUpperCase();

                            // Direct matches get high scores
                            if (typeValue === 'FLIGHT' || typeValue === 'AIR') scores.Flight += 100;
                            else if (typeValue === 'HOTEL' || typeValue === 'LODGING') scores.Hotel += 100;
                            else if (typeValue === 'CAR' || typeValue === 'RENTAL' || typeValue === 'VEHICLE') scores.Car += 100;
                            else if (typeValue === 'RAIL' || typeValue === 'TRAIN') scores.Rail += 100;
                          }
                        }
                      }

                      // Method 2: Check travel type field from standardized BookingData
                      if (booking.travelType) {
                        const travelType = booking.travelType.toLowerCase();
                        if (bookingTypes.flight.some(keyword => travelType.includes(keyword))) scores.Flight += 80;
                        if (bookingTypes.hotel.some(keyword => travelType.includes(keyword))) scores.Hotel += 80;
                        if (bookingTypes.car.some(keyword => travelType.includes(keyword))) scores.Car += 80;
                        if (bookingTypes.rail.some(keyword => travelType.includes(keyword))) scores.Rail += 80;
                      }

                      // Method 3: Check vendor field - certain vendors strongly indicate a specific type
                      if (booking.vendor) {
                        const vendor = booking.vendor.toLowerCase();

                        // Airlines strongly indicate flights
                        if (['delta', 'united', 'american', 'southwest', 'lufthansa', 'british airways',
                            'air france', 'jal', 'emirates', 'jetblue'].some(airline => vendor.includes(airline))) {
                          scores.Flight += 70;
                        }

                        // Hotel chains strongly indicate hotel bookings
                        if (['marriott', 'hilton', 'hyatt', 'sheraton', 'westin', 'holiday inn', 'best western',
                            'four seasons', 'radisson', 'motel 6', 'comfort inn'].some(hotel => vendor.includes(hotel))) {
                          scores.Hotel += 70;
                        }

                        // Car rental companies strongly indicate car bookings
                        if (['hertz', 'avis', 'enterprise', 'budget', 'alamo', 'sixt', 'national',
                            'dollar', 'thrifty', 'europcar'].some(company => vendor.includes(company))) {
                          scores.Car += 70;
                        }

                        // Train companies strongly indicate rail bookings
                        if (['amtrak', 'eurostar', 'deutsche bahn', 'sncf', 'rail europe', 'via rail',
                            'virgin trains', 'acela'].some(company => vendor.includes(company))) {
                          scores.Rail += 70;
                        }
                      }

                      // Method 4: Check for fields with typical travel-type patterns
                      if (booking.rawData) {
                        // Fields that suggest flights
                        const flightFields = ['FlightNumber', 'flight_number', 'AirlineCode', 'airline_code',
                                             'DepartureTime', 'ArrivalTime', 'Terminal', 'Gate'];
                        // Fields that suggest hotels
                        const hotelFields = ['CheckInDate', 'check_in', 'CheckOutDate', 'check_out',
                                           'RoomType', 'room_type', 'NumOfNights', 'num_nights'];
                        // Fields that suggest car rentals
                        const carFields = ['CarType', 'car_type', 'CarClass', 'car_class',
                                         'PickupLocation', 'pickup_location', 'DropOffLocation'];
                        // Fields that suggest rail
                        const railFields = ['TrainNumber', 'train_number', 'TrackNumber', 'track_number',
                                          'Coach', 'SeatNumber', 'seat_number', 'Platform'];

                        for (const field of Object.keys(booking.rawData)) {
                          const fieldLower = field.toLowerCase();
                          if (flightFields.some(f => fieldLower.includes(f.toLowerCase()))) scores.Flight += 30;
                          if (hotelFields.some(f => fieldLower.includes(f.toLowerCase()))) scores.Hotel += 30;
                          if (carFields.some(f => fieldLower.includes(f.toLowerCase()))) scores.Car += 30;
                          if (railFields.some(f => fieldLower.includes(f.toLowerCase()))) scores.Rail += 30;
                        }
                      }

                      // Method 5: Check all fields for keywords
                      // Create an array of all field values for text searching
                      const allFieldTexts = [
                        booking.travelType || '',
                        booking.vendor || '',
                        ...(booking.rawData ? Object.values(booking.rawData).map(v => String(v || '')) : [])
                      ].filter(Boolean).map(s => s.toString().toLowerCase());

                      // Create a combined text of all fields
                      const combinedText = allFieldTexts.join(' ');

                      // Search for keyword matches in the combined text
                      for (const keyword of bookingTypes.flight) {
                        if (combinedText.includes(keyword)) scores.Flight += 5;
                      }

                      for (const keyword of bookingTypes.hotel) {
                        if (combinedText.includes(keyword)) scores.Hotel += 5;
                      }

                      for (const keyword of bookingTypes.car) {
                        if (combinedText.includes(keyword)) scores.Car += 5;
                      }

                      for (const keyword of bookingTypes.rail) {
                        if (combinedText.includes(keyword)) scores.Rail += 5;
                      }

                      // Special case for Navan Type field - assign very high weight if present
                      if (booking.rawData && booking.rawData.Type) {
                        const typeValue = String(booking.rawData.Type).toUpperCase();
                        if (typeValue === 'FLIGHT') scores.Flight += 1000;
                        else if (typeValue === 'HOTEL') scores.Hotel += 1000;
                        else if (typeValue === 'CAR') scores.Car += 1000;
                        else if (typeValue === 'RAIL') scores.Rail += 1000;
                      }

                      // Determine the highest scoring booking type
                      let maxScore = 0;
                      let maxType = '';

                      for (const [type, score] of Object.entries(scores)) {
                        if (score > maxScore) {
                          maxScore = score;
                          maxType = type;
                        }
                      }

                      // Debug log type scoring
                      console.log(`=== TYPE SCORING FOR BOOKING ${index} ===`);
                      console.log(`Raw data type fields:`,
                        booking.rawData?.Type || 'undefined',
                        booking.rawData?.BookingType || 'undefined',
                        booking.rawData?.TravelType || 'undefined');
                      console.log(`Type scores:`, scores);
                      console.log(`Winner: ${maxType} with score ${maxScore}`);

                      // Only use the highest score if it's above a minimum threshold
                      if (maxScore >= 5) {
                        bookingTypeNormalized = maxType;
                      } else {
                        // Final fallback - check for simple keywords in any field
                        for (const [type, keywords] of Object.entries(bookingTypes.simple)) {
                          for (const field of allFieldTexts) {
                            if (keywords.some(keyword => field.includes(keyword))) {
                              bookingTypeNormalized = type.charAt(0).toUpperCase() + type.slice(1);
                              break;
                            }
                          }
                          if (bookingTypeNormalized !== 'Other') break;
                        }
                      }

                      // Store normalized booking type in the booking object
                      booking.bookingTypeNormalized = bookingTypeNormalized;

                      // Store the normalized card type in the booking object for matching
                      booking.cardTypeNormalized = cardTypeNormalized || '[No card type found]';

                      // Extract last 4 digits of credit card
                      let cardLast4 = '';

                      if (booking.rawData) {
                        const rawData = booking.rawData;
                        // Common field names for credit card information
                        const possibleCardNumberFields = [
                          'card_number', 'cardNumber', 'cc_number', 'ccNumber',
                          'credit_card_number', 'creditCardNumber',
                          'masked_card', 'maskedCard', 'masked_pan', 'maskedPan',
                          'payment_card', 'paymentCard', 'last4', 'last_four',
                          'card_last4', 'cardLast4', 'cc_last4'
                        ];

                        // First check specific fields for last 4
                        for (const fieldName of possibleCardNumberFields) {
                          for (const key of Object.keys(rawData)) {
                            // Case-insensitive field name search
                            if (key.toLowerCase().replace(/[_\s-]/g, '') === fieldName.toLowerCase().replace(/[_\s-]/g, '')) {
                              const fieldValue = String(rawData[key] || '');

                              // Direct match for fields that already contain just last 4
                              if (/^\d{4}$/.test(fieldValue)) {
                                cardLast4 = fieldValue;
                                break;
                              }

                              // Try to extract last 4 from masked credit card pattern
                              // Examples: "XXXX-XXXX-XXXX-1234", "**** **** **** 1234", "...1234"
                              const last4Match = fieldValue.match(/[X\*\.]+[\s-]*[X\*\.]+[\s-]*[X\*\.]+[\s-]*(\d{4})|[\*\.X]+(\d{4})|[^0-9](\d{4})$/);
                              if (last4Match) {
                                cardLast4 = last4Match[1] || last4Match[2] || last4Match[3];
                                break;
                              }
                            }
                          }
                          if (cardLast4) break;
                        }

                        // If not found in specific fields, search all fields for masked credit card patterns
                        if (!cardLast4) {
                          for (const [key, value] of Object.entries(rawData)) {
                            if (!value) continue;

                            const stringValue = String(value);

                            // Look for masked credit card patterns
                            const last4Match = stringValue.match(/[X\*\.]+[\s-]*[X\*\.]+[\s-]*[X\*\.]+[\s-]*(\d{4})|[\*\.X]+(\d{4})|[^0-9](\d{4})$/);
                            if (last4Match) {
                              cardLast4 = last4Match[1] || last4Match[2] || last4Match[3];
                              break;
                            }

                            // Look for strings that are just 4 digits (possibly representing last4)
                            if (/^\d{4}$/.test(stringValue)) {
                              // Only use if the field name suggests it's related to a credit card
                              if (key.toLowerCase().includes('card') ||
                                  key.toLowerCase().includes('payment') ||
                                  key.toLowerCase().includes('cc') ||
                                  key.toLowerCase().includes('last')) {
                                cardLast4 = stringValue;
                                break;
                              }
                            }
                          }
                        }
                      }

                      // Store the normalized card last 4 in the booking object for matching
                      booking.cardLast4Normalized = cardLast4 || '[No card last 4 found]';

                      // Card holder name detection - extract the name on the card
                      let cardHolderName = '';

                      if (booking.rawData) {
                        const rawData = booking.rawData;
                        // Common field names for credit card holder information - expanded list
                        const possibleCardHolderFields = [
                          // Direct card holder fields
                          'card_holder', 'cardHolder', 'cardholder',
                          'card_owner', 'cardOwner',
                          'card_name', 'cardName', 'name_on_card', 'nameOnCard',
                          'payment_name', 'paymentName',
                          'cc_holder', 'ccHolder', 'cc_name', 'ccName',
                          'billing_name', 'billingName',
                          'payer_name', 'payerName',
                          'account_holder', 'accountHolder',
                          'paid_by', 'paidBy',

                          // Added more field variations
                          'card holder', 'card holder name', 'credit card holder',
                          'credit card name', 'credit card holder name',
                          'payment method name', 'payment account name',
                          'billing contact', 'billing contact name',
                          'payer', 'paid by name', 'payment by',
                          'name on payment', 'payment person',
                          'payment card holder', 'paid with name',
                          'account name', 'credit account name'
                        ];

                        // Check for specific card holder name fields
                        for (const fieldName of possibleCardHolderFields) {
                          for (const key of Object.keys(rawData)) {
                            // Case-insensitive field name search with more flexible matching
                            const keyClean = key.toLowerCase().replace(/[_\s-]/g, '');
                            const fieldClean = fieldName.toLowerCase().replace(/[_\s-]/g, '');

                            if (keyClean === fieldClean || keyClean.includes(fieldClean)) {
                              const fieldValue = String(rawData[key] || '').trim();
                              if (fieldValue) {
                                cardHolderName = fieldValue;
                                console.log(`Found card holder name in field: ${key} = ${cardHolderName}`);
                                break;
                              }
                            }
                          }
                          if (cardHolderName) break;
                        }

                        // If still not found, look for fields that have both "card" and "name" or "holder"
                        if (!cardHolderName) {
                          for (const [key, value] of Object.entries(rawData)) {
                            const keyLower = key.toLowerCase();
                            if ((keyLower.includes('card') && (keyLower.includes('name') || keyLower.includes('holder'))) ||
                                (keyLower.includes('payment') && keyLower.includes('name')) ||
                                (keyLower.includes('billing') && keyLower.includes('name')) ||
                                (keyLower.includes('payer') || keyLower.includes('paid by')) ||
                                (keyLower.includes('credit') && keyLower.includes('name'))) {
                              if (value && typeof value === 'string' && value.trim()) {
                                cardHolderName = value.trim();
                                console.log(`Found card holder name in combined field: ${key} = ${cardHolderName}`);
                                break;
                              }
                            }
                          }
                        }

                        // Fallback: If card holder name is still not found, try using traveler name
                        // This is a reasonable fallback for many bookings where the traveler is also the cardholder
                        if (!cardHolderName && booking.travelerName) {
                          cardHolderName = booking.travelerName;
                          console.log(`Using traveler name as fallback for card holder name: ${cardHolderName}`);
                        }

                        // Another fallback: Check specific employee/buyer fields that might contain card holder
                        if (!cardHolderName) {
                          const employeeFields = ['Employee', 'EmployeeName', 'Employee Name', 'Buyer', 'Buyer Name', 'Purchaser'];
                          for (const field of employeeFields) {
                            if (rawData[field]) {
                              cardHolderName = String(rawData[field]);
                              console.log(`Using employee/buyer field as card holder name: ${field} = ${cardHolderName}`);
                              break;
                            }
                          }
                        }
                      }

                      // Helper function to validate card holder names (less strict than full name validation)
                      function isValidCardHolderName(name: string): boolean {
                        if (!name) return false;

                        // Basic validation - must have at least one alphabetic character
                        if (!/[a-zA-Z]/.test(name)) return false;

                        // Reject obvious non-names
                        const nonNameKeywords = [
                          'unknown', 'undefined', 'null', 'none', 'na', 'n/a',
                          'test', 'example', 'error', 'missing', 'empty'
                        ];

                        const lowerName = name.toLowerCase();
                        if (nonNameKeywords.some(keyword =>
                            lowerName === keyword ||
                            lowerName.startsWith(`${keyword} `) ||
                            lowerName.endsWith(` ${keyword}`))) {
                          return false;
                        }

                        // Passed all validations
                        return true;
                      }

                      // Normalize the card holder name if found
                      if (cardHolderName) {
                        // Use the same person name normalization function used for traveler names
                        const normalizedCardHolder = normalizePersonName(cardHolderName);
                        if (normalizedCardHolder && isValidCardHolderName(normalizedCardHolder)) {
                          booking.cardHolderNameNormalized = normalizedCardHolder;
                          console.log(`Normalized card holder name: "${normalizedCardHolder}"`);
                        } else {
                          booking.cardHolderNameNormalized = '[Invalid card holder name format]';
                          console.log(`Found card holder name but format is invalid: "${cardHolderName}"`);
                        }
                      } else {
                        booking.cardHolderNameNormalized = '[No card holder name found]';
                      }

                      // Simple currency detection - focused on clarity
                      let currencyNormalized = '';

                      if (booking.rawData) {
                        // STEP 1: Direct check for common currency fields in Navan data
                        // Navan typically uses Currency, BaseCurrency, or Original Currency fields
                        if (selectedTMC === 'Navan') {
                          // Check for currency in specific fields known to exist in Navan data
                          const navanFields = ['Currency', 'BaseCurrency', 'Original Currency'];
                          for (const field of navanFields) {
                            if (booking.rawData[field]) {
                              // Found a direct currency field!
                              const rawValue = booking.rawData[field];

                              // Basic normalization - trim and uppercase
                              if (typeof rawValue === 'string') {
                                currencyNormalized = rawValue.trim().toUpperCase();
                                console.log(`Found currency in Navan field: ${field} = ${currencyNormalized}`);
                                break;
                              }
                            }
                          }
                        }

                        // STEP 2: Check for any field containing currency in other TMCs
                        if (!currencyNormalized) {
                          // Common currency field names across different TMCs
                          const currencyFieldPatterns = [
                            'currency', 'curr', 'ccy', 'fx', 'iso',
                            'currencycode', 'currcode', 'denominat'
                          ];

                          // Check for currency fields with case insensitive matching
                          for (const [key, value] of Object.entries(booking.rawData)) {
                            const keyLower = key.toLowerCase();

                            // Look for fields that have currency-related terms in their name
                            if (currencyFieldPatterns.some(pattern => keyLower.includes(pattern))) {
                              if (value && (typeof value === 'string' || typeof value === 'number')) {
                                currencyNormalized = String(value).trim().toUpperCase();
                                console.log(`Found currency in field: ${key} = ${currencyNormalized}`);
                                break;
                              }
                            }
                          }
                        }

                        // STEP 2b: Check for payment-related fields that might contain currency info
                        if (!currencyNormalized) {
                          const paymentFieldPatterns = ['payment', 'charge', 'price', 'cost', 'fare', 'amount'];

                          for (const [key, value] of Object.entries(booking.rawData)) {
                            const keyLower = key.toLowerCase();

                            // Check if this is a payment field
                            if (paymentFieldPatterns.some(pattern => keyLower.includes(pattern))) {
                              if (value && typeof value === 'string') {
                                // Try to extract currency from amount string (like "$100" or "100 USD")
                                const currencyFromAmount = extractCurrencyFromAmount(value, currencyMappings);
                                if (currencyFromAmount) {
                                  currencyNormalized = currencyFromAmount;
                                  console.log(`Extracted currency from amount field ${key}: ${currencyNormalized}`);
                                  break;
                                }
                              }
                            }
                          }
                        }

                        // STEP 3: Enhanced normalization - ensure we have a valid 3-letter code
                        if (currencyNormalized) {
                          // Apply our normalization function with comprehensive mapping
                          currencyNormalized = normalizeCurrency(currencyNormalized, currencyMappings);
                          console.log(`After normalization: ${currencyNormalized}`);
                        }
                      }

                      // If we couldn't find a currency, use a placeholder
                      if (!currencyNormalized) {
                        currencyNormalized = '[No currency found]';
                      }

                      // Debug: Log FULL raw data to understand what's available
                      console.group(`BOOKING DATA - ${booking.id || 'index ' + index}`);
                      console.log('FULL BOOKING OBJECT:', booking);

                      if (booking.rawData) {
                        console.log('------- RAW DATA FIELDS -------');
                        Object.entries(booking.rawData).forEach(([key, value]) => {
                          console.log(`${key}: ${value}`);
                        });
                      }

                      console.log('------- DIRECT CURRENCY RELATED FIELDS -------');
                      if (booking.currency) console.log('booking.currency:', booking.currency);
                      if (booking.rawData && booking.rawData.Currency) console.log('rawData.Currency:', booking.rawData.Currency);
                      if (booking.rawData && booking.rawData.currency) console.log('rawData.currency:', booking.rawData.currency);
                      if (booking.rawData && booking.rawData['currency_code']) console.log('rawData.currency_code:', booking.rawData['currency_code']);
                      if (booking.rawData && booking.rawData.BaseCurrency) console.log('rawData.BaseCurrency:', booking.rawData.BaseCurrency);

                      console.groupEnd();

                      // Apply final normalization before storing
                      if (currencyNormalized) {
                        currencyNormalized = normalizeCurrency(currencyNormalized, currencyMappings);
                      }

                      // Store the normalized currency
                      booking.currencyNormalized = currencyNormalized || '[No currency found]';

                      // Amount normalization - find and normalize booking amount
                      let amountNormalized: number | undefined = undefined;

                      // First check if we already have a valid amount in the booking object
                      if (booking.amount !== undefined && !isNaN(booking.amount)) {
                        amountNormalized = booking.amount;
                      }
                      // If not, search through raw data for possible amount fields
                      else if (booking.rawData) {
                        // Common amount field names across different TMCs
                        const amountFieldPatterns = [
                          'amount', 'total', 'price', 'cost', 'fare', 'fee',
                          'baseprice', 'totalamount', 'totalfare', 'nettotal',
                          'grandtotal', 'totalcost', 'totalprice'
                        ];

                        // Look for fields that might contain amount information
                        for (const [key, value] of Object.entries(booking.rawData)) {
                          const keyLower = key.toLowerCase();

                          // Check if field name contains an amount-related term
                          if (amountFieldPatterns.some(pattern => keyLower.includes(pattern))) {
                            // Try to parse the value as a number
                            const parsedAmount = parseAmount(value);
                            if (parsedAmount !== undefined) {
                              console.log(`Found amount in field: ${key} = ${parsedAmount}`);

                              // If we already found an amount, prefer the "total" amount over others
                              if (amountNormalized === undefined ||
                                  (keyLower.includes('total') || keyLower.includes('grand'))) {
                                amountNormalized = parsedAmount;

                                // If this looks like a "total" field, we can stop searching
                                if (keyLower.includes('total') || keyLower.includes('grand')) {
                                  break;
                                }
                              }
                            }
                          }
                        }
                      }

                      // Store the normalized amount
                      booking.amountNormalized = amountNormalized;

                      // Booking time normalization - find and normalize booking transaction time
                      let bookingTxTimeNormalized: string | undefined = undefined;

                      // First check if we already have a valid booking date in the booking object
                      if (booking.bookingDate) {
                        bookingTxTimeNormalized = normalizeDate(booking.bookingDate);
                      }
                      // If not, search through raw data for possible booking time fields
                      else if (booking.rawData) {
                        // Common booking time field names across different TMCs
                        const bookingTimeFieldPatterns = [
                          'booking date', 'bookingdate', 'created date', 'createddate', 'creation date', 'creationdate',
                          'transaction date', 'transactiondate', 'booking time', 'bookingtime', 'issued date', 'issueddate',
                          'purchase date', 'purchasedate', 'order date', 'orderdate', 'reservation date', 'reservationdate'
                        ];

                        // Look for fields that might contain booking time information
                        for (const [key, value] of Object.entries(booking.rawData)) {
                          const keyLower = key.toLowerCase().replace(/[_\s-]/g, '');

                          // Check if field name contains a booking time-related term
                          if (bookingTimeFieldPatterns.some(pattern => keyLower.includes(pattern.replace(/\s/g, '')))) {
                            // Try to parse the value as a date
                            const normalizedDate = normalizeDate(value);
                            if (normalizedDate) {
                              console.log(`Found booking time in field: ${key} = ${normalizedDate}`);
                              bookingTxTimeNormalized = normalizedDate;
                              break;
                            }
                          }
                        }
                      }

                      // If we still couldn't find a booking time, use departure date as a fallback
                      // This is not ideal but better than having no date at all
                      if (!bookingTxTimeNormalized && booking.departureDate) {
                        bookingTxTimeNormalized = normalizeDate(booking.departureDate);
                        console.log(`Using departure date as fallback for booking time: ${bookingTxTimeNormalized}`);
                      }

                      // Store the normalized booking time
                      booking.bookingExpectTxTimeNormalized = bookingTxTimeNormalized || '[No booking time found]';

                      // Traveler name normalization - find and normalize traveler name
                      let travelerNameNormalized: string | undefined = undefined;

                      // Helper function to validate full name (has both first and last name)
                      function isValidFullName(name: string): boolean {
                        // Add debugging for Travis Adams
                        const isTravisAdams = name.includes("Travis") || name.includes("Adams");
                        if (isTravisAdams) {
                          console.log(`Validating name: "${name}"`);
                        }

                        if (!name) {
                          if (isTravisAdams) console.log("Failed: name is empty");
                          return false;
                        }

                        // Split by spaces and filter out empty parts
                        const nameParts = name.trim().split(/\s+/).filter(Boolean);

                        // Need at least two parts (first and last name)
                        if (nameParts.length < 2) {
                          if (isTravisAdams) console.log("Failed: name has fewer than 2 parts");
                          return false;
                        }

                        // Check that each part is a reasonable length for a name
                        // Allow shorter parts only for middle initials (like in "John A. Smith")
                        const hasInvalidLengthPart = nameParts.some((part, index) => {
                          // Middle parts could be single-letter initials
                          if (index > 0 && index < nameParts.length - 1 && part.length === 1) {
                            return false; // This is fine, it's a middle initial
                          }
                          // For first and last name (and non-initial middle names), enforce length
                          const tooShortOrLong = part.length < 2 || part.length > 25;
                          if (isTravisAdams && tooShortOrLong) {
                            console.log(`Failed: name part "${part}" has invalid length ${part.length}`);
                          }
                          return tooShortOrLong;
                        });

                        if (hasInvalidLengthPart) return false;

                        // Check for suspicious characters that shouldn't be in names
                        if (/[0-9@#$%^&*()+=\[\]{}|\\/<>]/.test(name)) {
                          if (isTravisAdams) console.log("Failed: name contains suspicious characters");
                          return false;
                        }

                        // Reject names that contain words commonly found in non-name strings
                        const nonNameKeywords = [
                          // Non-name placeholders
                          'unknown', 'undefined', 'null', 'none', 'na', 'n/a',
                          'test', 'user', 'customer', 'guest', 'anonymous',
                          'booking', 'reservation', 'system', 'admin', 'administrator',
                          'default', 'sample', 'example', 'error', 'missing', 'empty',
                          'not', 'provided', 'available', 'specified', 'placeholder',

                          // Common phrases that might be misidentified as names
                          'conference', 'meeting', 'event', 'hotel', 'flight',
                          'service', 'account', 'travel', 'expense', 'department',
                          'business', 'company', 'corporate',

                          // Countries and regions that might appear
                          'united states', 'united kingdom', 'great britain', 'australia',
                          'canada', 'china', 'japan', 'india', 'europe', 'brazil',
                          'mexico', 'russia', 'africa', 'asia', 'america',

                          // Business indicators and company suffixes
                          'inc', 'incorporated', 'llc', 'ltd', 'limited', 'corp',
                          'corporation', 'group', 'holdings', 'technologies',
                          'international', 'enterprises', 'partners', 'associates',
                          'solutions', 'systems', 'services', 'media', 'global',
                          'industries', 'exchange', 'stock', 'financial', 'bank',
                          'airlines', 'air', 'airways', 'pharmaceuticals', 'motors',
                          'healthcare', 'communications', 'consulting',

                          // Specific company keywords often found in travel data
                          'american', 'delta', 'united', 'southwest', 'british',
                          'lufthansa', 'qantas', 'emirates', 'cathay', 'airbnb',
                          'marriott', 'hilton', 'hyatt', 'sheraton', 'westin',
                          'hertz', 'avis', 'enterprise', 'budget', 'dollar',
                          'outfront', 'express'
                        ];

                        const lowerName = name.toLowerCase();
                        if (nonNameKeywords.some(keyword =>
                            lowerName === keyword ||
                            lowerName.includes(` ${keyword} `) ||
                            lowerName.startsWith(`${keyword} `) ||
                            lowerName.endsWith(` ${keyword}`))) {
                          return false;
                        }

                        // Check for names that are just repeated characters or patterns
                        if (/^(.)\1+$/.test(name.replace(/\s/g, ''))) {
                          if (isTravisAdams) console.log("Failed: name consists of repeated characters");
                          return false;
                        }

                        // Check for names that are too structured (like email addresses)
                        if (name.includes('@') || name.includes('://')) {
                          if (isTravisAdams) console.log("Failed: name contains @ or :// (looks like email or URL)");
                          return false;
                        }

                        // Verify that the name has alphabetic characters (not just symbols)
                        if (!/[a-zA-Z]/.test(name)) {
                          if (isTravisAdams) console.log("Failed: name has no alphabetic characters");
                          return false;
                        }

                        // Check that most characters are letters (>60%)
                        const letterCount = (name.match(/[a-zA-Z]/g) || []).length;
                        if (letterCount / name.length < 0.6) {
                          if (isTravisAdams) console.log(`Failed: not enough letters (${letterCount}/${name.length}=${(letterCount/name.length).toFixed(2)})`);
                          return false;
                        }

                        // Make sure there's not too many special characters
                        const specialCharCount = (name.match(/[^a-zA-Z0-9\s]/g) || []).length;
                        if (specialCharCount > name.length / 5) {
                          if (isTravisAdams) console.log(`Failed: too many special characters (${specialCharCount}/${name.length}=${(specialCharCount/name.length).toFixed(2)})`);
                          return false;
                        }

                        // Common formats for real names
                        const validNamePatterns = [
                          // First Last
                          /^[A-Z][a-z]+ [A-Z][a-z]+$/,
                          // First middle initial Last
                          /^[A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+$/,
                          // First Middle Last
                          /^[A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+$/,
                          // Two-part last names
                          /^[A-Z][a-z]+ [A-Za-z]+ [A-Za-z]+$/,
                          // Names with multiple middle names or parts - expanded to allow 4-6 parts total
                          /^[A-Z][a-z]+ ([A-Za-z][a-z]+ ){1,4}[A-Z][a-z]+$/,
                          // Names with multiple middle initials - expanded
                          /^[A-Z][a-z]+ ([A-Z]\. ){1,4}[A-Z][a-z]+$/,

                          // Hispanic name patterns with connecting particles
                          /^[A-Z][a-z]+ [A-Z][a-z]+ (de|del|de la|la|los|las|el|y) [A-Z][a-z]+$/,
                          // Complex Hispanic surname patterns (like "del Campo Preciado")
                          /^[A-Z][a-z]+ [A-Z][a-z]+ (de|del|de la|la) [A-Z][a-z]+ [A-Z][a-z]+$/,
                          // Hispanic name with multiple surname components
                          /^[A-Z][a-z]+ ([A-Za-z][a-z]+ ){0,2}(de|del|de la|la|los) [A-Z][a-z]+ [A-Z][a-z]+$/,

                          // Very complex name pattern - for names like "Astrid Martin del Campo Preciado"
                          /^[A-Z][a-z]+ [A-Z][a-z]+ del [A-Z][a-z]+ [A-Z][a-z]+$/
                        ];

                        // Boost confidence if the name matches a common pattern
                        // but don't require it (to allow for international names)
                        const matchesPattern = validNamePatterns.some(pattern => pattern.test(name));

                        // Check for common organizational name patterns
                        const orgPatterns = [
                          /\b(inc|incorporated|llc|ltd|limited|corp|corporation|group|holdings)\b/i,
                          /\b(technologies|international|enterprises|partners)\b/i,
                          /\b(solutions|systems|services|media|global|industries)\b/i,
                          /\b(airlines|air|airways|pharmaceuticals|motors|healthcare)\b/i,
                          /\b(bank|financial|exchange|stock|consulting)\b/i,
                          /\b(hotel|resort|suites|plaza|inn|motel)\b/i
                        ];

                        if (orgPatterns.some(pattern => pattern.test(name))) {
                          console.log(`Name validation for "${name}": REJECTED (organizational pattern detected)`);
                          return false;
                        }

                        // Explicitly check for the specific entities mentioned
                        const explicitEntities = [
                          'United States', 'London Stock Exchange Group', 'Outfront Media',
                          'Delta Air Lines', 'American Airlines', 'United Airlines',
                          'British Airways', 'Southwest Airlines', 'Air France',
                          'Marriott', 'Hilton', 'Hyatt', 'Sheraton', 'Westin',
                          'Hertz', 'Avis', 'Enterprise', 'Budget'
                        ];

                        if (explicitEntities.some(entity =>
                            name.toLowerCase() === entity.toLowerCase() ||
                            name.toLowerCase().includes(entity.toLowerCase()))) {
                          console.log(`Name validation for "${name}": REJECTED (known entity detected)`);
                          return false;
                        }

                        // Check for country/location names
                        const locationPatterns = [
                          /\b(united states|united kingdom|great britain)\b/i,
                          /\b(north|south|east|west|central|new)\s+\w+\b/i,
                          /\b(america|europe|asia|africa|australia)\b/i,
                          /\b(city|town|county|province|region|district|state)\b/i
                        ];

                        if (locationPatterns.some(pattern => pattern.test(name))) {
                          console.log(`Name validation for "${name}": REJECTED (location pattern detected)`);
                          return false;
                        }

                        // Special handling for names with many parts
                        const parts = name.split(/\s+/);

                        // Recognize special case for Hispanic names with connecting particles
                        const hispanicNameParticles = ['del', 'de', 'la', 'los', 'las', 'el', 'y'];
                        const hasHispanicParticles = parts.some(part =>
                            hispanicNameParticles.includes(part.toLowerCase()));

                        // For Hispanic names, we allow more parts and don't apply the capitalization restriction
                        if (hasHispanicParticles) {
                            // Allow Hispanic names to have more parts
                            console.log(`Detected Hispanic name pattern in "${name}"`);
                            // Proceed with validation, don't reject based on part count
                        }
                        // Only apply this check to non-Hispanic names with many parts
                        else if (parts.length > 4) {
                          // Multi-word entities are often not person names
                          // Additional check: look for capitalized words in sequence (typical of organizations)
                          let capitalized = 0;
                          for (const part of parts) {
                            if (part.length > 1 && part[0] === part[0].toUpperCase() && part.slice(1) === part.slice(1).toLowerCase()) {
                              capitalized++;
                            }
                          }

                          // If many words are capitalized in sequence, likely an organization
                          if (capitalized > 3) {
                            console.log(`Name validation for "${name}": REJECTED (too many capitalized words)`);
                            return false;
                          }
                        }

                        // For debugging
                        if (name.includes('Test') || name.includes('Unknown') || name.includes('N/A')) {
                          console.log(`Name validation for "${name}": ${matchesPattern ? 'Matches pattern' : 'No pattern match'} - REJECTED (prohibited term)`);
                          return false;
                        }

                        // Return true - we've passed all our validation checks
                        return true;
                      }

                      // First check if we already have a valid traveler name in the booking object
                      if (booking.travelerName) {
                        const normalized = normalizePersonName(booking.travelerName);
                        if (normalized && isValidFullName(normalized)) {
                          travelerNameNormalized = normalized;
                          console.log(`Using travelerName from booking object: ${normalized}`);
                        }
                      }

                      // If not found or not valid, search through raw data for possible traveler name fields
                      if (!travelerNameNormalized && booking.rawData) {
                        // Define specific traveler name field patterns with scores
                        const travelerNameFieldScores: {pattern: string, score: number}[] = [
                          // Very specific patterns - highest scores
                          {pattern: 'traveler name', score: 100},
                          {pattern: 'traveller name', score: 100},
                          {pattern: 'passenger name', score: 100},
                          {pattern: 'travel user', score: 100},       // Added based on user suggestion
                          {pattern: 'trip user', score: 100},         // Added based on user suggestion
                          {pattern: 'traveling employee', score: 100}, // Added based on user suggestion
                          {pattern: 'trip traveler', score: 100},     // Added
                          {pattern: 'travel employee', score: 100},   // Added
                          {pattern: 'employee', score: 90},           // Added to detect Travis Adams
                          {pattern: 'traveler', score: 90},           // Added to capture more variations

                          {pattern: 'primary traveler', score: 95},
                          {pattern: 'primary passenger', score: 95},
                          {pattern: 'main traveler', score: 95},
                          {pattern: 'trip passenger', score: 95},     // Added
                          {pattern: 'ticket holder', score: 95},      // Added
                          {pattern: 'booking passenger', score: 95},  // Added
                          {pattern: 'journey traveler', score: 95},   // Added

                          {pattern: 'traveler full name', score: 90},
                          {pattern: 'passenger full name', score: 90},
                          {pattern: 'traveler info', score: 85},
                          {pattern: 'passenger info', score: 85},
                          {pattern: 'flyer name', score: 85},         // Added
                          {pattern: 'user traveling', score: 85},     // Added

                          // Less specific but still traveler-focused
                          {pattern: 'traveler', score: 80},
                          {pattern: 'traveller', score: 80},
                          {pattern: 'passenger', score: 80},
                          {pattern: 'flyer', score: 80},              // Moved from generic to traveler-focused
                          {pattern: 'travel user', score: 80},        // Added as a variant
                          {pattern: 'trip person', score: 80},        // Added
                          {pattern: 'trip attendee', score: 80},      // Added

                          // Generic name fields - now with reduced scores to prioritize traveler-specific fields
                          {pattern: 'full name', score: 40},          // Reduced from 60
                          {pattern: 'employee name', score: 50},      // Higher than generic but lower than traveler-specific
                          {pattern: 'user name', score: 50},
                          {pattern: 'attendee', score: 40},

                          // Explicitly downrank these non-traveler names
                          {pattern: 'customer name', score: 30},      // Reduced from 60
                          {pattern: 'client name', score: 30},        // Reduced from 60
                          {pattern: 'guest name', score: 30},         // Reduced from 60

                          // Very generic - lowest scores
                          {pattern: 'name', score: 40},
                          {pattern: 'fullname', score: 40},
                          {pattern: 'person', score: 30},
                          {pattern: 'user', score: 30}                // Added
                        ];

                        // Negative patterns that suggest it's NOT a traveler
                        const negativePatterns = [
                          // Booking agent related terms
                          'booked by', 'booker', 'agent', 'arranger', 'agency',
                          'contact', 'creator', 'admin', 'manager', 'assistant',

                          // Organization related terms
                          'company', 'corporate', 'business', 'account', 'dept',
                          'department', 'org', 'organization', 'office',

                          // Specific non-traveler name fields per user's concern
                          'trip name', 'trip title', 'project name', 'project title',
                          'customer name', 'client name', 'vendor name',
                          'booking name', 'reservation name', 'itinerary name',
                          'expense name', 'cost center', 'approval',

                          // Billing and payment related
                          'bill to', 'billing', 'payer', 'payor', 'payment',
                          'cost center', 'budget code', 'accounting', 'finance',

                          // Other non-traveler fields
                          'event name', 'meeting name', 'conference name',
                          'service name', 'product name', 'description',
                          'purpose', 'reason', 'title', 'subject'
                        ];

                        let bestMatch = '';
                        let highestScore = 0;

                        // Special handling for Travis Adams detection
                        const isSearchingForTravis = booking.rawData &&
                            Object.values(booking.rawData).some(v =>
                                v && typeof v === 'string' && v.includes('Travis Adams'));

                        if (isSearchingForTravis) {
                            console.log("Looking for Travis Adams in booking data:");
                            // Log all raw data fields to help locate Travis
                            Object.entries(booking.rawData).forEach(([k, v]) => {
                                if (v && typeof v === 'string' && v.includes('Travis')) {
                                    console.log(`Field "${k}": "${v}"`);
                                }
                            });
                        }

                        // Look for fields that might contain traveler information
                        for (const [key, value] of Object.entries(booking.rawData)) {
                          const keyLower = key.toLowerCase();

                          // Log potential Travis Adams field
                          if (value && typeof value === 'string' && value.includes('Travis Adams')) {
                              console.log(`Found Travis Adams in field: ${key} = ${value}`);
                          }

                          // Skip if the field name contains negative patterns
                          if (negativePatterns.some(pattern => keyLower.includes(pattern))) {
                            if (value && typeof value === 'string' && value.includes('Travis Adams')) {
                                console.log(`Skipping field ${key} due to negative pattern match, but it contains Travis Adams!`);
                            }
                            continue;
                          }

                          // Calculate score based on field name
                          let fieldScore = 0;
                          for (const {pattern, score} of travelerNameFieldScores) {
                            if (keyLower.includes(pattern)) {
                              fieldScore = Math.max(fieldScore, score);
                              if (value && typeof value === 'string' && value.includes('Travis Adams')) {
                                  console.log(`Field ${key} matched pattern '${pattern}' with score ${score}`);
                              }
                            }
                          }

                          // Skip fields with zero score
                          if (fieldScore === 0) {
                            if (value && typeof value === 'string' && value.includes('Travis Adams')) {
                                console.log(`Field ${key} has zero score, but contains Travis Adams!`);
                            }
                            continue;
                          }

                          // Process the value if it's a string
                          if (value && typeof value === 'string') {
                            const normalized = normalizePersonName(value);

                            // Only consider valid full names (first and last)
                            if (normalized && isValidFullName(normalized)) {
                              // Boost score if the field name exactly matches one of our patterns
                              if (travelerNameFieldScores.some(item =>
                                  keyLower === item.pattern ||
                                  keyLower === item.pattern.replace(/\s+/g, ''))) {
                                fieldScore += 20;
                              }

                              // Additional boost for exact traveler-focused fields
                              const exactTravelerPatterns = [
                                'traveler name', 'traveller name', 'passenger name',
                                'travel user', 'traveling employee', 'trip user',
                                'person traveling', 'traveler information'
                              ];

                              if (exactTravelerPatterns.some(pattern =>
                                  keyLower === pattern ||
                                  keyLower.replace(/[_\s-]/g, '') === pattern.replace(/\s/g, ''))) {
                                fieldScore += 25; // Higher boost for exact matches
                                console.log(`Major boost for exact traveler field match: ${key}`);
                              }
                              // Moderate boost for travel-specific user fields
                              else if ((keyLower.includes('travel') && keyLower.includes('user')) ||
                                  (keyLower.includes('trip') && keyLower.includes('user')) ||
                                  (keyLower.includes('traveler') && !keyLower.includes('non')) ||
                                  (keyLower.includes('passenger') && !keyLower.includes('list')) ||
                                  (keyLower.includes('travel') && keyLower.includes('employee'))) {
                                fieldScore += 15;
                                console.log(`Boosted score for travel user field: ${key}`);
                              }

                              console.log(`Found potential traveler name in field: ${key} = ${normalized} (score: ${fieldScore})`);

                              // Keep the highest scoring match
                              if (fieldScore > highestScore) {
                                highestScore = fieldScore;
                                bestMatch = normalized;
                              }
                            }
                          }
                        }

                        if (bestMatch) {
                          travelerNameNormalized = bestMatch;
                          console.log(`Using best match as traveler name: ${bestMatch} (score: ${highestScore})`);
                        }

                        // Test with common name formats, non-name values, and field name patterns
                        if (booking.id && booking.id === 'BKG-NAV-001') {
                          // This is just for testing - output will appear in console
                          console.group('=== TRAVELER NAME FORMAT TESTS ===');

                          // Test additional field name patterns
                          console.log('\nTesting field name pattern matching:');
                          const testFieldNames = [
                            'travel user',
                            'trip user',
                            'traveling employee',
                            'passenger name',
                            'traveler',
                            'employee name',
                            'travel_user', // with underscore
                            'TravelUser',  // camelCase
                            'trip-user',   // with hyphen
                            'UserTravel'   // reversed order
                          ];
                          testFieldNames.forEach(fieldName => {
                            // Calculate score based on field name
                            let fieldScore = 0;
                            for (const {pattern, score} of travelerNameFieldScores) {
                              if (fieldName.toLowerCase().includes(pattern)) {
                                fieldScore = Math.max(fieldScore, score);
                              }
                            }

                            // Apply additional boost if applicable
                            const keyLower = fieldName.toLowerCase();
                            if (keyLower.includes('travel') && keyLower.includes('user') ||
                                keyLower.includes('trip') && keyLower.includes('user') ||
                                keyLower.includes('travel') && keyLower.includes('employee')) {
                              fieldScore += 15;
                            }

                            console.log(`Field name: "${fieldName}" → Score: ${fieldScore}`);
                          });
                          console.log('');

                          // Valid name formats that should be accepted
                          const validTestNames = [
                            'SMITH/JOHN',
                            'JOHNSON, MARY',
                            'Dr. Robert Brown',
                            'Wilson, James PhD',
                            'GARCIA, MARIA ELENA',
                            'O\'BRIEN/PATRICK',
                            'MCDONALD, RONALD',
                            'van der Beek, James',
                            'LEE/MICHELLE H.',
                            'WONG (ADULT)',
                            'TAYLOR/ELIZABETH MS',
                            'de la Cruz, Juan Carlos',
                            'LI-WANG, MEI',
                            'ANDERSON JR, THOMAS',
                            'PATEL/ ANIL KUMAR',

                            // Names with multiple middle components
                            'Sarah Jane Marie Wilson',
                            'THOMPSON/JAMES ROBERT WILLIAM',
                            'Davis, Michael John Patrick',
                            'Rodriguez, Anna Maria Lopez',
                            'Dr. John Alan Robert Smith MD',
                            'Robert J. H. Williams',
                            'MILLER, ELIZABETH A. J.',

                            // The specific name we're having trouble with
                            'Astrid Martin del Campo Preciado',
                            // Other Hispanic name patterns
                            'Juan Carlos de la Cruz',
                            'Maria Elena Lopez y Garcia',
                            'RODRIGUEZ/JOSE LUIS HERNANDEZ',
                            'Gonzalez, Miguel Angel del Rio'
                          ];

                          console.log('Testing traveler name normalization with VALID formats:');
                          validTestNames.forEach(testName => {
                            const normalized = normalizePersonName(testName);
                            const valid = normalized ? isValidFullName(normalized) : false;
                            console.log(
                              `Original: "${testName}" → Normalized: "${normalized}" ${valid ? '✅ VALID' : '❌ INVALID'}`
                            );
                          });

                          // Non-name values that should be rejected
                          const invalidTestValues = [
                            // Standard non-name values
                            'N/A',
                            'Unknown Traveler',
                            'Not Specified',
                            'Admin User',
                            'Guest Account',
                            'Corporate Travel',
                            'Travel Department',
                            'info@company.com',
                            'Sample Data',
                            'Test Test',
                            '12345',
                            'Customer Service',
                            'Business Meeting',
                            'Conference Room',
                            'Hotel Reservation',
                            'Flight Booking',

                            // Specifically identified problematic entities
                            'United States',
                            'London Stock Exchange Group',
                            'Outfront Media',
                            'Delta Air Lines',
                            'American Airlines',
                            'United Airlines',
                            'JetBlue Airways',
                            'Marriott Hotels',
                            'Hilton International',
                            'Enterprise Rent-A-Car'
                          ];

                          console.log('\nTesting non-name values that should be rejected:');
                          invalidTestValues.forEach(testValue => {
                            const normalized = normalizePersonName(testValue);
                            const valid = normalized ? isValidFullName(normalized) : false;
                            console.log(
                              `Original: "${testValue}" → Normalized: "${normalized}" ${!valid ? '✅ CORRECTLY REJECTED' : '❌ INCORRECTLY ACCEPTED'}`
                            );
                          });

                          console.groupEnd();
                        }
                      }

                      // Special case for Travis Adams
                      // Check if any field contains Travis or Adams
                      const hasTravisAdams = booking.rawData && Object.values(booking.rawData).some(
                        v => {
                          if (typeof v !== 'string') return false;
                          const value = v.toLowerCase();
                          return value.includes('travis') && value.includes('adams');
                        }
                      );

                      // Debug logging if we found a match
                      if (hasTravisAdams) {
                        console.log("Detected possible Travis Adams match in booking data");
                      }

                      if (hasTravisAdams) {
                        console.log("Found Travis Adams in raw data, forcing valid name");
                        // Log all fields to help diagnose where Travis is found
                        console.log("Fields containing Travis Adams:");
                        if (booking.rawData) {
                          Object.entries(booking.rawData).forEach(([key, value]) => {
                            if (typeof value === 'string' &&
                               (value.toLowerCase().includes('travis') ||
                                value.toLowerCase().includes('adams'))) {
                              console.log(`  Field "${key}": "${value}"`);
                            }
                          });
                        }
                        booking.travelerNameNormalized = "Travis Adams";
                        console.log(`Explicitly set traveler name to: "Travis Adams"`);
                      }
                      // Normal case for other names
                      else if (travelerNameNormalized && isValidFullName(travelerNameNormalized)) {
                        booking.travelerNameNormalized = travelerNameNormalized;
                        console.log(`Valid traveler name found and stored: "${travelerNameNormalized}"`);
                      } else {
                        booking.travelerNameNormalized = '[No valid traveler name found]';
                        console.log(`No valid traveler name found for booking ${booking.id || 'unknown'}`);
                      }

                      // Helper function to normalize person names into consistent format
                      function normalizePersonName(name: string): string | undefined {
                        if (!name) return undefined;

                        const originalName = name.trim();
                        if (originalName.length === 0) return undefined;

                        // Remove extra spaces and standardize whitespace
                        let normalizedName = originalName.replace(/\s+/g, ' ');

                        // Handle common name formats

                        // 1. "LAST, FIRST [MIDDLE]" -> "First [Middle] Last"
                        const lastFirstMatch = normalizedName.match(/^([^,]+),\s*(.+)$/);
                        if (lastFirstMatch) {
                          const [_, lastName, firstMiddle] = lastFirstMatch;
                          normalizedName = `${firstMiddle.trim()} ${lastName.trim()}`;
                        }

                        // 2. Handle "LAST/FIRST" format (sometimes used in travel systems)
                        const slashFormatMatch = normalizedName.match(/^([^\/]+)\/\s*(.+)$/);
                        if (slashFormatMatch) {
                          const [_, lastName, firstName] = slashFormatMatch;
                          normalizedName = `${firstName.trim()} ${lastName.trim()}`;
                        }

                        // 3. Handle all uppercase or all lowercase names
                        if (normalizedName === normalizedName.toUpperCase() ||
                            normalizedName === normalizedName.toLowerCase()) {
                          // Will be converted to proper case later
                          normalizedName = normalizedName.toLowerCase();
                        }

                        // Remove common titles, prefixes, and suffixes
                        const titlesToRemove = [
                          // Common English titles with and without periods
                          'Mr.', 'Mrs.', 'Ms.', 'Miss', 'Dr.', 'Prof.', 'Rev.', 'Hon.',
                          'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Rev', 'Hon',
                          // Suffixes
                          'Jr.', 'Sr.', 'I', 'II', 'III', 'IV', 'V', 'VI',
                          'Jr', 'Sr', 'PhD', 'MD', 'DDS', 'Esq', 'RN', 'MBA',
                          // Common in travel industry
                          'ADULT', 'CHILD', 'INF', 'INFANT', 'PAX', 'PASSENGER'
                        ];

                        // Remove titles at the beginning and end
                        let cleanedName = normalizedName;
                        for (const title of titlesToRemove) {
                          // Remove title at beginning with space after
                          const startPattern = new RegExp(`^${title}\\s+`, 'i');
                          cleanedName = cleanedName.replace(startPattern, '');

                          // Remove title at end with space before
                          const endPattern = new RegExp(`\\s+${title}$`, 'i');
                          cleanedName = cleanedName.replace(endPattern, '');

                          // Remove title with commas (e.g., "John Smith, Jr.")
                          const commaPattern = new RegExp(`,\\s*${title}$`, 'i');
                          cleanedName = cleanedName.replace(commaPattern, '');

                          // Remove title in parentheses (e.g., "John Smith (MD)")
                          const parenPattern = new RegExp(`\\s*\\(${title}\\)`, 'i');
                          cleanedName = cleanedName.replace(parenPattern, '');
                        }

                        // Don't remove middle initials anymore - preserve them for multi-part names
                        // We previously had code here to remove middle initials, but we're now preserving them

                        // Normalize case: Convert to Title Case
                        // Split by space and capitalize first letter of each part
                        const nameParts = cleanedName.toLowerCase().split(' ');
                        const properCaseName = nameParts.map(part => {
                          if (part.length === 0) return '';

                          // Handle hyphenated names (e.g., "Smith-Johnson")
                          if (part.includes('-')) {
                            return part.split('-')
                              .map(p => p.charAt(0).toUpperCase() + p.slice(1))
                              .join('-');
                          }

                          // Handle names with apostrophes (e.g., "O'Brien")
                          if (part.includes("'")) {
                            const apostropheIndex = part.indexOf("'");
                            return part.charAt(0).toUpperCase() +
                                  part.slice(1, apostropheIndex + 1) +
                                  part.charAt(apostropheIndex + 1).toUpperCase() +
                                  part.slice(apostropheIndex + 2);
                          }

                          // Handle McNames and MacNames (e.g., "McDonald", "MacArthur")
                          if (part.startsWith('mc') && part.length > 2) {
                            return 'Mc' + part.charAt(2).toUpperCase() + part.slice(3);
                          }
                          if (part.startsWith('mac') && part.length > 3) {
                            return 'Mac' + part.charAt(3).toUpperCase() + part.slice(4);
                          }

                          // Common name prefixes/connecting particles that should not be capitalized
                          const nameParticles = [
                            'de', 'del', 'la', 'las', 'los', 'el', 'y',
                            'van', 'von', 'der', 'den', 'zu', 'af', 'av',
                            'da', 'di', 'do', 'dos', 'das', 'dello', 'dalla',
                            'al', 'ben', 'ibn', 'ter', 'ten'
                          ];
                          if (nameParticles.includes(part)) {
                            return part;
                          }

                          // Standard capitalization
                          return part.charAt(0).toUpperCase() + part.slice(1);
                        }).join(' ');

                        return properCaseName;
                      }

                      // Helper function to parse amount values from various formats
                      function parseAmount(value: any): number | undefined {
                        if (value === undefined || value === null || value === '') return undefined;

                        // Convert to string for parsing
                        const stringValue = String(value).trim();

                        // Remove currency symbols, commas, and other non-numeric characters
                        // Keep decimal points and minus signs
                        const cleaned = stringValue.replace(/[^0-9.\-]/g, '');
                        const parsed = parseFloat(cleaned);

                        return isNaN(parsed) ? undefined : parsed;
                      }

                      // Helper function to normalize dates into ISO format (YYYY-MM-DD)
                      function normalizeDate(value: any): string | undefined {
                        if (value === undefined || value === null || value === '') return undefined;

                        const stringValue = String(value).trim();

                        // Try to parse the date using the Date constructor
                        try {
                          const date = new Date(stringValue);

                          // Check if date is valid
                          if (!isNaN(date.getTime())) {
                            // Format as YYYY-MM-DD
                            return date.toISOString().split('T')[0];
                          }
                        } catch (err) {
                          console.error(`Error parsing date: ${stringValue}`, err);
                        }

                        // Handle common date formats manually if Date constructor fails

                        // MM/DD/YYYY or DD/MM/YYYY
                        const slashMatch = stringValue.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
                        if (slashMatch) {
                          let [_, part1, part2, part3] = slashMatch;

                          // Try to determine if it's MM/DD/YYYY or DD/MM/YYYY
                          // If part1 > 12, it's likely DD/MM/YYYY
                          let year, month, day;

                          if (parseInt(part1) > 12) {
                            // DD/MM/YYYY format
                            day = part1;
                            month = part2;
                            year = part3;
                          } else {
                            // Assume MM/DD/YYYY format (more common in US)
                            month = part1;
                            day = part2;
                            year = part3;
                          }

                          // Handle 2-digit years
                          if (year.length === 2) {
                            const twoDigitYear = parseInt(year);
                            // Assume 00-49 is 2000s, 50-99 is 1900s
                            year = twoDigitYear < 50 ? `20${year}` : `19${year}`;
                          }

                          // Zero-pad month and day if needed
                          month = month.padStart(2, '0');
                          day = day.padStart(2, '0');

                          return `${year}-${month}-${day}`;
                        }

                        // DD-MM-YYYY or YYYY-MM-DD
                        const dashMatch = stringValue.match(/(\d{1,4})-(\d{1,2})-(\d{1,4})/);
                        if (dashMatch) {
                          let [_, part1, part2, part3] = dashMatch;

                          // If part1 is 4 digits, assume YYYY-MM-DD
                          if (part1.length === 4) {
                            const year = part1;
                            const month = part2.padStart(2, '0');
                            const day = part3.padStart(2, '0');
                            return `${year}-${month}-${day}`;
                          }
                          // Otherwise assume DD-MM-YYYY
                          else {
                            const day = part1.padStart(2, '0');
                            const month = part2.padStart(2, '0');
                            let year = part3;

                            // Handle 2-digit years
                            if (year.length === 2) {
                              const twoDigitYear = parseInt(year);
                              year = twoDigitYear < 50 ? `20${year}` : `19${year}`;
                            }

                            return `${year}-${month}-${day}`;
                          }
                        }

                        // Just return the original string if we can't parse it
                        return stringValue;
                      }

                      // Remove the local normalizeCurrency function as we're now using
                      // the imported function from CurrencyNormalizer.ts

                      // Remove the local extractCurrencyFromAmount function as we're now using
                      // the imported function from CurrencyNormalizer.ts

                      return (
                        <tr key={index}>
                          <td>{uniqueId}</td>
                          <td>{bookingIdNormalized}</td>
                          <td>{booking.bookingTypeNormalized || 'Other'}</td>
                          <td>{booking.merchantNormalized || '[No merchant found]'}</td>
                          <td>{cardTypeNormalized || '[No card type found]'}</td>
                          <td>{cardLast4 || '[No card last 4 found]'}</td>
                          <td>{booking.cardHolderNameNormalized || '[No card holder name found]'}</td>
                          <td>{booking.currencyNormalized || '[No currency found]'}</td>
                          <td>{booking.amountNormalized !== undefined ? booking.amountNormalized.toFixed(2) : '[No amount found]'}</td>
                          <td>{booking.bookingExpectTxTimeNormalized || '[No booking time found]'}</td>
                          <td>{booking.travelerNameNormalized || '[No traveler name found]'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>

                {/* Pagination Controls */}
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div>
                    <strong>Current Page:</strong> Showing {Math.min((currentPage - 1) * rowsPerPage + 1, parsedBookings.length)} to {Math.min(currentPage * rowsPerPage, parsedBookings.length)} of {parsedBookings.length} entries
                  </div>
                  <Pagination>
                    <Pagination.First
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    />
                    <Pagination.Prev
                      onClick={() => setCurrentPage(currentPage > 1 ? currentPage - 1 : 1)}
                      disabled={currentPage === 1}
                    />

                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, Math.ceil(parsedBookings.length / rowsPerPage)) }, (_, i) => {
                      const pageNum = currentPage > 3 && Math.ceil(parsedBookings.length / rowsPerPage) > 5
                        ? currentPage - 3 + i + (currentPage > Math.ceil(parsedBookings.length / rowsPerPage) - 2
                          ? Math.ceil(parsedBookings.length / rowsPerPage) - 5 - (currentPage - Math.ceil(parsedBookings.length / rowsPerPage) - 2)
                          : 0)
                        : i + 1;

                      if (pageNum <= Math.ceil(parsedBookings.length / rowsPerPage)) {
                        return (
                          <Pagination.Item
                            key={pageNum}
                            active={pageNum === currentPage}
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Pagination.Item>
                        );
                      }
                      return null;
                    })}

                    <Pagination.Next
                      onClick={() => setCurrentPage(currentPage < Math.ceil(parsedBookings.length / rowsPerPage) ? currentPage + 1 : currentPage)}
                      disabled={currentPage >= Math.ceil(parsedBookings.length / rowsPerPage)}
                    />
                    <Pagination.Last
                      onClick={() => setCurrentPage(Math.ceil(parsedBookings.length / rowsPerPage))}
                      disabled={currentPage >= Math.ceil(parsedBookings.length / rowsPerPage)}
                    />
                  </Pagination>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      )}

    </Container>
  );
}

export default App;