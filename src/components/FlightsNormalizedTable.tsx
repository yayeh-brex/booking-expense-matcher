import React, { useState } from 'react';
import { Table, Badge, Pagination } from 'react-bootstrap';
import { ExpenseData } from '../types/ExpenseData';
import styles from './FlightsEval.module.css';

interface FlightsNormalizedTableProps {
  expenses: ExpenseData[];
}

const FlightsNormalizedTable: React.FC<FlightsNormalizedTableProps> = ({ expenses }) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const rowsPerPage = 10; // 10 data rows (11 including header) as requested

  // Filter only expenses that might be flight-related using raw data
  const potentialFlightExpenses = expenses.filter(expense => {
    // Check if expense is likely a flight
    let isFlightExpense = false;

    // Get raw data for direct field access
    const raw = expense.rawData;
    if (!raw) return false;

    // Check all common expense type fields
    const typeFields = ['expense_type', 'category', 'type', 'expense_category'];
    for (const field of typeFields) {
      const value = raw[field];
      if (value && typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        if (['flight', 'air', 'airfare', 'airline', 'plane ticket'].some(keyword =>
          lowerValue.includes(keyword))) {
          isFlightExpense = true;
          break;
        }
      }
    }

    // Check all common vendor fields
    if (!isFlightExpense) {
      const vendorFields = ['merchant', 'vendor', 'merchant_name', 'vendor_name'];
      for (const field of vendorFields) {
        const value = raw[field];
        if (value && typeof value === 'string') {
          const lowerValue = value.toLowerCase();
          if (['air', 'airline', 'airways', 'flight'].some(keyword =>
            lowerValue.includes(keyword))) {
            isFlightExpense = true;
            break;
          }
        }
      }
    }

    // Check all common description fields
    if (!isFlightExpense) {
      const descFields = ['description', 'memo', 'notes', 'purpose'];
      for (const field of descFields) {
        const value = raw[field];
        if (value && typeof value === 'string') {
          const lowerValue = value.toLowerCase();
          if (['flight', 'ticket', 'air travel', 'plane'].some(keyword =>
            lowerValue.includes(keyword))) {
            isFlightExpense = true;
            break;
          }
        }
      }
    }

    return isFlightExpense;
  });

  return (
    <div>
      <h4 className="mb-3">Flights Normalized Table</h4>
      <p className="text-muted">
        This table shows normalized expense data for potential flight expenses, highlighting key fields needed for matching.
      </p>
      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Expense ID</th>
              <th>Employee Name</th>
              <th>Vendor</th>
              <th>Card Last 4</th>
              <th>Amount</th>
              <th>Currency</th>
              <th>Expense Date</th>
              <th>Expense Type</th>
            </tr>
          </thead>
          <tbody>
            {potentialFlightExpenses
              .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
              .map((expense, index) => {
                // Extract potential booking reference from description
                let bookingRef = null;
                if (expense.description) {
                  // Common patterns for booking references
                  const patterns = [
                    /(?:booking|confirmation|reservation|pnr|reference)(?:\s*(?:id|number|code|#))?\s*[:#]?\s*([a-z0-9]{5,10})/i,
                    /(?:ticket|itinerary|trip)(?:\s*(?:id|number|#))?\s*[:#]?\s*([a-z0-9]{5,10})/i,
                    /(?:record locator|locator code|record)\s*[:#]?\s*([a-z0-9]{5,8})/i,
                    /\b([a-z]{2}[0-9]{4,6})\b/i,  // 2 letters + 4-6 digits
                    /\b([a-z0-9]{6})\b/i,         // 6 alphanumeric characters
                  ];

                  for (const pattern of patterns) {
                    const match = expense.description.match(pattern);
                    if (match && match[1]) {
                      bookingRef = match[1].toUpperCase();
                      break;
                    }
                  }
                }

                // The actual index in the potentialFlightExpenses array
                const expenseIndex = (currentPage - 1) * rowsPerPage + index;

                // Direct access to raw data
                const raw = expense.rawData;

                // Check if there's an expense_id field directly in the raw data
                // Log all fields that look like they might contain an expense ID
                const idFields = Object.keys(raw).filter(key =>
                  key.toLowerCase().includes('id') ||
                  key.toLowerCase().includes('expense') ||
                  key.toLowerCase().includes('number')
                );

                if (expenseIndex < 3) {
                  console.log(`[FlightsNormalizedTable] Row ${expenseIndex} potential ID fields:`, idFields);
                }

                // Try to get expense_id directly from raw data
                const expenseId = raw['expense_id'] || raw['expense_key'] ||
                                 raw['id'] || raw['expense'] ||
                                 raw['expense_number'] || raw['transaction_id'] ||
                                 `expense-${expenseIndex}`;

                return (
                  <tr key={expenseIndex}>
                    <td className={styles.textHighlight}>
                      {/* Display the raw expense_id or equivalent field */}
                      {expenseId}
                    </td>
                    <td>
                      {/* Try different employee/cardholder field variations */}
                      {raw['employee'] || raw['employee_name'] || raw['cardholder'] ||
                       raw['cardholder_name'] || '[No employee name]'}
                    </td>
                    <td>
                      {/* Try different vendor field variations */}
                      {raw['merchant'] || raw['vendor'] || raw['merchant_name'] ||
                       raw['vendor_name'] || '[No vendor]'}
                    </td>
                    <td className={styles.textHighlight}>
                      {expense.cardLast4Normalized && expense.cardLast4Normalized !== '[No card last 4 found]'
                        ? expense.cardLast4Normalized
                        : <Badge bg="warning">Missing</Badge>}
                    </td>
                    <td>
                      {/* Try to get amount directly */}
                      {raw['amount']
                        ? Number(raw['amount']).toFixed(2)
                        : raw['total']
                          ? Number(raw['total']).toFixed(2)
                          : '[No amount]'}
                    </td>
                    <td>
                      {/* Try different currency field variations */}
                      {raw['currency'] || raw['currency_code'] || '[No currency]'}
                    </td>
                    <td>
                      {/* Try different date field variations */}
                      {raw['expense_date'] || raw['date'] || raw['transaction_date'] ||
                       raw['posted_date'] || '[No date]'}
                    </td>
                    <td>
                      {/* Try different type field variations */}
                      {raw['expense_type'] || raw['category'] || raw['type'] ||
                       raw['expense_category'] || '[No type]'}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {potentialFlightExpenses.length > rowsPerPage && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div>
            <strong>Current Page:</strong> Showing {Math.min((currentPage - 1) * rowsPerPage + 1, potentialFlightExpenses.length)} to {Math.min(currentPage * rowsPerPage, potentialFlightExpenses.length)} of {potentialFlightExpenses.length} entries
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
            {Array.from({ length: Math.min(5, Math.ceil(potentialFlightExpenses.length / rowsPerPage)) }, (_, i) => {
              const pageNum = currentPage > 3 && Math.ceil(potentialFlightExpenses.length / rowsPerPage) > 5
                ? currentPage - 3 + i + (currentPage > Math.ceil(potentialFlightExpenses.length / rowsPerPage) - 2
                  ? Math.ceil(potentialFlightExpenses.length / rowsPerPage) - 5 - (currentPage - Math.ceil(potentialFlightExpenses.length / rowsPerPage) - 2)
                  : 0)
                : i + 1;

              if (pageNum <= Math.ceil(potentialFlightExpenses.length / rowsPerPage)) {
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
              onClick={() => setCurrentPage(currentPage < Math.ceil(potentialFlightExpenses.length / rowsPerPage) ? currentPage + 1 : currentPage)}
              disabled={currentPage >= Math.ceil(potentialFlightExpenses.length / rowsPerPage)}
            />
            <Pagination.Last
              onClick={() => setCurrentPage(Math.ceil(potentialFlightExpenses.length / rowsPerPage))}
              disabled={currentPage >= Math.ceil(potentialFlightExpenses.length / rowsPerPage)}
            />
          </Pagination>
        </div>
      )}

      <div className="alert alert-info mt-3">
        <p className="mb-0">
          <strong>Found {potentialFlightExpenses.length} potential flight expenses</strong> out of {expenses.length} total expenses.
          The Flights Normalized Table helps identify key matching criteria like card last 4 digits, vendor names, and amounts.
        </p>
      </div>
    </div>
  );
};

export default FlightsNormalizedTable;