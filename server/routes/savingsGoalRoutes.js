const express = require("express");
const { body, param } = require("express-validator");

const { protect } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

const {
  createSavingsGoal,
  getSavingsGoals,
  updateSavingsGoal,
  deleteSavingsGoal,
} = require("../controllers/savingsGoalController");

const router = express.Router();

router.use(protect);

// CREATE GOAL
router.post(
  "/",
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Goal name is required.")
      .isLength({ max: 100 })
      .withMessage("Goal name cannot exceed 100 characters."),

    body("targetAmount")
      .isFloat({ gt: 0 })
      .withMessage("Target amount must be greater than zero."),

    body("currentAmount")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Current amount cannot be negative."),

    body("targetDate")
      .optional({ nullable: true })
      .isISO8601()
      .withMessage("Please provide a valid target date."),
  ],
  validateRequest,
  createSavingsGoal
);

// GET ALL GOALS
router.get("/", getSavingsGoals);

// UPDATE GOAL
router.put(
  "/:id",
  [
    param("id")
      .isMongoId()
      .withMessage("Invalid savings goal ID."),

    body("name")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Goal name cannot be empty.")
      .isLength({ max: 100 }),

    body("targetAmount")
      .optional()
      .isFloat({ gt: 0 })
      .withMessage("Target amount must be greater than zero."),

    body("currentAmount")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Current amount cannot be negative."),

    body("targetDate")
      .optional({ nullable: true })
      .isISO8601()
      .withMessage("Please provide a valid target date."),
  ],
  validateRequest,
  updateSavingsGoal
);

// DELETE GOAL
router.delete(
  "/:id",
  [
    param("id")
      .isMongoId()
      .withMessage("Invalid savings goal ID."),
  ],
  validateRequest,
  deleteSavingsGoal
);

module.exports = router;