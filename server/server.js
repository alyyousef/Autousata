const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const User = require('./models/User');

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/autousata';
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');

    if (process.env.NODE_ENV !== 'production') {
      const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@autousata.com';
      const demoPassword = process.env.DEMO_USER_PASSWORD || 'DemoPass123!';
      const existing = await User.findOne({ email: demoEmail.toLowerCase() });
      if (!existing) {
        await User.create({
          name: 'Demo Seller',
          email: demoEmail.toLowerCase(),
          phone: '+10000000000',
          password: demoPassword,
          role: 'SELLER',
          isKycVerified: true
        });
        console.log('Demo user created');
      }
    }
  })
  .catch(err => console.log('MongoDB connection error:', err));

// Routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');

app.use('/api/auth', authRoutes);
app.use('/api', profileRoutes);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Autousata API' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
