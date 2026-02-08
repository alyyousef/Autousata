const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan'); // ✅ Added Morgan
require('dotenv').config();

// Import DB
const db = require('./config/db');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// =====================================================
// 1. SOCKET.IO SETUP
// =====================================================
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

// Attach IO to every request so controllers can use it
app.set('io', io);

// =====================================================
// 2. SECURITY MIDDLEWARE (Helmet & Rate Limit)
// =====================================================
app.use(helmet()); // Secure Headers

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, 
    message: { error: 'Too many requests from this IP, please try again later.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 10, 
    message: { error: 'Too many login attempts, please try again later.' }
});

// Apply Global Limiter to API routes
app.use('/api', globalLimiter);

// =====================================================
// 3. STANDARD MIDDLEWARE
// =====================================================
// Webhook route MUST come before express.json()
const webhookRoutes = require('./routes/webhooks');
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ✅ HTTP Logger (Morgan) - Replaces manual console.log
app.use(morgan('dev'));

// =====================================================
// 4. ROUTES
// =====================================================
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const vehicleRoutes = require('./routes/vehicles');
const auctionRoutes = require('./routes/auctions');
const paymentRoutes = require('./routes/payments');

// Apply Auth Limiter specifically to auth routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/payments', paymentRoutes);

// Test Route
app.get('/', (req, res) => {
    res.json({ status: 'Online', message: 'Server running on Port ' + PORT });
});

// =====================================================
// 5. SERVER STARTUP
// =====================================================
const initializeAuctionSocket = require('./sockets/auctionSocket');
const auctionScheduler = require('./services/auctionScheduler');

async function startServer() {
    try {
        // A. Initialize Oracle Pool
        await db.initialize();

        // B. Initialize Socket Logic
        initializeAuctionSocket(io);

        // C. Start Scheduler
        if (auctionScheduler.startScheduler) {
             auctionScheduler.startScheduler(io);
        } else {
             console.log('⚠️ Warning: auctionScheduler.startScheduler not found');
        }

        // D. Start HTTP Server
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`✅ Server started on http://localhost:${PORT}`);
        });

    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
}

// Graceful Shutdown
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

startServer();