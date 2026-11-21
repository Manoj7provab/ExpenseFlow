const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // First day of the budget month
    month: {
      type: Date,
      required: true,
    },

    // Null means overall monthly budget.
    // A category name means category-specific budget.
    category: {
      type: String,
      trim: true,
      default: null,
      maxlength: 50,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
  },
  { timestamps: true }
);

budgetSchema.index(
  { user: 1, month: 1, category: 1 },
  { unique: true }
);

module.exports = mongoose.model("Budget", budgetSchema);