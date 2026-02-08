const cron = require('node-cron');
const oracledb = require('oracledb');
const db = require('../config/db');
const webhookService = require('./webhookService');

/**
 * Auction Scheduler Service
 * Handles periodic checks for ending auctions, ended auctions, and notifications
 */

let schedulerTask = null;
let io = null; // Socket.IO instance

/**
 * Set Socket.IO instance for real-time notifications
 * @param {Object} socketIo - Socket.IO server instance
 */
function setSocketIO(socketIo) {
  io = socketIo;
}

/**
 * Send notification to user
 * @param {string} userId - User ID
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {string} auctionId - Related auction ID
 */
async function createNotification(userId, type, title, body, auctionId = null) {
  let connection;
  try {
    connection = await db.getConnection();

    await connection.execute(
      `INSERT INTO notifications (
        id,
        user_id,
        notification_type,
        title,
        body,
        related_auction_id,
        channels_sent,
        is_read,
        is_archived,
        created_at
      ) VALUES (
        SYS_GUID(),
        :userId,
        :type,
        :title,
        :body,
        :auctionId,
        '["in_app"]',
        0,
        0,
        CURRENT_TIMESTAMP
      )`,
      {
        userId,
        type,
        title,
        body,
        auctionId
      },
      { autoCommit: true }
    );

    // Send real-time notification via Socket.IO
    if (io) {
      io.to(`user:${userId}`).emit('notification', {
        type,
        title,
        body,
        auctionId,
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error('Failed to create notification:', err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Connection close error:', err);
      }
    }
  }
}

/**
 * Check for auctions ending soon (within 5 minutes)
 * Send notifications and webhooks
 */
async function checkEndingSoonAuctions() {
  let connection;
  try {
    connection = await db.getConnection();

    // Find auctions ending in 5 minutes that haven't been notified yet
    const result = await connection.execute(
      `SELECT
        a.id,
        a.seller_id,
        a.leading_bidder_id,
        a.current_bid_egp,
        a.end_time,
        v.make,
        v.model,
        v.year_mfg
      FROM auctions a
      JOIN vehicles v ON a.vehicle_id = v.id
      WHERE a.status = 'live'
        AND a.end_time BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '5' MINUTE
        AND a.end_time > CURRENT_TIMESTAMP + INTERVAL '4' MINUTE`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    for (const auction of result.rows || []) {
      const vehicleDesc = `${auction.YEAR_MFG} ${auction.MAKE} ${auction.MODEL}`;
      
      // Notify seller
      await createNotification(
        auction.SELLER_ID,
        'auction_ended',
        'Auction Ending Soon',
        `Your auction for ${vehicleDesc} ends in 5 minutes. Current bid: EGP ${Number(auction.CURRENT_BID_EGP).toLocaleString()}`,
        auction.ID
      );

      // Notify leading bidder if exists
      if (auction.LEADING_BIDDER_ID) {
        await createNotification(
          auction.LEADING_BIDDER_ID,
          'auction_ended',
          'Auction Ending Soon',
          `The auction for ${vehicleDesc} ends in 5 minutes. You are currently leading at EGP ${Number(auction.CURRENT_BID_EGP).toLocaleString()}`,
          auction.ID
        );
      }

      // Trigger webhooks
      await webhookService.triggerWebhook('auction.ending_soon', {
        auctionId: auction.ID,
        vehicle: vehicleDesc,
        currentBid: Number(auction.CURRENT_BID_EGP),
        endTime: auction.END_TIME
      });

      // Emit Socket.IO event to auction room
      if (io) {
        io.to(`auction:${auction.ID}`).emit('auction_ending_soon', {
          auctionId: auction.ID,
          endTime: auction.END_TIME,
          minutesRemaining: 5
        });
      }
    }

    console.log(`[Scheduler] Checked ending soon auctions: ${(result.rows || []).length} found`);
  } catch (err) {
    console.error('[Scheduler] Error checking ending soon auctions:', err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Connection close error:', err);
      }
    }
  }
}

/**
 * Check for ended auctions and declare winners
 */
async function checkEndedAuctions() {
  let connection;
  try {
    connection = await db.getConnection();

    // Find auctions that have ended
    const result = await connection.execute(
      `SELECT
        a.id,
        a.seller_id,
        a.leading_bidder_id,
        a.current_bid_egp,
        a.vehicle_id,
        v.make,
        v.model,
        v.year_mfg
      FROM auctions a
      JOIN vehicles v ON a.vehicle_id = v.id
      WHERE a.status = 'live'
        AND a.end_time <= CURRENT_TIMESTAMP
      FOR UPDATE`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    for (const auction of result.rows || []) {
      const vehicleDesc = `${auction.YEAR_MFG} ${auction.MAKE} ${auction.MODEL}`;
      const winnerId = auction.LEADING_BIDDER_ID;

      // Update auction status
      await connection.execute(
        `UPDATE auctions
         SET status = 'ended',
             ended_at = CURRENT_TIMESTAMP,
             winner_id = :winnerId,
             payment_deadline = CURRENT_TIMESTAMP + INTERVAL '24' HOUR
         WHERE id = :auctionId`,
        {
          winnerId,
          auctionId: auction.ID
        },
        { autoCommit: false }
      );

      // Update vehicle status to sold if there's a winner
      if (winnerId) {
        await connection.execute(
          `UPDATE vehicles
           SET status = 'sold'
           WHERE id = :vehicleId`,
          { vehicleId: auction.VEHICLE_ID },
          { autoCommit: false }
        );
      }

      await connection.commit();

      // Notify seller
      await createNotification(
        auction.SELLER_ID,
        'auction_ended',
        'Auction Ended',
        winnerId
          ? `Your auction for ${vehicleDesc} has ended. Final bid: EGP ${Number(auction.CURRENT_BID_EGP).toLocaleString()}`
          : `Your auction for ${vehicleDesc} has ended with no bids.`,
        auction.ID
      );

      // Notify winner
      if (winnerId) {
        await createNotification(
          winnerId,
          'auction_won',
          'Congratulations! You Won',
          `You won the auction for ${vehicleDesc} at EGP ${Number(auction.CURRENT_BID_EGP).toLocaleString()}. Please complete payment within 24 hours.`,
          auction.ID
        );

        // Trigger winner webhook
        await webhookService.triggerWebhook('auction.winner_declared', {
          auctionId: auction.ID,
          winnerId,
          vehicle: vehicleDesc,
          finalBid: Number(auction.CURRENT_BID_EGP)
        }, winnerId);
      }

      // Trigger general auction ended webhook
      await webhookService.triggerWebhook('auction.ended', {
        auctionId: auction.ID,
        vehicle: vehicleDesc,
        finalBid: winnerId ? Number(auction.CURRENT_BID_EGP) : 0,
        hasWinner: Boolean(winnerId)
      });

      // Emit Socket.IO event to auction room
      if (io) {
        io.to(`auction:${auction.ID}`).emit('auction_ended', {
          auctionId: auction.ID,
          winnerId,
          finalBid: Number(auction.CURRENT_BID_EGP),
          endedAt: new Date().toISOString()
        });
      }

      console.log(`[Scheduler] Ended auction ${auction.ID}, winner: ${winnerId || 'none'}`);
    }

    console.log(`[Scheduler] Checked ended auctions: ${(result.rows || []).length} processed`);
  } catch (err) {
    console.error('[Scheduler] Error checking ended auctions:', err);
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error('Rollback error:', rollbackErr);
      }
    }
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Connection close error:', err);
      }
    }
  }
}

/**
 * Main scheduler task that runs periodically
 */
async function runScheduler() {
  console.log('[Scheduler] Running periodic check...');
  await checkEndingSoonAuctions();
  await checkEndedAuctions();
}

/**
 * Start the auction scheduler
 * Runs every 30 seconds
 */
function startScheduler(socketIo = null) {
  if (schedulerTask) {
    console.log('[Scheduler] Already running');
    return;
  }

  if (socketIo) {
    setSocketIO(socketIo);
  }

  // Run every 30 seconds
  schedulerTask = cron.schedule('*/30 * * * * *', runScheduler);

  console.log('[Scheduler] Started - checking auctions every 30 seconds');

  // Run immediately on start
  runScheduler();
}

/**
 * Stop the auction scheduler
 */
function stopScheduler() {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    console.log('[Scheduler] Stopped');
  }
}

module.exports = {
  setSocketIO,
  startScheduler,
  stopScheduler,
  checkEndingSoonAuctions,
  checkEndedAuctions,
  createNotification
};
