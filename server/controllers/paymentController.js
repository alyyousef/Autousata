const Stripe = require('stripe');
const db = require('../config/db');
const { v4: uuidv4 } = require('crypto').randomUUID ? { v4: () => require('crypto').randomUUID() } : require('uuid');

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Constants
const PLATFORM_COMMISSION_PERCENT = parseFloat(process.env.PLATFORM_COMMISSION_PERCENT || '5');
const STRIPE_FEE_PERCENT = 2.9; // Stripe's standard fee
const STRIPE_FEE_FIXED_EGP = 2.5; // Stripe's fixed fee in EGP

/**
 * Calculate total payment breakdown
 */
const calculatePaymentBreakdown = (bidAmountEGP) => {
    const platformCommission = Math.round((bidAmountEGP * PLATFORM_COMMISSION_PERCENT) / 100);
    const stripeFee = Math.round((bidAmountEGP * STRIPE_FEE_PERCENT) / 100 + STRIPE_FEE_FIXED_EGP);
    const totalAmount = bidAmountEGP + platformCommission + stripeFee;
    const sellerPayout = bidAmountEGP - platformCommission;

    return {
        bidAmount: bidAmountEGP,
        platformCommission,
        stripeFee,
        totalAmount,
        sellerPayout
    };
};

/**
 * Create Payment Intent
 * POST /api/payments/create-intent
 */
exports.createPaymentIntent = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { auctionId } = req.body;
        const userId = req.user.id;

        // Validate auction and check if user is the winner
        const auctionQuery = `
            SELECT 
                a.ID, a.VEHICLE_ID, a.SELLER_ID, a.WINNER_ID,
                a.CURRENT_BID_EGP, a.STATUS, a.PAYMENT_ID,
                a.PAYMENT_DEADLINE,
                v.YEAR, v.MAKE, v.MODEL
            FROM AUCTIONS a
            JOIN VEHICLES v ON a.VEHICLE_ID = v.ID
            WHERE a.ID = :auctionId
        `;
        
        const auctionResult = await connection.execute(auctionQuery, { auctionId });
        
        if (auctionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Auction not found' });
        }

        const auction = {
            id: auctionResult.rows[0][0],
            vehicleId: auctionResult.rows[0][1],
            sellerId: auctionResult.rows[0][2],
            winnerId: auctionResult.rows[0][3],
            currentBidEGP: auctionResult.rows[0][4],
            status: auctionResult.rows[0][5],
            paymentId: auctionResult.rows[0][6],
            paymentDeadline: auctionResult.rows[0][7],
            vehicleYear: auctionResult.rows[0][8],
            vehicleMake: auctionResult.rows[0][9],
            vehicleModel: auctionResult.rows[0][10]
        };

        // Validation checks
        if (auction.status !== 'ended') {
            return res.status(400).json({ error: 'Auction is not ended yet' });
        }

        if (auction.winnerId !== userId) {
            return res.status(403).json({ error: 'You are not the auction winner' });
        }

        if (auction.paymentId) {
            return res.status(400).json({ error: 'Payment already exists for this auction' });
        }

        // Check payment deadline
        if (auction.paymentDeadline && new Date() > new Date(auction.paymentDeadline)) {
            return res.status(400).json({ 
                error: 'Payment deadline has passed',
                message: 'Your payment window has expired'
            });
        }

        // Calculate payment breakdown
        const breakdown = calculatePaymentBreakdown(auction.currentBidEGP);

        // Create payment record in database
        const paymentId = uuidv4();
        const insertPaymentQuery = `
            INSERT INTO PAYMENTS (
                ID, AUCTION_ID, BUYER_ID, SELLER_ID,
                AMOUNT_EGP, CURRENCY, PAYMENT_METHOD, GATEWAY,
                STATUS, INITIATED_AT
            ) VALUES (
                :paymentId, :auctionId, :buyerId, :sellerId,
                :amount, 'EGP', 'card', 'Stripe',
                'pending', SYSTIMESTAMP
            )
        `;

        await connection.execute(insertPaymentQuery, {
            paymentId,
            auctionId: auction.id,
            buyerId: userId,
            sellerId: auction.sellerId,
            amount: breakdown.totalAmount
        });

        // Create Stripe PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: breakdown.totalAmount * 100, // Stripe uses smallest currency unit (piasters)
            currency: 'egp',
            metadata: {
                auctionId: auction.id,
                paymentId: paymentId,
                userId: userId,
                vehicleDescription: `${auction.vehicleYear} ${auction.vehicleMake} ${auction.vehicleModel}`,
                bidAmount: breakdown.bidAmount,
                platformCommission: breakdown.platformCommission,
                stripeFee: breakdown.stripeFee
            },
            description: `Payment for ${auction.vehicleYear} ${auction.vehicleMake} ${auction.vehicleModel} - Auction ${auction.id}`,
            automatic_payment_methods: {
                enabled: true,
            },
        });

        // Update payment record with Stripe PaymentIntent ID
        await connection.execute(
            `UPDATE PAYMENTS SET GATEWAY_ORDER_ID = :gatewayOrderId WHERE ID = :paymentId`,
            { gatewayOrderId: paymentIntent.id, paymentId }
        );

        await connection.commit();

        res.status(200).json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentId: paymentId,
            breakdown: breakdown,
            auction: {
                id: auction.id,
                vehicle: `${auction.vehicleYear} ${auction.vehicleMake} ${auction.vehicleModel}`,
                deadline: auction.paymentDeadline
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error creating payment intent:', error);
        res.status(500).json({ 
            error: 'Failed to create payment intent',
            details: error.message 
        });
    } finally {
        await connection.close();
    }
};

