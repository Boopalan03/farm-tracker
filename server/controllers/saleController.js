const Sale = require('../models/Sale');
const LivestockInventory = require('../models/LivestockInventory');

const getSales = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    const sales = await Sale.find({ userId }).sort({ date: -1 });
    res.json(sales);
  } catch (err) {
    console.error('getSales error:', err);
    res.status(500).json({ message: err.message || 'Server Error' });
  }
};

const addSale = async (req, res) => {
  try {
    const { livestockType, saleType, soldCategory, quantitySold, amountReceived, date, notes } = req.body;

    const newSale = new Sale({
      userId: req.user.id,
      livestockType,
      saleType,
      soldCategory,
      quantitySold,
      amountReceived,
      notes,
      date,
    });

    const sale = await newSale.save();

    // If it's an animal sale, decrement livestock inventory count
    if (saleType === 'Animal Sale') {
      const inventory = await LivestockInventory.findOne({ userId: req.user.id, livestockType });
      if (inventory) {
        const parsedQuantity = parseFloat(quantitySold) || 0;
        
        if (soldCategory && inventory.categories && inventory.categories.has(soldCategory)) {
          let currentCatCount = inventory.categories.get(soldCategory);
          inventory.categories.set(soldCategory, Math.max(0, currentCatCount - parsedQuantity));
          
          let sum = 0;
          for (let key of inventory.categories.keys()) {
            sum += inventory.categories.get(key);
          }
          inventory.totalCount = sum;
        } else {
          inventory.totalCount = Math.max(0, inventory.totalCount - parsedQuantity);
        }
        
        await inventory.save();
      }
    }

    res.json(sale);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

const deleteSale = async (req, res) => {
  try {
    const sale = await Sale.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!sale) {
      return res.status(404).json({ msg: 'Sale not found' });
    }
    res.json({ msg: 'Sale removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  getSales,
  addSale,
  deleteSale,
};
