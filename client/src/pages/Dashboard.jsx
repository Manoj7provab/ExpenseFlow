import { useCallback, useEffect, useState } from "react";

import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Plus,
} from "lucide-react";

import toast from "react-hot-toast";

import api from "../services/api";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import TransactionTable from "../components/TransactionTable";
import AddTransactionModal from "../components/AddTransactionModal";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount || 0);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTransactionModal, setShowTransactionModal] =
    useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const response = await api.get("/dashboard/summary");
      setData(response.data);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        "Unable to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const summary = data?.summary || {};

  const stats = [
    {
      title: "Total Balance",
      value: formatCurrency(summary.totalBalance),
      icon: Wallet,
      color: "#38bdf8",
      subtitle: "Opening balance + net transactions",
    },
    {
      title: "Total Income",
      value: formatCurrency(summary.totalIncome),
      icon: TrendingUp,
      color: "#22c55e",
      subtitle: "All recorded income",
    },
    {
      title: "Total Expenses",
      value: formatCurrency(summary.totalExpenses),
      icon: TrendingDown,
      color: "#f87171",
      subtitle: "All recorded expenses",
    },
    {
      title: "Monthly Savings",
      value: formatCurrency(summary.monthlyNetSavings),
      icon: PiggyBank,
      color: "#a78bfa",
      subtitle: "Current month income minus expenses",
    },
  ];

  return (
    <div className="dashboard">
      <Sidebar />

      <main className="main-content">
        <Navbar title="Dashboard" />

        {!loading && (
          <div className="dashboard-actions">
            <p className="muted">
              Manage your income and expenses.
            </p>

            <button
              className="add-transaction-button"
              onClick={() => setShowTransactionModal(true)}
              disabled={!data?.accounts?.length}
            >
              <Plus size={19} />
              Add Transaction
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading-screen">
            <div className="loader"></div>
            <p>Loading financial data...</p>
          </div>
        ) : (
          <>
            <section className="stats-grid">
              {stats.map((item) => (
                <StatCard key={item.title} {...item} />
              ))}
            </section>

            <section className="content-grid">
              <div className="panel">
                <h3>Monthly Overview</h3>

                <div className="monthly-overview">
                  <div>
                    <span>Monthly Income</span>
                    <h2 className="income-text">
                      {formatCurrency(summary.monthlyIncome)}
                    </h2>
                  </div>

                  <div>
                    <span>Monthly Expenses</span>
                    <h2 className="expense-text">
                      {formatCurrency(summary.monthlyExpenses)}
                    </h2>
                  </div>
                </div>
              </div>

              <div className="panel">
                <h3>My Accounts</h3>

                {data?.accounts?.length ? (
                  data.accounts.map((account) => (
                    <div
                      className="account-row"
                      key={account._id}
                    >
                      <div>
                        <strong>{account.name}</strong>
                        <small>{account.type}</small>
                      </div>

                      <span>
                        {formatCurrency(account.openingBalance)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="muted">
                    No accounts available.
                  </p>
                )}
              </div>
            </section>

            <section className="panel recent-panel">
              <h3>Recent Transactions</h3>

              <TransactionTable
                transactions={data?.recentTransactions || []}
                onRefresh={loadDashboard}
              />
            </section>
          </>
        )}

        {showTransactionModal && (
          <AddTransactionModal
            accounts={data?.accounts || []}
            onClose={() => setShowTransactionModal(false)}
            onSuccess={loadDashboard}
          />
        )}
      </main>
    </div>
  );
};

export default Dashboard;