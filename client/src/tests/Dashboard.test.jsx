import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Dashboard from "../pages/Dashboard";

const { mockGet, mockToastError } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("../services/api", () => ({
  default: {
    get: mockGet,
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    error: mockToastError,
  },
}));

vi.mock("../components/Sidebar", () => ({
  default: () => <div>Sidebar</div>,
}));

vi.mock("../components/Navbar", () => ({
  default: ({ title }) => <div>{title}</div>,
}));

vi.mock("../components/StatCard", () => ({
  default: ({ title, value }) => (
    <div>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  ),
}));

vi.mock("../components/TransactionTable", () => ({
  default: ({ transactions }) => (
    <div data-testid="transaction-table">
      {transactions.length} transactions
    </div>
  ),
}));

vi.mock("../components/AddTransactionModal", () => ({
  default: () => <div>Add Transaction Modal</div>,
}));

describe("Dashboard Component Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should show loading state while fetching dashboard data", () => {
    mockGet.mockReturnValue(new Promise(() => {}));

    render(<Dashboard />);

    expect(screen.getByText("Loading financial data...")).toBeInTheDocument();
  });

  test("should display dashboard summary and accounts", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        summary: {
          totalBalance: 10000,
          totalIncome: 15000,
          totalExpenses: 5000,
          monthlyNetSavings: 3000,
          monthlyIncome: 8000,
          monthlyExpenses: 5000,
        },
        accounts: [
          {
            _id: "account123",
            name: "Main Cash",
            type: "Cash",
            openingBalance: 5000,
          },
        ],
        recentTransactions: [
          {
            _id: "transaction123",
            amount: 500,
            type: "Expense",
            category: "Food",
          },
        ],
      },
    });

    render(<Dashboard />);

    expect(
      await screen.findByText("Total Balance")
    ).toBeInTheDocument();

    expect(screen.getByText("Total Income")).toBeInTheDocument();
    expect(screen.getByText("Total Expenses")).toBeInTheDocument();
    expect(screen.getByText("Monthly Savings")).toBeInTheDocument();

    expect(screen.getByText("Main Cash")).toBeInTheDocument();
    expect(screen.getByText("Cash")).toBeInTheDocument();

    expect(screen.getByTestId("transaction-table")).toHaveTextContent(
      "1 transactions"
    );

    expect(mockGet).toHaveBeenCalledWith("/dashboard/summary");
  });

  test("should show error when dashboard API fails", async () => {
    mockGet.mockRejectedValueOnce({
      response: {
        data: {
          message: "Unable to load dashboard",
        },
      },
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Unable to load dashboard"
      );
    });

    expect(
      screen.queryByText("Loading financial data...")
    ).not.toBeInTheDocument();
  });
});