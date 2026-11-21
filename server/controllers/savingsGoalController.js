const SavingsGoal = require("../models/SavingsGoal");

const formatGoal = (goal) => {
  const targetAmount = goal.targetAmount;
  const currentAmount = goal.currentAmount;

  const percentage =
    (currentAmount / targetAmount) * 100;

  return {
    ...goal.toObject(),
    percentage: Number(percentage.toFixed(2)),
    remainingAmount: Math.max(0, targetAmount - currentAmount),
    achieved: currentAmount >= targetAmount,
  };
};

// CREATE SAVINGS GOAL
const createSavingsGoal = async (req, res, next) => {
  try {
    const {
      name,
      targetAmount,
      currentAmount = 0,
      targetDate = null,
    } = req.body;

    const goal = await SavingsGoal.create({
      user: req.user.id,
      name: name.trim(),
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount),
      targetDate: targetDate || null,
    });

    return res.status(201).json({
      success: true,
      message: "Savings goal created successfully.",
      goal: formatGoal(goal),
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL SAVINGS GOALS
const getSavingsGoals = async (req, res, next) => {
  try {
    const goals = await SavingsGoal.find({
      user: req.user.id,
    }).sort({ createdAt: -1 });

    const formattedGoals = goals.map(formatGoal);

    const summary = {
      totalGoals: formattedGoals.length,
      totalTargetAmount: formattedGoals.reduce(
        (total, goal) => total + goal.targetAmount,
        0
      ),
      totalSavedAmount: formattedGoals.reduce(
        (total, goal) => total + goal.currentAmount,
        0
      ),
      completedGoals: formattedGoals.filter(
        (goal) => goal.achieved
      ).length,
    };

    return res.status(200).json({
      success: true,
      summary,
      goals: formattedGoals,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE SAVINGS GOAL
const updateSavingsGoal = async (req, res, next) => {
  try {
    const { name, targetAmount, currentAmount, targetDate } = req.body;

    const updates = {};

    if (name !== undefined) updates.name = name.trim();
    if (targetAmount !== undefined) {
      updates.targetAmount = Number(targetAmount);
    }
    if (currentAmount !== undefined) {
      updates.currentAmount = Number(currentAmount);
    }
    if (targetDate !== undefined) {
      updates.targetDate = targetDate || null;
    }

    const goal = await SavingsGoal.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.id,
      },
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: "Savings goal not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Savings goal updated successfully.",
      goal: formatGoal(goal),
    });
  } catch (error) {
    next(error);
  }
};

// DELETE SAVINGS GOAL
const deleteSavingsGoal = async (req, res, next) => {
  try {
    const goal = await SavingsGoal.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: "Savings goal not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Savings goal deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSavingsGoal,
  getSavingsGoals,
  updateSavingsGoal,
  deleteSavingsGoal,
};