const mongoose = require("mongoose");
const Account = require("../models/Account");
const Transaction = require("../models/Transaction");

const ALLOWED_TYPES = [
  "Cash",
  "Bank Account",
  "Credit Card",
  "Wallet",
  "Savings",
];

// CREATE ACCOUNT
const createAccount = async (req, res, next) => {
  try {
    const { name, type, openingBalance = 0 } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Account name is required",
      });
    }

    if (!ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account type",
      });
    }

    const balance = Number(openingBalance);

    if (!Number.isFinite(balance) || balance < 0) {
      return res.status(400).json({
        success: false,
        message: "Opening balance cannot be negative",
      });
    }

    const accountName = name.trim();

    const existing = await Account.findOne({
      user: req.user.id,
      name: accountName,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Account name already exists",
      });
    }

    const account = await Account.create({
      user: req.user.id,
      name: accountName,
      type,
      openingBalance: balance,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      account,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Account name already exists",
      });
    }

    next(error);
  }
};

// GET ACCOUNTS WITH INDIVIDUAL AND COMBINED BALANCES
const getAccounts = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const accounts = await Account.find({
      user: userId,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    const accountTransactions = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          account: {
            $in: accounts.map((account) => account._id),
          },
        },
      },
      {
        $group: {
          _id: "$account",
          totalIncome: {
            $sum: {
              $cond: [
                { $eq: ["$type", "Income"] },
                "$amount",
                0,
              ],
            },
          },
          totalExpenses: {
            $sum: {
              $cond: [
                { $eq: ["$type", "Expense"] },
                "$amount",
                0,
              ],
            },
          },
          transactionCount: {
            $sum: 1,
          },
        },
      },
    ]);

    const transactionMap = new Map(
      accountTransactions.map((item) => [
        item._id.toString(),
        item,
      ])
    );

    const accountsWithBalances = accounts.map((account) => {
      const transactions = transactionMap.get(
        account._id.toString()
      );

      const totalIncome = transactions?.totalIncome || 0;
      const totalExpenses = transactions?.totalExpenses || 0;

      const currentBalance =
        account.openingBalance + totalIncome - totalExpenses;

      return {
        ...account,
        totalIncome,
        totalExpenses,
        currentBalance,
        transactionCount: transactions?.transactionCount || 0,
      };
    });

    const combinedBalance = accountsWithBalances.reduce(
      (total, account) => total + account.currentBalance,
      0
    );

    return res.status(200).json({
      success: true,
      accounts: accountsWithBalances,
      summary: {
        totalAccounts: accountsWithBalances.length,
        combinedBalance,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAccount,
  getAccounts,
};