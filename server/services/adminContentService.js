const oracledb = require("oracledb");


const getPendingKYCService = async () => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        
        const result = await connection.execute(
            `SELECT 
                U.ID as USER_ID,
                U.EMAIL,
                U.PHONE,
                U.FIRST_NAME,
                U.LAST_NAME,
                U.IS_ACTIVE,
                U.IS_BANNED,
                U.KYC_STATUS,
                K.ID as KYC_ID,
                K.DOCUMENT_TYPE,
                K.DOCUMENT_NUMBER,
                K.FULL_NAME_ON_DOC,
                K.DATE_OF_BIRTH,
                K.ISSUE_DATE,
                K.EXPIRY_DATE,
                K.DOCUMENT_FRONT_URL,
                K.DOCUMENT_BACK_URL,
                K.SELFIE_WITH_DOC_URL,
                K.STATUS as KYC_DOC_STATUS,
                K.REJECTION_REASON,
                K.VERIFICATION_METHOD,
                K.SUBMITTED_AT,
                K.REVIEWED_AT,
                K.REVIEWED_BY_ADMIN_ID
            FROM DIP.KYC_DOCUMENTS K
            RIGHT JOIN DIP.USERS U ON K.USER_ID = U.ID
            WHERE U.KYC_STATUS = 'pending'`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        return result.rows.map((row) => ({
            userId: row.USER_ID,
            email: row.EMAIL,
            phone: row.PHONE,
            firstName: row.FIRST_NAME,
            lastName: row.LAST_NAME,
            isActive: row.IS_ACTIVE,
            isBanned: row.IS_BANNED,
            kycStatus: row.KYC_STATUS,
            kycId: row.KYC_ID,
            documentType: row.DOCUMENT_TYPE,
            documentNumber: row.DOCUMENT_NUMBER,
            fullNameOnDoc: row.FULL_NAME_ON_DOC,
            dateOfBirth: row.DATE_OF_BIRTH,
            issueDate: row.ISSUE_DATE,
            expiryDate: row.EXPIRY_DATE,
            documentFrontUrl: row.DOCUMENT_FRONT_URL,
            documentBackUrl: row.DOCUMENT_BACK_URL,
            selfieWithDocUrl: row.SELFIE_WITH_DOC_URL,
            kycDocStatus: row.KYC_DOC_STATUS,
            rejectionReason: row.REJECTION_REASON,
            verificationMethod: row.VERIFICATION_METHOD,
            submittedAt: row.SUBMITTED_AT,
            reviewedAt: row.REVIEWED_AT,
            reviewedByAdminId: row.REVIEWED_BY_ADMIN_ID
        }));
    } catch (error) {
        console.error('Error fetching pending KYC documents:', error);
        throw error;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
};




const getPendingPaymentsService = async () => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        
        const result = await connection.execute(
            `SELECT 
                P.ID,
                P.AUCTION_ID,
                P.BUYER_ID,
                B.FIRST_NAME || ' ' || B.LAST_NAME as BUYER_NAME,
                P.SELLER_ID,
                S.FIRST_NAME || ' ' || S.LAST_NAME as SELLER_NAME,
                P.AMOUNT_EGP,
                P.CURRENCY,
                P.PROCESSOR_FEE_EGP,
                P.PAYMENT_METHOD,
                P.GATEWAY,
                P.GATEWAY_ORDER_ID,
                P.GATEWAY_TRANS_ID,
                P.STATUS,
                P.FAILURE_REASON,
                P.INITIATED_AT,
                P.COMPLETED_AT,
                P.FAILED_AT,
                P.REFUNDED_AT
            FROM DIP.PAYMENTS P
            LEFT JOIN DIP.USERS B ON P.BUYER_ID = B.ID
            LEFT JOIN DIP.USERS S ON P.SELLER_ID = S.ID
            WHERE P.STATUS = 'pending'
            ORDER BY P.INITIATED_AT DESC`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        return result.rows.map((p) => ({
            id: p.ID,
            auctionId: p.AUCTION_ID,
            buyerId: p.BUYER_ID,
            buyerName: p.BUYER_NAME,
            sellerId: p.SELLER_ID,
            sellerName: p.SELLER_NAME,
            amount: p.AMOUNT_EGP,
            currency: p.CURRENCY,
            processorFee: p.PROCESSOR_FEE_EGP,
            paymentMethod: p.PAYMENT_METHOD,
            gateway: p.GATEWAY,
            gatewayOrderId: p.GATEWAY_ORDER_ID,
            gatewayTransId: p.GATEWAY_TRANS_ID,
            status: p.STATUS,
            failureReason: p.FAILURE_REASON,
            initiatedAt: p.INITIATED_AT,
            completedAt: p.COMPLETED_AT,
            failedAt: p.FAILED_AT,
            refundedAt: p.REFUNDED_AT
        }));
    } catch (error) {
        console.error('Error fetching pending payments:', error);
        throw error;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
};


