import { useEffect, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

function SavingsGoals() {
  const [goals, setGoals] = useState([]);
  const [summary, setSummary] = useState({
    totalGoals: 0,
    totalTargetAmount: 0,
    totalSavedAmount: 0,
    completedGoals: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    targetAmount: "",
    currentAmount: "0",
    targetDate: "",
  });

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount || 0);

  const loadGoals = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/savings-goals");

      setGoals(response.data.goals || []);
      setSummary(
        response.data.summary || {
          totalGoals: 0,
          totalTargetAmount: 0,
          totalSavedAmount: 0,
          completedGoals: 0,
        }
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load savings goals."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const resetForm = () => {
    setForm({
      name: "",
      targetAmount: "",
      currentAmount: "0",
      targetDate: "",
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
        name: form.name.trim(),
        targetAmount: Number(form.targetAmount),
        currentAmount: Number(form.currentAmount),
        targetDate: form.targetDate || null,
      };

      if (editingId) {
        await api.put(`/savings-goals/${editingId}`, payload);
        setSuccess("Savings goal updated successfully.");
      } else {
        await api.post("/savings-goals", payload);
        setSuccess("Savings goal created successfully.");
      }

      resetForm();
      await loadGoals();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save savings goal."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (goal) => {
    setEditingId(goal._id);

    setForm({
      name: goal.name,
      targetAmount: String(goal.targetAmount),
      currentAmount: String(goal.currentAmount),
      targetDate: goal.targetDate
        ? goal.targetDate.slice(0, 10)
        : "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (goalId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this savings goal?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(`/savings-goals/${goalId}`);

      setSuccess("Savings goal deleted successfully.");

      if (editingId === goalId) {
        resetForm();
      }

      await loadGoals();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to delete savings goal."
      );
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return "#22c55e";
    if (percentage >= 75) return "#6366f1";
    if (percentage >= 50) return "#0ea5e9";
    return "#eab308";
  };

  const renderGoalCard = (goal) => {
    const percentage = Math.max(0, goal.percentage || 0);
    const progressWidth = Math.min(percentage, 100);

    return (
      <div className="savings-goal-card" key={goal._id}>
        <div className="savings-goal-header">
          <div>
            <h3>{goal.name}</h3>

            {goal.achieved ? (
              <span className="goal-completed-label">
                Goal Completed
              </span>
            ) : (
              <span className="goal-active-label">
                In Progress
              </span>
            )}
          </div>

          <div className="savings-goal-actions">
            <button
              type="button"
              className="goal-edit-btn"
              onClick={() => handleEdit(goal)}
            >
              Edit
            </button>

            <button
              type="button"
              className="goal-delete-btn"
              onClick={() => handleDelete(goal._id)}
            >
              Delete
            </button>
          </div>
        </div>

        <div className="goal-amount">
          {formatCurrency(goal.currentAmount)}
          <span> saved of {formatCurrency(goal.targetAmount)}</span>
        </div>

        <div className="goal-progress-track">
          <div
            className="goal-progress-fill"
            style={{
              width: `${progressWidth}%`,
              backgroundColor: getProgressColor(percentage),
            }}
          />
        </div>

        <div className="goal-progress-info">
          <span>{percentage.toFixed(2)}% completed</span>
          <span>
            {formatCurrency(goal.remainingAmount)} remaining
          </span>
        </div>

        <div className="goal-footer">
          <span>
            <strong>Target date:</strong>{" "}
            {goal.targetDate
              ? new Date(goal.targetDate).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  timeZone: "UTC",
                })
              : "Not set"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-content">
        <Navbar />

        <div className="page-container">
          <div className="page-header">
            <h1>Savings Goals</h1>
            <p>
              Set financial goals, track your savings and achieve your dreams.
            </p>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="goal-success">{success}</div>}

          {loading ? (
            <div className="content-card">
              <p>Loading savings goals...</p>
            </div>
          ) : (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Total Goals</h3>
                  <h2>{summary.totalGoals}</h2>
                </div>

                <div className="stat-card">
                  <h3>Total Target Amount</h3>
                  <h2>{formatCurrency(summary.totalTargetAmount)}</h2>
                </div>

                <div className="stat-card">
                  <h3>Total Saved Amount</h3>
                  <h2>{formatCurrency(summary.totalSavedAmount)}</h2>
                </div>

                <div className="stat-card">
                  <h3>Completed Goals</h3>
                  <h2>{summary.completedGoals}</h2>
                </div>
              </div>

              <div className="content-card">
                <h2>{editingId ? "Edit Savings Goal" : "Create Savings Goal"}</h2>

                <form
                  className="savings-goal-form"
                  onSubmit={handleSubmit}
                >
                  <div className="form-group">
                    <label>Goal Name</label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Example: Buy New Laptop"
                      maxLength={100}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Target Amount (₹)</label>
                    <input
                      type="number"
                      name="targetAmount"
                      value={form.targetAmount}
                      onChange={handleChange}
                      placeholder="Enter target amount"
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Current Saved Amount (₹)</label>
                    <input
                      type="number"
                      name="currentAmount"
                      value={form.currentAmount}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Target Date</label>
                    <input
                      type="date"
                      name="targetDate"
                      value={form.targetDate}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="savings-goal-form-actions">
                    <button
                      type="submit"
                      className="primary-btn"
                      disabled={saving}
                    >
                      {saving
                        ? "Saving..."
                        : editingId
                        ? "Update Goal"
                        : "Create Goal"}
                    </button>

                    {editingId && (
                      <button
                        type="button"
                        className="goal-cancel-btn"
                        onClick={resetForm}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="savings-goals-section">
                <h2>My Savings Goals</h2>

                {goals.length === 0 ? (
                  <div className="content-card">
                    <p>
                      No savings goals found. Create your first goal above.
                    </p>
                  </div>
                ) : (
                  <div className="savings-goals-grid">
                    {goals.map(renderGoalCard)}
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

export default SavingsGoals;