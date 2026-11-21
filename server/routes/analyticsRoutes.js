const express = require("express");

const { protect } = require("../middleware/authMiddleware");

const {
  getAnalyticsSummary,
} = require("../controllers/analyticsController");

const router = express.Router();

// All analytics endpoints require authentication
router.use(protect);

// GET analytics summary
router.get("/summary", getAnalyticsSummary);

module.exports = router;