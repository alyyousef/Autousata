const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import the new DB Configuration (Pool Manager)
const db = require('./config/db'); 

const app = express();
// USE PORT 5000
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request Logger
app.use((req, res, next) => {
    console.log(`🔎 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const vehicleRoutes = require('./routes/vehicles');
const auctionRoutes = require('./routes/auctions');
app.use('/api/auth', authRoutes);
app.use('/api', profileRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/auctions', auctionRoutes);

// Test Route
app.get('/', (req, res) => {
    res.json({ status: 'Online', message: 'Server is running on Port ' + PORT });
});

// =====================================================
// 🚀 STARTUP SEQUENCE: Initialize Pool -> Start Server
// =====================================================
async function startServer() {
    try {
        // 1. Initialize Oracle Pool FIRST
        await db.initialize();

        // 2. Start the server after DB is ready
        app.listen(PORT, () => {
            console.log(`✅ Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
