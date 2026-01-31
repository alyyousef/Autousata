const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const loginHistorySchema = new mongoose.Schema({
  ipAddress: { type: String, required: true },
  userAgent: { type: String, required: true },
  location: { type: String },
  timestamp: { type: Date, default: Date.now },
  success: { type: Boolean, default: true }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['GUEST', 'BUYER', 'SELLER', 'DEALER', 'ADMIN', 'BANK'],
    default: 'BUYER'
  },
  isKycVerified: { type: Boolean, default: false },
  avatar: { type: String },
  location: { 
    city: { type: String },
    country: { type: String, default: 'Egypt' }
  },
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  phoneVerificationCode: { type: String },
  phoneVerificationExpiry: { type: Date },
  passwordResetToken: { type: String },
  passwordResetExpiry: { type: Date },
  loginHistory: [loginHistorySchema],
  activeSessions: [{ type: String }], // JWT tokens
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Update timestamp
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Add login history entry
userSchema.methods.addLoginHistory = function(ipAddress, userAgent, location, success = true) {
  this.loginHistory.push({
    ipAddress,
    userAgent,
    location,
    timestamp: new Date(),
    success
  });
  // Keep only last 50 login attempts
  if (this.loginHistory.length > 50) {
    this.loginHistory = this.loginHistory.slice(-50);
  }
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
