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

  // Filter only expenses that might be flight-related
  const potentialFlightExpenses = expenses.filter(expense => {
    // Check if expense is likely a flight
    let isFlightExpense = false;

    // Check expense type
    if (expense.expenseType && typeof expense.expenseType === 'string') {
      if (['flight', 'air', 'airfare', 'airline', 'plane ticket'].some(keyword =>
        expense.expenseType!.toLowerCase().includes(keyword))) {
        isFlightExpense = true;
      }
    }

    // Check vendor
    if (!isFlightExpense && expense.vendor && typeof expense.vendor === 'string') {
      if (['air', 'airline', 'airways', 'flight'].some(keyword =>
        expense.vendor!.toLowerCase().includes(keyword))) {
        isFlightExpense = true;
      }
    }

    // Check description
    if (!isFlightExpense && expense.description && typeof expense.description === 'string') {
      if (['flight', 'ticket', 'air travel', 'plane'].some(keyword =>
        expense.description!.toLowerCase().includes(keyword))) {
        isFlightExpense = true;
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

                return (
                  <tr key={expenseIndex}>
                    <td className={styles.textHighlight}>{expense.id || '[No expense ID]'}</td>
                    <td>{expense.employeeName || '[No employee name]'}</td>
                    <td>{expense.vendor || '[No vendor]'}</td>
                    <td className={styles.textHighlight}>
                      {expense.cardLast4Normalized && expense.cardLast4Normalized !== '[No card last 4 found]'
                        ? expense.cardLast4Normalized
                        : <Badge bg="warning">Missing</Badge>}
                    </td>
                    <td>{expense.amount !== undefined ? expense.amount.toFixed(2) : '[No amount]'}</td>
                    <td>{expense.currency || '[No currency]'}</td>
                    <td>{expense.expenseDate || '[No date]'}</td>
                    <td>{expense.expenseType || '[No type]'}</td>
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