//auctions
const getAllAuctionService = async () => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        
        const result = await connection.execute(
            `SELECT 
                A.ID,
                A.VEHICLE_ID,
                A.SELLER_ID,
                S.FIRST_NAME || ' ' || S.LAST_NAME as SELLER_NAME,
                A.STATUS,
                A.START_TIME,
                A.END_TIME,
                A.ORIGINAL_END_TIME,
                A.RESERVE_PRICE_EGP,
                A.STARTING_BID_EGP,
                A.CURRENT_BID_EGP,
                A.BID_COUNT,
                A.MIN_BID_INCREMENT,
                A.AUTO_EXTEND_ENABLED,
                A.AUTO_EXTEND_MINUTES,
                A.MAX_AUTO_EXTENSIONS,
                A.AUTO_EXT_COUNT,
                A.LEADING_BIDDER_ID,
                L.FIRST_NAME || ' ' || L.LAST_NAME as LEADING_BIDDER_NAME,
                A.WINNER_ID,
                W.FIRST_NAME || ' ' || W.LAST_NAME as WINNER_NAME,
                A.CREATED_AT,
                A.STARTED_AT
            FROM DIP.AUCTIONS A
            JOIN DIP.USERS S ON A.SELLER_ID = S.ID
            LEFT JOIN DIP.USERS L ON A.LEADING_BIDDER_ID = L.ID
            LEFT JOIN DIP.USERS W ON A.WINNER_ID = W.ID
            ORDER BY A.START_TIME DESC`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        return result.rows.map((a) => ({
            id: a.ID,
            vehicleId: a.VEHICLE_ID,
            sellerId: a.SELLER_ID,
            sellerName: a.SELLER_NAME,
            status: a.STATUS,
            startTime: a.START_TIME,
            endTime: a.END_TIME,
            originalEndTime: a.ORIGINAL_END_TIME,
            reservePrice: a.RESERVE_PRICE_EGP,
            startingBid: a.STARTING_BID_EGP,
            currentBid: a.CURRENT_BID_EGP,
            bidCount: a.BID_COUNT,
            minBidIncrement: a.MIN_BID_INCREMENT,
            autoExtendEnabled: a.AUTO_EXTEND_ENABLED,
            autoExtendMinutes: a.AUTO_EXTEND_MINUTES,
            maxAutoExtensions: a.MAX_AUTO_EXTENSIONS,
            autoExtCount: a.AUTO_EXT_COUNT,
            leadingBidderId: a.LEADING_BIDDER_ID,
            leadingBidderName: a.LEADING_BIDDER_NAME,
            winnerId: a.WINNER_ID,
            winnerName: a.WINNER_NAME,
            createdAt: a.CREATED_AT,
            startedAt: a.STARTED_AT
        }));
    } catch (error) {
        console.error('Error fetching live auctions:', error);
        throw error;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
};

