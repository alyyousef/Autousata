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
// Allow multiple origins for Socket.io
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000"
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
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

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests from this IP, please try again later." },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 200, 
    message: { error: 'Too many login attempts, please try again later.' }
});

app.use("/api", globalLimiter);

// =====================================================
// 3. STANDARD MIDDLEWARE
// =====================================================
const webhookRoutes = require('./routes/webhooks');
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// ✅ FIX: Updated CORS to allow Docker port 8080
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
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

// Apply authLimiter specifically to auth routes
app.use("/api/auth", authLimiter, authRoutes);

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

app.get("/payment-redirect", (req, res) => {
  const { listingId, paymentId, payment_intent, payment_intent_client_secret } = req.query;
  const clientUrl = process.env.CLIENT_URL || "http://localhost:8080";
  const params = new URLSearchParams();
  if (payment_intent) params.set("payment_intent", payment_intent);
  if (payment_intent_client_secret) params.set("payment_intent_client_secret", payment_intent_client_secret);
  if (paymentId) params.set("paymentId", paymentId);
  const hash = `/payment/${listingId || "unknown"}/confirmation`;
  const queryString = params.toString() ? `?${params.toString()}` : "";
  res.redirect(`${clientUrl}/#${hash}${queryString}`);
});

app.get("/", (req, res) => {
  res.json({ status: "Online", message: "Server is running on Port " + PORT });
});

// =====================================================
// 5. ERROR HANDLING
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
    await db.initialize();
    initializeAuctionSocket(io);
    console.log("[Socket.IO] Initialized");

    if (auctionScheduler.startScheduler) {
      auctionScheduler.startScheduler(io);
    }

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server started on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    if (auctionScheduler.stopScheduler) auctionScheduler.stopScheduler();
    io.close();
    await db.close();
    server.close(() => process.exit(0));
});

if (require.main === module) {
    startServer();
}

module.exports = app;