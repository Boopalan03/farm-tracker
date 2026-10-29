const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const Sale = require('../models/Sale');
const LivestockInventory = require('../models/LivestockInventory');
const CropUsage = require('../models/CropUsage');
const User = require('../models/User');
const { sendMonthlyReportEmail, NOREPLY_EMAIL } = require('../utils/mailer');

const getDashboardSummary = async (req, res) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    const userId = new mongoose.Types.ObjectId(rawUserId);
    const user = await User.findById(userId);

    const { startDate, endDate, month, year, filterType } = req.query;

    let computedStart = null;
    let computedEnd = null;

    if (filterType === 'month' && month) {
      // month is in format 'YYYY-MM'
      const [y, m] = month.split('-').map(Number);
      if (y && m) {
        computedStart = new Date(y, m - 1, 1, 0, 0, 0, 0);
        computedEnd = new Date(y, m, 0, 23, 59, 59, 999);
      }
    } else if (filterType === 'year' && year) {
      const y = Number(year);
      if (y) {
        computedStart = new Date(y, 0, 1, 0, 0, 0, 0);
        computedEnd = new Date(y, 11, 31, 23, 59, 59, 999);
      }
    } else if (startDate || endDate) {
      if (startDate) {
        computedStart = new Date(startDate);
        computedStart.setHours(0, 0, 0, 0);
      }
      if (endDate) {
        computedEnd = new Date(endDate);
        computedEnd.setHours(23, 59, 59, 999);
      }
    }

    const expenseMatch = { userId };
    const saleMatch = { userId };

    if (computedStart || computedEnd) {
      const dateFilter = {};
      if (computedStart && !isNaN(computedStart.getTime())) {
        dateFilter.$gte = computedStart;
      }
      if (computedEnd && !isNaN(computedEnd.getTime())) {
        dateFilter.$lte = computedEnd;
      }
      if (Object.keys(dateFilter).length > 0) {
        expenseMatch.date = dateFilter;
        saleMatch.date = dateFilter;
      }
    }

    // Aggregate expenses by livestockType
    const expensesAgg = await Expense.aggregate([
      { $match: expenseMatch },
      {
        $group: {
          _id: '$livestockType',
          totalExpenses: { $sum: '$amount' },
        },
      },
    ]);

    // Aggregate sales by livestockType
    const salesAgg = await Sale.aggregate([
      { $match: saleMatch },
      {
        $group: {
          _id: '$livestockType',
          totalRevenue: { $sum: '$amountReceived' },
        },
      },
    ]);

    // Get livestock counts
    const inventory = await LivestockInventory.find({ userId });

    // Format the response
    const summary = {};
    
    // Create a Set of all unique livestock types from inventory, expenses, and sales
    const livestockSet = new Set();
    inventory.forEach(item => livestockSet.add(item.livestockType));
    expensesAgg.forEach(item => livestockSet.add(item._id));
    salesAgg.forEach(item => livestockSet.add(item._id));
    
    const livestockTypes = Array.from(livestockSet);

    livestockTypes.forEach((type) => {
      summary[type] = {
        totalCount: 0,
        totalExpenses: 0,
        totalRevenue: 0,
        netProfit: 0,
      };
    });

    inventory.forEach((item) => {
      if (summary[item.livestockType]) {
        summary[item.livestockType].totalCount = item.totalCount || 0;
      }
    });

    expensesAgg.forEach((item) => {
      if (summary[item._id]) {
        summary[item._id].totalExpenses = item.totalExpenses;
      }
    });

    salesAgg.forEach((item) => {
      if (summary[item._id]) {
        summary[item._id].totalRevenue = item.totalRevenue;
      }
    });

    // Calculate net profit
    livestockTypes.forEach((type) => {
      summary[type].netProfit = summary[type].totalRevenue - summary[type].totalExpenses;
    });

    // Aggregate own crop usage savings
    const cropUsageAgg = await CropUsage.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalSavings: { $sum: '$estimatedSavings' },
          totalUsageLogs: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);
    const cropUsageStats = cropUsageAgg[0] || { totalSavings: 0, totalUsageLogs: 0, totalQuantity: 0 };

    res.json({
      farmName: user ? user.farmName : '',
      summary,
      totalOverallExpenses: livestockTypes.reduce((acc, curr) => acc + summary[curr].totalExpenses, 0),
      totalOverallRevenue: livestockTypes.reduce((acc, curr) => acc + summary[curr].totalRevenue, 0),
      totalOverallProfit: livestockTypes.reduce((acc, curr) => acc + summary[curr].netProfit, 0),
      totalFeedSavings: cropUsageStats.totalSavings,
      totalCropUsageLogs: cropUsageStats.totalUsageLogs,
      appliedFilter: {
        filterType: filterType || 'all',
        startDate: computedStart ? computedStart.toISOString() : null,
        endDate: computedEnd ? computedEnd.toISOString() : null,
      }
    });
  } catch (err) {
    console.error('getDashboardSummary error:', err.message);
    res.status(500).json({ message: err.message || 'Server Error' });
  }
};

