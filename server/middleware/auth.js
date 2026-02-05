const jwt = require('jsonwebtoken');
const oracledb = require('oracledb');
require('dotenv').config(); // Ensure env vars are loaded

const ACCESS_SECRET = process.env.JWT_SECRET || 'default-access-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';

// 1. Generate Tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// 2. Verify Refresh Token
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (error) {
    return null;
  }
};

// 3. Authenticate & MAP DATA
const authenticate = async (req, res, next) => {
  let connection;
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, ACCESS_SECRET);
    
    connection = await oracledb.getConnection();

    // Call the procedure we just fixed
    const result = await connection.execute(
      `BEGIN 
         sp_get_user_by_id(:id, :fn, :ln, :em, :ph, :role, :status, :pic, :city); 
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
        city: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
      }
    );

    const userData = result.outBinds;

    if (userData.status === 'NOT_FOUND') {
      return res.status(401).json({ error: 'User not found' });
    }

    // === CRITICAL MAPPING STEP ===
    // This connects DB columns (outBinds) to Frontend variables
    req.user = {
      id: decoded.userId,
      firstName: userData.fn,      // Maps :fn -> firstName
      lastName: userData.ln,       // Maps :ln -> lastName
      email: userData.em,
      phone: userData.ph,
      role: userData.role,
      profileImage: userData.pic,  // Maps :pic -> profileImage
      location: {
        city: userData.city        // Maps :city -> location.city
      }
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

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

module.exports = {
  generateTokens,
  verifyRefreshToken,
  authenticate,
  authorize
};