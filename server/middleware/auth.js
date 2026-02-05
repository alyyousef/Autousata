const jwt = require('jsonwebtoken');
const oracledb = require('oracledb');
require('dotenv').config();

const ACCESS_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const LEGACY_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

// =========================================================
// 1. GENERATE TOKEN (Legacy support)
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
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify Access Token
    const decoded = jwt.verify(token, ACCESS_SECRET);
    
    connection = await oracledb.getConnection();

    // === UPDATED PROCEDURE CALL ===
    // Added :ver to catch the verification status
    const result = await connection.execute(
      `BEGIN 
         sp_get_user_by_id(:id, :fn, :ln, :em, :ph, :role, :status, :pic, :city, :ver); 
       END;`,
      {
        id: decoded.userId,
        fn: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        ln: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        em: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        ph: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        role: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        status: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        pic: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        city: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        ver: { dir: oracledb.BIND_OUT, type: oracledb.STRING } // <--- CATCH VERIFICATION STATUS
      }
    );

    const userData = result.outBinds;

    if (userData.status === 'NOT_FOUND') {
      return res.status(401).json({ error: 'User not found' });
    }

    // === DATA MAPPING ===
    req.user = {
      id: decoded.userId,
      firstName: userData.fn,
      lastName: userData.ln,
      email: userData.em,
      phone: userData.ph,
      role: userData.role,
      profileImage: userData.pic,
      location: {
        city: userData.city
      },
      // Convert '1' to true, '0' to false
      emailVerified: userData.ver === '1' 
    };
    
    req.token = token;
    next();

  } catch (error) {
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
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

module.exports = {
  generateToken, // Legacy
  generateTokens,
  verifyRefreshToken,
  authenticate,
  authorize
};