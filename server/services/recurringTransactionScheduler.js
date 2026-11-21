const {
  processRecurringTransactions,
} = require("./recurringTransactionService");

let isRunning = false;

const startRecurringTransactionScheduler = () => {
  console.log("Recurring transaction scheduler started.");

  const runScheduler = async () => {
    if (isRunning) return;

    isRunning = true;

    try {
      const processed = await processRecurringTransactions();

      if (processed > 0) {
        console.log(
          `Recurring scheduler checked ${processed} transaction templates.`
        );
      }
    } catch (error) {
      console.error(
        "Recurring transaction scheduler error:",
        error.message
      );
    } finally {
      isRunning = false;
    }
  };

  // Run once when the server starts
  runScheduler();

  // Check for due transactions every 60 seconds
  setInterval(runScheduler, 60 * 1000);
};

module.exports = startRecurringTransactionScheduler;