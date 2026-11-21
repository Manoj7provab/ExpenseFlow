const express = require("express");
const { body } = require("express-validator");

const { protect } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

const {
  createAccount,
  getAccounts,
} = require("../controllers/accountController");

const router = express.Router();

const accountValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Account name is required")
    .isLength({ max: 50 }),

  body("type")
    .isIn([
      "Cash",
      "Bank Account",
      "Credit Card",
      "Wallet",
      "Savings",
    ])
    .withMessage("Invalid account type"),

  body("openingBalance")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Opening balance cannot be negative"),
];

router.use(protect);

router.post("/", accountValidator, validateRequest, createAccount);
router.get("/", getAccounts);

module.exports = router;