const CropUsage = require('../models/CropUsage');
const LivestockInventory = require('../models/LivestockInventory');

// @desc    Get all crop usage records for the user
// @route   GET /api/crop-usage
const getCropUsages = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const { cropType, fedToLivestock, startDate, endDate, month } = req.query;
    const query = { userId };

    if (cropType && cropType !== 'All') {
      query.cropType = cropType;
    }

    if (fedToLivestock && fedToLivestock !== 'All') {
      query.fedToLivestock = fedToLivestock;
    }

    if (month) {
      const [y, m] = month.split('-').map(Number);
      if (y && m) {
        query.date = {
          $gte: new Date(y, m - 1, 1, 0, 0, 0, 0),
          $lte: new Date(y, m, 0, 23, 59, 59, 999),
        };
      }
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const usages = await CropUsage.find(query).sort({ date: -1 });
    res.json(usages);
  } catch (err) {
    console.error('getCropUsages error:', err);
    res.status(500).json({ message: err.message || 'Server Error' });
  }
};

// @desc    Create a new crop usage log
// @route   POST /api/crop-usage
const addCropUsage = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const {
      cropType,
      fedToLivestock,
      quantity,
      unit,
      estimatedSavings,
      usageType,
      notes,
      date,
      deductFromInventory,
    } = req.body;

    if (!cropType || !fedToLivestock || quantity === undefined) {
      return res.status(400).json({ message: 'Please provide crop name, livestock recipient, and quantity.' });
    }

    const newUsage = new CropUsage({
      userId,
      cropType: cropType.trim(),
      fedToLivestock: fedToLivestock.trim(),
      quantity: Number(quantity) || 0,
      unit: unit || 'kg',
      estimatedSavings: Number(estimatedSavings) || 0,
      usageType: usageType || 'Livestock Feed / Fodder',
      notes: notes ? notes.trim() : '',
      date: date || new Date(),
    });

    const saved = await newUsage.save();

    // Optionally deduct from LivestockInventory count if requested
    if (deductFromInventory) {
      const invItem = await LivestockInventory.findOne({ userId, livestockType: cropType.trim() });
      if (invItem && invItem.totalCount > 0) {
        const qtyToDeduct = Math.min(invItem.totalCount, Number(quantity) || 0);
        invItem.totalCount = Math.max(0, invItem.totalCount - qtyToDeduct);

        // Deduct from relevant sub-categories if present
        if (invItem.categories) {
          const map = invItem.categories;
          const candidateStages = ['Harvest Ready', 'Yield Producing', 'Fruiting / Bearing', 'Growing / Vegetative'];
          for (const stage of candidateStages) {
            if (map.has(stage) && map.get(stage) > 0) {
              const current = map.get(stage);
              map.set(stage, Math.max(0, current - qtyToDeduct));
              break;
            }
          }
        }
        await invItem.save();
      }
    }

    res.status(201).json(saved);
  } catch (err) {
    console.error('addCropUsage error:', err);
    res.status(500).json({ message: err.message || 'Server Error' });
  }
};

// @desc    Update a crop usage record
// @route   PUT /api/crop-usage/:id
const updateCropUsage = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const usage = await CropUsage.findOne({ _id: req.params.id, userId });

    if (!usage) {
      return res.status(404).json({ message: 'Usage record not found' });
    }

    const {
      cropType,
      fedToLivestock,
      quantity,
      unit,
      estimatedSavings,
      usageType,
      notes,
      date,
    } = req.body;

    if (cropType !== undefined) usage.cropType = cropType.trim();
    if (fedToLivestock !== undefined) usage.fedToLivestock = fedToLivestock.trim();
    if (quantity !== undefined) usage.quantity = Number(quantity);
    if (unit !== undefined) usage.unit = unit;
    if (estimatedSavings !== undefined) usage.estimatedSavings = Number(estimatedSavings);
    if (usageType !== undefined) usage.usageType = usageType;
    if (notes !== undefined) usage.notes = notes.trim();
    if (date !== undefined) usage.date = date;

    const updated = await usage.save();
    res.json(updated);
  } catch (err) {
    console.error('updateCropUsage error:', err);
    res.status(500).json({ message: err.message || 'Server Error' });
  }
};

// @desc    Delete a crop usage record
// @route   DELETE /api/crop-usage/:id
const deleteCropUsage = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const removed = await CropUsage.findOneAndDelete({ _id: req.params.id, userId });

    if (!removed) {
      return res.status(404).json({ message: 'Usage record not found' });
    }

    res.json({ message: 'Crop usage record deleted successfully' });
  } catch (err) {
    console.error('deleteCropUsage error:', err);
    res.status(500).json({ message: err.message || 'Server Error' });
  }
};

// @desc    Get aggregate summary of crop usages (savings, breakdowns)
// @route   GET /api/crop-usage/summary
const getCropUsageSummary = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const usages = await CropUsage.find({ userId }).sort({ date: -1 });

    const totalSavings = usages.reduce((acc, curr) => acc + (Number(curr.estimatedSavings) || 0), 0);
    
    // Group by livestock
    const byLivestock = {};
    const byCrop = {};

    usages.forEach((item) => {
      // By livestock
      if (!byLivestock[item.fedToLivestock]) {
        byLivestock[item.fedToLivestock] = {
          totalQty: 0,
          entries: 0,
          savings: 0,
          units: {},
        };
      }
      byLivestock[item.fedToLivestock].totalQty += item.quantity;
      byLivestock[item.fedToLivestock].entries += 1;
      byLivestock[item.fedToLivestock].savings += (item.estimatedSavings || 0);
      byLivestock[item.fedToLivestock].units[item.unit] = (byLivestock[item.fedToLivestock].units[item.unit] || 0) + item.quantity;

      // By crop
      if (!byCrop[item.cropType]) {
        byCrop[item.cropType] = {
          totalQty: 0,
          entries: 0,
          savings: 0,
          units: {},
        };
      }
      byCrop[item.cropType].totalQty += item.quantity;
      byCrop[item.cropType].entries += 1;
      byCrop[item.cropType].savings += (item.estimatedSavings || 0);
      byCrop[item.cropType].units[item.unit] = (byCrop[item.cropType].units[item.unit] || 0) + item.quantity;
    });

    res.json({
      totalRecords: usages.length,
      totalSavings,
      byLivestock,
      byCrop,
      recent: usages.slice(0, 5),
    });
  } catch (err) {
    console.error('getCropUsageSummary error:', err);
    res.status(500).json({ message: err.message || 'Server Error' });
  }
};

module.exports = {
  getCropUsages,
  addCropUsage,
  updateCropUsage,
  deleteCropUsage,
  getCropUsageSummary,
};
