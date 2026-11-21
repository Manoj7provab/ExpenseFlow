const { body, query, param } = require("express-validator");

const validTypes = ["Income", "Expense"];

const createTransactionValidator = [
  body("amount")
    .isFloat({ gt: 0 })
    .withMessage("Amount must be greater than zero"),

  body("type")
    .isIn(validTypes)
    .withMessage("Type must be Income or Expense"),

  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required")
    .isLength({ max: 50 }),

  body("accountId")
    .isMongoId()
    .withMessage("Valid account ID is required"),

  body("note")
    .optional()
    .isString()
    .isLength({ max: 500 }),

  body("date")
    .optional()
    .isISO8601()
    .withMessage("Enter a valid date"),

  body("recurring")
    .optional()
    .isBoolean(),

  body("recurrenceType")
    .optional({ nullable: true })
    .isIn(["Daily", "Weekly", "Monthly", "Yearly"]),

  body("attachment")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 500 }),
];

const updateTransactionValidator = [
  param("id").isMongoId().withMessage("Invalid transaction ID"),

  body("amount").optional().isFloat({ gt: 0 }),

  body("type").optional().isIn(validTypes),

  body("category").optional().trim().notEmpty().isLength({ max: 50 }),

  body("accountId").optional().isMongoId(),

  body("note").optional().isString().isLength({ max: 500 }),

  body("date").optional().isISO8601(),

  body("recurring").optional().isBoolean(),

  body("recurrenceType")
    .optional({ nullable: true })
    .isIn(["Daily", "Weekly", "Monthly", "Yearly"]),

  body("attachment")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 500 }),
];

const transactionIdValidator = [
  param("id").isMongoId().withMessage("Invalid transaction ID"),
];

const transactionQueryValidator = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("type").optional().isIn(validTypes),
  query("category").optional().trim().isLength({ max: 50 }),
  query("accountId").optional().isMongoId(),
  query("dateFrom").optional().isISO8601(),
  query("dateTo").optional().isISO8601(),
  query("minAmount").optional().isFloat({ min: 0 }),
  query("maxAmount").optional().isFloat({ min: 0 }),
  query("search").optional().isString().isLength({ max: 100 }),
];

module.exports = {
  createTransactionValidator,
  updateTransactionValidator,
  transactionIdValidator,
  transactionQueryValidator,
};