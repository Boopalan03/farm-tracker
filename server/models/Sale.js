const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  livestockType: {
    type: String,
    required: true,
  },
  saleType: {
    type: String,
    required: true,
    enum: ['Animal Sale', 'Product Sale'],
  },
  soldCategory: {
    type: String,
  },
  quantitySold: {
    type: Number,
    required: true,
    min: 0,
  },
  notes: {
    type: String,
  },
  amountReceived: {
    type: Number,
    required: true,
    min: 0,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);
