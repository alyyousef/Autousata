const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

// Import Middleware & DB
const { errorHandler, notFound } = require("./middleware/errorMiddleware");
const db = require("./config/db");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5005;

// =====================================================
// 1. SOCKET.IO SETUP
// =====================================================
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Export io instance for use in routes
function getIO() {
  return io;
}
module.exports = { getIO };

// Attach IO to every request so controllers can use it
app.set("io", io);

// =====================================================
// 2. SECURITY MIDDLEWARE (Helmet & Rate Limit)
// =====================================================
app.use(helmet());

// ✅ 1. Define Global Limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests from this IP, please try again later." },
});

// ✅ 2. Define Auth Limiter (Fixes your error)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 200, 
    message: { error: 'Too many login attempts, please try again later.' }
});

// Apply Global Limiter
app.use("/api", globalLimiter);

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

// HTTP Logger
app.use(morgan('dev'));

// =====================================================
// 4. ROUTES
// =====================================================
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const vehicleRoutes = require("./routes/vehicles");
const auctionRoutes = require("./routes/auctions");
const paymentRoutes = require("./routes/payments");
const adminAuthRoutes = require("./routes/adminAuth");
const adminUsersRoutes = require("./routes/adminUsers");
const adminContentRoutes = require("./routes/adminContent");
const adminRoutes = require("./routes/admin");
const adminFinanceRoutes = require("./routes/adminFinance");
const userRoutes = require("./routes/user");

// ✅ Now authLimiter is defined, so this works:
app.use("/api/auth", authLimiter, authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/auctions', auctionRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin/content", adminContentRoutes);
app.use("/api/admin/finance", adminFinanceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);

// Stripe redirect handler for 3D Secure / hash router compatibility
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
app.get("/", (req, res) => {
  res.json({ status: "Online", message: "Server is running on Port " + PORT });
});

// =====================================================
// 5. ERROR HANDLING (Must be after routes)
// =====================================================
app.use(notFound);
app.use(errorHandler);

// =====================================================
// 6. SERVER STARTUP
// =====================================================
const initializeAuctionSocket = require('./sockets/auctionSocket');
const auctionScheduler = require('./services/auctionScheduler');

async function startServer() {
  try {
    // A. Initialize Oracle Pool
    await db.initialize();

    // B. Initialize Socket Logic
    initializeAuctionSocket(io);
    console.log("[Socket.IO] Initialized");

    // C. Start Scheduler
    if (auctionScheduler.startScheduler) {
      auctionScheduler.startScheduler(io);
    } else {
      console.log("⚠️ Warning: auctionScheduler.startScheduler not found");
    }

    // D. Start HTTP Server
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server started on http://localhost:${PORT}`);
      console.log(`Socket.IO listening on ws://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
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
if (require.main === module) {
    startServer();
}

// Export the app so Jest can test it
module.exports = app;