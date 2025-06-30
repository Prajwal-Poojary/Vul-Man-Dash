const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Register User - Final Fixed Version
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    // Check for existing user by email only (case insensitive)
    const existingUser = await User.findOne({ 
      email: { $regex: new RegExp('^' + email + '$', 'i') } 
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Create new user with random username to avoid null
    const newUser = new User({
      name,
      email,
      password,
      username: crypto.randomBytes(8).toString('hex') // Random unique username
    });

    // Save user
    const savedUser = await newUser.save();

    // Create token
    const token = jwt.sign(
      { id: savedUser._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    const decoded = jwt.decode(token);

    res.status(201).json({
      token,
      exp: decoded.exp,
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email
      }
    });

  }  catch (err) {
  // console.error('Registration error:', err);

  // Detailed duplicate key error logging
  if (err.code === 11000) {
    return res.status(400).json({ 
      message: 'Duplicate key error',
      duplicateField: err.keyValue
    });
  }

  res.status(500).json({ 
    message: 'Registration failed',
    error: err.message
  });
}

});

// [Keep all other routes exactly the same as before]
// Login User
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    const decoded = jwt.decode(token);
    res.json({
      token,
      exp: decoded.exp,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (err) {
    // console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Get User Data
router.get('/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    // console.error('User data error:', err);
    res.status(500).json({ message: 'Error fetching user data' });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Please provide email' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: 'If account exists, reset email sent' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"Password Reset" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <p>You requested a password reset</p>
        <p>Click this link to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>Link expires in 1 hour.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Reset email sent if account exists' });

  } catch (err) {
    // console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Error processing request' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password required' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successful' });

  } catch (err) {
    // console.error('Reset password error:', err);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

module.exports = router;