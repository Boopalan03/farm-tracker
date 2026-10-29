const mongoose = require('mongoose');

const livestockInventorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  livestockType: {
    type: String,
    required: true,
  },
  totalCount: {
    type: Number,
    required: true,
    default: 0,
  },
  categories: {
    type: Map,
    of: Number,
    default: {},
    // Example categories: milkProducing, pregnant, calves0To24Months
  },
}, { timestamps: true });

module.exports = mongoose.model('LivestockInventory', livestockInventorySchema);
