const { getPendingKYCService,
    getAllAuctionService,
    getPendingPaymentsService,
    updateAuctionStatus,
    setstartTimeAuction,
    filterauctionbyStatus,
    searchAuctions,
    getAuctionById,
    updateStatusKYC,
    searchKYC,
    filterKYCByStatus,
    viewKYCDetails,
    viewuser,
    getalluserskyc
} = require('../services/adminContentService');

//kyc
const getPendingKYC = async (req, res) => {
    try {
        const kycQueue = await getPendingKYCService(); 
        res.status(200).json({ kycDocuments: kycQueue });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch KYC queue' });
    }

};

const updateKYCcontroller = async (req, res) => {
    const { userId } = req.params;
    const { status } = req.body;
    try {
        await updateStatusKYC(userId, status);
        res.status(200).json({ message: 'KYC status updated successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update KYC status' });
    }
};

const searchKYCController = async (req, res) => {
    const { searchTerm } = req.query;
    try {
        const searchResults = await searchKYC(searchTerm);
        res.status(200).json({ data: searchResults });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to search KYC documents' });
    }
};

const filterKYCByStatusController = async (req, res) => {
    const { status } = req.query;
    try {
        const filteredKYC = await filterKYCByStatus(status);
        res.status(200).json({ data: filteredKYC });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to filter KYC documents' });
    }
};

const viewKYCDetailsController = async (req, res) => {
    const { kycId } = req.params;   
    try {
        const kycDetails = await viewKYCDetails(kycId);
        if (!kycDetails) {
            return res.status(404).json({ error: 'KYC document not found' });
        }
        res.status(200).json({ data: kycDetails });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch KYC details' });
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

const getalluserskycController = async (req, res) => {
    try {
        const allUsersKYC = await getalluserskyc();
        res.status(200).json({ data: allUsersKYC });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch all users KYC' });
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


const viewUserController = async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await viewuser(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
       
        res.status(200).json({ data: user });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch user details' });
    }
};


module.exports = { getPendingKYC ,getAllAuction, getPendingPayments, updateAuction, setAuctionStartTime, filterAuctions, searchAuctionsController, getAuctionController, updateKYCcontroller, searchKYCController, filterKYCByStatusController, viewKYCDetailsController, viewUserController,getalluserskycController};