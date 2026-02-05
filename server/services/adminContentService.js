const { getPendingKYC,getLiveAuction,getPendingPayments } = require('../db/adminQueries');

const getPendingKYCService = async () => {
    try {
        const pendingKYC = await getPendingKYC();
        return pendingKYC;
    }
    catch (error) {
        console.error('Error fetching pending KYC documents:', error);
        throw error;
    }
};
const getLiveAuctionService = async () => {
    try {
        const liveAuctions = await getLiveAuction();
        return liveAuctions;
    }
    catch (error) {
        console.error('Error fetching live auctions:', error);
        throw error;
    }
};
const getPendingPaymentsService = async () => {
    try {
        const pendingPayments = await getPendingPayments();
        return pendingPayments;
    }
    catch (error) {
        console.error('Error fetching pending payments:', error);
        throw error;
    }
};

module.exports = {
    getPendingKYCService,
    getLiveAuctionService,
    getPendingPaymentsService
};  