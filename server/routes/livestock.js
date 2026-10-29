const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getLivestock, updateLivestock, deleteLivestock } = require('../controllers/livestockController');

// @route   GET api/livestock
// @desc    Get all livestock inventory for user
// @access  Private
router.get('/', auth, getLivestock);

// @route   POST api/livestock
// @desc    Add or update livestock inventory
// @access  Private
router.post('/', auth, updateLivestock);

// @route   DELETE api/livestock/:type
// @desc    Delete a livestock inventory
// @access  Private
router.delete('/:type', auth, deleteLivestock);

module.exports = router;
