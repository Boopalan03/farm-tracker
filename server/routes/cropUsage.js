const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getCropUsages,
  addCropUsage,
  updateCropUsage,
  deleteCropUsage,
  getCropUsageSummary,
} = require('../controllers/cropUsageController');

router.get('/', auth, getCropUsages);
router.post('/', auth, addCropUsage);
router.get('/summary', auth, getCropUsageSummary);
router.put('/:id', auth, updateCropUsage);
router.delete('/:id', auth, deleteCropUsage);

module.exports = router;
