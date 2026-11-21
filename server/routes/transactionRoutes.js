const express = require("express");

const { protect } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

const {
  createTransactionValidator,
  updateTransactionValidator,
  transactionIdValidator,
  transactionQueryValidator,
} = require("../validators/transactionValidator");

const {
  addTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
} = require("../controllers/transactionController");

const router = express.Router();

// All transaction endpoints require authentication
router.use(protect);

// GET all transactions with pagination and filters
router.get(
  "/",
  transactionQueryValidator,
  validateRequest,
  getTransactions
);

// ADD transaction
router.post(
  "/",
  createTransactionValidator,
  validateRequest,
  addTransaction
);

// GET single transaction
router.get(
  "/:id",
  transactionIdValidator,
  validateRequest,
  getTransactionById
);

// UPDATE transaction
router.put(
  "/:id",
  updateTransactionValidator,
  validateRequest,
  updateTransaction
);

// DELETE transaction
router.delete(
  "/:id",
  transactionIdValidator,
  validateRequest,
  deleteTransaction
);

module.exports = router;