import { useEffect, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function Budgets() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [data, setData] = useState({
    totalExpenses: 0,
    overallBudget: null,
    categoryBudgets: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    amount: "",
    category: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount || 0);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/budgets", {
        params: { month },
      });

      setData({
        totalExpenses: response.data.totalExpenses || 0,
        overallBudget: response.data.overallBudget || null,
        categoryBudgets: response.data.categoryBudgets || [],
      });
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load budgets."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, [month]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const resetForm = () => {
    setForm({
      amount: "",
      category: "",
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        amount: Number(form.amount),
        month,
        category: form.category.trim() || null,
      };

      if (editingId) {
        await api.put(`/budgets/${editingId}`, {
          amount: payload.amount,
        });
        setSuccess("Budget updated successfully.");
      } else {
        await api.post("/budgets", payload);
        setSuccess("Budget saved successfully.");
      }

      resetForm();
      await loadBudgets();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save budget."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (budget) => {
    setEditingId(budget._id);
    setForm({
      amount: String(budget.amount),
      category: budget.category || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (budgetId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this budget?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(`/budgets/${budgetId}`);

      setSuccess("Budget deleted successfully.");
      await loadBudgets();

      if (editingId === budgetId) {
        resetForm();
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to delete budget."
      );
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return "#ef4444";
    if (percentage >= 90) return "#f97316";
    if (percentage >= 75) return "#eab308";
    if (percentage >= 50) return "#3b82f6";
    return "#22c55e";
  };

  const renderBudgetCard = (budget, title) => {
    const percentage = Math.max(0, budget.percentage || 0);
    const progressWidth = Math.min(percentage, 100);

    return (
      <div className="budget-card" key={budget._id}>
        <div className="budget-card-header">
          <div>
            <h3>{title}</h3>
            <span className="budget-category-label">
              {budget.category || "Overall monthly budget"}
            </span>
          </div>

          <div className="budget-actions">
            <button
              type="button"
              className="budget-edit-btn"
              onClick={() => handleEdit(budget)}
            >
              Edit
            </button>

            <button
              type="button"
              className="budget-delete-btn"
              onClick={() => handleDelete(budget._id)}
            >
              Delete
            </button>
          </div>
        </div>

        <div className="budget-amount">
          {formatCurrency(budget.spent)}
          <span> spent of {formatCurrency(budget.amount)}</span>
        </div>

        <div className="budget-progress-track">
          <div
            className="budget-progress-fill"
            style={{
              width: `${progressWidth}%`,
              backgroundColor: getProgressColor(percentage),
            }}
          />
        </div>

        <div className="budget-progress-info">
          <span>{percentage.toFixed(2)}% used</span>
          <span>
            {formatCurrency(budget.remaining)} remaining
          </span>
        </div>

        <div className={`budget-alert ${budget.alert?.level || "normal"}`}>
          {budget.alert?.message || "Your spending is within budget."}
        </div>
      </div>
    );
  };

  const overall = data.overallBudget;

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-content">
        <Navbar />

        <div className="page-container">
          <div className="page-header budget-page-header">
            <div>
              <h1>Budgets</h1>
              <p>Plan your monthly spending and manage your finances.</p>
            </div>

            <div className="budget-month-picker">
              <label htmlFor="budget-month">Select Month</label>
              <input
                id="budget-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="budget-success">{success}</div>}

          {loading ? (
            <div className="content-card">
              <p>Loading budgets...</p>
            </div>
          ) : (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Total Expenses</h3>
                  <h2>{formatCurrency(data.totalExpenses)}</h2>
                </div>

                <div className="stat-card">
                  <h3>Monthly Budget</h3>
                  <h2>
                    {overall
                      ? formatCurrency(overall.amount)
                      : "Not set"}
                  </h2>
                </div>

                <div className="stat-card">
                  <h3>Remaining Budget</h3>
                  <h2>
                    {overall
                      ? formatCurrency(overall.remaining)
                      : "Not set"}
                  </h2>
                </div>
              </div>

              <div className="content-card">
                <h2>{editingId ? "Edit Budget" : "Add New Budget"}</h2>

                <form
                  className="budget-form"
                  onSubmit={handleSubmit}
                >
                  <div className="form-group">
                    <label>Budget Type</label>
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                    >
                      <option value="">Overall Monthly Budget</option>
                      <option value="Food">Food</option>
                      <option value="Travel">Travel</option>
                      <option value="Shopping">Shopping</option>
                      <option value="Bills">Bills</option>
                      <option value="Rent">Rent</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Health">Health</option>
                      <option value="Education">Education</option>
                      <option value="Subscription">Subscription</option>
                      <option value="Other">Other</option>
                      <option value="Transport">Transport</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Budget Amount (₹)</label>
                    <input
                      type="number"
                      name="amount"
                      value={form.amount}
                      onChange={handleChange}
                      placeholder="Enter budget amount"
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="budget-form-actions">
                    <button
                      type="submit"
                      className="primary-btn"
                      disabled={saving}
                    >
                      {saving
                        ? "Saving..."
                        : editingId
                        ? "Update Budget"
                        : "Save Budget"}
                    </button>

                    {editingId && (
                      <button
                        type="button"
                        className="budget-cancel-btn"
                        onClick={resetForm}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="budget-section">
                <h2>Overall Monthly Budget</h2>

                {overall ? (
                  renderBudgetCard(overall, "Monthly Budget")
                ) : (
                  <div className="content-card">
                    <p>
                      No overall budget set for this month.
                      Create one using the form above.
                    </p>
                  </div>
                )}
              </div>

              <div className="budget-section">
                <h2>Category Budgets</h2>

                {data.categoryBudgets.length === 0 ? (
                  <div className="content-card">
                    <p>
                      No category budgets found for this month.
                      You can add one using the form above.
                    </p>
                  </div>
                ) : (
                  <div className="budget-cards-grid">
                    {data.categoryBudgets.map((budget) =>
                      renderBudgetCard(budget, budget.category)
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Budgets;