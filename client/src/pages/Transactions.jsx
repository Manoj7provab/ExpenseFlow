import { useCallback, useEffect, useState } from "react";

import {
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Download,
} from "lucide-react";

import toast from "react-hot-toast";

import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import TransactionTable from "../components/TransactionTable";

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({});

  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [categoryInput, setCategoryInput] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [loading, setLoading] = useState(true);

  // DEBOUNCE SEARCH
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // LOAD TRANSACTIONS
  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get("/transactions", {
        params: {
          page,
          limit,
          type: type || undefined,
          category: category || undefined,
          search: search || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      });

      setTransactions(response.data.transactions || []);
      setPagination(response.data.pagination || {});

    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        "Unable to load transactions"
      );
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    type,
    category,
    search,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // FILTER HANDLER
  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(1);
  };

  // RESET FILTERS
  const resetFilters = () => {
    setType("");
    setCategory("");
    setCategoryInput("");

    setSearchInput("");
    setSearch("");

    setDateFrom("");
    setDateTo("");

    setLimit(10);
    setPage(1);
  };

  // EXPORT TRANSACTIONS TO CSV
  const exportCSV = () => {
    if (!transactions.length) {
      toast.error("No transactions available to export");
      return;
    }

    const headers = [
      "Category",
      "Type",
      "Amount",
      "Account",
      "Date",
      "Description",
    ];

    // Escape text values for CSV
    const escapeCSV = (value) => {
      let text = String(value ?? "");

      // Prevent spreadsheet formula injection
      if (/^[\s]*[=+\-@]/.test(text)) {
        text = "'" + text;
      }

      return `"${text.replace(/"/g, '""')}"`;
    };

    const rows = transactions.map((item) => [
      escapeCSV(item.category),
      escapeCSV(item.type),
      Number(item.amount) || 0,
      escapeCSV(item.account?.name || ""),
      escapeCSV(
        new Date(item.date).toLocaleDateString("en-IN")
      ),
      escapeCSV(item.note || ""),
    ]);

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\r\n");

    const blob = new Blob(
      ["\uFEFF" + csvContent],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "ExpenseFlow_Transactions.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    toast.success("CSV exported successfully");
  };

  return (
    <div className="dashboard">

      <Sidebar />

      <main className="main-content">

        <Navbar title="Transactions" />

        <section className="panel transaction-panel">

          {/* SEARCH AND TYPE FILTER */}

          <div className="transaction-toolbar">

            <div className="search-box">

              <Search size={18} />

              <input
                type="search"
                placeholder="Search category, note or amount..."
                value={searchInput}
                onChange={(e) =>
                  setSearchInput(e.target.value)
                }
              />

            </div>

            <select
              value={type}
              onChange={(e) =>
                handleFilterChange(
                  setType,
                  e.target.value
                )
              }
            >
              <option value="">All Transactions</option>
              <option value="Income">Income</option>
              <option value="Expense">Expense</option>
            </select>

            {/* CSV EXPORT */}

            <button
              type="button"
              className="export-btn"
              onClick={exportCSV}
            >
              <Download size={17} />
              Export CSV
            </button>

          </div>

          {/* ADVANCED FILTERS */}

          <div className="advanced-filters">

            <input
              type="text"
              placeholder="Filter by category"
              value={categoryInput}
              onChange={(e) =>
                setCategoryInput(e.target.value)
              }
            />

            <button
              type="button"
              onClick={() =>
                handleFilterChange(
                  setCategory,
                  categoryInput.trim()
                )
              }
            >
              Apply Category
            </button>

            <label>
              From:

              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) =>
                  handleFilterChange(
                    setDateFrom,
                    e.target.value
                  )
                }
              />
            </label>

            <label>
              To:

              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) =>
                  handleFilterChange(
                    setDateTo,
                    e.target.value
                  )
                }
              />
            </label>

            <select
              value={limit}
              onChange={(e) =>
                handleFilterChange(
                  setLimit,
                  Number(e.target.value)
                )
              }
            >
              <option value={10}>10 Records</option>
              <option value={20}>20 Records</option>
              <option value={50}>50 Records</option>
            </select>

            <button
              type="button"
              className="reset-filter-btn"
              onClick={resetFilters}
            >
              <RotateCcw size={15} />
              Reset Filters
            </button>

          </div>

          {/* TRANSACTION TABLE */}

          {loading ? (

            <div className="loading-screen">
              <div className="loader"></div>
              <p>Loading transactions...</p>
            </div>

          ) : (

            <>

              <TransactionTable
                transactions={transactions}
              />

              {/* PAGINATION */}

              <div className="pagination">

                <span>
                  {pagination.total || 0} transactions
                </span>

                <div>

                  <button
                    disabled={!pagination.hasPreviousPage}
                    onClick={() =>
                      setPage((previous) => previous - 1)
                    }
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <span>
                    Page {pagination.page || 1} of{" "}
                    {pagination.totalPages || 1}
                  </span>

                  <button
                    disabled={!pagination.hasNextPage}
                    onClick={() =>
                      setPage((previous) => previous + 1)
                    }
                  >
                    <ChevronRight size={18} />
                  </button>

                </div>

              </div>

            </>

          )}

        </section>

      </main>

    </div>
  );
};

export default Transactions;