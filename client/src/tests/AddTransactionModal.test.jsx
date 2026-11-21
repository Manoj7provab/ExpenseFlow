import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddTransactionModal from "../components/AddTransactionModal";

const { mockPost, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("../services/api", () => ({
  default: {
    post: mockPost,
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

const accounts = [
  {
    _id: "account123",
    name: "Main Cash",
    type: "Cash",
  },
];

describe("Add Transaction Modal Tests", () => {
  let onClose;
  let onSuccess;

  beforeEach(() => {
    vi.clearAllMocks();
    onClose = vi.fn();
    onSuccess = vi.fn().mockResolvedValue(undefined);
  });

  test("should render transaction form", () => {
    render(
      <AddTransactionModal
        accounts={accounts}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    expect(screen.getByText("Add Transaction")).toBeInTheDocument();
    expect(screen.getByLabelText("Amount (₹)")).toBeInTheDocument();
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(screen.getByLabelText("Select Account")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Transaction" })).toBeInTheDocument();
  });

  test("should change transaction type to Income", async () => {
    const user = userEvent.setup();

    render(
      <AddTransactionModal
        accounts={accounts}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    await user.click(screen.getByRole("button", { name: "Income" }));

    expect(screen.getByRole("button", { name: "Income" })).toHaveClass("active");
  });

  test("should submit transaction successfully", async () => {
    const user = userEvent.setup();

    mockPost.mockResolvedValueOnce({
      data: { success: true },
    });

    render(
      <AddTransactionModal
        accounts={accounts}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    await user.type(screen.getByLabelText("Amount (₹)"), "500");
    await user.type(screen.getByLabelText("Category"), "Food");
    await user.selectOptions(
      screen.getByLabelText("Select Account"),
      "account123"
    );
    await user.type(
      screen.getByLabelText("Description (Optional)"),
      "Lunch expense"
    );

    await user.click(
      screen.getByRole("button", { name: "Save Transaction" })
    );

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/transactions",
        expect.objectContaining({
          amount: 500,
          type: "Expense",
          category: "Food",
          accountId: "account123",
          note: "Lunch expense",
          recurring: false,
        })
      );
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Transaction added successfully!"
    );

    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  test("should show error when transaction API fails", async () => {
    const user = userEvent.setup();

    mockPost.mockRejectedValueOnce({
      response: {
        data: {
          message: "Account not found",
        },
      },
    });

    render(
      <AddTransactionModal
        accounts={accounts}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    await user.type(screen.getByLabelText("Amount (₹)"), "500");
    await user.type(screen.getByLabelText("Category"), "Food");
    await user.selectOptions(
      screen.getByLabelText("Select Account"),
      "account123"
    );

    await user.click(
      screen.getByRole("button", { name: "Save Transaction" })
    );

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Account not found");
    });

    expect(onClose).not.toHaveBeenCalled();
  });
});