/**
 * Confirm Payment
 * POST /api/payments/:id/confirm
 */
exports.confirmPayment = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { id: paymentId } = req.params;
        const userId = req.user.id;

        // Get payment details
        const paymentQuery = `
            SELECT 
                p.ID, p.AUCTION_ID, p.BUYER_ID, p.SELLER_ID,
                p.AMOUNT_EGP, p.STATUS, p.GATEWAY_ORDER_ID,
                p.PROCESSOR_FEE_EGP
            FROM PAYMENTS p
            WHERE p.ID = :paymentId
        `;

        const paymentResult = await connection.execute(paymentQuery, { paymentId });
        
        if (paymentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        const payment = {
            id: paymentResult.rows[0][0],
            auctionId: paymentResult.rows[0][1],
            buyerId: paymentResult.rows[0][2],
            sellerId: paymentResult.rows[0][3],
            amountEGP: paymentResult.rows[0][4],
            status: paymentResult.rows[0][5],
            gatewayOrderId: paymentResult.rows[0][6],
            processorFeeEGP: paymentResult.rows[0][7]
        };

        // Verify user is the buyer
        if (payment.buyerId !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Check if already confirmed
        if (payment.status === 'completed') {
            return res.status(200).json({ 
                success: true, 
                message: 'Payment already confirmed',
                paymentId: payment.id 
            });
        }

        // Retrieve PaymentIntent from Stripe to verify status
        const paymentIntent = await stripe.paymentIntents.retrieve(payment.gatewayOrderId);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ 
                error: 'Payment not succeeded',
                stripeStatus: paymentIntent.status 
            });
        }

        // Update payment status
        await connection.execute(
            `UPDATE PAYMENTS 
             SET STATUS = 'completed', 
                 GATEWAY_TRANS_ID = :transId,
                 PROCESSOR_FEE_EGP = :processorFee,
                 COMPLETED_AT = SYSTIMESTAMP 
             WHERE ID = :paymentId`,
            { 
                transId: paymentIntent.charges.data[0]?.id || paymentIntent.id,
                processorFee: Math.round(paymentIntent.charges.data[0]?.balance_transaction?.fee || 0) / 100,
                paymentId 
            }
        );

        // Calculate escrow breakdown
        const breakdown = calculatePaymentBreakdown(
            payment.amountEGP - Math.round((payment.amountEGP * (STRIPE_FEE_PERCENT + PLATFORM_COMMISSION_PERCENT)) / 100)
        );

        // Create escrow record
        const escrowId = uuidv4();
        const insertEscrowQuery = `
            INSERT INTO ESCROWS (
                ID, PAYMENT_ID, AUCTION_ID, SELLER_ID, BUYER_ID,
                TOTAL_AMOUNT_EGP, COMMISSION_EGP, PROCESSOR_FEE_EGP,
                SELLER_PAYOUT_EGP, STATUS, CREATED_AT
            ) VALUES (
                :escrowId, :paymentId, :auctionId, :sellerId, :buyerId,
                :totalAmount, :commission, :processorFee,
                :sellerPayout, 'held', SYSTIMESTAMP
            )
        `;

        await connection.execute(insertEscrowQuery, {
            escrowId,
            paymentId: payment.id,
            auctionId: payment.auctionId,
            sellerId: payment.sellerId,
            buyerId: payment.buyerId,
            totalAmount: payment.amountEGP,
            commission: breakdown.platformCommission,
            processorFee: paymentIntent.charges.data[0]?.balance_transaction?.fee 
                ? Math.round(paymentIntent.charges.data[0].balance_transaction.fee / 100) 
                : breakdown.stripeFee,
            sellerPayout: breakdown.sellerPayout
        });

        // Update auction with payment ID
        await connection.execute(
            `UPDATE AUCTIONS SET PAYMENT_ID = :paymentId, STATUS = 'settled' WHERE ID = :auctionId`,
            { paymentId: payment.id, auctionId: payment.auctionId }
        );

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'Payment confirmed and escrow created',
            paymentId: payment.id,
            escrowId: escrowId,
            breakdown: breakdown
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error confirming payment:', error);
        res.status(500).json({ 
            error: 'Failed to confirm payment',
            details: error.message 
        });
    } finally {
        await connection.close();
    }
};

