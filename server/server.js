const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Import the new DB Configuration (Pool Manager)
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

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
const adminFinanceRoutes = require("./routes/adminFinance");
const adminAuthRoutes = require("./routes/adminAuth");
const adminUsersRoutes = require("./routes/adminUsers");
const adminContentRoutes = require("./routes/adminContent");
const adminRoutes = require("./routes/admin");

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/payments', paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/auctions", auctionRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin/content", adminContentRoutes);
app.use("/api/admin/finance", adminFinanceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);

// Stripe redirect handler for 3D Secure / hash router compatibility
// Stripe cannot redirect to hash URLs, so we redirect here first
app.get("/payment-redirect", (req, res) => {
  const { listingId, paymentId, payment_intent, payment_intent_client_secret } =
    req.query;
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const params = new URLSearchParams();
  if (payment_intent) params.set("payment_intent", payment_intent);
  if (payment_intent_client_secret)
    params.set("payment_intent_client_secret", payment_intent_client_secret);
  if (paymentId) params.set("paymentId", paymentId);
  const hash = `/payment/${listingId || "unknown"}/confirmation`;
  const queryString = params.toString() ? `?${params.toString()}` : "";
  res.redirect(`${clientUrl}/#${hash}${queryString}`);
});

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

process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    if (auctionScheduler.stopScheduler) auctionScheduler.stopScheduler();
    
    io.close(() => console.log('Socket.IO closed.'));
    
    await db.close();
    
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});

// =====================================================
// CRITICAL FIX: EXPORT APP & CONDITIONAL START
// =====================================================

// Only start the server if this file is run directly (node server.js)
// This prevents the server from starting when we run 'npm test'
if (require.main === module) {
    startServer();
}

// Export the app so Jest can test it
module.exports = app;