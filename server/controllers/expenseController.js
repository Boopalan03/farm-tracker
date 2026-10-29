const Expense = require('../models/Expense');

const getExpenses = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    const expenses = await Expense.find({ userId }).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    console.error('getExpenses error:', err);
    res.status(500).json({ message: err.message || 'Server Error' });
  }
};

const addExpense = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    const { livestockType, category, amount, notes, date } = req.body;

    const newExpense = new Expense({
      userId,
      livestockType,
      category,
      amount: Number(amount),
      notes,
      date: date || new Date(),
    });

    const expense = await newExpense.save();
    res.status(201).json(expense);
  } catch (err) {
    console.error('addExpense error:', err);
    res.status(500).json({ message: err.message || 'Server Error' });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, userId });
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json({ message: 'Expense removed' });
  } catch (err) {
    console.error('deleteExpense error:', err);
    res.status(500).json({ message: err.message || 'Server Error' });
  }
};

module.exports = {
  getExpenses,
  addExpense,
  deleteExpense,
};
