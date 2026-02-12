const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/payments/create-intent
 * @desc    Create a Stripe Payment Intent for auction winner
 * @access  Private (Authenticated users only)
 */
router.post('/create-intent', authenticate, paymentController.createPaymentIntent);

/**
 * @route   POST /api/payments/create-direct-intent
 * @desc    Create a Stripe Payment Intent for direct (Buy Now) purchase
 * @access  Private (Authenticated users only)
 */
router.post('/create-direct-intent', authenticate, paymentController.createDirectPaymentIntent);

/**
 * @route   POST /api/payments/:id/confirm
 * @desc    Confirm payment completion and create escrow
 * @access  Private (Buyer only)
 */
router.post('/:id/confirm', authenticate, paymentController.confirmPayment);

/**
 * @route   GET /api/payments/:id
 * @desc    Get payment details by payment ID
 * @access  Private (Buyer, Seller, or Admin)
 */
router.get('/:id', authenticate, paymentController.getPaymentById);

/**
 * @route   GET /api/payments/auction/:auctionId
 * @desc    Get payment details by auction ID
 * @access  Private (Buyer, Seller, or Admin)
 */
router.get('/auction/:auctionId', authenticate, paymentController.getPaymentByAuction);

/**
 * @route   GET /api/payments/vehicle/:vehicleId
 * @desc    Get payment details by vehicle ID (for direct purchases)
 * @access  Private (Buyer, Seller, or Admin)
 */
router.get('/vehicle/:vehicleId', authenticate, paymentController.getPaymentByVehicle);

/**
 * @route   GET /api/escrows/:id
 * @desc    Get escrow details
 * @access  Private
 */
router.get('/escrows/:id', authenticate, async (req, res) => {
    const db = require('../config/db');
    const connection = await db.getConnection();
    
    try {
        const { id: escrowId } = req.params;
        const userId = req.user.id;

        const query = `
            SELECT 
                e.ID, e.PAYMENT_ID, e.AUCTION_ID, e.SELLER_ID, e.BUYER_ID,
                e.TOTAL_AMOUNT_EGP, e.COMMISSION_EGP, e.PROCESSOR_FEE_EGP,
                e.SELLER_PAYOUT_EGP, e.STATUS, e.CREATED_AT,
                e.BUYER_RECEIVED, e.SELLER_TRANSFER, e.DISPUTED_AT,
                e.DISPUTE_REASON,
                a.VEHICLE_ID,
                v.YEAR, v.MAKE, v.MODEL
            FROM ESCROWS e
            JOIN AUCTIONS a ON e.AUCTION_ID = a.ID
            JOIN VEHICLES v ON a.VEHICLE_ID = v.ID
            WHERE e.ID = :escrowId
        `;

        const result = await connection.execute(query, { escrowId });

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Escrow not found' });
        }

        const row = result.rows[0];
        const escrow = {
            id: row[0],
            paymentId: row[1],
            auctionId: row[2],
            sellerId: row[3],
            buyerId: row[4],
            totalAmountEGP: row[5],
            commissionEGP: row[6],
            processorFeeEGP: row[7],
            sellerPayoutEGP: row[8],
            status: row[9],
            createdAt: row[10],
            buyerReceived: row[11],
            sellerTransfer: row[12],
            disputedAt: row[13],
            disputeReason: row[14],
            vehicle: {
                id: row[15],
                year: row[16],
                make: row[17],
                model: row[18]
            }
        };

        // Verify user is buyer, seller, or admin
        if (escrow.buyerId !== userId && escrow.sellerId !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        res.status(200).json({ success: true, escrow });

    } catch (error) {
        console.error('Error fetching escrow:', error);
        res.status(500).json({ 
            error: 'Failed to fetch escrow',
            details: error.message 
        });
    } finally {
        await connection.close();
    }
});

/**
 * @route   POST /api/escrows/:id/confirm-receipt
 * @desc    Buyer confirms vehicle receipt, releases escrow
 * @access  Private (Buyer only)
 */
