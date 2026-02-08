const jwt = require('jsonwebtoken');
const oracledb = require('oracledb');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

// 1. Generate Token (Same as before)
const generateToken = (user) => {
  return jwt.sign( { userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// 2. Authenticate Middleware (Uses direct SQL query instead of stored procedure)
const authenticate = async (req, res, next) => {
  let connection;
  try {
    // Get the token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token validity
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ Token decoded. User ID:', decoded.userId);
    } catch (jwtError) {
      console.error('❌ JWT Error:', jwtError.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Connect to Oracle
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
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log('📊 Query returned', result.rows?.length || 0, 'rows');

    // Check if user exists
    if (!result.rows || result.rows.length === 0) {
      console.error('❌ User not found. ID:', decoded.userId);
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    console.log('👤 User found:', user.EMAIL, '| Role:', user.ROLE);

    // Check if user is banned or inactive
    if (user.IS_BANNED === '1') {
      console.error('🚫 User is banned');
      return res.status(401).json({ error: 'Account is banned' });
    }

    if (user.IS_ACTIVE === '0') {
      console.error('⏸️ User is inactive');
      return res.status(401).json({ error: 'Account is inactive' });
    }

    // Attach user info to the request object
    req.user = {
      _id: user.ID,
      id: user.ID,
      name: user.NAME,
      email: user.EMAIL,
      role: user.ROLE
    };
    
    req.token = token;
    console.log('✅ Auth success:', user.EMAIL);
    next();

  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(401).json({ error: 'Authentication failed: ' + error.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error(e); }
    }
  }
};

// 3. Authorization (Same as before)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userRole = String(req.user.role || '').toLowerCase();
    const allowedRoles = roles.map((r) => String(r).toLowerCase());
    
    console.log('🔑 Auth check - User:', userRole, '| Required:', allowedRoles);
    
    if (!allowedRoles.includes(userRole)) {
      console.error('❌ Insufficient permissions');
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    console.log('✅ Authorization passed');
    next();
  };
};

module.exports = {
  generateToken,
  authenticate,
  authorize
};