const filterauctionbyStatus= async (status) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(
            `SELECT
                A.ID,
                A.VEHICLE_ID,
                A.SELLER_ID,
                S.FIRST_NAME || ' ' || S.LAST_NAME AS SELLER_NAME,
                A.STATUS,
                A.START_TIME,
                A.END_TIME,
                A.ORIGINAL_END_TIME,
                A.RESERVE_PRICE_EGP,
                A.STARTING_BID_EGP,
                A.CURRENT_BID_EGP,
                A.BID_COUNT,
                A.MIN_BID_INCREMENT,
                A.AUTO_EXTEND_ENABLED,
                A.AUTO_EXTEND_MINUTES,
                A.MAX_AUTO_EXTENSIONS,
                A.AUTO_EXT_COUNT,
                A.LEADING_BIDDER_ID,
                L.FIRST_NAME || ' ' || L.LAST_NAME AS LEADING_BIDDER_NAME,
                A.WINNER_ID,
                W.FIRST_NAME || ' ' || W.LAST_NAME AS WINNER_NAME,
                A.CREATED_AT,
                A.STARTED_AT,
                A.ENDED_AT
            FROM DIP.AUCTIONS A
            JOIN DIP.USERS S ON A.SELLER_ID = S.ID
            LEFT JOIN DIP.USERS L ON A.LEADING_BIDDER_ID = L.ID
            LEFT JOIN DIP.USERS W ON A.WINNER_ID = W.ID
            WHERE A.STATUS = :status
            ORDER BY A.START_TIME DESC`,
            { status },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return result.rows.map((a) => ({
            id: a.ID,
            vehicleId: a.VEHICLE_ID,
            sellerId: a.SELLER_ID,
            sellerName: a.SELLER_NAME,
            status: a.STATUS,
            startTime: a.START_TIME,
            endTime: a.END_TIME,
            originalEndTime: a.ORIGINAL_END_TIME,
            reservePrice: a.RESERVE_PRICE_EGP,
            startingBid: a.STARTING_BID_EGP,
            currentBid: a.CURRENT_BID_EGP,
            bidCount: a.BID_COUNT,
            minBidIncrement: a.MIN_BID_INCREMENT,
            autoExtendEnabled: a.AUTO_EXTEND_ENABLED,
            autoExtendMinutes: a.AUTO_EXTEND_MINUTES,
            maxAutoExtensions: a.MAX_AUTO_EXTENSIONS,
            autoExtCount: a.AUTO_EXT_COUNT,
            leadingBidderId: a.LEADING_BIDDER_ID,
            leadingBidderName: a.LEADING_BIDDER_NAME,
            winnerId: a.WINNER_ID,
            winnerName: a.WINNER_NAME,
            createdAt: a.CREATED_AT,
            startedAt: a.STARTED_AT,
            endedAt: a.ENDED_AT
        }));
    }
        catch (error) {
        console.error('Error filtering auctions by status:', error);
        throw error;
    }
    finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
};

