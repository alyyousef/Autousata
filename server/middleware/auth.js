const jwt = require('jsonwebtoken');
const oracledb = require('oracledb');
require('dotenv').config();

const ACCESS_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const LEGACY_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

// =========================================================
// 1. GENERATE TOKEN (Legacy single token)
// =========================================================
const generateToken = (userId) => {
  return jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: LEGACY_TOKEN_EXPIRES_IN });
};

// =========================================================
// 2. GENERATE TOKENS (Access + Refresh)
// =========================================================
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
  const refreshToken = jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// =========================================================
// 3. VERIFY REFRESH TOKEN (Helper)
// =========================================================
// Why: The controller will need this to check if a user is allowed to get a new token.
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (error) {
    return null; // Invalid or expired
  }
};

// =========================================================
// 4. AUTHENTICATE MIDDLEWARE (Checks Access Token)
// =========================================================
const authenticate = async (req, res, next) => {
  let connection;
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify against ACCESS_SECRET (Short lived)
    const decoded = jwt.verify(token, ACCESS_SECRET);
    
    connection = await oracledb.getConnection();

    const result = await connection.execute(
      `BEGIN 
         sp_get_user_by_id(:id, :name, :email, :role, :status); 
       END;`,
      {
        id: decoded.userId,
        name:   { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        email:  { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        role:   { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        status: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
      }
    );

    const userData = result.outBinds;

    if (userData.status !== 'SUCCESS') {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      id: decoded.userId,
      name: userData.name,
      email: userData.email,
      role: userData.role
    };
    
    req.token = token;
    next();

  } catch (error) {
    // Specific error message helps frontend know IF it should try to refresh
    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'TokenExpired', message: 'Access token expired' });
    }
    console.error('Auth Middleware Error:', error.message);
    res.status(401).json({ error: 'Invalid token' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error(e); }
    }
  }
};

// =========================================================
// 5. AUTHORIZATION
// =========================================================
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

module.exports = {
  generateToken,
  generateTokens,
  verifyRefreshToken,
  authenticate,
  authorize
};