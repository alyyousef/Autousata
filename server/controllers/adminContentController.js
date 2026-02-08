const { getPendingKYCService,
    getAllAuctionService,
    getPendingPaymentsService,
    updateAuctionStatus,
    setstartTimeAuction,
    filterauctionbyStatus,
    searchAuctions,
    getAuctionById
} = require('../services/adminContentService');

const getPendingKYC = async (req, res) => {
    try {
        const kycQueue = await getPendingKYCService(); 
        res.status(200).json({ data: kycQueue });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch KYC queue' });
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

//auctions
const getAllAuction = async (req, res) => {
    try {
        const allAuctions = await getAllAuctionService();
        res.status(200).json({ data: allAuctions });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch all auctions' });
    }
};

const updateAuction = async (req, res) => {
    const { auctionId } = req.params;
    const { status } = req.body;
    try {
        await updateAuctionStatus(auctionId, status);
        res.status(200).json({ message: 'Auction status updated successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update auction status' });
    }
};

const setAuctionStartTime = async (req, res) => {
    const { auctionId } = req.params;
    const { startTime } = req.body;
    try {
        await setstartTimeAuction(auctionId, startTime);
        res.status(200).json({ message: 'Auction start time updated successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update auction start time' });
    }
};

const filterAuctions = async (req, res) => {
    const { status } = req.query;
    try {
        const filteredAuctions = await filterauctionbyStatus(status);
        res.status(200).json({ data: filteredAuctions });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to filter auctions' });
    }
};

const searchAuctionsController = async (req, res) => {
    const { searchTerm } = req.query;
    try {
        const searchResults = await searchAuctions(searchTerm);
        res.status(200).json({ data: searchResults });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to search auctions' });
    }
};

const getAuctionController = async (req, res) => {
    const { auctionId } = req.params;
    try {
        const auction = await getAuctionById(auctionId);
        if (!auction) {
            return res.status(404).json({ error: 'Auction not found' });
        }
        res.status(200).json({ data: auction });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch auction details' });
    }
};

module.exports = { getPendingKYC ,getAllAuction, getPendingPayments, updateAuction, setAuctionStartTime, filterAuctions, searchAuctionsController, getAuctionController};