const searchAuctions = async (searchTerm) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(
            `SELECT
                A.ID,
                A.VEHICLE_ID,
                A.SELLER_ID,
                S.FIRST_NAME || ' ' || S.LAST_NAME AS SELLER_NAME,
                A.STATUS,
                A.START_TIME,
                A.END_TIME,
                A.ORIGINAL_END_TIME,
                A.RESERVE_PRICE_EGP,
                A.STARTING_BID_EGP,
                A.CURRENT_BID_EGP,
                A.BID_COUNT,
                A.MIN_BID_INCREMENT,
                A.AUTO_EXTEND_ENABLED,
                A.AUTO_EXTEND_MINUTES,
                A.MAX_AUTO_EXTENSIONS,
                A.AUTO_EXT_COUNT,
                A.LEADING_BIDDER_ID,
                L.FIRST_NAME || ' ' || L.LAST_NAME AS LEADING_BIDDER_NAME,
                A.WINNER_ID,
                W.FIRST_NAME || ' ' || W.LAST_NAME AS WINNER_NAME,
                A.CREATED_AT,
                A.STARTED_AT,
                A.ENDED_AT,
                V.MAKE,
                V.MODEL,
                V.YEAR,
                V.BODY_TYPE,
                V.COLOR,
                V.FUEL_TYPE,
                V.LOCATION_CITY
            FROM DIP.AUCTIONS A
            JOIN DIP.USERS S ON A.SELLER_ID = S.ID
            LEFT JOIN DIP.USERS L ON A.LEADING_BIDDER_ID = L.ID
            LEFT JOIN DIP.USERS W ON A.WINNER_ID = W.ID
            LEFT JOIN DIP.VEHICLES V ON A.VEHICLE_ID = V.ID
            WHERE LOWER(S.FIRST_NAME || ' ' || S.LAST_NAME) LIKE LOWER(:search)
                OR LOWER(A.STATUS) LIKE LOWER(:search)
                OR LOWER(A.START_TIME) LIKE LOWER(:search)
                OR LOWER(A.END_TIME) LIKE LOWER(:search)
                OR LOWER(A.STARTING_BID_EGP) LIKE LOWER(:search)
                OR LOWER(V.MAKE) LIKE LOWER(:search)
                OR LOWER(V.MODEL) LIKE LOWER(:search)
                OR LOWER(V.YEAR) LIKE LOWER(:search)
                OR LOWER(V.BODY_TYPE) LIKE LOWER(:search)
                OR LOWER(V.COLOR) LIKE LOWER(:search)
                OR LOWER(V.FUEL_TYPE) LIKE LOWER(:search)
                OR LOWER(V.LOCATION_CITY) LIKE LOWER(:search)
                OR LOWER(S.FIRST_NAME || ' ' || S.LAST_NAME) LIKE LOWER(:search)
            ORDER BY A.START_TIME DESC`,
            { search: `%${searchTerm}%` },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return result.rows.map((a) => ({
            id: a.ID,
            vehicleId: a.VEHICLE_ID,
            sellerId: a.SELLER_ID,
            sellerName: a.SELLER_NAME,
            status: a.STATUS,
            startTime: a.START_TIME,
            endTime: a.END_TIME,
            originalEndTime: a.ORIGINAL_END_TIME,
            reservePrice: a.RESERVE_PRICE_EGP,
            startingBid: a.STARTING_BID_EGP,
            currentBid: a.CURRENT_BID_EGP,
            bidCount: a.BID_COUNT,
            minBidIncrement: a.MIN_BID_INCREMENT,
            autoExtendEnabled: a.AUTO_EXTEND_ENABLED,
            autoExtendMinutes: a.AUTO_EXTEND_MINUTES,
            maxAutoExtensions: a.MAX_AUTO_EXTENSIONS,
            autoExtCount: a.AUTO_EXT_COUNT,
            leadingBidderId: a.LEADING_BIDDER_ID,
            leadingBidderName: a.LEADING_BIDDER_NAME,
            winnerId: a.WINNER_ID,
            winnerName: a.WINNER_NAME,
            createdAt: a.CREATED_AT,
            startedAt: a.STARTED_AT,
            endedAt: a.ENDED_AT
        }));
    }
        catch (error) {
        console.error('Error filtering auctions by status:', error);
        throw error;
    }
    finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
};


const updateAuctionStatus = async (auctionId, newStatus) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(
            `UPDATE DIP.AUCTIONS
            SET STATUS = :newStatus
            WHERE ID = :auctionId`,
            { newStatus, auctionId },
            { autoCommit: true }
        );
        return result.rowsAffected === 1;
    }
    catch (error) {
        console.error('Error updating auction status:', error);
        throw error;
    }
    finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
};