/**
 * Get Payment by Auction ID
 * GET /api/payments/auction/:auctionId
 */
exports.getPaymentByAuction = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { auctionId } = req.params;
        const userId = req.user.id;

        const query = `
            SELECT 
                p.ID, p.AUCTION_ID, p.BUYER_ID, p.SELLER_ID,
                p.AMOUNT_EGP, p.CURRENCY, p.PAYMENT_METHOD, p.GATEWAY,
                p.STATUS, p.INITIATED_AT, p.COMPLETED_AT, p.FAILED_AT,
                p.PROCESSOR_FEE_EGP,
                e.ID as ESCROW_ID, e.STATUS as ESCROW_STATUS,
                e.COMMISSION_EGP, e.SELLER_PAYOUT_EGP,
                e.BUYER_RECEIVED, e.SELLER_TRANSFER
            FROM PAYMENTS p
            LEFT JOIN ESCROWS e ON p.ID = e.PAYMENT_ID
            WHERE p.AUCTION_ID = :auctionId
        `;

        const result = await connection.execute(query, { auctionId });

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found for this auction' });
        }

        const row = result.rows[0];
        const payment = {
            id: row[0],
            auctionId: row[1],
            buyerId: row[2],
            sellerId: row[3],
            amountEGP: row[4],
            currency: row[5],
            paymentMethod: row[6],
            gateway: row[7],
            status: row[8],
            initiatedAt: row[9],
            completedAt: row[10],
            failedAt: row[11],
            processorFeeEGP: row[12],
            escrow: row[13] ? {
                id: row[13],
                status: row[14],
                commissionEGP: row[15],
                sellerPayoutEGP: row[16],
                buyerReceived: row[17],
                sellerTransfer: row[18]
            } : null
        };

        // Verify user is buyer or seller
        if (payment.buyerId !== userId && payment.sellerId !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        res.status(200).json({ success: true, payment });

    } catch (error) {
        console.error('Error fetching payment:', error);
        res.status(500).json({ 
            error: 'Failed to fetch payment',
            details: error.message 
        });
    } finally {
        await connection.close();
    }
};

/**
 * Handle Stripe Webhook Events
 * POST /api/webhooks/stripe
 */
