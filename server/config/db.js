const oracledb = require('oracledb');
require('dotenv').config();

oracledb.autoCommit = true;
oracledb.fetchAsString = [oracledb.CLOB];

const dbConfig = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONN_STR,
    poolMin: 2,
    poolMax: 10,
    poolIncrement: 2
};

let pool = null;

async function initialize() {
    try {
        console.log("⏳ Initializing Oracle Pool...");
        pool = await oracledb.createPool(dbConfig);
        console.log('✅ Oracle Database connected!');
    } catch (err) {
        console.error('❌ Failed to create DB pool:', err.message);
        process.exit(1);
    }
}

async function close() {
    try {
        if (pool) {
            await pool.close(10);
            console.log('⚠️ Oracle Pool Closed');
        }
    } catch (err) {
        console.error('Error closing pool:', err);
    }
}

async function getConnection() {
    if (!pool) {
        throw new Error('Database pool not initialized. Server starting up?');
    }
    return await pool.getConnection();
}

module.exports = { initialize, close, getConnection };