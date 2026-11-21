require("dotenv").config();

const connectDB = require("./config/db");
const app = require("./app");

const startRecurringTransactionScheduler = require(
  "./services/recurringTransactionScheduler"
);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from .env");
    }

    await connectDB();

    startRecurringTransactionScheduler();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();