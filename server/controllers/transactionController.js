const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const Account = require("../models/Account");

const {
  addRecurrence,
} = require("../services/recurringTransactionService");

// Helper: verify that account belongs to logged-in user
const verifyAccount = async (accountId, userId) => {
  return Account.findOne({
    _id: accountId,
    user: userId,
    isActive: true,
  });
};

const validRecurrenceTypes = [
  "Daily",
  "Weekly",
  "Monthly",
  "Yearly",
];

// ADD TRANSACTION
const addTransaction = async (req, res, next) => {
  try {
    const {
      amount,
      type,
      category,
      accountId,
      note,
      date,
      recurring,
      recurrenceType,
      attachment,
    } = req.body;

    // Verify account ownership
    const account = await verifyAccount(accountId, req.user.id);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found or access denied",
      });
    }

    const isRecurring = recurring === true;

    // Validate recurrence
    if (
      isRecurring &&
      !validRecurrenceTypes.includes(recurrenceType)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid recurrence type",
      });
    }

    if (!isRecurring && recurrenceType) {
      return res.status(400).json({
        success: false,
        message: "Recurrence type requires recurring to be true",
      });
    }

    const transactionDate = date
      ? new Date(date)
      : new Date();

    if (Number.isNaN(transactionDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction date",
      });
    }

    // Create transaction
    const transaction = await Transaction.create({
      user: req.user.id,
      account: account._id,
      amount: Number(amount),
      type,
      category: category.trim(),
      note: note || "",
      date: transactionDate,
      recurring: isRecurring,
      recurrenceType: isRecurring ? recurrenceType : null,

      // Calculate the next recurring date
      recurringNextDate: isRecurring
        ? addRecurrence(transactionDate, recurrenceType)
        : null,

      attachment: attachment || null,
    });

    return res.status(201).json({
      success: true,
      message: "Transaction added successfully",
      transaction,
    });
  } catch (error) {
    next(error);
  }
};

// GET TRANSACTIONS WITH FILTERS AND PAGINATION
const getTransactions = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      100
    );

    const skip = (page - 1) * limit;

    // Always restrict queries to logged-in user
    const filter = {
      user: req.user.id,
    };

    if (req.query.type) {
      filter.type = req.query.type;
    }

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.accountId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.accountId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid account ID",
        });
      }

      filter.account = req.query.accountId;
    }

    // Date range filter
    if (req.query.dateFrom || req.query.dateTo) {
      filter.date = {};

      if (req.query.dateFrom) {
        const startDate = new Date(req.query.dateFrom);

        if (Number.isNaN(startDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date",
          });
        }

        filter.date.$gte = startDate;
      }

      if (req.query.dateTo) {
        const endDate = new Date(req.query.dateTo);

        if (Number.isNaN(endDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date",
          });
        }

        endDate.setUTCHours(23, 59, 59, 999);
        filter.date.$lte = endDate;
      }
    }

    if (
      req.query.dateFrom &&
      req.query.dateTo &&
      new Date(req.query.dateFrom) > new Date(req.query.dateTo)
    ) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be after end date",
      });
    }

    // Amount range filter
    if (
      req.query.minAmount !== undefined ||
      req.query.maxAmount !== undefined
    ) {
      filter.amount = {};

      if (req.query.minAmount !== undefined) {
        const minAmount = Number(req.query.minAmount);

        if (!Number.isFinite(minAmount) || minAmount < 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid minimum amount",
          });
        }

        filter.amount.$gte = minAmount;
      }

      if (req.query.maxAmount !== undefined) {
        const maxAmount = Number(req.query.maxAmount);

        if (!Number.isFinite(maxAmount) || maxAmount < 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid maximum amount",
          });
        }

        filter.amount.$lte = maxAmount;
      }
    }

    if (
      req.query.minAmount !== undefined &&
      req.query.maxAmount !== undefined &&
      Number(req.query.minAmount) > Number(req.query.maxAmount)
    ) {
      return res.status(400).json({
        success: false,
        message: "Minimum amount cannot exceed maximum amount",
      });
    }

    // Search note, category, or exact amount
    if (req.query.search) {
      const search = req.query.search.trim();

      if (search) {
        // Escape regex special characters
        const escaped = search.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

        const searchConditions = [
          {
            note: {
              $regex: escaped,
              $options: "i",
            },
          },
          {
            category: {
              $regex: escaped,
              $options: "i",
            },
          },
        ];

        const numericSearch = Number(search);

        if (Number.isFinite(numericSearch)) {
          searchConditions.push({
            amount: numericSearch,
          });
        }

        filter.$or = searchConditions;
      }
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate("account", "name type")
        .sort({
          date: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Transaction.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET SINGLE TRANSACTION
const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate("account", "name type");

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      transaction,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE TRANSACTION
const updateTransaction = async (req, res, next) => {
  try {
    const allowedFields = [
      "amount",
      "type",
      "category",
      "note",
      "date",
      "recurring",
      "recurrenceType",
      "attachment",
    ];

    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Find existing transaction belonging to logged-in user
    const existing = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Account ID is accepted separately and ownership is verified
    if (req.body.accountId !== undefined) {
      const account = await verifyAccount(
        req.body.accountId,
        req.user.id
      );

      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Account not found or access denied",
        });
      }

      updates.account = account._id;
    }

    // Validate amount
    if (updates.amount !== undefined) {
      updates.amount = Number(updates.amount);

      if (
        !Number.isFinite(updates.amount) ||
        updates.amount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Amount must be greater than zero",
        });
      }
    }

    // Validate category
    if (updates.category !== undefined) {
      if (typeof updates.category !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid category",
        });
      }

      updates.category = updates.category.trim();

      if (!updates.category) {
        return res.status(400).json({
          success: false,
          message: "Category is required",
        });
      }
    }

    // Validate date
    if (updates.date !== undefined) {
      updates.date = new Date(updates.date);

      if (Number.isNaN(updates.date.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction date",
        });
      }
    }

    // Determine the next recurrence settings
    const nextRecurring =
      updates.recurring !== undefined
        ? updates.recurring === true
        : existing.recurring;

    const nextRecurrenceType =
      updates.recurrenceType !== undefined
        ? updates.recurrenceType
        : existing.recurrenceType;

    // Validate recurrence type when recurring is enabled
    if (
      nextRecurring &&
      !validRecurrenceTypes.includes(nextRecurrenceType)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid recurrence type",
      });
    }

    // Disable recurring transaction
    if (!nextRecurring) {
      updates.recurring = false;
      updates.recurrenceType = null;
      updates.recurringNextDate = null;
    } else {
      // Check whether recurrence settings have changed
      const recurrenceChanged =
        (updates.recurring !== undefined &&
          updates.recurring !== existing.recurring) ||
        (updates.recurrenceType !== undefined &&
          updates.recurrenceType !== existing.recurrenceType) ||
        updates.date !== undefined;

      // Recalculate next occurrence when required
      if (recurrenceChanged) {
        const baseDate = updates.date || existing.date;

        if (Number.isNaN(new Date(baseDate).getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid transaction date",
          });
        }

        updates.recurring = true;
        updates.recurrenceType = nextRecurrenceType;

        updates.recurringNextDate = addRecurrence(
          baseDate,
          nextRecurrenceType
        );
      }
    }

    const transaction = await Transaction.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.id,
      },
      updates,
      {
        returnDocument: "after",
         runValidators: true,
      }
    ).populate("account", "name type");

    return res.status(200).json({
      success: true,
      message: "Transaction updated successfully",
      transaction,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE TRANSACTION
const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
};