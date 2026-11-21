const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    type: {
      type: String,
      enum: [
        "Cash",
        "Bank Account",
        "Credit Card",
        "Wallet",
        "Savings",
      ],
      required: true,
    },

    openingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

accountSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Account", accountSchema);