const resetAllData = async (req, res) => {
  try {
    const userId = req.user.id;
    await Promise.all([
      Sale.deleteMany({ userId }),
      Expense.deleteMany({ userId }),
      LivestockInventory.deleteMany({ userId }),
      CropUsage.deleteMany({ userId })
    ]);
    res.json({ msg: 'All farm data reset successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

const importData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sales, expenses, inventory } = req.body;
    
    if (sales && sales.length > 0) {
      const salesDocs = sales.map(s => {
        const { _id, userId: uId, __v, ...rest } = s;
        return { ...rest, userId };
      });
      await Sale.insertMany(salesDocs);
    }

    if (expenses && expenses.length > 0) {
      const expDocs = expenses.map(e => {
        const { _id, userId: uId, __v, ...rest } = e;
        return { ...rest, userId };
      });
      await Expense.insertMany(expDocs);
    }

    if (inventory && inventory.length > 0) {
      const invDocs = inventory.map(i => {
        const { _id, userId: uId, __v, ...rest } = i;
        return { ...rest, userId };
      });
      await LivestockInventory.insertMany(invDocs);
    }

    res.json({ message: 'Data imported successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

const sendMonthlyReport = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.email) {
      return res.status(404).json({ message: 'User or email address not found' });
    }

    const { pdfBase64, month, year, summary } = req.body;
    const now = new Date();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const reportMonth = month || monthNames[now.getMonth()];
    const reportYear = year || now.getFullYear();

    let pdfBuffer;
    if (pdfBase64) {
      pdfBuffer = Buffer.from(pdfBase64, 'base64');
    } else {
      // Fallback empty text buffer or minimal valid PDF if not provided
      pdfBuffer = Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Title (Monthly Farm Report - ${reportMonth} ${reportYear}) >>\nendobj\ntrailer\n<< >>\n%%EOF`);
    }

    let summaryData = summary;
    if (!summaryData) {
      // Calculate monthly stats from DB
      const startOfMonth = new Date(reportYear, monthNames.indexOf(reportMonth), 1);
      const endOfMonth = new Date(reportYear, monthNames.indexOf(reportMonth) + 1, 0, 23, 59, 59);

      const [monthlySales, monthlyExpenses] = await Promise.all([
        Sale.find({ userId: user._id, date: { $gte: startOfMonth, $lte: endOfMonth } }),
        Expense.find({ userId: user._id, date: { $gte: startOfMonth, $lte: endOfMonth } })
      ]);

      const totalRevenue = monthlySales.reduce((acc, s) => acc + (s.amountReceived || 0), 0);
      const totalExpenses = monthlyExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
      summaryData = {
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses
      };
    }

    const result = await sendMonthlyReportEmail({
      to: user.email,
      farmName: user.farmName,
      monthName: reportMonth,
      year: reportYear,
      pdfBuffer,
      summaryData
    });

    res.json({
      success: true,
      message: result.simulated
        ? `Report generated! Server is in Dev/Preview mode (SMTP not yet configured in server/.env).`
        : `Monthly report sent successfully to ${user.email} from ${NOREPLY_EMAIL}!`,
      recipient: user.email,
      sender: NOREPLY_EMAIL,
      month: reportMonth,
      year: reportYear,
      simulated: result.simulated || false
    });
  } catch (err) {
    console.error('Error sending monthly report email:', err);
    res.status(500).json({ message: 'Failed to send monthly report email', error: err.message });
  }
};

module.exports = {
  getDashboardSummary,
  resetAllData,
  importData,
  sendMonthlyReport,
};
