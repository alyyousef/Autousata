const Stripe = require("stripe");
const db = require("../config/db");
const { v4: uuidv4 } = require("crypto").randomUUID
  ? { v4: () => require("crypto").randomUUID() }
  : require("uuid");

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Constants
const PLATFORM_COMMISSION_PERCENT = parseFloat(
  process.env.PLATFORM_COMMISSION_PERCENT || "5",
);
const STRIPE_FEE_PERCENT = 2.9; // Stripe's standard fee
const STRIPE_FEE_FIXED_EGP = 2.5; // Stripe's fixed fee in EGP

/**
 * Calculate total payment breakdown
 */
const calculatePaymentBreakdown = (bidAmountEGP) => {
  const platformCommission = Math.round(
    (bidAmountEGP * PLATFORM_COMMISSION_PERCENT) / 100,
  );
  const stripeFee = Math.round(
    (bidAmountEGP * STRIPE_FEE_PERCENT) / 100 + STRIPE_FEE_FIXED_EGP,
  );
  const totalAmount = bidAmountEGP + platformCommission + stripeFee;
  const sellerPayout = bidAmountEGP - platformCommission;

  return {
    bidAmount: bidAmountEGP,
    platformCommission,
    stripeFee,
    totalAmount,
    sellerPayout,
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
                v.YEAR_MFG, v.MAKE, v.MODEL
            FROM AUCTIONS a
            JOIN VEHICLES v ON a.VEHICLE_ID = v.ID
            WHERE a.ID = :auctionId
        `;

    const auctionResult = await connection.execute(auctionQuery, { auctionId });

    if (auctionResult.rows.length === 0) {
      return res.status(404).json({ error: "Auction not found" });
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
      vehicleModel: auctionResult.rows[0][10],
    };

    // Validation checks
    if (auction.status !== "ended") {
      return res.status(400).json({ error: "Auction is not ended yet" });
    }

    if (auction.winnerId !== userId) {
      return res.status(403).json({ error: "You are not the auction winner" });
    }

    if (auction.paymentId) {
      return res
        .status(400)
        .json({ error: "Payment already exists for this auction" });
    }

    // Check payment deadline
    if (
      auction.paymentDeadline &&
      new Date() > new Date(auction.paymentDeadline)
    ) {
      return res.status(400).json({
        error: "Payment deadline has passed",
        message: "Your payment window has expired",
      });
    }

    // Calculate payment breakdown
    const breakdown = calculatePaymentBreakdown(auction.currentBidEGP);

    // Generate a paymentId to track this payment (stored in Stripe metadata, NOT in DB yet)
    const paymentId = uuidv4();

    // Create Stripe PaymentIntent (no DB record until payment is confirmed)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: breakdown.totalAmount * 100, // Stripe uses smallest currency unit (piasters)
      currency: "egp",
      metadata: {
        auctionId: auction.id,
        vehicleId: auction.vehicleId,
        paymentId: paymentId,
        userId: userId,
        sellerId: auction.sellerId,
        purchaseType: "auction",
        vehicleDescription: `${auction.vehicleYear} ${auction.vehicleMake} ${auction.vehicleModel}`,
        bidAmount: String(breakdown.bidAmount),
        platformCommission: String(breakdown.platformCommission),
        stripeFee: String(breakdown.stripeFee),
        totalAmount: String(breakdown.totalAmount),
        sellerPayout: String(breakdown.sellerPayout),
      },
      description: `Payment for ${auction.vehicleYear} ${auction.vehicleMake} ${auction.vehicleModel} - Auction ${auction.id}`,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Create payment record with all required fields
    await connection.execute(
      `INSERT INTO PAYMENTS (
                ID, AUCTION_ID, BUYER_ID, SELLER_ID,
                AMOUNT_EGP, PROCESSOR_FEE_EGP, CURRENCY, PAYMENT_METHOD, GATEWAY,
                GATEWAY_ORDER_ID, STATUS, INITIATED_AT
            ) VALUES (
                :paymentId, :auctionId, :buyerId, :sellerId,
                :amount, :processorFee, 'EGP', 'card', 'Stripe',
                :gatewayOrderId, 'pending', SYSTIMESTAMP
            )`,
      {
        paymentId,
        auctionId: auction.id,
        buyerId: userId,
        sellerId: auction.sellerId,
        amount: breakdown.totalAmount,
        processorFee: breakdown.stripeFee,
        gatewayOrderId: paymentIntent.id,
      },
    );

    await connection.commit();

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentId: paymentId,
      gatewayOrderId: paymentIntent.id,
      breakdown: breakdown,
      auction: {
        id: auction.id,
        vehicle: `${auction.vehicleYear} ${auction.vehicleMake} ${auction.vehicleModel}`,
        deadline: auction.paymentDeadline,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating payment intent:", error);
    res.status(500).json({
      error: "Failed to create payment intent",
      details: error.message,
    });
  } finally {
    await connection.close();
  }
};

/**
 * Create Direct Payment Intent (for Browse / Buy-Now)
 * POST /api/payments/create-direct-intent
 */
exports.createDirectPaymentIntent = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { vehicleId } = req.body;
    const userId = req.user.id;

    if (!vehicleId) {
      return res.status(400).json({ error: "Vehicle ID is required" });
    }

    // Validate vehicle exists and is available for direct purchase
    const vehicleQuery = `
            SELECT 
                v.ID, v.SELLER_ID, v.PRICE_EGP, v.STATUS,
                v.YEAR_MFG, v.MAKE, v.MODEL
            FROM VEHICLES v
            WHERE v.ID = :vehicleId
        `;

    const vehicleResult = await connection.execute(vehicleQuery, { vehicleId });

    if (vehicleResult.rows.length === 0) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    const vehicle = {
      id: vehicleResult.rows[0][0],
      sellerId: vehicleResult.rows[0][1],
      priceEGP: vehicleResult.rows[0][2],
      status: vehicleResult.rows[0][3],
      year: vehicleResult.rows[0][4],
      make: vehicleResult.rows[0][5],
      model: vehicleResult.rows[0][6],
    };

    // Validation checks
    if (vehicle.status !== "active") {
      return res.status(400).json({
        error: "Vehicle is not available for purchase",
        status: vehicle.status,
      });
    }

    if (vehicle.sellerId === userId) {
      return res
        .status(400)
        .json({ error: "You cannot purchase your own vehicle" });
    }

    // Check if this vehicle is already sold (completed payment exists)
    const existingPaymentQuery = `
            SELECT ID FROM PAYMENTS 
            WHERE VEHICLE_ID = :vehicleId 
            AND STATUS = 'completed'
        `;
    const existingPayment = await connection.execute(existingPaymentQuery, {
      vehicleId,
    });

    if (existingPayment.rows.length > 0) {
      return res.status(400).json({
        error: "This vehicle has already been purchased",
      });
    }

    // Calculate payment breakdown
    const breakdown = calculatePaymentBreakdown(vehicle.priceEGP);

    // Generate a paymentId to track this payment (stored in Stripe metadata, NOT in DB yet)
    const paymentId = uuidv4();

    // Create Stripe PaymentIntent (no DB record until payment is confirmed)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: breakdown.totalAmount * 100, // Stripe uses smallest currency unit (piasters)
      currency: "egp",
      metadata: {
        vehicleId: vehicle.id,
        paymentId: paymentId,
        userId: userId,
        sellerId: vehicle.sellerId,
        purchaseType: "direct",
        vehicleDescription: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        vehiclePrice: String(breakdown.bidAmount),
        platformCommission: String(breakdown.platformCommission),
        stripeFee: String(breakdown.stripeFee),
        totalAmount: String(breakdown.totalAmount),
        sellerPayout: String(breakdown.sellerPayout),
      },
      description: `Direct Purchase: ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // No DB insert here — payment record is created only after Stripe confirms payment

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentId: paymentId,
      gatewayOrderId: paymentIntent.id,
      breakdown: {
        vehiclePrice: breakdown.bidAmount,
        platformCommission: breakdown.platformCommission,
        stripeFee: breakdown.stripeFee,
        totalAmount: breakdown.totalAmount,
        sellerPayout: breakdown.sellerPayout,
      },
      vehicle: {
        id: vehicle.id,
        title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating direct payment intent:", error);
    res.status(500).json({
      error: "Failed to create payment intent",
      details: error.message,
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
    const { gatewayOrderId: clientGatewayOrderId } = req.body || {};
    const userId = req.user.id;

    // Check if a payment record already exists (e.g. webhook may have created it)
    const paymentQuery = `
            SELECT 
                p.ID, p.AUCTION_ID, p.VEHICLE_ID, p.BUYER_ID, p.SELLER_ID,
                p.AMOUNT_EGP, p.STATUS, p.GATEWAY_ORDER_ID,
                p.PROCESSOR_FEE_EGP, p.PURCHASE_TYPE
            FROM PAYMENTS p
            WHERE p.ID = :paymentId
        `;

    const paymentResult = await connection.execute(paymentQuery, { paymentId });

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (paymentResult.rows.length > 0) {
      // Payment record already exists (webhook may have created it)
      payment = {
        id: paymentResult.rows[0][0],
        auctionId: paymentResult.rows[0][1],
        vehicleId: paymentResult.rows[0][2],
        buyerId: paymentResult.rows[0][3],
        sellerId: paymentResult.rows[0][4],
        amountEGP: paymentResult.rows[0][5],
        status: paymentResult.rows[0][6],
        gatewayOrderId: paymentResult.rows[0][7],
        processorFeeEGP: paymentResult.rows[0][8],
        purchaseType: paymentResult.rows[0][9],
      };
      const payment = {
        id: paymentResult.rows[0][0],
        auctionId: paymentResult.rows[0][1],
        buyerId: paymentResult.rows[0][2],
        sellerId: paymentResult.rows[0][3],
        amountEGP: paymentResult.rows[0][4],
        status: paymentResult.rows[0][5],
        gatewayOrderId: paymentResult.rows[0][6],
        processorFeeEGP: paymentResult.rows[0][7],
        vehicleId: paymentResult.rows[0][8],
        purchaseType: paymentResult.rows[0][9] || "auction",
      };

      // Verify user is the buyer
      if (payment.buyerId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // If already completed, return existing payment details
      if (payment.status === "completed") {
        const fetchQuery = `
                    SELECT 
                        p.ID, p.AUCTION_ID, p.VEHICLE_ID, p.BUYER_ID, p.SELLER_ID,
                        p.AMOUNT_EGP, p.CURRENCY, p.PAYMENT_METHOD, p.GATEWAY,
                        p.STATUS, p.INITIATED_AT, p.COMPLETED_AT, p.PURCHASE_TYPE,
                        p.PROCESSOR_FEE_EGP,
                        e.ID as ESCROW_ID, e.STATUS as ESCROW_STATUS,
                        e.COMMISSION_EGP, e.SELLER_PAYOUT_EGP,
                        e.BUYER_RECEIVED, e.SELLER_TRANSFER
                    FROM PAYMENTS p
                    LEFT JOIN ESCROWS e ON p.ID = e.PAYMENT_ID
                    WHERE p.ID = :paymentId
                `;
        const existingResult = await connection.execute(fetchQuery, {
          paymentId: payment.id,
        });
        const row = existingResult.rows[0];
        return res.status(200).json({
          success: true,
          message: "Payment already confirmed",
          payment: buildPaymentResponse(row),
        });
      }
      // Check if already confirmed
      if (payment.status === "completed") {
        return res.status(200).json({
          success: true,
          message: "Payment already confirmed",
          paymentId: payment.id,
        });
      }

      // Retrieve PaymentIntent from Stripe to verify status
      // Retry up to 3 times with short delays for Stripe eventual consistency
      let paymentIntent;
      for (let attempt = 0; attempt < 3; attempt++) {
        paymentIntent = await stripe.paymentIntents.retrieve(
          payment.gatewayOrderId,
          {
            expand: ["latest_charge.balance_transaction"],
          },
        );
        if (paymentIntent.status === "succeeded") break;
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
      // Retrieve PaymentIntent from Stripe to verify
      paymentIntent = await stripe.paymentIntents.retrieve(
        payment.gatewayOrderId,
        {
          expand: ["charges.data.balance_transaction"],
        },
      );
    } else {
      // No payment record yet — this is the normal flow since we no longer insert at intent creation
      // We need the gatewayOrderId (Stripe PaymentIntent ID) to look up the payment in Stripe
      if (!clientGatewayOrderId) {
        return res.status(400).json({
          error: "Gateway order ID is required to confirm payment",
        });
      }

      // Retrieve PaymentIntent from Stripe
      paymentIntent = await stripe.paymentIntents.retrieve(
        clientGatewayOrderId,
        {
          expand: ["charges.data.balance_transaction"],
        },
      );

      // Verify the paymentId in Stripe metadata matches
      if (paymentIntent.metadata.paymentId !== paymentId) {
        return res.status(400).json({ error: "Payment ID mismatch" });
      }

      // Verify user matches
      if (paymentIntent.metadata.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    // Verify Stripe payment succeeded
    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({
        error: "Payment not succeeded",
        stripeStatus: paymentIntent.status,
      });
    }

    // Extract charge details
    const charge = paymentIntent.charges?.data?.[0];
    const transId = charge?.id || paymentIntent.id;
    const actualStripeFee = charge?.balance_transaction?.fee
      ? Math.round(charge.balance_transaction.fee / 100)
      : parseInt(paymentIntent.metadata.stripeFee) || 0;

    const meta = paymentIntent.metadata;
    const purchaseType = meta.purchaseType || "auction";
    const isDirectPurchase = purchaseType === "direct";
    const vehicleId = meta.vehicleId || null;
    const auctionId = meta.auctionId || null;
    const sellerId = meta.sellerId || null;
    const totalAmount =
      parseInt(meta.totalAmount) || Math.round(paymentIntent.amount / 100);
    const bidAmount =
      parseInt(meta.vehiclePrice || meta.bidAmount) || totalAmount;

    if (!payment) {
      // CREATE the payment record now that Stripe has confirmed it
      const insertPaymentQuery = `
                INSERT INTO PAYMENTS (
                    ID, ${isDirectPurchase ? "VEHICLE_ID" : "AUCTION_ID"}, BUYER_ID, SELLER_ID,
                    AMOUNT_EGP, CURRENCY, PAYMENT_METHOD, GATEWAY,
                    STATUS, INITIATED_AT, COMPLETED_AT,
                    ${isDirectPurchase ? "PURCHASE_TYPE," : ""} PROCESSOR_FEE_EGP, 
                    GATEWAY_ORDER_ID, GATEWAY_TRANS_ID
                ) VALUES (
                    :paymentId, :refId, :buyerId, :sellerId,
                    :amount, 'EGP', 'card', 'Stripe',
                    'completed', SYSTIMESTAMP, SYSTIMESTAMP,
                    ${isDirectPurchase ? "'direct'," : ""} :processorFee, 
                    :gatewayOrderId, :transId
                )
            `;

      await connection.execute(insertPaymentQuery, {
        paymentId,
        refId: isDirectPurchase ? vehicleId : auctionId,
        buyerId: userId,
        sellerId: sellerId,
        amount: totalAmount,
        processorFee: actualStripeFee,
        gatewayOrderId: paymentIntent.id,
        transId,
      });

      payment = {
        id: paymentId,
        auctionId: auctionId,
        vehicleId: vehicleId,
        buyerId: userId,
        sellerId: sellerId,
        amountEGP: totalAmount,
        purchaseType: purchaseType,
        gatewayOrderId: paymentIntent.id,
      };
    } else {
      // Update existing payment record to completed
      await connection.execute(
        `UPDATE PAYMENTS 
                 SET STATUS = 'completed', 
                     GATEWAY_TRANS_ID = :transId,
                     PROCESSOR_FEE_EGP = :processorFee,
                     COMPLETED_AT = SYSTIMESTAMP 
                 WHERE ID = :paymentId`,
        { transId, processorFee: actualStripeFee, paymentId },
      );
    }
    // Extract charge info safely
    const latestCharge = paymentIntent.latest_charge;
    const chargeId =
      (typeof latestCharge === "object" ? latestCharge?.id : latestCharge) ||
      paymentIntent.id;
    const balanceTxFee =
      typeof latestCharge === "object"
        ? latestCharge?.balance_transaction?.fee
        : null;
    const actualProcessorFee = balanceTxFee
      ? Math.round(balanceTxFee / 100)
      : payment.processorFeeEGP;

    // Update payment status
    await connection.execute(
      `UPDATE PAYMENTS 
             SET STATUS = 'completed', 
                 GATEWAY_TRANS_ID = :transId,
                 PROCESSOR_FEE_EGP = :processorFee,
                 COMPLETED_AT = SYSTIMESTAMP 
             WHERE ID = :paymentId`,
      {
        transId: chargeId,
        processorFee: actualProcessorFee,
        paymentId,
      },
    );

    // Calculate escrow breakdown
    //const breakdown = calculatePaymentBreakdown(bidAmount);

    // Check if escrow already exists (webhook may have created it)
    const existingEscrow = await connection.execute(
      `SELECT ID FROM ESCROWS WHERE PAYMENT_ID = :paymentId`,
      { paymentId: payment.id },
    );

    if (existingEscrow.rows.length === 0) {
      // Create escrow record
      const escrowId = uuidv4();

      const insertEscrowQuery = isDirectPurchase
        ? `
                INSERT INTO ESCROWS (
                    ID, PAYMENT_ID, VEHICLE_ID, SELLER_ID, BUYER_ID,
                    TOTAL_AMOUNT_EGP, COMMISSION_EGP, PROCESSOR_FEE_EGP,
                    SELLER_PAYOUT_EGP, STATUS, HELD_AT
                ) VALUES (
                    :escrowId, :paymentId, :vehicleId, :sellerId, :buyerId,
                    :totalAmount, :commission, :processorFee,
                    :sellerPayout, 'held', SYSTIMESTAMP
                )
            `
        : `
                INSERT INTO ESCROWS (
                    ID, PAYMENT_ID, AUCTION_ID, SELLER_ID, BUYER_ID,
                    TOTAL_AMOUNT_EGP, COMMISSION_EGP, PROCESSOR_FEE_EGP,
                    SELLER_PAYOUT_EGP, STATUS, HELD_AT
                ) VALUES (
                    :escrowId, :paymentId, :auctionId, :sellerId, :buyerId,
                    :totalAmount, :commission, :processorFee,
                    :sellerPayout, 'held', SYSTIMESTAMP
                )
            `;

      const escrowParams = {
        escrowId,
        paymentId: payment.id,
        sellerId: payment.sellerId,
        buyerId: payment.buyerId || userId,
        totalAmount: totalAmount,
        commission: breakdown.platformCommission,
        processorFee: actualStripeFee,
        sellerPayout: breakdown.sellerPayout,
      };

      if (isDirectPurchase) {
        escrowParams.vehicleId = payment.vehicleId;
      } else {
        escrowParams.auctionId = payment.auctionId;
      }

      await connection.execute(insertEscrowQuery, escrowParams);
    }

    // Update auction with payment ID (only for auction purchases)
    if (!isDirectPurchase && payment.auctionId) {
      await connection.execute(
        `UPDATE AUCTIONS SET PAYMENT_ID = :paymentId, STATUS = 'settled' WHERE ID = :auctionId`,
        { paymentId: payment.id, auctionId: payment.auctionId },
      );
    }
    // Calculate escrow breakdown from the original bid/price amount
    const originalAmount =
      payment.amountEGP -
      Math.round(
        (payment.amountEGP *
          (STRIPE_FEE_PERCENT + PLATFORM_COMMISSION_PERCENT)) /
          100,
      );
    const breakdown = calculatePaymentBreakdown(originalAmount);

    // Create escrow record — use VEHICLE_ID for direct purchases, AUCTION_ID for auctions
    const escrowId = uuidv4();
    await connection.execute(
      `INSERT INTO ESCROWS (
                ID, PAYMENT_ID, AUCTION_ID, VEHICLE_ID, SELLER_ID, BUYER_ID,
                TOTAL_AMOUNT_EGP, COMMISSION_EGP, PROCESSOR_FEE_EGP,
                SELLER_PAYOUT_EGP, STATUS, HELD_AT
            ) VALUES (
                :escrowId, :paymentId, :auctionId, :vehicleId, :sellerId, :buyerId,
                :totalAmount, :commission, :processorFee,
                :sellerPayout, 'held', SYSTIMESTAMP
            )`,
      {
        escrowId,
        paymentId: payment.id,
        auctionId: payment.auctionId || null,
        vehicleId: payment.vehicleId || null,
        sellerId: payment.sellerId,
        buyerId: payment.buyerId,
        totalAmount: payment.amountEGP,
        commission: breakdown.platformCommission,
        processorFee: actualProcessorFee,
        sellerPayout: breakdown.sellerPayout,
      },
    );

    // For auction purchases, update auction status
    if (payment.auctionId) {
      await connection.execute(
        `UPDATE AUCTIONS SET PAYMENT_ID = :paymentId, STATUS = 'settled' WHERE ID = :auctionId`,
        { paymentId: payment.id, auctionId: payment.auctionId },
      );
    }

    // Mark vehicle as sold (only for direct purchases)
    if (isDirectPurchase && payment.vehicleId) {
      await connection.execute(
        `UPDATE VEHICLES SET STATUS = 'sold' WHERE ID = :vehicleId AND STATUS = 'active'`,
        { vehicleId: payment.vehicleId },
      );
    }

    await connection.commit();

    // Fetch complete payment details with escrow for response
    const fetchQuery = `
            SELECT 
                p.ID, p.AUCTION_ID, p.VEHICLE_ID, p.BUYER_ID, p.SELLER_ID,
                p.AMOUNT_EGP, p.CURRENCY, p.PAYMENT_METHOD, p.GATEWAY,
                p.STATUS, p.INITIATED_AT, p.COMPLETED_AT, p.PURCHASE_TYPE,
                p.PROCESSOR_FEE_EGP,
                e.ID as ESCROW_ID, e.STATUS as ESCROW_STATUS,
                e.COMMISSION_EGP, e.SELLER_PAYOUT_EGP,
                e.BUYER_RECEIVED, e.SELLER_TRANSFER
            FROM PAYMENTS p
            LEFT JOIN ESCROWS e ON p.ID = e.PAYMENT_ID
            WHERE p.ID = :paymentId
        `;

    const paymentDetailsResult = await connection.execute(fetchQuery, {
      paymentId: payment.id,
    });
    const row = paymentDetailsResult.rows[0];

    res.status(200).json({
      success: true,
      message: "Payment confirmed and escrow created",
      payment: buildPaymentResponse(row),
      paymentId: payment.id,
      escrowId: escrowId,
      breakdown: breakdown,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error confirming payment:", error);
    res.status(500).json({
      error: "Failed to confirm payment",
      details: error.message,
    });
  } finally {
    await connection.close();
  }
};

/**
 * Helper: Build payment response object from a DB row
 */
function buildPaymentResponse(row) {
  return {
    id: row[0],
    auctionId: row[1],
    vehicleId: row[2],
    buyerId: row[3],
    sellerId: row[4],
    amountEGP: row[5],
    currency: row[6],
    paymentMethod: row[7],
    gateway: row[8],
    status: row[9],
    initiatedAt: row[10],
    completedAt: row[11],
    purchaseType: row[12],
    processorFeeEGP: row[13],
    escrow: row[14]
      ? {
          id: row[14],
          status: row[15],
          commissionEGP: row[16],
          sellerPayoutEGP: row[17],
          buyerReceived: row[18],
          sellerTransfer: row[19],
        }
      : null,
  };
}

/**
 * Get Payment by Payment ID
 * GET /api/payments/:id
 */
exports.getPaymentById = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id: paymentId } = req.params;
    const userId = req.user.id;

    const query = `
            SELECT 
                p.ID, p.AUCTION_ID, p.VEHICLE_ID, p.BUYER_ID, p.SELLER_ID,
                p.AMOUNT_EGP, p.CURRENCY, p.PAYMENT_METHOD, p.GATEWAY,
                p.STATUS, p.INITIATED_AT, p.COMPLETED_AT, p.FAILED_AT,
                p.PROCESSOR_FEE_EGP, p.PURCHASE_TYPE,
                e.ID as ESCROW_ID, e.STATUS as ESCROW_STATUS,
                e.COMMISSION_EGP, e.SELLER_PAYOUT_EGP,
                e.BUYER_RECEIVED, e.SELLER_TRANSFER
            FROM PAYMENTS p
            LEFT JOIN ESCROWS e ON p.ID = e.PAYMENT_ID
            WHERE p.ID = :paymentId
        `;

    const result = await connection.execute(query, { paymentId });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const row = result.rows[0];
    const payment = {
      id: row[0],
      auctionId: row[1],
      vehicleId: row[2],
      buyerId: row[3],
      sellerId: row[4],
      amountEGP: row[5],
      currency: row[6],
      paymentMethod: row[7],
      gateway: row[8],
      status: row[9],
      initiatedAt: row[10],
      completedAt: row[11],
      failedAt: row[12],
      processorFeeEGP: row[13],
      purchaseType: row[14],
      escrow: row[15]
        ? {
            id: row[15],
            status: row[16],
            commissionEGP: row[17],
            sellerPayoutEGP: row[18],
            buyerReceived: row[19],
            sellerTransfer: row[20],
          }
        : null,
    };

    // Verify user is buyer or seller
    if (
      payment.buyerId !== userId &&
      payment.sellerId !== userId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.status(200).json({ success: true, payment });
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({
      error: "Failed to fetch payment",
      details: error.message,
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
      return res
        .status(404)
        .json({ error: "Payment not found for this auction" });
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
      escrow: row[13]
        ? {
            id: row[13],
            status: row[14],
            commissionEGP: row[15],
            sellerPayoutEGP: row[16],
            buyerReceived: row[17],
            sellerTransfer: row[18],
          }
        : null,
    };

    // Verify user is buyer or seller
    if (
      payment.buyerId !== userId &&
      payment.sellerId !== userId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.status(200).json({ success: true, payment });
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({
      error: "Failed to fetch payment",
      details: error.message,
    });
  } finally {
    await connection.close();
  }
};

/**
 * Get Payment by Vehicle ID (for direct purchases)
 * GET /api/payments/vehicle/:vehicleId
 */
exports.getPaymentByVehicle = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { vehicleId } = req.params;
    const userId = req.user.id;

    const query = `
            SELECT 
                p.ID, p.VEHICLE_ID, p.BUYER_ID, p.SELLER_ID,
                p.AMOUNT_EGP, p.CURRENCY, p.PAYMENT_METHOD, p.GATEWAY,
                p.STATUS, p.INITIATED_AT, p.COMPLETED_AT, p.FAILED_AT,
                p.PROCESSOR_FEE_EGP, p.PURCHASE_TYPE,
                e.ID as ESCROW_ID, e.STATUS as ESCROW_STATUS,
                e.COMMISSION_EGP, e.SELLER_PAYOUT_EGP,
                e.BUYER_RECEIVED, e.SELLER_TRANSFER
            FROM PAYMENTS p
            LEFT JOIN ESCROWS e ON p.ID = e.PAYMENT_ID
            WHERE p.VEHICLE_ID = :vehicleId
        `;

    //const result = await connection.execute(query, { paymentId });
    const result = await connection.execute(query, { vehicleId });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Payment not found" });
    }
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Payment not found for this vehicle" });
    }

    const row = result.rows[0];
    const payment = {
      id: row[0],
      vehicleId: row[1],
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
      vehicleId: row[13],
      purchaseType: row[14],
      escrow: row[15]
        ? {
            id: row[15],
            status: row[16],
            commissionEGP: row[17],
            sellerPayoutEGP: row[18],
            buyerReceived: row[19],
            sellerTransfer: row[20],
          }
        : null,
    };

    // Verify user is buyer or seller
    if (
      payment.buyerId !== userId &&
      payment.sellerId !== userId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.status(200).json({ success: true, payment });
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({
      error: "Failed to fetch payment",
      details: error.message,
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
  const signature = req.headers["stripe-signature"];
  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );

    // inside handleStripeWebhook after verifying signature
    await logActivity({
      userId: "null",
      userRole: "system",
      action: "STRIPE_WEBHOOK_RECEIVED",
      severity: "INFO",
      entityType: "PAYMENT",
      entityId: paymentId || null,
      description: `Stripe event: ${event.type}`,
      ipAddress:
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip,
      userAgent: req.headers["user-agent"] || null,
    });
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const connection = await db.getConnection();

  try {
    // Check for duplicate webhook events (idempotency)
    const checkEventQuery = `
            SELECT ID FROM WEBHOOK_EVENTS WHERE EVENT_ID = :eventId
        `;
    const eventCheckResult = await connection.execute(checkEventQuery, {
      eventId: event.id,
    });

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
        eventType: event.type,
      },
    );

    // Handle different event types
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object, connection);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object, connection);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object, connection);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    await connection.commit();
    res.status(200).json({ received: true });
  } catch (error) {
    await connection.rollback();
    console.error("Error processing webhook:", error);
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
  const meta = paymentIntent.metadata;
  const paymentId = meta.paymentId;
  const purchaseType = meta.purchaseType || "auction";
  const isDirectPurchase = purchaseType === "direct";
  const vehicleId = paymentIntent.metadata.vehicleId;

  if (!paymentId) {
    console.error("No paymentId in metadata");
    return;
  }

  // ✅ CRITICAL: Verify payment intent status is truly 'succeeded'
  if (paymentIntent.status !== "succeeded") {
    console.warn(
      `⚠ Webhook received for payment_intent.succeeded but status is '${paymentIntent.status}' for payment ${paymentId}`,
    );
    return;
  }
  const transId = paymentIntent.charges?.data?.[0]?.id || paymentIntent.id;

  // Check if payment record already exists
  const paymentQuery = `
        SELECT ID, BUYER_ID, SELLER_ID, AMOUNT_EGP, VEHICLE_ID, AUCTION_ID, PURCHASE_TYPE, STATUS
        FROM PAYMENTS WHERE ID = :paymentId
    `;
  const paymentResult = await connection.execute(paymentQuery, { paymentId });

  let payment;

  if (paymentResult.rows.length > 0) {
    // Payment record exists (frontend confirmPayment may have created it already)
    payment = {
      id: paymentResult.rows[0][0],
      buyerId: paymentResult.rows[0][1],
      sellerId: paymentResult.rows[0][2],
      amountEGP: paymentResult.rows[0][3],
      vehicleId: paymentResult.rows[0][4],
      auctionId: paymentResult.rows[0][5],
      purchaseType: paymentResult.rows[0][6],
      status: paymentResult.rows[0][7],
    };

    // If already completed, nothing more to do
    if (payment.status === "completed") {
      console.log(
        `Payment ${paymentId} already completed, skipping webhook processing`,
      );
      return;
    }

    // Update payment status
    const updateResult = await connection.execute(
      `UPDATE PAYMENTS 
         SET STATUS = 'completed',
             GATEWAY_TRANS_ID = :transId,
             PROCESSOR_FEE_EGP = :processorFee,
             COMPLETED_AT = SYSTIMESTAMP
         WHERE ID = :paymentId AND STATUS = 'pending'`,
      {
        transId: paymentIntent.charges.data[0]?.id || paymentIntent.id,
        processorFee:
          (paymentIntent.charges.data[0]?.amount || paymentIntent.amount) *
            (STRIPE_FEE_PERCENT / 100) +
          STRIPE_FEE_FIXED_EGP,
        paymentId,
      },
    );

    if (updateResult.rowsAffected === 0) {
      console.warn(
        `⚠ Payment ${paymentId} was not updated - may already be completed or not found`,
      );
      return; // Don't proceed if payment wasn't updated
    }

    console.log(`✓ Payment ${paymentId} marked as completed via webhook`);

    // If this is a direct purchase, mark vehicle as sold
    // SAFETY CHECK: Only update if vehicle is currently 'active' and no other completed payment exists
    if (purchaseType === "direct" && vehicleId) {
      const updateResult = await connection.execute(
        `UPDATE VEHICLES 
             SET STATUS = 'sold' 
             WHERE ID = :vehicleId 
               AND STATUS = 'active'
               AND ID NOT IN (
                   SELECT VEHICLE_ID FROM PAYMENTS 
                   WHERE VEHICLE_ID = :vehicleId 
                     AND STATUS = 'completed'
                     AND ID != :paymentId
               )`,
        { vehicleId, paymentId },
        { autoCommit: false },
      );

      if (updateResult.rowsAffected > 0) {
        console.log(
          `✓ Vehicle ${vehicleId} marked as sold via webhook (${updateResult.rowsAffected} rows affected)`,
        );
      } else {
        console.warn(
          `⚠ Vehicle ${vehicleId} NOT marked as sold - may already be sold or not active`,
        );
      }

      // Verify update
      const verifyResult = await connection.execute(
        `SELECT STATUS FROM VEHICLES WHERE ID = :vehicleId`,
        { vehicleId },
      );
      if (verifyResult.rows.length > 0) {
        console.log(
          `✓ Verification: Vehicle ${vehicleId} status is now: ${verifyResult.rows[0][0]}`,
        );
      } else {
        console.error(
          `✗ WARNING: Could not verify vehicle ${vehicleId} after status update`,
        );
      }

      // Create escrow record for direct purchase
      const metadata = paymentIntent.metadata;
      const bidAmount = parseFloat(
        metadata.bidAmount || metadata.vehiclePrice || 0,
      );
      const platformCommission = parseFloat(metadata.platformCommission || 0);
      const stripeFee = parseFloat(metadata.stripeFee || 0);
      const sellerPayout = parseFloat(metadata.sellerPayout || bidAmount);
      const sellerId = metadata.sellerId;
      const userId = metadata.userId;
      // Update existing payment to completed
      await connection.execute(
        `UPDATE PAYMENTS 
             SET STATUS = 'completed',
                 GATEWAY_TRANS_ID = :transId,
                 COMPLETED_AT = SYSTIMESTAMP
             WHERE ID = :paymentId AND STATUS != 'completed'`,
        { transId, paymentId },
      );
    } else {
      // No payment record — create one now (safety net if frontend confirm hasn't run yet)
      const vehicleId = meta.vehicleId || null;
      const auctionId = meta.auctionId || null;
      const sellerId = meta.sellerId || null;
      const buyerId = meta.userId || null;
      const totalAmount =
        parseInt(meta.totalAmount) || Math.round(paymentIntent.amount / 100);
      const stripeFee = parseInt(meta.stripeFee) || 0;

      const insertQuery = `
            INSERT INTO PAYMENTS (
                ID, ${isDirectPurchase ? "VEHICLE_ID" : "AUCTION_ID"}, BUYER_ID, SELLER_ID,
                AMOUNT_EGP, CURRENCY, PAYMENT_METHOD, GATEWAY,
                STATUS, INITIATED_AT, COMPLETED_AT,
                ${isDirectPurchase ? "PURCHASE_TYPE," : ""} PROCESSOR_FEE_EGP, 
                GATEWAY_ORDER_ID, GATEWAY_TRANS_ID
            ) VALUES (
                :paymentId, :refId, :buyerId, :sellerId,
                :amount, 'EGP', 'card', 'Stripe',
                'completed', SYSTIMESTAMP, SYSTIMESTAMP,
                ${isDirectPurchase ? "'direct'," : ""} :processorFee, 
                :gatewayOrderId, :transId
            )
        `;

      await connection.execute(insertQuery, {
        paymentId,
        refId: isDirectPurchase ? vehicleId : auctionId,
        buyerId,
        sellerId,
        amount: totalAmount,
        processorFee: stripeFee,
        gatewayOrderId: paymentIntent.id,
        transId,
      });

      payment = {
        id: paymentId,
        buyerId,
        sellerId,
        amountEGP: totalAmount,
        vehicleId,
        auctionId,
        purchaseType,
      };

      console.log(
        `Payment ${paymentId} created via webhook (frontend confirm hadn't run yet)`,
      );
    }

    // Handle direct purchase: mark vehicle as sold and create escrow
    if (isDirectPurchase && payment.vehicleId) {
      // Mark vehicle as sold
      await connection.execute(
        `UPDATE VEHICLES SET STATUS = 'sold' WHERE ID = :vehicleId AND STATUS = 'active'`,
        { vehicleId: payment.vehicleId },
      );

      const bidAmount =
        parseInt(meta.vehiclePrice || meta.bidAmount) || payment.amountEGP;
      const breakdown = calculatePaymentBreakdown(bidAmount);

      // Check if escrow already exists
      const existingEscrow = await connection.execute(
        `SELECT ID FROM ESCROWS WHERE PAYMENT_ID = :paymentId`,
        { paymentId: payment.id },
      );

      if (existingEscrow.rows.length === 0) {
        const escrowId = uuidv4();
        await connection.execute(
          `INSERT INTO ESCROWS (
                    ID, PAYMENT_ID, VEHICLE_ID, SELLER_ID, BUYER_ID,
                    TOTAL_AMOUNT_EGP, COMMISSION_EGP, PROCESSOR_FEE_EGP,
                    SELLER_PAYOUT_EGP, STATUS, HELD_AT
                ) VALUES (
                    :escrowId, :paymentId, :vehicleId, :sellerId, :buyerId,
                    :totalAmount, :commission, :processorFee,
                    :sellerPayout, 'held', SYSTIMESTAMP
                )`,
          {
            escrowId,
            paymentId: payment.id,
            vehicleId: payment.vehicleId,
            sellerId: payment.sellerId,
            buyerId: payment.buyerId,
            totalAmount: payment.amountEGP,
            commission: breakdown.platformCommission,
            processorFee: breakdown.stripeFee,
            sellerPayout: breakdown.sellerPayout,
          },
        );
        console.log(
          `Direct purchase ${paymentId} completed - Vehicle ${payment.vehicleId} marked as sold, Escrow ${escrowId} created`,
        );
      }
    } else if (!isDirectPurchase && payment.auctionId) {
      // For auction purchases, update auction status
      await connection.execute(
        `UPDATE AUCTIONS SET PAYMENT_ID = :paymentId, STATUS = 'settled' 
             WHERE ID = :auctionId AND STATUS != 'settled'`,
        { paymentId: payment.id, auctionId: payment.auctionId },
      );

      const bidAmount = parseInt(meta.bidAmount) || payment.amountEGP;
      const breakdown = calculatePaymentBreakdown(bidAmount);

      // Check if escrow already exists
      const existingEscrow = await connection.execute(
        `SELECT ID FROM ESCROWS WHERE PAYMENT_ID = :paymentId`,
        { paymentId: payment.id },
      );

      if (existingEscrow.rows.length === 0) {
        const escrowId = uuidv4();
        await connection.execute(
          `INSERT INTO ESCROWS (
                    ID, PAYMENT_ID, AUCTION_ID, SELLER_ID, BUYER_ID,
                    TOTAL_AMOUNT_EGP, COMMISSION_EGP, PROCESSOR_FEE_EGP,
                    SELLER_PAYOUT_EGP, STATUS, HELD_AT
                ) VALUES (
                    :escrowId, :paymentId, :auctionId, :sellerId, :buyerId,
                    :totalAmount, :commission, :processorFee,
                    :sellerPayout, 'held', SYSTIMESTAMP
                )`,
          {
            escrowId,
            paymentId: payment.id,
            auctionId: payment.auctionId,
            sellerId: payment.sellerId,
            buyerId: payment.buyerId,
            totalAmount: payment.amountEGP,
            commission: breakdown.platformCommission,
            processorFee: breakdown.stripeFee,
            sellerPayout: breakdown.sellerPayout,
          },
        );
      }
      console.log(`Auction payment ${paymentId} completed via webhook`);
    } else {
      console.log(`Payment ${paymentId} marked as completed via webhook`);
    }
  }

  /**
   * Helper: Handle payment_intent.payment_failed event
   */
  async function handlePaymentIntentFailed(paymentIntent, connection) {
    const paymentId = paymentIntent.metadata.paymentId;
    const purchaseType = paymentIntent.metadata.purchaseType || "auction";
    const vehicleId = paymentIntent.metadata.vehicleId;
    // const paymentId = paymentIntent.metadata.paymentId;
    const failureMessage =
      paymentIntent.last_payment_error?.message || "Payment failed";

    if (!paymentId) {
      console.error("No paymentId in metadata");
      return;
    }

    // Update payment status
    await connection.execute(
      `UPDATE PAYMENTS 
         SET STATUS = 'failed',
             FAILURE_REASON = :reason,
             FAILED_AT = SYSTIMESTAMP
         WHERE ID = :paymentId`,
      {
        reason: paymentIntent.last_payment_error?.message || "Payment failed",
        paymentId,
      },
    );

    // If this is a direct purchase, rollback vehicle status (if it was marked as sold)
    // In our new flow, vehicle shouldn't be sold yet, but this is a safety measure
    if (purchaseType === "direct" && vehicleId) {
      await connection.execute(
        `UPDATE VEHICLES 
             SET STATUS = 'active' 
             WHERE ID = :vehicleId AND STATUS = 'sold'
               AND ID NOT IN (
                   SELECT VEHICLE_ID FROM PAYMENTS 
                   WHERE VEHICLE_ID = :vehicleId AND STATUS = 'completed'
               )`,
        { vehicleId },
      );
      console.log(
        `Vehicle ${vehicleId} status rolled back to active due to payment failure`,
      );
    }

    console.log(`Payment ${paymentId} marked as failed via webhook`);
    // Only update if a record exists (it may not, since we no longer insert at intent creation)
    const result = await connection.execute(
      `SELECT ID FROM PAYMENTS WHERE ID = :paymentId`,
      { paymentId },
    );

    if (result.rows.length > 0) {
      await connection.execute(
        `UPDATE PAYMENTS 
             SET STATUS = 'failed',
                 FAILED_AT = SYSTIMESTAMP
             WHERE ID = :paymentId`,
        { paymentId },
      );
      console.log(
        `Payment ${paymentId} marked as failed via webhook: ${failureMessage}`,
      );
    } else {
      // No record to update — payment was never completed, which is fine
      console.log(
        `Payment ${paymentId} failed but no DB record exists (intent was never confirmed): ${failureMessage}`,
      );
    }
  }

  /**
   * Helper: Handle charge.refunded event
   */
  async function handleChargeRefunded(charge, connection) {
    const paymentIntentId = charge.payment_intent;

    // Find payment by gateway_order_id
    const result = await connection.execute(
      `SELECT ID FROM PAYMENTS WHERE GATEWAY_ORDER_ID = :gatewayOrderId`,
      { gatewayOrderId: paymentIntentId },
    );

    if (result.rows.length === 0) {
      console.error(`Payment not found for charge ${charge.id}`);
      return;
    }

    const paymentId = result.rows[0][0];

    // Update payment status
    await connection.execute(
      `UPDATE PAYMENTS SET STATUS = 'refunded' WHERE ID = :paymentId`,
      { paymentId },
    );

    // Update escrow status
    await connection.execute(
      `UPDATE ESCROWS SET STATUS = 'refunded' WHERE PAYMENT_ID = :paymentId`,
      { paymentId },
    );

    console.log(`Payment ${paymentId} refunded via webhook`);
  }

  /**
   * Create Direct Payment Intent (Fixed-Price Purchase)
   * POST /api/payments/create-direct-intent
   */
  exports.createDirectPaymentIntent = async (req, res) => {
    const connection = await db.getConnection();
    try {
      const { vehicleId } = req.body;
      const userId = req.user.id;

      if (!vehicleId) {
        return res.status(400).json({ error: "vehicleId is required" });
      }

      // ✅ Enhanced availability check - ensures vehicle is truly available
      // Checks: 1) Vehicle is active, 2) Not in an active auction, 3) No pending/completed payments
      const availabilityCheck = await connection.execute(
        `SELECT COUNT(*) FROM VEHICLES 
             WHERE ID = :vehicleId 
               AND STATUS = 'active'
               AND ID NOT IN (
                   SELECT VEHICLE_ID FROM AUCTIONS 
                   WHERE STATUS NOT IN ('cancelled')
               )
               AND ID NOT IN (
                   SELECT VEHICLE_ID FROM PAYMENTS 
                   WHERE VEHICLE_ID IS NOT NULL 
                     AND STATUS IN ('pending', 'completed')
               )`,
        { vehicleId },
      );

      if (availabilityCheck.rows[0][0] === 0) {
        return res.status(409).json({
          error: "Vehicle is no longer available for purchase",
          message:
            "This vehicle may have been sold or is currently being purchased by another buyer.",
        });
      }

      // Fetch vehicle details
      const vehResult = await connection.execute(
        `SELECT ID, SELLER_ID, MAKE, MODEL, YEAR_MFG, PRICE_EGP
             FROM VEHICLES WHERE ID = :vehicleId`,
        { vehicleId },
        { outFormat: require("oracledb").OUT_FORMAT_OBJECT },
      );

      const vehicle = vehResult.rows[0];

      if (vehicle.SELLER_ID === userId) {
        return res
          .status(400)
          .json({ error: "You cannot buy your own vehicle" });
      }

      const priceEGP = Number(vehicle.PRICE_EGP);
      const breakdown = calculatePaymentBreakdown(priceEGP);

      // Generate payment ID and create Stripe PaymentIntent first
      const paymentId = uuidv4();
      const vehicleTitle = `${vehicle.YEAR_MFG} ${vehicle.MAKE} ${vehicle.MODEL}`;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: breakdown.totalAmount * 100,
        currency: "egp",
        metadata: {
          vehicleId: vehicle.ID,
          paymentId,
          userId,
          sellerId: vehicle.SELLER_ID,
          vehicleDescription: vehicleTitle,
          purchaseType: "direct",
          vehiclePrice: priceEGP,
          platformCommission: breakdown.platformCommission,
          stripeFee: breakdown.stripeFee,
          bidAmount: priceEGP,
          sellerPayout: breakdown.sellerPayout,
        },
        description: `Direct purchase: ${vehicleTitle}`,
        automatic_payment_methods: { enabled: true },
      });

      // Create payment record with all required fields
      await connection.execute(
        `INSERT INTO PAYMENTS (
                ID, AUCTION_ID, VEHICLE_ID, BUYER_ID, SELLER_ID,
                AMOUNT_EGP, PROCESSOR_FEE_EGP, CURRENCY, PAYMENT_METHOD, GATEWAY,
                GATEWAY_ORDER_ID, STATUS, PURCHASE_TYPE, INITIATED_AT
            ) VALUES (
                :paymentId, NULL, :vehicleId, :buyerId, :sellerId,
                :amount, :processorFee, 'EGP', 'card', 'Stripe',
                :gatewayOrderId, 'pending', 'direct', SYSTIMESTAMP
            )`,
        {
          paymentId,
          vehicleId,
          buyerId: userId,
          sellerId: vehicle.SELLER_ID,
          amount: breakdown.totalAmount,
          processorFee: breakdown.stripeFee,
          gatewayOrderId: paymentIntent.id,
        },
      );

      await connection.commit();

      res.status(200).json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentId,
        breakdown: {
          vehiclePrice: priceEGP,
          platformCommission: breakdown.platformCommission,
          stripeFee: breakdown.stripeFee,
          totalAmount: breakdown.totalAmount,
          sellerPayout: breakdown.sellerPayout,
        },
        vehicle: {
          id: vehicle.ID,
          title: vehicleTitle,
        },
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error creating direct payment intent:", error);
      res.status(500).json({
        error: "Failed to create payment intent",
        details: error.message,
      });
    } finally {
      await connection.close();
    }
  };
}
module.exports = exports;
