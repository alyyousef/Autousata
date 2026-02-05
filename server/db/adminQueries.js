
const db = require('../config/db'); 

const getPendingKYC = async () => {
    let connection;
    try {
        connection = await db.getConnection(); 
        const sql = 
        `SELECT k.ID, k.USER_ID, u.FIRST_NAME, u.LAST_NAME, k.DOCUMENT_TYPE, k.STATUS
        FROM KYC_DOCUMENTS k
        JOIN USERS u ON k.USER_ID = u.ID
        WHERE k.STATUS = 'pending'
        ORDER BY k.ID ASC
        `;
        const result = await connection.execute(sql);
        return result.rows;
    } catch (err) {
        console.error('Oracle query error:', err);
        throw err;
    } finally {
        if (connection) await connection.close(); 
    }   
};

const getLiveAuction= async () => {
    let connection;
    try {
        connection = await db.getConnection();
        const sql =
        `SELECT *
        FROM AUCTIONS
        WHERE STATUS = 'live'
        ORDER BY START_TIME DESC`;
        const result = await connection.execute(sql);
        return result.rows;
    } catch (err) {     
        console.error('Oracle query error:', err);
        throw err;
    } finally {
        if (connection) await connection.close();
    }
};

const getPendingPayments= async () => {
    let connection;
    try {
        connection = await db.getConnection();
        const sql =
        `SELECT *
        FROM PAYMENTS
        WHERE STATUS = 'pending'`;
        //pending & processing
        const result = await connection.execute(sql);
        return result.rows;
    } catch (err) {
        console.error('Oracle query error:', err);
        throw err;
    }
    finally {
        if (connection) await connection.close();
    }
};
module.exports = { getPendingKYC ,getLiveAuction, getPendingPayments};
