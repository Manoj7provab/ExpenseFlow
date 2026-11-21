import { useState } from "react";
import { X, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";

const getToday = () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const AddTransactionModal = ({
  accounts = [],
  onClose,
  onSuccess,
}) => {
  const [form, setForm] = useState({
    amount: "",
    type: "Expense",
    category: "",
    accountId: "",
    note: "",
    date: getToday(),
  });

  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!form.category.trim()) {
      toast.error("Please enter a category");
      return;
    }

    if (!form.accountId) {
      toast.error("Please select an account");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        amount: Number(form.amount),
        type: form.type,
        category: form.category.trim(),
        accountId: form.accountId,
        note: form.note.trim(),
        date: form.date,
        recurring: false,
      };

      const response = await api.post(
        "/transactions",
        payload
      );

      if (response.data.success) {
        toast.success("Transaction added successfully!");

        await onSuccess();
        onClose();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        "Unable to add transaction"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="transaction-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>Add Transaction</h2>
            <p>Record your income or expenses.</p>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={21} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>

          <label>Transaction Type</label>

          <div className="transaction-type-options">
            <button
              type="button"
              className={
                form.type === "Income"
                  ? "type-option income active"
                  : "type-option income"
              }
              onClick={() =>
                setForm((prev) => ({
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
                form.type === "Expense"
                  ? "type-option expense active"
                  : "type-option expense"
              }
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  type: "Expense",
                }))
              }
            >
              <ArrowUpRight size={19} />
              Expense
            </button>
          </div>

          <label htmlFor="amount">Amount (₹)</label>

          <input
            id="amount"
            type="number"
            name="amount"
            placeholder="Enter amount"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={handleChange}
            required
          />

          <label htmlFor="category">Category</label>

          <input
            id="category"
            type="text"
            name="category"
            placeholder="e.g. Salary, Food, Shopping"
            value={form.category}
            onChange={handleChange}
            maxLength={50}
            required
          />

          <label htmlFor="accountId">Select Account</label>

          <select
            id="accountId"
            name="accountId"
            value={form.accountId}
            onChange={handleChange}
            required
          >
            <option value="">Choose an account</option>

            {accounts.map((account) => (
              <option
                key={account._id}
                value={account._id}
              >
                {account.name} ({account.type})
              </option>
            ))}
          </select>

          <label htmlFor="date">Transaction Date</label>

          <input
            id="date"
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            required
          />

          <label htmlFor="note">Description (Optional)</label>

          <textarea
            id="note"
            name="note"
            placeholder="Add transaction details..."
            value={form.note}
            onChange={handleChange}
            rows="3"
            maxLength={500}
          />

          <div className="modal-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="save-button"
              disabled={saving || accounts.length === 0}
            >
              {saving ? "Saving..." : "Save Transaction"}
            </button>
          </div>

          {accounts.length === 0 && (
            <p className="muted">
              Create an account before adding transactions.
            </p>
          )}

        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;