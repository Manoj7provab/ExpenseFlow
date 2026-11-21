import { useEffect, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const accountTypes = [
  "Cash",
  "Bank Account",
  "Credit Card",
  "Wallet",
  "Savings",
];

function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState({
    totalAccounts: 0,
    combinedBalance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    type: "Cash",
    openingBalance: "0",
  });

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount || 0);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/accounts");

      setAccounts(response.data.accounts || []);
      setSummary(
        response.data.summary || {
          totalAccounts: 0,
          combinedBalance: 0,
        }
      );
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api.post("/accounts", {
        name: form.name.trim(),
        type: form.type,
        openingBalance: Number(form.openingBalance),
      });

      setForm({
        name: "",
        type: "Cash",
        openingBalance: "0",
      });

      await loadAccounts();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create account.");
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-content">
        <Navbar />

        <div className="page-container">
          <div className="page-header">
            <h1>Accounts & Wallets</h1>
            <p>Manage your cash, bank accounts and wallets.</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Accounts</h3>
              <h2>{summary.totalAccounts}</h2>
            </div>

            <div className="stat-card">
              <h3>Combined Balance</h3>
              <h2>{formatCurrency(summary.combinedBalance)}</h2>
            </div>
          </div>

          <div className="content-card">
            <h2>Add New Account</h2>

            <form onSubmit={handleSubmit} className="account-form">
              <div className="form-group">
                <label>Account Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Example: My Savings"
                  maxLength={50}
                  required
                />
              </div>

              <div className="form-group">
                <label>Account Type</label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                >
                  {accountTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Opening Balance (₹)</label>
                <input
                  type="number"
                  name="openingBalance"
                  value={form.openingBalance}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <button type="submit" className="primary-btn">
                Add Account
              </button>
            </form>
          </div>

          <div className="content-card">
            <h2>My Accounts</h2>

            {loading ? (
              <p>Loading accounts...</p>
            ) : accounts.length === 0 ? (
              <p>No accounts found. Create your first account above.</p>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Account Name</th>
                      <th>Type</th>
                      <th>Opening Balance</th>
                      <th>Income</th>
                      <th>Expenses</th>
                      <th>Current Balance</th>
                    </tr>
                  </thead>

                  <tbody>
                    {accounts.map((account) => (
                      <tr key={account._id}>
                        <td>{account.name}</td>
                        <td>{account.type}</td>
                        <td>{formatCurrency(account.openingBalance)}</td>
                        <td>{formatCurrency(account.totalIncome)}</td>
                        <td>{formatCurrency(account.totalExpenses)}</td>
                        <td>
                          <strong>
                            {formatCurrency(account.currentBalance)}
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Accounts;