const mongoose = require("mongoose");
const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");

const getCurrentMonth = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year").value;
  const month = parts.find((part) => part.type === "month").value;

  return `${year}-${month}`;
};

const getMonthRange = (monthString) => {
  const [year, month] = monthString.split("-").map(Number);

  const start = new Date(
    `${monthString}-01T00:00:00+05:30`
  );

  const nextMonthDate = new Date(Date.UTC(year, month, 1));
  const nextYear = nextMonthDate.getUTCFullYear();
  const nextMonth = String(nextMonthDate.getUTCMonth() + 1).padStart(2, "0");

  const end = new Date(
    `${nextYear}-${nextMonth}-01T00:00:00+05:30`
  );

  return { start, end };
};

const getAlert = (percentage) => {
  if (percentage >= 100) {
    return {
      level: "danger",
      message: "Budget exceeded! You have spent your full budget or more.",
    };
  }

  if (percentage >= 90) {
    return {
      level: "critical",
      message: "Critical: You have used at least 90% of your budget.",
    };
  }

  if (percentage >= 75) {
    return {
      level: "warning",
      message: "Warning: You have used at least 75% of your budget.",
    };
  }

  if (percentage >= 50) {
    return {
      level: "notice",
      message: "Notice: You have used at least 50% of your budget.",
    };
  }

  return {
    level: "normal",
    message: "Your spending is within budget.",
  };
};

const calculateBudget = (budget, spent) => {
  const amount = budget.amount;
  const remaining = amount - spent;
  const percentage = (spent / amount) * 100;

  return {
    _id: budget._id,
    month: budget.month,
    category: budget.category,
    amount,
    spent,
    remaining,
    percentage: Number(percentage.toFixed(2)),
    alert: getAlert(percentage),
  };
};

// CREATE OR UPDATE A MONTHLY BUDGET
const saveBudget = async (req, res, next) => {
  try {
    const {
      amount,
      category = null,
      month = getCurrentMonth(),
    } = req.body;

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: "Month must be in YYYY-MM format.",
      });
    }

    const normalizedCategory =
      typeof category === "string" && category.trim()
        ? category.trim()
        : null;

    const { start } = getMonthRange(month);

    const budget = await Budget.findOneAndUpdate(
      {
        user: req.user.id,
        month: start,
        category: normalizedCategory,
      },
      {
        $set: {
          amount: Number(amount),
          category: normalizedCategory,
        },
        $setOnInsert: {
          user: req.user.id,
          month: start,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Budget saved successfully.",
      budget,
    });
  } catch (error) {
    next(error);
  }
};

// GET MONTHLY AND CATEGORY BUDGETS WITH ACTUAL SPENDING
const getBudgets = async (req, res, next) => {
  try {
    const month = req.query.month || getCurrentMonth();

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: "Month must be in YYYY-MM format.",
      });
    }

    const { start, end } = getMonthRange(month);
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const [budgets, expenseData] = await Promise.all([
      Budget.find({
        user: req.user.id,
        month: start,
      }).sort({ category: 1 }),

      Transaction.aggregate([
        {
          $match: {
            user: userId,
            type: "Expense",
            date: {
              $gte: start,
              $lt: end,
            },
          },
        },
        {
          $group: {
            _id: "$category",
            total: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const totalExpenses = expenseData.reduce(
      (total, item) => total + item.total,
      0
    );

    const overallBudget = budgets.find(
      (budget) => !budget.category
    );

    const categoryBudgets = budgets.filter(
      (budget) => Boolean(budget.category)
    );

    const categorySpentMap = new Map(
      expenseData.map((item) => [item._id, item.total])
    );

    return res.status(200).json({
      success: true,
      month,

      totalExpenses,

      overallBudget: overallBudget
        ? calculateBudget(overallBudget, totalExpenses)
        : null,

      categoryBudgets: categoryBudgets.map((budget) =>
        calculateBudget(
          budget,
          categorySpentMap.get(budget.category) || 0
        )
      ),
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE AN EXISTING BUDGET
const updateBudget = async (req, res, next) => {
  try {
    const { amount } = req.body;

    const budget = await Budget.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.id,
      },
      {
        $set: { amount: Number(amount) },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Budget updated successfully.",
      budget,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE A BUDGET
const deleteBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Budget deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  saveBudget,
  getBudgets,
  updateBudget,
  deleteBudget,
};