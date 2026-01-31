const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const crypto = require('crypto');

// FRQAS-006: Update profile information
router.put('/profile', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { name, location } = req.body;

    if (name) user.name = name;
    if (location) {
      user.location = {
        city: location.city || user.location?.city,
        country: location.country || user.location?.country || 'Egypt'
      };
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
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
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// FRQAS-007: Upload profile picture
router.put('/profile/avatar', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { avatarUrl } = req.body;

    if (!avatarUrl) {
      return res.status(400).json({ error: 'Avatar URL is required' });
    }

    user.avatar = avatarUrl;
    await user.save();

    res.json({
      message: 'Profile picture updated successfully',
      avatar: user.avatar
    });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({ error: 'Failed to update profile picture' });
  }
});

// FRQAS-008: Set primary location (city)
router.put('/profile/location', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { city, country } = req.body;

    if (!city) {
      return res.status(400).json({ error: 'City is required' });
    }

    user.location = {
      city,
      country: country || 'Egypt'
    };
    await user.save();

    res.json({
      message: 'Location updated successfully',
      location: user.location
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// FRQAS-009: Verify phone number
router.post('/profile/verify-phone', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { phone, code } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // If code is provided, verify it
    if (code) {
      if (user.phoneVerificationCode !== code) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      if (user.phoneVerificationExpiry < Date.now()) {
        return res.status(400).json({ error: 'Verification code expired' });
      }

      user.phone = phone;
      user.phoneVerified = true;
      user.phoneVerificationCode = undefined;
      user.phoneVerificationExpiry = undefined;
      await user.save();

      return res.json({ message: 'Phone number verified successfully' });
    }

    // Generate verification code (in production, send via SMS)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.phoneVerificationCode = verificationCode;
    user.phoneVerificationExpiry = Date.now() + 600000; // 10 minutes
    await user.save();

    // In production, send SMS with code
    // For now, return code (remove in production)
    res.json({
      message: 'Verification code sent',
      code: verificationCode // Remove this in production
    });
  } catch (error) {
    console.error('Verify phone error:', error);
    res.status(500).json({ error: 'Phone verification failed' });
  }
});

// FRQAS-010: Verify email address
router.post('/profile/verify-email', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { token } = req.body;

    if (token) {
      // Verify token
      if (user.emailVerificationToken !== token) {
        return res.status(400).json({ error: 'Invalid verification token' });
      }

      user.emailVerified = true;
      user.emailVerificationToken = undefined;
      await user.save();

      return res.json({ message: 'Email verified successfully' });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = verificationToken;
    await user.save();

    // In production, send email with verification link
    // For now, return token (remove in production)
    res.json({
      message: 'Verification email sent',
      token: verificationToken // Remove this in production
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Email verification failed' });
  }
});

module.exports = router;
