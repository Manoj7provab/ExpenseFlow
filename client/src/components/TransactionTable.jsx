import { useState } from "react";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import toast from "react-hot-toast";
import api from "../services/api";

const TransactionTable = ({
  transactions = [],
  onRefresh,
}) => {
  const [editingTransaction, setEditingTransaction] =
    useState(null);

  const [editForm, setEditForm] = useState({
    amount: "",
    type: "Expense",
    category: "",
    note: "",
    date: "",
  });

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount || 0);

  const getDateValue = (date) => {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "";
    }

    const year = parsedDate.getFullYear();
    const month = String(
      parsedDate.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
      parsedDate.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // OPEN EDIT MODAL
  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);

    setEditForm({
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category || "",
      note: transaction.note || "",
      date: getDateValue(transaction.date),
    });
  };

  // HANDLE FORM INPUTS
  const handleChange = (e) => {
    const { name, value } = e.target;

    setEditForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // UPDATE TRANSACTION
  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!editingTransaction) return;

    if (!editForm.amount || Number(editForm.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!editForm.category.trim()) {
      toast.error("Please enter a category");
      return;
    }

    if (!editForm.date) {
      toast.error("Please select a transaction date");
      return;
    }

    try {
      setSaving(true);

      const accountId =
        typeof editingTransaction.account === "string"
          ? editingTransaction.account
          : editingTransaction.account?._id;

      const payload = {
        amount: Number(editForm.amount),
        type: editForm.type,
        category: editForm.category.trim(),
        note: editForm.note.trim(),
        date: editForm.date,
      };

      // Preserve the existing account
      if (accountId) {
        payload.accountId = accountId;
      }

      const response = await api.put(
        `/transactions/${editingTransaction._id}`,
        payload
      );

      if (response.data.success) {
        toast.success("Transaction updated successfully!");

        setEditingTransaction(null);

        if (onRefresh) {
          await onRefresh();
        }
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        "Unable to update transaction"
      );
    } finally {
      setSaving(false);
    }
  };

  // DELETE TRANSACTION
  const handleDelete = async (transactionId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this transaction? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setDeletingId(transactionId);

      const response = await api.delete(
        `/transactions/${transactionId}`
      );

      if (response.data.success) {
        toast.success("Transaction deleted successfully!");

        if (onRefresh) {
          await onRefresh();
        }
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        "Unable to delete transaction"
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (!transactions.length) {
    return (
      <div className="empty-chart">
        <p>No transactions found.</p>
        <small>Your transactions will appear here.</small>
      </div>
    );
  }

  return (
    <>
      <div className="table-wrapper">
        <table className="transaction-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Note</th>
              <th>Account</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {transactions.map((transaction) => {
              const isIncome =
                transaction.type === "Income";

              return (
                <tr key={transaction._id}>
                  <td>
                    <div className="category-cell">
                      {isIncome ? (
                        <ArrowDownLeft
                          color="#22c55e"
                          size={17}
                        />
                      ) : (
                        <ArrowUpRight
                          color="#f87171"
                          size={17}
                        />
                      )}

                      {transaction.category}
                    </div>
                  </td>

                  <td>{transaction.note || "—"}</td>

                  <td>
                    {transaction.account?.name || "—"}
                  </td>

                  <td>
                    {new Date(
                      transaction.date
                    ).toLocaleDateString("en-IN")}
                  </td>

                  <td
                    className={
                      isIncome
                        ? "income-text"
                        : "expense-text"
                    }
                  >
                    {isIncome ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </td>

                  <td>
                    <div className="transaction-actions">
                      <button
                        type="button"
                        className="edit-action"
                        title="Edit transaction"
                        onClick={() =>
                          handleEdit(transaction)
                        }
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        className="delete-action"
                        title="Delete transaction"
                        disabled={
                          deletingId === transaction._id
                        }
                        onClick={() =>
                          handleDelete(transaction._id)
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* EDIT TRANSACTION MODAL */}

      {editingTransaction && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!saving) setEditingTransaction(null);
          }}
        >
          <div
            className="transaction-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Edit Transaction</h2>
                <p>Update your transaction details.</p>
              </div>

              <button
                type="button"
                className="modal-close"
                disabled={saving}
                onClick={() =>
                  setEditingTransaction(null)
                }
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleUpdate}>
              <label>Transaction Type</label>

              <div className="transaction-type-options">
                <button
                  type="button"
                  className={
                    editForm.type === "Income"
                      ? "type-option income active"
                      : "type-option income"
                  }
                  onClick={() =>
                    setEditForm((prev) => ({
                      ...prev,
                      type: "Income",
                    }))
                  }
                >
                  <ArrowDownLeft size={19} />
                  Income
                </button>

                <button
                  type="button"
                  className={
                    editForm.type === "Expense"
                      ? "type-option expense active"
                      : "type-option expense"
                  }
                  onClick={() =>
                    setEditForm((prev) => ({
                      ...prev,
                      type: "Expense",
                    }))
                  }
                >
                  <ArrowUpRight size={19} />
                  Expense
                </button>
              </div>

              <label htmlFor="editAmount">
                Amount (₹)
              </label>

              <input
                id="editAmount"
                type="number"
                name="amount"
                min="0.01"
                step="0.01"
                value={editForm.amount}
                onChange={handleChange}
                required
              />

              <label htmlFor="editCategory">
                Category
              </label>

              <input
                id="editCategory"
                type="text"
                name="category"
                maxLength={50}
                value={editForm.category}
                onChange={handleChange}
                required
              />

              <label htmlFor="editDate">
                Transaction Date
              </label>

              <input
                id="editDate"
                type="date"
                name="date"
                value={editForm.date}
                onChange={handleChange}
                required
              />

              <label htmlFor="editNote">
                Description
              </label>

              <textarea
                id="editNote"
                name="note"
                rows="3"
                maxLength={500}
                value={editForm.note}
                onChange={handleChange}
              />

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  disabled={saving}
                  onClick={() =>
                    setEditingTransaction(null)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-button"
                  disabled={saving}
                >
                  {saving
                    ? "Updating..."
                    : "Update Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default TransactionTable;