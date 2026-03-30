const express = require("express");
const Expense = require("../models/Expense");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// GET /expenses - return only logged-in user's expenses.
router.get("/expenses", authMiddleware, async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user.userId }).sort({ date: -1 });
    return res.status(200).json({ expenses });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch expenses." });
  }
});

// POST /expenses - create a new expense for logged-in user.
router.post("/expenses", authMiddleware, async (req, res) => {
  try {
    const { title, amount, category, date, note } = req.body;

    if (!title || !amount || !category || !date) {
      return res.status(400).json({
        message: "Title, amount, category, and date are required.",
      });
    }

    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0." });
    }

    const expense = await Expense.create({
      user: req.user.userId,
      title,
      amount: parsedAmount,
      category,
      date,
      note: note || "",
    });

    return res.status(201).json({
      message: "Expense added successfully.",
      expense,
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not create expense." });
  }
});

// DELETE /expenses/:id - delete only if expense belongs to logged-in user.
router.delete("/expenses/:id", authMiddleware, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!expense) {
      return res.status(404).json({ message: "Expense not found." });
    }

    return res.status(200).json({ message: "Expense deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Could not delete expense." });
  }
});

module.exports = router;
