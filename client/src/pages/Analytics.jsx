import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const COLORS = [
  "#6366f1",
  "#06b6d4",
  "#f59e0b",
  "#ec4899",
  "#10b981",
  "#8b5cf6",
  "#f97316",
];

const PERIODS = [
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "3 Months", value: "3months" },
  { label: "Year", value: "year" },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get("/analytics/summary", {
        params: { period },
      });

      setAnalytics(response.data);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to load analytics"
      );
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const summary = analytics?.summary;
  const trendData = analytics?.trendData || [];
  const categoryData = analytics?.categoryData || [];

  const cards = [
    {
      title: "Total Income",
      value: formatCurrency(summary?.totalIncome),
      icon: TrendingUp,
      color: "#10b981",
    },
    {
      title: "Total Expenses",
      value: formatCurrency(summary?.totalExpenses),
      icon: TrendingDown,
      color: "#ef4444",
    },
    {
      title: "Net Savings",
      value: formatCurrency(summary?.savings),
      icon: PiggyBank,
      color: "#6366f1",
    },
    {
      title: "Savings Rate",
      value: `${summary?.savingsRate ?? 0}%`,
      icon: Wallet,
      color: "#06b6d4",
    },
  ];

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Navbar />

        <div className="analytics-page">
          {/* Header */}
          <div className="analytics-header">
            <div>
              <h1>Analytics Overview</h1>
              <p>
                Understand your income, expenses and savings.
              </p>
            </div>

            <button
              className="analytics-refresh"
              onClick={loadAnalytics}
              disabled={loading}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          {/* Period Filters */}
          <div className="analytics-period-section">
            <span>Time Period</span>

            <div className="analytics-period-buttons">
              {PERIODS.map((item) => (
                <button
                  key={item.value}
                  className={`analytics-period-btn ${
                    period === item.value ? "active" : ""
                  }`}
                  onClick={() => setPeriod(item.value)}
                  disabled={loading}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="analytics-loading">
              Loading analytics...
            </div>
          ) : !analytics ? (
            <div className="analytics-empty">
              Unable to display analytics.
              <button onClick={loadAnalytics}>
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="analytics-stats">
                {cards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <div
                      className="analytics-stat-card"
                      key={card.title}
                    >
                      <div
                        className="analytics-stat-icon"
                        style={{ color: card.color }}
                      >
                        <Icon size={23} />
                      </div>

                      <div>
                        <p>{card.title}</p>
                        <h2>{card.value}</h2>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Income vs Expense */}
              <div className="analytics-chart-card">
                <h2>Income vs Expenses</h2>

                <p className="analytics-subtitle">
                  {PERIODS.find(
                    (item) => item.value === period
                  )?.label}{" "}
                  overview
                </p>

                {trendData.length > 0 ? (
                  <div className="analytics-chart">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <BarChart data={trendData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#374151"
                        />

                        <XAxis
                          dataKey="label"
                          stroke="#9ca3af"
                          tick={{ fontSize: 12 }}
                        />

                        <YAxis
                          stroke="#9ca3af"
                          tickFormatter={(value) =>
                            `₹${value}`
                          }
                        />

                        <Tooltip
                          formatter={(value) =>
                            formatCurrency(value)
                          }
                          contentStyle={{
                            background: "#1f2937",
                            border: "1px solid #374151",
                            borderRadius: "10px",
                          }}
                        />

                        <Legend />

                        <Bar
                          dataKey="income"
                          name="Income"
                          fill="#10b981"
                          radius={[5, 5, 0, 0]}
                        />

                        <Bar
                          dataKey="expense"
                          name="Expense"
                          fill="#ef4444"
                          radius={[5, 5, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="analytics-empty">
                    No transactions found for this period.
                  </div>
                )}
              </div>

              {/* Category and Insights */}
              <div className="analytics-bottom-grid">
                <div className="analytics-chart-card">
                  <h2>Expense by Category</h2>

                  <p className="analytics-subtitle">
                    Category-wise spending for selected period
                  </p>

                  {categoryData.length > 0 ? (
                    <>
                      <div className="analytics-pie-chart">
                        <ResponsiveContainer
                          width="100%"
                          height="100%"
                        >
                          <PieChart>
                            <Pie
                              data={categoryData}
                              dataKey="amount"
                              nameKey="category"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              innerRadius={60}
                              paddingAngle={4}
                            >
                              {categoryData.map(
                                (item, index) => (
                                  <Cell
                                    key={item.category}
                                    fill={
                                      COLORS[
                                        index % COLORS.length
                                      ]
                                    }
                                  />
                                )
                              )}
                            </Pie>

                            <Tooltip
                              formatter={(value) =>
                                formatCurrency(value)
                              }
                            />

                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="analytics-category-list">
                        {categoryData.map((item, index) => (
                          <div
                            className="analytics-category-item"
                            key={item.category}
                          >
                            <span
                              className="category-dot"
                              style={{
                                backgroundColor:
                                  COLORS[
                                    index % COLORS.length
                                  ],
                              }}
                            />

                            <span>{item.category}</span>

                            <strong>
                              {formatCurrency(item.amount)}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="analytics-empty">
                      No expenses found for this period.
                    </div>
                  )}
                </div>

                {/* Financial Insights */}
                <div className="analytics-chart-card">
                  <h2>Financial Insights</h2>

                  <p className="analytics-subtitle">
                    Your selected period summary
                  </p>

                  <div className="analytics-insight">
                    <span>Total Transactions</span>
                    <strong>
                      {summary?.totalTransactions ?? 0}
                    </strong>
                  </div>

                  <div className="analytics-insight">
                    <span>Highest Spending Category</span>
                    <strong>
                      {summary?.highestSpendingCategory
                        ?.category || "N/A"}
                    </strong>
                  </div>

                  <div className="analytics-insight">
                    <span>Highest Category Amount</span>
                    <strong>
                      {formatCurrency(
                        summary?.highestSpendingCategory?.amount
                      )}
                    </strong>
                  </div>

                  <div className="analytics-insight">
                    <span>Net Savings</span>
                    <strong>
                      {formatCurrency(summary?.savings)}
                    </strong>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Analytics;