const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    type: {
      type: String,
      enum: ["Income", "Expense"],
      required: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    date: {
      type: Date,
      required: true,
      default: Date.now,
    },

    attachment: {
      type: String,
      default: null,
    },

    recurring: {
      type: Boolean,
      default: false,
    },

    recurrenceType: {
      type: String,
      enum: ["Daily", "Weekly", "Monthly", "Yearly", null],
      default: null,
    },

    // Next date when the recurring transaction should be created
    recurringNextDate: {
      type: Date,
      default: null,
    },

    // Reference to the original recurring transaction
    recurringTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },

    // Date for which this recurring occurrence was generated
    recurringOccurrenceDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, type: 1, category: 1 });

// Prevent duplicate generated occurrences
transactionSchema.index(
  {
    recurringTemplate: 1,
    recurringOccurrenceDate: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      recurringTemplate: { $type: "objectId" },
    },
  }
);

module.exports = mongoose.model("Transaction", transactionSchema);