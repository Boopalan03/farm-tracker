const LivestockInventory = require('../models/LivestockInventory');
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const CropUsage = require('../models/CropUsage');

const getLivestock = async (req, res) => {
  try {
    const inventory = await LivestockInventory.find({ userId: req.user.id });
    res.json(inventory);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

const updateLivestock = async (req, res) => {
  try {
    const { livestockType, totalCount, categories } = req.body;

    // See if inventory for this type already exists for the user
    let inventory = await LivestockInventory.findOne({ userId: req.user.id, livestockType });

    if (inventory) {
      // Update existing
      inventory.totalCount = totalCount !== undefined ? totalCount : inventory.totalCount;
      if (categories) {
        inventory.categories = categories;
      }
      await inventory.save();
      return res.json(inventory);
    }

    // Create new
    inventory = new LivestockInventory({
      userId: req.user.id,
      livestockType,
      totalCount,
      categories,
    });

    await inventory.save();
    res.json(inventory);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

const deleteLivestock = async (req, res) => {
  try {
    const { type } = req.params;
    const inventory = await LivestockInventory.findOneAndDelete({ userId: req.user.id, livestockType: type });
    if (!inventory) {
      return res.status(404).json({ msg: 'Livestock not found' });
    }
    
    // Also delete any associated sales, expenses, and crop usages
    await Sale.deleteMany({ userId: req.user.id, livestockType: type });
    await Expense.deleteMany({ userId: req.user.id, livestockType: type });
    await CropUsage.deleteMany({ 
      userId: req.user.id, 
      $or: [{ cropType: type }, { fedToLivestock: type }] 
    });
    
    res.json({ msg: 'Item and all associated records removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  getLivestock,
  updateLivestock,
  deleteLivestock,
};
