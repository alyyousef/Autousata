const jwt = require("jsonwebtoken");
const oracledb = require("oracledb");
require("dotenv").config();

const ACCESS_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "default-refresh-secret";
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const LEGACY_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30d";

// =========================================================
// 1. GENERATE TOKEN (Legacy support)
// =========================================================
const generateToken = (userId) => {
  return jwt.sign({ userId }, ACCESS_SECRET, {
    expiresIn: LEGACY_TOKEN_EXPIRES_IN,
  });
};

// =========================================================
// 2. GENERATE TOKENS (Access + Refresh)
// =========================================================
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
  const refreshToken = jwt.sign({ userId }, REFRESH_SECRET, {
    expiresIn: "7d",
  });
  return { accessToken, refreshToken };
};

// =========================================================
// 3. VERIFY REFRESH TOKEN
// =========================================================
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (error) {
    return null;
  }
};

// =========================================================
// 4. AUTHENTICATE & MAP DATA (The Critical Part)
// =========================================================
const authenticate = async (req, res, next) => {
  let connection;
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Verify Access Token
    const decoded = jwt.verify(token, ACCESS_SECRET);

    connection = await oracledb.getConnection();

    // DIRECT SQL QUERY instead of stored procedure
    const result = await connection.execute(
      `SELECT 
        ID,
        FIRST_NAME || ' ' || LAST_NAME AS NAME,
        EMAIL,
        ROLE,
        IS_ACTIVE,
        IS_BANNED
      FROM USERS
      WHERE ID = :userId`,
      { userId: decoded.userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    console.log("📊 Query returned", result.rows?.length || 0, "rows");

    // Check if user exists
    if (!result.rows || result.rows.length === 0) {
      console.error("❌ User not found. ID:", decoded.userId);
      return res.status(401).json({ error: "User not found" });
    }

    const user = result.rows[0];
    console.log("👤 User found:", user.EMAIL, "| Role:", user.ROLE);

    // Check if user is banned or inactive
    if (user.IS_BANNED === "1") {
      console.error("🚫 User is banned");
      return res.status(401).json({ error: "Account is banned" });
    }

    if (user.IS_ACTIVE === "0") {
      console.error("⏸️ User is inactive");
      return res.status(401).json({ error: "Account is inactive" });
    }

    // Attach user info to the request object
    req.user = {
      _id: user.ID,
      id: user.ID,
      name: user.NAME,
      email: user.EMAIL,
      role: user.ROLE,
    };

    req.token = token;
    console.log("✅ Auth success:", user.EMAIL);
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ error: "TokenExpired", message: "Access token expired" });
    }
    console.error("Auth Middleware Error:", error.message);
    res.status(401).json({ error: "Invalid token" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        console.error(e);
      }
    }
  }
};

// =========================================================
// 5. AUTHORIZATION
// =========================================================
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const userRole = String(req.user.role || "").toLowerCase();
    const allowedRoles = roles.map((r) => String(r).toLowerCase());

    console.log("🔑 Auth check - User:", userRole, "| Required:", allowedRoles);

    if (!allowedRoles.includes(userRole)) {
      console.error("❌ Insufficient permissions");
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    console.log("✅ Authorization passed");
    next();
  };
};

module.exports = {
  generateToken, // Legacy
  generateTokens,
  verifyRefreshToken,
  authenticate,
  authorize,
};
