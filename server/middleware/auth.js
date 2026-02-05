const jwt = require('jsonwebtoken');
const oracledb = require('oracledb');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

// 1. Generate Token (Same as before)
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// 2. Authenticate Middleware (Now uses ORACLE)
const authenticate = async (req, res, next) => {
  let connection;
  try {
    // Get the token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token validity
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Connect to Oracle
    connection = await oracledb.getConnection();

    // Call our new Procedure to find the user
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

    // Check if user exists
    if (userData.status !== 'SUCCESS') {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user info to the request object so routes can use it
    req.user = {
      _id: decoded.userId, // Keeping _id for compatibility with your old code
      id: decoded.userId,
      name: userData.name,
      email: userData.email,
      role: userData.role
    };
    
    req.token = token;
    next();

  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(401).json({ error: 'Invalid token' });
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
    
    // Check if user role matches one of the allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

module.exports = {
  generateToken,
  authenticate,
  authorize
};