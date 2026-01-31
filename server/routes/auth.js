const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, authenticate } = require('../middleware/auth');
const crypto = require('crypto');

// Helper to get client IP and user agent
const getClientInfo = (req) => {
  return {
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('user-agent') || 'unknown',
    location: req.get('x-forwarded-for') || 'unknown'
  };
};

// FRQAS-001: Register with email/phone and password
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        ...(phone ? [{ phone }] : [])
      ]
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or phone already exists' });
    }

    // Create user
    const user = new User({
      name,
      email: email.toLowerCase(),
      phone: phone || undefined,
      password,
      role: 'BUYER'
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);
    user.activeSessions.push(token);
    await user.save();

    // Add initial login history
    const clientInfo = getClientInfo(req);
    await user.addLoginHistory(clientInfo.ipAddress, clientInfo.userAgent, clientInfo.location, true);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isKycVerified: user.isKycVerified,
        avatar: user.avatar,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

// FRQAS-002: Login with secure credentials
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      const clientInfo = getClientInfo(req);
      await user.addLoginHistory(clientInfo.ipAddress, clientInfo.userAgent, clientInfo.location, false);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);
    user.activeSessions.push(token);
    await user.save();

    // Add login history
    const clientInfo = getClientInfo(req);
    await user.addLoginHistory(clientInfo.ipAddress, clientInfo.userAgent, clientInfo.location, true);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isKycVerified: user.isKycVerified,
        avatar: user.avatar,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// FRQAS-003: Reset password securely
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists for security
      return res.json({ message: 'If an account exists, a password reset link has been sent' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpiry = Date.now() + 3600000; // 1 hour
    await user.save();

    // In production, send email with reset link
    // For now, return token (in production, send via email)
    res.json({ 
      message: 'Password reset token generated',
      resetToken // Remove this in production, send via email instead
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Password reset request failed' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = await User.findOne({
      passwordResetToken: resetToken,
      passwordResetExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    // Clear all sessions for security
    user.activeSessions = [];
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// FRQAS-004: Logout and terminate all sessions
router.post('/logout', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const token = req.token;

    // Remove current session
    user.activeSessions = user.activeSessions.filter(sessionToken => sessionToken !== token);
    await user.save();

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Logout from all devices
router.post('/logout-all', authenticate, async (req, res) => {
  try {
    const user = req.user;
    user.activeSessions = [];
    await user.save();

    res.json({ message: 'Logged out from all devices successfully' });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// FRQAS-005: Get login history
router.get('/login-history', authenticate, async (req, res) => {
  try {
    const user = req.user;
    
    // Return last 50 login attempts, sorted by most recent
    const history = user.loginHistory
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50)
      .map(entry => ({
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        location: entry.location,
        timestamp: entry.timestamp,
        success: entry.success
      }));

    res.json({ loginHistory: history });
  } catch (error) {
    console.error('Get login history error:', error);
    res.status(500).json({ error: 'Failed to retrieve login history' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isKycVerified: user.isKycVerified,
        avatar: user.avatar,
        location: user.location,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to retrieve user' });
  }
});

module.exports = router;
