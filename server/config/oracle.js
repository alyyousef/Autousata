const oracledb = require('oracledb');
require('dotenv').config();

// Attempt to initialize the client (Safe check)
try {
  oracledb.initOracleClient(); 
} catch (err) {
  console.log('Oracle Client init skipped (usually fine on Mac/Linux)');
}

async function initialize() {
  try {
    await oracledb.createPool({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONN_STR,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 1
    });
    console.log('✅ Oracle Database connected!');
  } catch (err) {
    // --- CHANGE: Do NOT kill the process. Just throw the error. ---
    console.error('❌ Oracle Connection Error:', err.message);
    throw err; // Let server.js decide what to do
  }
}

async function close() {
  try {
    await oracledb.getPool().close(0);
  } catch(err) {
    console.log('Oracle pool already closed or not initialized.');
  }
}

module.exports = { initialize, close };