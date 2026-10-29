const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Labour / Worker Wage',
      'Equipment & Machinery',
      'Irrigation & Water System',
      'Electrical & Fencing',
      'Shed & Pen Upkeep',
      'Field & Crop Care',
      'Other Maintenance'
    ],
    default: 'Labour / Worker Wage',
  },
  workerName: {
    type: String,
    trim: true,
    default: '',
  },
  workerRole: {
    type: String,
    trim: true,
    default: 'Worker',
  },
  workerPhone: {
    type: String,
    trim: true,
    default: '',
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['Completed', 'Pending', 'In Progress'],
    default: 'Completed',
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
  expenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense',
  },
}, { timestamps: true });

module.exports = mongoose.model('Maintenance', maintenanceSchema);
