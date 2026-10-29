const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDashboardSummary, resetAllData, importData, sendMonthlyReport } = require('../controllers/dashboardController');

router.get('/summary', auth, getDashboardSummary);
router.delete('/reset', auth, resetAllData);
router.post('/import', auth, importData);
router.post('/send-monthly-report', auth, sendMonthlyReport);

module.exports = router;
