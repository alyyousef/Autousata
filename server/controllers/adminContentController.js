const { get } = require('mongoose');
const { getPendingKYCService,getLiveAuctionService,getPendingPaymentsService } = require('../services/adminContentService');

const getPendingKYC = async (req, res) => {
    try {
        const kycQueue = await getPendingKYCService(); 
        res.status(200).json({ data: kycQueue });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch KYC queue' });
    }

};

const getLiveAuction = async (req, res) => {
    try {
        console.log(req.user);
        const liveAuctions = await getLiveAuctionService();
        res.status(200).json({ data: liveAuctions });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch live auctions' });
    }
};

const getPendingPayments= async (req, res) => {
    try {
        const pendingPayments = await getPendingPaymentsService();
        res.status(200).json({ data: pendingPayments });
    }

    catch (error) {
        res.status(500).json({ error: 'Failed to fetch pending payments' });
    }
};

module.exports = { getPendingKYC ,getLiveAuction, getPendingPayments};