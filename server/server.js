const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// 1. Import the DB Module
const db = require('./config/db'); 

const app = express();
const PORT = process.env.PORT || 5001; // Changed to 5001 to match your previous setup

// Middleware
app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
    console.log(`🔎 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// --- ROUTES ---
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Test Route
app.get('/', (req, res) => {
    res.json({ status: 'Online', message: 'Server is running on Port ' + PORT });
});

// =====================================================
// 🚀 STARTUP SEQUENCE: Initialize Pool -> Start Server
// =====================================================
async function startServer() {
    try {
        // 2. Initialize Oracle Pool FIRST (Blocking)
        // The app will NOT start listening until this finishes
        await db.initialize(); 

        // 3. Initialize MongoDB (Passive - Optional)
        const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/autousata';
        try {
            await mongoose.connect(MONGO_URI);
            console.log('✅ MongoDB connected');
        } catch (err) {
            console.error('⚠️ MongoDB Failed (Ignored):', err.message);
        }

        // 4. Start Listening ONLY after DB is ready
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`\n✅ SERVER STARTED SUCCESSFULLY!`);
            console.log(`👉 Local:   http://127.0.0.1:${PORT}`);
        });

        // Graceful Shutdown Logic
        process.on('SIGINT', async () => {
            console.log('\n🛑 Shutting down...');
            await db.close(); // Close Oracle Pool
            server.close(() => {
                console.log('Server closed.');
                process.exit(0);
            });
        });

    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
}

startServer();
