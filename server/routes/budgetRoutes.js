const express = require("express");
const { body, param } = require("express-validator");

const { protect } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

const {
  saveBudget,
  getBudgets,
  updateBudget,
  deleteBudget,
} = require("../controllers/budgetController");

const router = express.Router();

router.use(protect);

// Create or save a monthly/category budget
router.post(
  "/",
  [
    body("amount")
      .isFloat({ gt: 0 })
      .withMessage("Budget amount must be greater than zero."),

    body("month")
      .optional()
      .matches(/^\d{4}-(0[1-9]|1[0-2])$/)
      .withMessage("Month must be in YYYY-MM format."),

    body("category")
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 50 })
      .withMessage("Category cannot exceed 50 characters."),
  ],
  validateRequest,
  saveBudget
);

// Get budgets for a selected month
router.get("/", getBudgets);

// Update budget amount
router.put(
  "/:id",
  [
    param("id").isMongoId().withMessage("Invalid budget ID."),

    body("amount")
      .isFloat({ gt: 0 })
      .withMessage("Budget amount must be greater than zero."),
  ],
  validateRequest,
  updateBudget
);

// Delete budget
router.delete(
  "/:id",
  [
    param("id").isMongoId().withMessage("Invalid budget ID."),
  ],
  validateRequest,
  deleteBudget
);

module.exports = router;