exports.handleStripeWebhook = async (req, res) => {
    const signature = req.headers['stripe-signature'];
    let event;

    try {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const connection = await db.getConnection();

    try {
        // Check for duplicate webhook events (idempotency)
        const checkEventQuery = `
            SELECT ID FROM WEBHOOK_EVENTS WHERE EVENT_ID = :eventId
        `;
        const eventCheckResult = await connection.execute(checkEventQuery, { eventId: event.id });

        if (eventCheckResult.rows.length > 0) {
            console.log(`Webhook event ${event.id} already processed`);
            return res.status(200).json({ received: true, duplicate: true });
        }

        // Store webhook event
        await connection.execute(
            `INSERT INTO WEBHOOK_EVENTS (ID, EVENT_ID, EVENT_TYPE, PROCESSED_AT) 
             VALUES (:id, :eventId, :eventType, SYSTIMESTAMP)`,
            { 
                id: uuidv4(),
                eventId: event.id, 
                eventType: event.type 
            }
        );

        // Handle different event types
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentIntentSucceeded(event.data.object, connection);
                break;

            case 'payment_intent.payment_failed':
                await handlePaymentIntentFailed(event.data.object, connection);
                break;

            case 'charge.refunded':
                await handleChargeRefunded(event.data.object, connection);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        await connection.commit();
        res.status(200).json({ received: true });

    } catch (error) {
        await connection.rollback();
        console.error('Error processing webhook:', error);
        // Return 200 to prevent Stripe from retrying permanent failures
        res.status(200).json({ received: true, error: error.message });
    } finally {
        await connection.close();
    }
};

/**
 * Helper: Handle payment_intent.succeeded event
 */
async function handlePaymentIntentSucceeded(paymentIntent, connection) {
    const paymentId = paymentIntent.metadata.paymentId;

    if (!paymentId) {
        console.error('No paymentId in metadata');
        return;
    }

    // Update payment status
    await connection.execute(
        `UPDATE PAYMENTS 
         SET STATUS = 'completed',
             GATEWAY_TRANS_ID = :transId,
             COMPLETED_AT = SYSTIMESTAMP
         WHERE ID = :paymentId AND STATUS = 'pending'`,
        { 
            transId: paymentIntent.charges.data[0]?.id || paymentIntent.id,
            paymentId 
        }
    );

    console.log(`Payment ${paymentId} marked as completed via webhook`);
}

/**
 * Helper: Handle payment_intent.payment_failed event
 */
async function handlePaymentIntentFailed(paymentIntent, connection) {
    const paymentId = paymentIntent.metadata.paymentId;

    if (!paymentId) {
        console.error('No paymentId in metadata');
        return;
    }

    await connection.execute(
        `UPDATE PAYMENTS 
         SET STATUS = 'failed',
             FAILED_AT = SYSTIMESTAMP
         WHERE ID = :paymentId`,
        { paymentId }
    );

    console.log(`Payment ${paymentId} marked as failed via webhook`);
}

/**
 * Helper: Handle charge.refunded event
 */
async function handleChargeRefunded(charge, connection) {
    const paymentIntentId = charge.payment_intent;

    // Find payment by gateway_order_id
    const result = await connection.execute(
        `SELECT ID FROM PAYMENTS WHERE GATEWAY_ORDER_ID = :gatewayOrderId`,
        { gatewayOrderId: paymentIntentId }
    );

    if (result.rows.length === 0) {
        console.error(`Payment not found for charge ${charge.id}`);
        return;
    }

    const paymentId = result.rows[0][0];

    // Update payment status
    await connection.execute(
        `UPDATE PAYMENTS SET STATUS = 'refunded' WHERE ID = :paymentId`,
        { paymentId }
    );

    // Update escrow status
    await connection.execute(
        `UPDATE ESCROWS SET STATUS = 'refunded' WHERE PAYMENT_ID = :paymentId`,
        { paymentId }
    );

    console.log(`Payment ${paymentId} refunded via webhook`);
}

module.exports = exports;