router.post('/escrows/:id/confirm-receipt', authenticate, async (req, res) => {
    const db = require('../config/db');
    const connection = await db.getConnection();
    
    try {
        const { id: escrowId } = req.params;
        const userId = req.user.id;

        // Get escrow details
        const escrowQuery = `
            SELECT ID, BUYER_ID, STATUS, SELLER_PAYOUT_EGP, SELLER_ID
            FROM ESCROWS
            WHERE ID = :escrowId
        `;

        const escrowResult = await connection.execute(escrowQuery, { escrowId });

        if (escrowResult.rows.length === 0) {
            return res.status(404).json({ error: 'Escrow not found' });
        }

        const escrow = {
            id: escrowResult.rows[0][0],
            buyerId: escrowResult.rows[0][1],
            status: escrowResult.rows[0][2],
            sellerPayoutEGP: escrowResult.rows[0][3],
            sellerId: escrowResult.rows[0][4]
        };

        // Verify user is the buyer
        if (escrow.buyerId !== userId) {
            return res.status(403).json({ error: 'Only the buyer can confirm receipt' });
        }

        // Check escrow status
        if (escrow.status !== 'held') {
            return res.status(400).json({ 
                error: 'Escrow cannot be released',
                currentStatus: escrow.status 
            });
        }

        // Release escrow
        await connection.execute(
            `UPDATE ESCROWS 
             SET STATUS = 'released',
                 BUYER_RECEIVED = SYSTIMESTAMP
             WHERE ID = :escrowId`,
            { escrowId }
        );

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'Vehicle receipt confirmed, escrow released to seller',
            escrowId: escrow.id,
            sellerPayoutEGP: escrow.sellerPayoutEGP
        });

        // TODO: Trigger seller payout notification/process

    } catch (error) {
        await connection.rollback();
        console.error('Error confirming receipt:', error);
        res.status(500).json({ 
            error: 'Failed to confirm receipt',
            details: error.message 
        });
    } finally {
        await connection.close();
    }
});

/**
 * @route   POST /api/escrows/:id/dispute
 * @desc    Buyer or seller initiates dispute
 * @access  Private
 */
router.post('/escrows/:id/dispute', authenticate, async (req, res) => {
    const db = require('../config/db');
    const connection = await db.getConnection();
    
    try {
        const { id: escrowId } = req.params;
        const { reason } = req.body;
        const userId = req.user.id;

        if (!reason || reason.trim() === '') {
            return res.status(400).json({ error: 'Dispute reason is required' });
        }

        // Get escrow details
        const escrowQuery = `
            SELECT ID, BUYER_ID, SELLER_ID, STATUS
            FROM ESCROWS
            WHERE ID = :escrowId
        `;

        const escrowResult = await connection.execute(escrowQuery, { escrowId });

        if (escrowResult.rows.length === 0) {
            return res.status(404).json({ error: 'Escrow not found' });
        }

        const escrow = {
            id: escrowResult.rows[0][0],
            buyerId: escrowResult.rows[0][1],
            sellerId: escrowResult.rows[0][2],
            status: escrowResult.rows[0][3]
        };

        // Verify user is buyer or seller
        if (escrow.buyerId !== userId && escrow.sellerId !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Check if already disputed or released
        if (escrow.status === 'disputed') {
            return res.status(400).json({ error: 'Escrow already under dispute' });
        }

        if (escrow.status === 'released' || escrow.status === 'refunded') {
            return res.status(400).json({ error: 'Cannot dispute completed escrow' });
        }

        // Mark as disputed
        await connection.execute(
            `UPDATE ESCROWS 
             SET STATUS = 'disputed',
                 DISPUTED_AT = SYSTIMESTAMP,
                 DISPUTE_REASON = :reason
             WHERE ID = :escrowId`,
            { reason: reason.trim(), escrowId }
        );

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'Dispute initiated. Admin will review your case.',
            escrowId: escrow.id
        });

        // TODO: Notify admin of dispute

    } catch (error) {
        await connection.rollback();
        console.error('Error initiating dispute:', error);
        res.status(500).json({ 
            error: 'Failed to initiate dispute',
            details: error.message 
        });
    } finally {
        await connection.close();
    }
});

/**
 * @route   POST /api/payments/:id/refund
 * @desc    Admin initiates refund (full or partial)
 * @access  Admin only
 */
