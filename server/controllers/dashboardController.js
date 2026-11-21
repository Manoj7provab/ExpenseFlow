const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const Account = require("../models/Account");

const getDashboardSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const now = new Date();

    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    );

    const [summary, accounts, monthly] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(userId),
          },
        },
        {
          $group: {
            _id: "$type",
            total: { $sum: "$amount" },
          },
        },
      ]),

      Account.find({
        user: userId,
        isActive: true,
      }).lean(),

      Transaction.aggregate([
        {
          $match: {
            user: new (require("mongoose").Types.ObjectId)(userId),
            date: {
              $gte: monthStart,
              $lt: monthEnd,
            },
          },
        },
        {
          $group: {
            _id: "$type",
            total: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const getTotal = (data, type) =>
      data.find((item) => item._id === type)?.total || 0;

    const totalIncome = getTotal(summary, "Income");
    const totalExpenses = getTotal(summary, "Expense");

    const monthlyIncome = getTotal(monthly, "Income");
    const monthlyExpenses = getTotal(monthly, "Expense");

    const totalOpeningBalance = accounts.reduce(
      (sum, account) => sum + account.openingBalance,
      0
    );

    const currentBalance =
      totalOpeningBalance + totalIncome - totalExpenses;

    const recentTransactions = await Transaction.find({
      user: userId,
    })
      .populate("account", "name type")
      .sort({ date: -1, createdAt: -1 })
      .limit(10)
      .lean();

    return res.status(200).json({
      success: true,
      summary: {
        totalBalance: currentBalance,
        totalIncome,
        totalExpenses,
        monthlyIncome,
        monthlyExpenses,
        monthlyNetSavings: monthlyIncome - monthlyExpenses,
        totalOpeningBalance,
      },
      accounts,
      recentTransactions,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardSummary };