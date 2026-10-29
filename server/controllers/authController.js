const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const register = async (req, res) => {
  try {
    const { email, password, farmName, location, mobile } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    user = new User({
      email,
      passwordHash,
      farmName,
      location,
      mobile,
    });

    await user.save();

    // Create and return JWT
    const payload = {
      user: {
        id: user.id,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({ token, user: { id: user.id, email: user.email, farmName: user.farmName } });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: err.message || 'Server Error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    // Create and return JWT
    const payload = {
      user: {
        id: user.id,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: { id: user.id, email: user.email, farmName: user.farmName } });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

const updateProfile = async (req, res) => {
  try {
    const { farmName, location, password, mobile, monthlyReportEnabled } = req.body;
    let user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (farmName) user.farmName = farmName;
    if (location !== undefined) user.location = location;
    if (monthlyReportEnabled !== undefined) user.monthlyReportEnabled = monthlyReportEnabled;

    if (password) {
      if (!mobile || user.mobile !== mobile) {
        return res.status(400).json({ message: 'Incorrect mobile number. Required to change password.' });
      }
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password, salt);
    }

    await user.save();
    res.json({ message: 'Profile updated successfully', user: { id: user.id, email: user.email, farmName: user.farmName, location: user.location } });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email, mobile, newPassword } = req.body;
    let user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.mobile !== mobile) {
      return res.status(400).json({ message: 'Incorrect mobile number' });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();
    
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const Sale = require('../models/Sale');
    const Expense = require('../models/Expense');
    const LivestockInventory = require('../models/LivestockInventory');
    
    await Promise.all([
      Sale.deleteMany({ userId }),
      Expense.deleteMany({ userId }),
      LivestockInventory.deleteMany({ userId })
    ]);
    
    await User.findByIdAndDelete(userId);
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  forgotPassword,
  deleteAccount,
};
