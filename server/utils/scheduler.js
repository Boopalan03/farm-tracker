const User = require('../models/User');
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const LivestockInventory = require('../models/LivestockInventory');
const { sendMonthlyReportEmail, NOREPLY_EMAIL } = require('./mailer');
const { generateServerReportPDF } = require('./pdfGenerator');

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Checks all users and sends the monthly report if today is the 1st of the month at 8:00 AM
 */
async function checkAndSendMonthlyReports(force = false) {
  try {
    const now = new Date();
    const day = now.getDate();
    const hours = now.getHours();

    const isFirstDay = day === 1;
    const is8AM = hours === 8;

    // Only run if it's the 1st of the month at 8:00 AM (or if forced for testing)
    if (!force && (!isFirstDay || !is8AM)) {
      return;
    }

    const currentMonthTag = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Find users with monthlyReportEnabled who haven't received it for this month tag yet
    const query = {
      monthlyReportEnabled: true,
      email: { $exists: true, $ne: '' }
    };

    if (!force) {
      query.lastMonthlyReportSent = { $ne: currentMonthTag };
    }

    const users = await User.find(query);
    if (users.length === 0) {
      return;
    }

    console.log(`[SCHEDULED TASK] Found ${users.length} user(s) due for monthly report on 1st of the month at 8:00 AM...`);

    // Target the previous month's full data
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthName = monthNames[prevDate.getMonth()];
    const prevYear = prevDate.getFullYear();

    const startOfMonth = new Date(prevYear, prevDate.getMonth(), 1, 0, 0, 0);
    const endOfMonth = new Date(prevYear, prevDate.getMonth() + 1, 0, 23, 59, 59);

    for (const user of users) {
      try {
        const [sales, expenses, inventory] = await Promise.all([
          Sale.find({ userId: user._id, date: { $gte: startOfMonth, $lte: endOfMonth } }),
          Expense.find({ userId: user._id, date: { $gte: startOfMonth, $lte: endOfMonth } }),
          LivestockInventory.find({ userId: user._id })
        ]);

        const totalRevenue = sales.reduce((acc, s) => acc + (s.amountReceived || 0), 0);
        const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
        const netProfit = totalRevenue - totalExpenses;

        const summaryData = { totalRevenue, totalExpenses, netProfit };

        const pdfBuffer = generateServerReportPDF({
          farmName: user.farmName,
          monthName: prevMonthName,
          year: prevYear,
          totalRevenue,
          totalExpenses,
          netProfit,
          inventory,
          sales,
          expenses
        });

        await sendMonthlyReportEmail({
          to: user.email,
          farmName: user.farmName,
          monthName: prevMonthName,
          year: prevYear,
          pdfBuffer,
          summaryData
        });

        user.lastMonthlyReportSent = currentMonthTag;
        await user.save();

        console.log(`[AUTOMATED 1st OF MONTH DISPATCH (8:00 AM)] Sent ${prevMonthName} ${prevYear} report to: ${user.email}`);
      } catch (userErr) {
        console.error(`Error sending automated report to ${user.email}:`, userErr.message);
      }
    }
  } catch (err) {
    console.error('Error during automated monthly report job:', err.message);
  }
}

/**
 * Initializes the background scheduler. Runs check every minute.
 */
function startMonthlyReportScheduler() {
  console.log('[SCHEDULER] Monthly automated PDF dispatch scheduler active (runs on the 1st of every month at 8:00 AM).');
  
  // Initial check on server boot
  checkAndSendMonthlyReports(false);

  // Check every 60 seconds
  setInterval(() => {
    checkAndSendMonthlyReports(false);
  }, 60 * 1000);
}

module.exports = {
  startMonthlyReportScheduler,
  checkAndSendMonthlyReports
};
