const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { register, login, getMe, updateProfile, forgotPassword, deleteAccount } = require('../controllers/authController');

// @route   POST api/auth/forgot-password
// @desc    Reset forgotten password
// @access  Public
router.post('/forgot-password', forgotPassword);

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', register);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', login);

// @route   GET api/auth/me
// @desc    Get user profile
// @access  Private
router.get('/me', auth, getMe);

// @route   PUT api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, updateProfile);

// @route   DELETE api/auth/account
// @desc    Delete user account and all data
// @access  Private
router.delete('/account', auth, deleteAccount);

module.exports = router;
