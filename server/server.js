const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Import the new DB Configuration (Pool Manager)
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const vehicleRoutes = require('./routes/vehicles');
const auctionRoutes = require('./routes/auctions');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/auctions', auctionRoutes);

// Test Route
app.get('/', (req, res) => {
    res.json({ status: 'Online', message: 'Server is running on Port ' + PORT });
});

// =====================================================
// STARTUP SEQUENCE: Initialize Pool -> Start Server
// =====================================================
async function startServer() {
    try {
        // 1. Initialize Oracle Pool FIRST
        await db.initialize();

        // 2. Initialize MongoDB (Passive)
        const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/AUTOUSATA';
        try {
            await mongoose.connect(MONGO_URI);
            console.log('MongoDB connected');
        } catch (err) {
            console.error('MongoDB connection failed (ignored):', err.message);
        }

        // 3. Start Listening
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server started on http://127.0.0.1:${PORT}`);
        });

        // Graceful Shutdown Logic
        process.on('SIGINT', async () => {
            console.log('\nShutting down...');
            await db.close();
            server.close(() => {
                console.log('Server closed.');
                process.exit(0);
            });
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

startServer();
