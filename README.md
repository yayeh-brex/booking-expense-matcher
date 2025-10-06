# Booking-Expense Matcher

A React application that helps match travel booking data with expense reports to identify corresponding entries.

## Features

- Upload and parse booking reports from various Travel Management Companies (TMCs)
- Upload and parse expense reports
- Automatically match bookings with expenses based on multiple criteria
- View detailed match results and statistics
- Identify unmatched bookings and expenses

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
