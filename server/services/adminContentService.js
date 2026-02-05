const { getPendingKYC,getLiveAuction,getPendingPayments } = require('../db/adminQueries');
const oracledb = require("oracledb");

const getPendingKYCService = async () => {
    try {
         connection = await oracledb.getConnection();
        
        const result = await connection.execute(
            `SELECT *
            FROM DIP.USERS
            WHERE KYC_STATUS = 'pending'`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return result.rows.map((u) => ({
        id: u.ID,
        email: u.EMAIL,
        phone: u.PHONE,
        firstName: u.FIRST_NAME,
        lastName: u.LAST_NAME,
        isActive: u.IS_ACTIVE,
        isBanned: u.IS_BANNED,
        kycStatus: u.KYC_STATUS,
    }));

    }
    catch (error) {
        console.error('Error fetching pending KYC documents:', error);
        throw error;
    }
    finally {
        if (connection) await connection.close();
    }
};
const getLiveAuctionService = async () => {
    try {
       connection = await oracledb.getConnection();
        
        const result = await connection.execute(
            `SELECT a.ID, a.VEHICLE_ID, a.SELLER_ID,s.FIRST_NAME as SELLER_NAME, a.STATUS, a.START_TIME, a.END_TIME, a.CURRENT_BID_EGP, a.LEADING_BIDDER_ID, l.FIRST_NAME as LEADING_BIDDER_NAME, a.WINNER_ID, u.FIRST_NAME as WINNER_NAME
        FROM DIP.AUCTIONS a JOIN  DIP.USERS s on a.SELLER_ID = s.ID LEFT JOIN DIP.USERS l on a.LEADING_BIDDER_ID = l.ID LEFT JOIN DIP.USERS u ON a.WINNER_ID = u.ID
        WHERE a.STATUS = 'live'
        ORDER BY a.START_TIME DESC`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return result.rows.map((a) => ({
         id: a.ID,
            vehicle_id: a.VEHICLE_ID,
            seller_id: a.SELLER_ID,
            seller_name: a.SELLER_NAME,
            status: a.STATUS,
            start_time: a.START_TIME,
            end_time: a.END_TIME,
            current_bid: a.CURRENT_BID_EGP,
            leading_bid_id : a.LEADING_BIDDER_ID,
            leading_bid_name: a.LEADING_BIDDER_NAME,
            winner_id: a.WINNER_ID,
            winner_name: a.WINNER_NAME,
    }));

    }
    catch (error) {
        console.error('Error fetching live auctions:', error);
        throw error;
    }

    finally {
        if (connection) await connection.close();
    }
};
const getPendingPaymentsService = async () => {
    try {
        connection = await oracledb.getConnection();
        
        const result = await connection.execute(
            `SELECT *
        FROM DIP.PAYMENTS
        WHERE STATUS = 'pending'`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return result.rows.map((p) => ({
        id: p.ID,
        auction_id: p.AUCTION_ID,
        buyer_id: p.BUYER_ID,
        amount: p.AMOUNT_EGP,
        status: p.STATUS,
        gateway: p.GATEWAY,
    }));
    }
    catch (error) {
        console.error('Error fetching pending payments:', error);
        throw error;
    }
    finally {
        if (connection) await connection.close();
    }
};

module.exports = {
    getPendingKYCService,
    getLiveAuctionService,
    getPendingPaymentsService
};  