const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const oracleDb = require('./config/oracle');

const app = express();
// USE PORT 5005 (We verified this port works on your Mac)
const PORT = process.env.PORT || 5005;

// Middleware
app.use(cors());
app.use(express.json());

// 🕵️‍♂️ DEBUG SPY: Logs every request to the terminal
app.use((req, res, next) => {
    console.log(`🔎 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// --- ROUTES ---
const authRoutes = require('./routes/auth');

// Mount Auth Routes
app.use('/api/auth', authRoutes);

// Test Route (Access this to prove server is alive)
app.get('/', (req, res) => {
    res.json({ status: 'Online', message: 'Server is running on Port ' + PORT });
});

// =====================================================
// 🚀 STARTUP SEQUENCE: Server First -> Then Databases
// =====================================================
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅ SERVER STARTED SUCCESSFULLY!`);
    console.log(`👉 Local:   http://127.0.0.1:${PORT}`);
    console.log(`👉 Network: http://0.0.0.0:${PORT}`);
    
    // NOW connect to databases (So they don't block startup)
    connectDatabases();
});

async function connectDatabases() {
    // 1. Oracle Connection
    try {
        console.log('⏳ Initializing Oracle Pool...');
        await oracleDb.initialize();
        console.log('✅ Oracle Database connected!');
    } catch (err) {
        console.error('❌ Oracle Connection FAILED:', err.message);
        // We do NOT exit the process, so the server stays alive for debugging
    }

    // 2. MongoDB Connection (Passive)
    try {
        const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/autousata';
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB connected (Passive Mode)');
    } catch (err) {
        console.error('⚠️ MongoDB Connection Failed (Ignored):', err.message);
    }
}

// Graceful Shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    try {
        await oracleDb.close(); 
    } catch(e) { console.log('Oracle close error:', e.message); }
    
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});