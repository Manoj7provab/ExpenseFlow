const Transaction = require("../models/Transaction");

// Calculate the next occurrence date
const addRecurrence = (date, recurrenceType) => {
  const nextDate = new Date(date);

  switch (recurrenceType) {
    case "Daily":
      nextDate.setDate(nextDate.getDate() + 1);
      break;

    case "Weekly":
      nextDate.setDate(nextDate.getDate() + 7);
      break;

    case "Monthly": {
      const originalDay = nextDate.getDate();

      nextDate.setDate(1);
      nextDate.setMonth(nextDate.getMonth() + 1);

      const lastDay = new Date(
        nextDate.getFullYear(),
        nextDate.getMonth() + 1,
        0
      ).getDate();

      nextDate.setDate(Math.min(originalDay, lastDay));
      break;
    }

    case "Yearly": {
      const originalMonth = nextDate.getMonth();
      const originalDay = nextDate.getDate();

      nextDate.setFullYear(nextDate.getFullYear() + 1);

      // Handle leap-year dates such as February 29
      if (nextDate.getMonth() !== originalMonth) {
        nextDate.setDate(0);
      }

      if (nextDate.getDate() > originalDay) {
        nextDate.setDate(originalDay);
      }

      break;
    }

    default:
      throw new Error("Invalid recurrence type");
  }

  return nextDate;
};

// Generate all recurring transactions that are due
const processRecurringTransactions = async () => {
  const now = new Date();

  const templates = await Transaction.find({
    recurring: true,
    recurrenceType: {
      $in: ["Daily", "Weekly", "Monthly", "Yearly"],
    },
    recurringNextDate: {
      $lte: now,
    },
  }).limit(100);

  for (const template of templates) {
    let nextDate = template.recurringNextDate;

    while (nextDate && nextDate <= now) {
      const occurrenceDate = new Date(nextDate);

      const nextOccurrence = addRecurrence(
        occurrenceDate,
        template.recurrenceType
      );

      try {
        await Transaction.create({
          user: template.user,
          account: template.account,
          amount: template.amount,
          type: template.type,
          category: template.category,
          note: template.note,
          date: occurrenceDate,
          attachment: template.attachment,

          // Generated occurrences are not templates
          recurring: false,
          recurrenceType: null,

          recurringTemplate: template._id,
          recurringOccurrenceDate: occurrenceDate,
        });
      } catch (error) {
        // Ignore duplicate occurrence errors
        if (error.code !== 11000) {
          throw error;
        }
      }

      nextDate = nextOccurrence;
    }

    // Update the template's next scheduled date
    await Transaction.updateOne(
      {
        _id: template._id,
        recurring: true,
        recurringNextDate: template.recurringNextDate,
      },
      {
        $set: {
          recurringNextDate: nextDate,
        },
      }
    );
  }

  return templates.length;
};

module.exports = {
  addRecurrence,
  processRecurringTransactions,
};