router.post('/:id/refund', authenticate, authorize('admin'), async (req, res) => {
    const db = require('../config/db');
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const connection = await db.getConnection();
    
    try {
        const { id: paymentId } = req.params;
        const { reason, amount } = req.body; // amount in EGP (optional, defaults to full refund)

        // Get payment details
        const paymentQuery = `
            SELECT 
                p.ID, p.GATEWAY_ORDER_ID, p.AMOUNT_EGP, p.STATUS,
                p.AUCTION_ID
            FROM PAYMENTS p
            WHERE p.ID = :paymentId
        `;

        const paymentResult = await connection.execute(paymentQuery, { paymentId });

        if (paymentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        const payment = {
            id: paymentResult.rows[0][0],
            gatewayOrderId: paymentResult.rows[0][1],
            amountEGP: paymentResult.rows[0][2],
            status: paymentResult.rows[0][3],
            auctionId: paymentResult.rows[0][4]
        };

        if (payment.status !== 'completed') {
            return res.status(400).json({ error: 'Can only refund completed payments' });
        }

        // Determine refund amount
        const refundAmountEGP = amount || payment.amountEGP;
        const refundAmountPiasters = refundAmountEGP * 100;

        // Create refund in Stripe
        const refund = await stripe.refunds.create({
            payment_intent: payment.gatewayOrderId,
            amount: refundAmountPiasters,
            reason: reason || 'requested_by_customer',
            metadata: {
                paymentId: payment.id,
                auctionId: payment.auctionId,
                adminReason: reason || 'Admin initiated'
            }
        });

        // Update payment status
        await connection.execute(
            `UPDATE PAYMENTS 
             SET STATUS = 'refunded',
                 FAILED_AT = SYSTIMESTAMP
             WHERE ID = :paymentId`,
            { paymentId }
        );

        // Update escrow status
        await connection.execute(
            `UPDATE ESCROWS 
             SET STATUS = 'refunded'
             WHERE PAYMENT_ID = :paymentId`,
            { paymentId }
        );

        // Update auction status to allow re-listing
        await connection.execute(
            `UPDATE AUCTIONS 
             SET STATUS = 'ended',
                 PAYMENT_ID = NULL
             WHERE ID = :auctionId`,
            { auctionId: payment.auctionId }
        );

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'Refund processed successfully',
            refundId: refund.id,
            amountRefundedEGP: refundAmountEGP,
            reason: reason
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error processing refund:', error);
        res.status(500).json({ 
            error: 'Failed to process refund',
            details: error.message 
        });
    } finally {
        await connection.close();
    }
});

/**
 * @route   GET /api/payments/escrows/disputed
 * @desc    Get all disputed escrows (admin dashboard)
 * @access  Admin only
 */
router.get('/escrows/disputed', authenticate, authorize('admin'), async (req, res) => {
    const db = require('../config/db');
    const connection = await db.getConnection();
    
    try {
        const query = `
            SELECT 
                e.ID, e.AUCTION_ID, e.BUYER_ID, e.SELLER_ID,
                e.TOTAL_AMOUNT_EGP, e.STATUS, e.DISPUTED_AT, e.DISPUTE_REASON,
                v.YEAR, v.MAKE, v.MODEL,
                u_buyer.NAME as BUYER_NAME, u_buyer.EMAIL as BUYER_EMAIL,
                u_seller.NAME as SELLER_NAME, u_seller.EMAIL as SELLER_EMAIL
            FROM ESCROWS e
            JOIN AUCTIONS a ON e.AUCTION_ID = a.ID
            JOIN VEHICLES v ON a.VEHICLE_ID = v.ID
            LEFT JOIN USERS u_buyer ON e.BUYER_ID = u_buyer.ID
            LEFT JOIN USERS u_seller ON e.SELLER_ID = u_seller.ID
            WHERE e.STATUS = 'disputed'
            ORDER BY e.DISPUTED_AT DESC
        `;

        const result = await connection.execute(query);

        const disputes = result.rows.map(row => ({
            id: row[0],
            auctionId: row[1],
            buyerId: row[2],
            sellerId: row[3],
            totalAmountEGP: row[4],
            status: row[5],
            disputedAt: row[6],
            disputeReason: row[7],
            vehicle: {
                year: row[8],
                make: row[9],
                model: row[10]
            },
            buyer: {
                name: row[11],
                email: row[12]
            },
            seller: {
                name: row[13],
                email: row[14]
            }
        }));

        res.status(200).json({ success: true, disputes });

    } catch (error) {
        console.error('Error fetching disputed escrows:', error);
        res.status(500).json({ 
            error: 'Failed to fetch disputed escrows',
            details: error.message 
        });
    } finally {
        await connection.close();
    }
});

module.exports = router;