const setstartTimeAuction= async (auctionId, startTime) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(
            `UPDATE DIP.AUCTIONS
            SET START_TIME = TO_DATE(:startTime, 'YYYY-MM-DD HH24:MI:SS')
            WHERE ID = :auctionId`,
            { startTime, auctionId },
            { autoCommit: true }
        );
        return result.rowsAffected === 1;
    }
    catch (error) {
        console.error('Error updating auction start time:', error);
        throw error;
    }
    finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
};

const getAuctionById = async (auctionId) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(
            `SELECT
                A.ID,
                A.VEHICLE_ID,
                A.SELLER_ID,
                S.FIRST_NAME || ' ' || S.LAST_NAME AS SELLER_NAME,
                A.STATUS,
                A.START_TIME,
                A.END_TIME,
                A.ORIGINAL_END_TIME,
                A.RESERVE_PRICE_EGP,
                A.STARTING_BID_EGP,
                A.CURRENT_BID_EGP,
                A.BID_COUNT,
                A.MIN_BID_INCREMENT,
                A.AUTO_EXTEND_ENABLED,
                A.AUTO_EXTEND_MINUTES,
                A.MAX_AUTO_EXTENSIONS,
                A.AUTO_EXT_COUNT,
                A.LEADING_BIDDER_ID,
                L.FIRST_NAME || ' ' || L.LAST_NAME AS LEADING_BIDDER_NAME,
                A.WINNER_ID,
                W.FIRST_NAME || ' ' || W.LAST_NAME AS WINNER_NAME,
                A.CREATED_AT,
                A.STARTED_AT,
                A.ENDED_AT,
                V.MAKE,
                V.MODEL,
                V.YEAR_MFG,
                V.BODY_TYPE,
                V.COLOR,
                V.FUEL_TYPE,
                V.LOCATION_CITY
            FROM DIP.AUCTIONS A
            JOIN DIP.USERS S ON A.SELLER_ID = S.ID
            LEFT JOIN DIP.USERS L ON A.LEADING_BIDDER_ID = L.ID
            LEFT JOIN DIP.USERS W ON A.WINNER_ID = W.ID
            LEFT JOIN DIP.VEHICLES V ON A.VEHICLE_ID = V.ID
            WHERE A.ID = :auctionId`,
            { auctionId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (result.rows.length === 0) {
            return null;
        }
        const a = result.rows[0];
        return {
            id: a.ID,
            vehicleId: a.VEHICLE_ID,
            sellerId: a.SELLER_ID,
            sellerName: a.SELLER_NAME,
            status: a.STATUS,
            startTime: a.START_TIME,
            endTime: a.END_TIME,
            originalEndTime: a.ORIGINAL_END_TIME,
            reservePrice: a.RESERVE_PRICE_EGP,
            startingBid: a.STARTING_BID_EGP,
            currentBid: a.CURRENT_BID_EGP,
            bidCount: a.BID_COUNT,
            minBidIncrement: a.MIN_BID_INCREMENT,
            autoExtendEnabled: a.AUTO_EXTEND_ENABLED,
            autoExtendMinutes: a.AUTO_EXTEND_MINUTES,
            maxAutoExtensions: a.MAX_AUTO_EXTENSIONS,
            autoExtCount: a.AUTO_EXT_COUNT,
            leadingBidderId: a.LEADING_BIDDER_ID,
            leadingBidderName: a.LEADING_BIDDER_NAME,
            winnerId: a.WINNER_ID,
            winnerName: a.WINNER_NAME,
            createdAt: a.CREATED_AT,
            startedAt: a.STARTED_AT,
            endedAt: a.ENDED_AT
        };
    }
    catch (error) {
        console.error('Error fetching auction by ID:', error);
        throw error;
    }
    finally {
        if (connection) {
            try {
                await connection.close();
            }
            catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
};




module.exports = {
    getPendingKYCService,
    getAllAuctionService,
    getPendingPaymentsService,
    filterauctionbyStatus,
    searchAuctions,
    updateAuctionStatus,
    setstartTimeAuction,
    getAuctionById
};