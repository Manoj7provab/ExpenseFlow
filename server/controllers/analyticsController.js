const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");

const TIME_ZONE = "Asia/Kolkata";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Convert current time into Indian calendar date parts.
const getISTParts = (date) => {
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);

  return {
    year: istDate.getUTCFullYear(),
    month: istDate.getUTCMonth(),
    day: istDate.getUTCDate(),
    weekday: istDate.getUTCDay(),
  };
};

// Create a Date representing midnight in India.
const createISTDate = (year, monthIndex, day) =>
  new Date(
    Date.UTC(year, monthIndex, day) - IST_OFFSET_MS
  );

// Calculate the beginning of the selected period.
const getPeriodStart = (period, now) => {
  const { year, month, day, weekday } = getISTParts(now);

  switch (period) {
    case "week": {
      // Monday is the first day of the week.
      const daysSinceMonday = (weekday + 6) % 7;

      return createISTDate(
        year,
        month,
        day - daysSinceMonday
      );
    }

    case "month":
      return createISTDate(year, month, 1);

    case "3months":
      return createISTDate(year, month - 2, 1);

    case "year":
      return createISTDate(year, 0, 1);

    default:
      return createISTDate(year, month, 1);
  }
};

// GET ANALYTICS SUMMARY
const getAnalyticsSummary = async (req, res, next) => {
  try {
    const allowedPeriods = ["week", "month", "3months", "year"];

    const period = allowedPeriods.includes(req.query.period)
      ? req.query.period
      : "month";

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const now = new Date();
    const startDate = getPeriodStart(period, now);

    // Choose trend grouping based on selected period.
    const groupUnit =
      period === "3months"
        ? "week"
        : period === "year"
          ? "month"
          : "day";

    const labelFormat =
      period === "year" ? "%b %Y" : "%d %b";

    const matchStage = {
      user: userId,
      date: {
        $gte: startDate,
        $lte: now,
      },
    };

    // Income, expenses and transaction count for selected period.
    const totals = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalIncome =
      totals.find((item) => item._id === "Income")?.total || 0;

    const totalExpenses =
      totals.find((item) => item._id === "Expense")?.total || 0;

    const totalTransactions = totals.reduce(
      (sum, item) => sum + item.count,
      0
    );

    const savings = totalIncome - totalExpenses;

    const savingsRate =
      totalIncome > 0
        ? Number(((savings / totalIncome) * 100).toFixed(2))
        : 0;

    // Income vs expense trend for selected period.
    const trendResults = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateTrunc: {
              date: "$date",
              unit: groupUnit,
              startOfWeek: "monday",
              timezone: TIME_ZONE,
            },
          },
          income: {
            $sum: {
              $cond: [
                { $eq: ["$type", "Income"] },
                "$amount",
                0,
              ],
            },
          },
          expense: {
            $sum: {
              $cond: [
                { $eq: ["$type", "Expense"] },
                "$amount",
                0,
              ],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          income: 1,
          expense: 1,
        },
      },
    ]);

    const trendData = trendResults.map((item) => ({
      date: item.date,
      label: new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        ...(period === "year" ? { year: "numeric" } : {}),
        timeZone: TIME_ZONE,
      }).format(item.date),
      income: item.income,
      expense: item.expense,
    }));

    // Expense breakdown by category for selected period.
    const categoryData = await Transaction.aggregate([
      {
        $match: {
          ...matchStage,
          type: "Expense",
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
      { $sort: { total: -1 } },
      {
        $project: {
          _id: 0,
          category: "$_id",
          amount: "$total",
        },
      },
    ]);

    const highestSpendingCategory =
      categoryData.length > 0
        ? {
            category: categoryData[0].category,
            amount: categoryData[0].amount,
          }
        : null;

    return res.status(200).json({
      success: true,
      period,
      range: {
        startDate,
        endDate: now,
      },
      summary: {
        totalIncome,
        totalExpenses,
        savings,
        savingsRate,
        totalTransactions,
        highestSpendingCategory,
      },
      trendData,
      categoryData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalyticsSummary,
};