const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (!existingUser.password) {
        // Link password to existing Google account
        const hashedPassword = await bcrypt.hash(password, 10);
        existingUser.password = hashedPassword;
        if (name && !existingUser.name) existingUser.name = name;
        await existingUser.save();
        return res.status(200).json({
          message: 'Password linked successfully! You can now log in with your password or Google.'
        });
      }
      return res.status(400).json({ message: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, name: name || email.split('@')[0] });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(400).json({
        message: 'This account was registered with Google and has no password yet. Click "Create one now" below to set a password, or use "Continue with Google".'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const displayName = user.name || user.email.split('@')[0];
    const token = jwt.sign(
      { id: user._id, email: user.email, name: displayName },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ token, email: user.email, name: displayName });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login };