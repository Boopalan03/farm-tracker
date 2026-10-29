const mongoose = require('mongoose');
const Maintenance = require('../models/Maintenance');
const Expense = require('../models/Expense');

// GET all maintenance records
const getMaintenance = async (req, res) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    const userId = new mongoose.Types.ObjectId(rawUserId);

    const { category, status, month, year } = req.query;
    const filter = { userId };

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (month) {
      const [y, m] = month.split('-').map(Number);
      if (y && m) {
        filter.date = {
          $gte: new Date(y, m - 1, 1, 0, 0, 0, 0),
          $lte: new Date(y, m, 0, 23, 59, 59, 999)
        };
      }
    } else if (year) {
      const y = Number(year);
      if (y) {
        filter.date = {
          $gte: new Date(y, 0, 1, 0, 0, 0, 0),
          $lte: new Date(y, 11, 31, 23, 59, 59, 999)
        };
      }
    }

    const records = await Maintenance.find(filter).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    console.error('getMaintenance error:', err.message);
    res.status(500).json({ message: err.message || 'Server Error' });
  }
};

// ADD new maintenance record
const addMaintenance = async (req, res) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    const userId = new mongoose.Types.ObjectId(rawUserId);

    const {
      title,
      category,
      workerName,
      workerRole,
      workerPhone,
      amount,
      date,
      status,
      notes
    } = req.body;

    const maintenanceDate = date ? new Date(date) : new Date();
    const numAmount = Number(amount) || 0;

    // Create synchronized expense record so overall finances reflect maintenance & wages
    const expenseCategory = category === 'Labour / Worker Wage' ? 'Labor' : 'Maintenance';
    const expenseNote = [
      title || 'Maintenance',
      workerName ? `Worker: ${workerName}` : '',
      workerRole ? `Role: ${workerRole}` : '',
      notes ? `(${notes})` : ''
    ].filter(Boolean).join(' | ');

    const newExpense = new Expense({
      userId,
      livestockType: 'Farm Maintenance',
      category: expenseCategory,
      amount: numAmount,
      notes: expenseNote,
      date: maintenanceDate,
    });

    const savedExpense = await newExpense.save();

    const newMaintenance = new Maintenance({
      userId,
      title: title || 'Farm Maintenance',
      category: category || 'Labour / Worker Wage',
      workerName: workerName || '',
      workerRole: workerRole || 'Worker',
      workerPhone: workerPhone || '',
      amount: numAmount,
      date: maintenanceDate,
      status: status || 'Completed',
      notes: notes || '',
      expenseId: savedExpense._id,
    });

    const savedRecord = await newMaintenance.save();
    res.status(201).json(savedRecord);
  } catch (err) {
    console.error('addMaintenance error:', err.message);
    res.status(500).json({ message: err.message || 'Server Error' });
  }
};

// UPDATE maintenance record
const updateMaintenance = async (req, res) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    const userId = new mongoose.Types.ObjectId(rawUserId);
    const { id } = req.params;

    const record = await Maintenance.findOne({ _id: id, userId });
    if (!record) {
      return res.status(404).json({ message: 'Maintenance record not found' });
    }

    const {
      title,
      category,
      workerName,
      workerRole,
      workerPhone,
      amount,
      date,
      status,
      notes
    } = req.body;

    if (title !== undefined) record.title = title;
    if (category !== undefined) record.category = category;
    if (workerName !== undefined) record.workerName = workerName;
    if (workerRole !== undefined) record.workerRole = workerRole;
    if (workerPhone !== undefined) record.workerPhone = workerPhone;
    if (amount !== undefined) record.amount = Number(amount) || 0;
    if (date !== undefined) record.date = new Date(date);
    if (status !== undefined) record.status = status;
    if (notes !== undefined) record.notes = notes;

    await record.save();

    // Update synced expense if present
    if (record.expenseId) {
      const expenseCategory = record.category === 'Labour / Worker Wage' ? 'Labor' : 'Maintenance';
      const expenseNote = [
        record.title,
        record.workerName ? `Worker: ${record.workerName}` : '',
        record.workerRole ? `Role: ${record.workerRole}` : '',
        record.notes ? `(${record.notes})` : ''
      ].filter(Boolean).join(' | ');

      await Expense.findByIdAndUpdate(record.expenseId, {
        category: expenseCategory,
        amount: record.amount,
        notes: expenseNote,
        date: record.date,
      });
    }

    res.json(record);
  } catch (err) {
    console.error('updateMaintenance error:', err.message);
    res.status(500).json({ message: err.message || 'Server Error' });
  }
};

// DELETE maintenance record
const deleteMaintenance = async (req, res) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    const userId = new mongoose.Types.ObjectId(rawUserId);
    const { id } = req.params;

    const record = await Maintenance.findOneAndDelete({ _id: id, userId });
    if (!record) {
      return res.status(404).json({ message: 'Maintenance record not found' });
    }

    // Delete linked expense
    if (record.expenseId) {
      await Expense.findByIdAndDelete(record.expenseId);
    }

    res.json({ message: 'Maintenance record deleted successfully' });
  } catch (err) {
    console.error('deleteMaintenance error:', err.message);
    res.status(500).json({ message: err.message || 'Server Error' });
  }
};

// GET distinct workers directory
const getWorkersList = async (req, res) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    const userId = new mongoose.Types.ObjectId(rawUserId);

    const workers = await Maintenance.aggregate([
      { $match: { userId, workerName: { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: '$workerName',
          workerRole: { $last: '$workerRole' },
          workerPhone: { $last: '$workerPhone' },
          totalPaid: { $sum: '$amount' },
          tasksCount: { $sum: 1 },
          lastTaskDate: { $max: '$date' }
        }
      },
      { $sort: { totalPaid: -1 } }
    ]);

    res.json(workers.map(w => ({
      name: w._id,
      role: w.workerRole || 'Worker',
      phone: w.workerPhone || '',
      totalPaid: w.totalPaid,
      tasksCount: w.tasksCount,
      lastTaskDate: w.lastTaskDate
    })));
  } catch (err) {
    console.error('getWorkersList error:', err.message);
    res.status(500).json({ message: err.message || 'Server Error' });
  }
};

module.exports = {
  getMaintenance,
  addMaintenance,
  updateMaintenance,
  deleteMaintenance,
  getWorkersList,
};
