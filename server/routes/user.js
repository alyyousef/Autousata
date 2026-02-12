const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');


router.patch('/sellertransfer', authenticate, userController.sellerTransferController);
router.patch('/buyerreceived', authenticate, userController.buyerReceivedController);
router.patch('/buyerrefund', authenticate, userController.buyerRefundController);

module.exports = router;
