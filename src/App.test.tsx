import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Booking-Expense Matcher heading', () => {
  render(<App />);
  const headingElement = screen.getByText(/Booking-Expense Matcher/i);
  expect(headingElement).toBeInTheDocument();
});
