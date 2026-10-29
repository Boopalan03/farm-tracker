const mongoose = require('mongoose');

const cropUsageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  cropType: {
    type: String,
    required: true,
    trim: true,
  },
  fedToLivestock: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unit: {
    type: String,
    required: true,
    default: 'kg',
  },
  estimatedSavings: {
    type: Number,
    default: 0,
    min: 0,
  },
  usageType: {
    type: String,
    default: 'Livestock Feed / Fodder',
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('CropUsage', cropUsageSchema);
