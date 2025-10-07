# Booking-Expense Matcher

A React application that helps match travel booking data with expense reports to identify corresponding entries.

## Features

- Upload and parse booking reports from various Travel Management Companies (TMCs)
- Upload and parse expense reports
- Automatically match bookings with expenses based on multiple criteria
- View detailed match results and statistics
- Identify unmatched bookings and expenses
- Performance-optimized batch processing to handle large datasets
- Detailed progress tracking during matching operations

## Data Normalization

The application performs extensive normalization on the following fields to improve matching accuracy:
- Booking ID
- Booking Type (Flight, Hotel, Car, Rail)
- Merchant/Vendor Name
- Credit Card Type
- Credit Card Last 4 Digits
- Card Holder Name
- Currency
- Amount
- Transaction Time
- Traveler Name

## Matching Algorithm

The application uses a sophisticated scoring system to match bookings with expenses:
- Card last 4 matching (highest weight)
- Amount matching with fuzzy comparison
- Name matching (traveler name vs. employee name)
- Reference number matching
- Vendor/merchant name matching
- Special handling for flight bookings with additional criteria

## Performance Optimization

The matching process is optimized to handle large datasets without freezing the UI:
- Batch processing breaks down the matching operation into smaller chunks
- Progress tracking with visual feedback during processing
- Asynchronous execution that yields to the UI thread
- Set-based string comparison for improved efficiency

## Supported TMCs

Currently supports booking data from:
- Navan (formerly TripActions)
- Egencia
- BCD Travel
- CWT (Carlson Wagonlit Travel)
- FCM Travel Solutions
- CTM (Corporate Travel Management)
- TravelPerk
- TravelBank
- ITILITE
- And others

## Recent Improvements

- **Performance Enhancement**: Implemented batch processing for matching operations to prevent UI freezing
- **Validation Improvement**: Updated card holder name validation to be more permissive while maintaining security
- **Bug Fixes**:
  - Fixed regular expression escape character issues in string normalization
  - Resolved TypeScript compilation errors related to Set iteration
  - Fixed currency mapping errors related to undefined properties
  - Enhanced card holder name extraction to reduce "[No card holder name found]" instances

## Technologies

- React
- TypeScript
- Bootstrap
- Papa Parse (CSV parsing)

## Getting Started

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

1. Clone this repository
2. Install dependencies: `npm install`
3. Start the development server: `npm start`
4. Open http://localhost:3000 in your browser

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm test`

Launches the test runner in the interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.

## Development Notes

- Use `npm run build` to create a production build for deployment
- The app automatically fixes data issues in the booking data before matching
- For large datasets, the batch processing system provides progress updates during matching