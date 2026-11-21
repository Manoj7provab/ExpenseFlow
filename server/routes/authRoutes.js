const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
} = require("../controllers/authController");

const {
  registerValidator,
  loginValidator,
} = require("../validators/authValidator");

const validateRequest = require("../middleware/validateRequest");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Rate limiting for registration and login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Try again later.",
  },
});

router.post(
  "/register",
  authLimiter,
  registerValidator,
  validateRequest,
  registerUser
);

router.post(
  "/login",
  authLimiter,
  loginValidator,
  validateRequest,
  loginUser
);

router.get("/me", protect, getCurrentUser);

router.post("/logout", logoutUser);

module.exports = router;