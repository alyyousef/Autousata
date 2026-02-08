const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import the new DB Configuration (Pool Manager)
const db = require('./config/db');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Socket.IO Configuration
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

// Export io instance for use in routes
function getIO() {
    return io;
}
module.exports = { getIO };

// Webhook route MUST come before express.json() middleware
// Stripe needs the raw body for signature verification
const webhookRoutes = require('./routes/webhooks');
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

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
const paymentRoutes = require('./routes/payments');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/payments', paymentRoutes);

// Test Route
app.get('/', (req, res) => {
    res.json({ status: 'Online', message: 'Server is running on Port ' + PORT });
});

// =====================================================
// SOCKET.IO INITIALIZATION
// =====================================================
const initializeAuctionSocket = require('./sockets/auctionSocket');
const auctionScheduler = require('./services/auctionScheduler');

initializeAuctionSocket(io);
console.log('[Socket.IO] Initialized');

// =====================================================
// STARTUP SEQUENCE: Initialize Pool -> Start Server
// =====================================================
async function startServer() {
    try {
        // 1. Initialize Oracle Pool FIRST
        await db.initialize();

        // 2. Start Listening
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`Server started on http://127.0.0.1:${PORT}`);
            console.log(`Socket.IO listening on ws://127.0.0.1:${PORT}`);
        });

        // 3. Start Auction Scheduler
        auctionScheduler.startScheduler(io);

        // Graceful Shutdown Logic
        process.on('SIGINT', async () => {
            console.log('\nShutting down...');
            auctionScheduler.stopScheduler();
            io.close(() => {
                console.log('Socket.IO closed.');
            });
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
