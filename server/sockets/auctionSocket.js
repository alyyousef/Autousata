const jwt = require('jsonwebtoken');
const bidProcessingService = require('../services/bidProcessingService');
const webhookService = require('../services/webhookService');
const auctionScheduler = require('../services/auctionScheduler');
const { checkSocketRateLimit } = require('../middleware/rateLimiter');
const { formatBidderName, obfuscateName } = require('../utils/anonymizeBidder');
const db = require('../config/db');
const oracledb = require('oracledb');

/**
 * Socket.IO Auction Handler
 * Manages real-time auction connections, bid events, and broadcasts
 */

/**
 * Authenticate socket connection
 * @param {Object} socket - Socket instance
 * @returns {Promise<Object|null>} - User object { id, role } or null
 */
async function authenticateSocket(socket) {
  let connection;
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    if (!userId) {
      console.error('Socket auth: no userId in token payload');
      return null;
    }

    // Fetch user from DB (same as HTTP auth middleware)
    connection = await db.getConnection();
    const result = await connection.execute(
      `SELECT ID, ROLE, IS_ACTIVE, IS_BANNED, FIRST_NAME, LAST_NAME FROM USERS WHERE ID = :userId`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!result.rows || result.rows.length === 0) {
      console.error('Socket auth: user not found for userId', userId);
      return null;
    }

    const user = result.rows[0];

    if (user.IS_BANNED === 'Y' || user.IS_ACTIVE === 'N') {
      console.error('Socket auth: user is banned or inactive', userId);
      return null;
    }

    return { id: user.ID, role: user.ROLE, firstName: user.FIRST_NAME || '', lastName: user.LAST_NAME || '' };
  } catch (err) {
    console.error('Socket authentication error:', err.message);
    return null;
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { /* ignore */ }
    }
  }
}

/**
 * Get auction details
 * @param {string} auctionId - Auction ID
 * @returns {Promise<Object|null>} - Auction object or null
 */
async function getAuctionDetails(auctionId) {
  let connection;
  try {
    connection = await db.getConnection();

    const result = await connection.execute(
      `SELECT
        a.id,
        a.seller_id,
        a.status,
        a.end_time,
        a.current_bid_egp,
        a.bid_count,
        a.leading_bidder_id,
        a.min_bid_increment,
        v.make,
        v.model,
        v.year_mfg
      FROM auctions a
      JOIN vehicles v ON a.vehicle_id = v.id
      WHERE a.id = :auctionId`,
      { auctionId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.ID,
      sellerId: row.SELLER_ID,
      status: row.STATUS,
      endTime: row.END_TIME,
      currentBid: Number(row.CURRENT_BID_EGP),
      bidCount: Number(row.BID_COUNT),
      leadingBidderId: row.LEADING_BIDDER_ID,
      minBidIncrement: Number(row.MIN_BID_INCREMENT),
      vehicle: {
        make: row.MAKE,
        model: row.MODEL,
        year: row.YEAR_MFG
      }
    };
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
 * Get the previous leading bidder (the one who was outbid)
 * @param {string} auctionId - Auction ID
 * @param {string} currentBidderId - The user who just placed a bid
 * @param {Object} connection - Oracle DB connection
 * @returns {Promise<string|null>} - Previous leading bidder's user ID or null
 */
async function getPreviousLeader(auctionId, currentBidderId, connection) {
  try {
    const result = await connection.execute(
      `SELECT bidder_id
       FROM bids
       WHERE auction_id = :auctionId
         AND status = 'accepted'
         AND bidder_id != :currentBidderId
       ORDER BY created_at DESC
       FETCH FIRST 1 ROW ONLY`,
      { auctionId, currentBidderId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows && result.rows.length > 0) {
      return result.rows[0].BIDDER_ID;
    }
    return null;
  } catch (err) {
    console.error('Error getting previous leader:', err);
    return null;
  }
}

/**
 * Initialize Socket.IO auction handler
 * @param {Object} io - Socket.IO server instance
 */
function initializeAuctionSocket(io) {
  io.on('connection', async (socket) => {
    console.log(`[Socket.IO] New connection: ${socket.id}`);

    // Authenticate user — reject unauthenticated connections
    const user = await authenticateSocket(socket);

    if (!user) {
      console.log(`[Socket.IO] ❌ Unauthenticated connection rejected: ${socket.id}`);
      socket.emit('auth_error', { message: 'Authentication required. Please log in.' });
      socket.disconnect(true);
      return;
    }

    socket.userId = user.id;
    socket.userRole = user.role;
    // Join user's personal room for targeted notifications (outbid, etc.)
    socket.join(`user:${user.id}`);
    console.log(`[Socket.IO] ✅ User ${user.id} authenticated (${user.role}), socket: ${socket.id}`);

    // If the user was previously in an auction room (reconnection), log it
    if (socket.currentAuctionId) {
      console.log(`[Socket.IO] User ${user.id} reconnected, previously in auction: ${socket.currentAuctionId}`);
    }

    // ===== JOIN_AUCTION Event =====
    socket.on('join_auction', async (data) => {
      const { auctionId } = data;
      const userId = socket.userId;

      console.log(`[Socket.IO] User ${userId} (${socket.id}) attempting to join auction: ${auctionId}`);

      if (!auctionId) {
        socket.emit('error', { message: 'Auction ID required' });
        return;
      }

      try {
        // Get auction details
        const auction = await getAuctionDetails(auctionId);

        if (!auction) {
          console.log(`[Socket.IO] Auction ${auctionId} not found`);
          socket.emit('error', { message: 'Auction not found' });
          return;
        }

        // Join auction room
        socket.join(`auction:${auctionId}`);
        socket.currentAuctionId = auctionId;

        const roomSize = io.sockets.adapter.rooms.get(`auction:${auctionId}`)?.size || 0;
        const roomMembers = Array.from(io.sockets.adapter.rooms.get(`auction:${auctionId}`) || []);
        console.log(`[Socket.IO] ✅ User ${userId} (${socket.id}) joined room: auction:${auctionId}`);
        console.log(`[Socket.IO] Room auction:${auctionId} now has ${roomSize} members:`, roomMembers);

        // Send current auction state
        socket.emit('auction_joined', {
          auctionId: auction.id,
          currentBid: auction.currentBid,
          bidCount: auction.bidCount,
          endTime: auction.endTime,
          status: auction.status,
          minBidIncrement: auction.minBidIncrement
        });

        console.log(`[Socket.IO] Sent auction_joined event to ${socket.id} with currentBid: ${auction.currentBid}`);

        // Get and send recent bids
        const recentBids = await bidProcessingService.getRecentBids(auctionId, 10);
        const formattedBids = recentBids.map(bid => ({
          id: bid.id,
          bidderId: bid.bidderId,
          amount: bid.amount,
          timestamp: bid.timestamp,
          displayName: formatBidderName(
            { id: bid.bidderId, firstName: bid.firstName, lastName: bid.lastName },
            userId,
            user.role,
            auction.sellerId,
            bid.bidderId === userId
          ),
          isYou: bid.bidderId === userId
        }));

        socket.emit('bid_history', { bids: formattedBids });

        console.log(`[Socket.IO] ✅ User ${userId} successfully joined auction ${auctionId}, sent ${formattedBids.length} bids`);
      } catch (err) {
        console.error(`[Socket.IO] Error joining auction:`, err);
        socket.emit('error', { message: 'Failed to join auction' });
      }
    });

    // ===== PLACE_BID Event =====
    socket.on('place_bid', async (data) => {
      const { auctionId, amount } = data;

      if (!auctionId || !amount) {
        socket.emit('bid_error', { message: 'Auction ID and amount required' });
        return;
      }

      let connection;

      try {
        // Rate limit check
        const rateLimit = checkSocketRateLimit(user.id);
        if (!rateLimit.allowed) {
          socket.emit('bid_error', {
            message: rateLimit.message,
            retryAfter: rateLimit.retryAfter
          });
          return;
        }

        // Get database connection
        connection = await db.getConnection();

        // Fetch pre-bid auction state
        const preBidAuction = await getAuctionDetails(auctionId);
        if (!preBidAuction) {
          socket.emit('bid_error', { message: 'Auction not found' });
          await connection.close();
          return;
        }

        // Process bid (validates and commits atomically)
        const result = await bidProcessingService.processBid(
            auctionId,
            user.id,
            amount,
            'manual',
            socket.handshake.address,
            connection
          );

          if (!result.success) {
            socket.emit('bid_error', { message: result.error });
            return;
          }

          // Compute new state from pre-bid + result (NO extra DB read)
          const newBidCount = preBidAuction.bidCount + 1;
          const effectiveEndTime = result.autoExtendInfo?.newEndTime || preBidAuction.endTime;
          const bidderDisplayName = obfuscateName(
            user.firstName || '', user.lastName || '', user.id
          );

          // Emit confirmation to bidder's socket (instant feedback)
          socket.emit('bid_placed', {
            bid: result.bid,
            auction: {
              currentBid: amount,
              bidCount: newBidCount,
              minBidIncrement: preBidAuction.minBidIncrement,
              endTime: effectiveEndTime,
            },
            autoExtended: result.autoExtended,
            autoExtendInfo: result.autoExtendInfo,
          });

          // Broadcast to all OTHER sockets in room (bidder already got bid_placed)
          const roomSize = io.sockets.adapter.rooms.get(`auction:${auctionId}`)?.size || 0;
          const roomMembers = Array.from(io.sockets.adapter.rooms.get(`auction:${auctionId}`) || []);
          console.log(`[Socket.IO] 📢 Broadcasting auction_updated to auction:${auctionId}`);
          console.log(`[Socket.IO] Room has ${roomSize} total members: ${roomMembers.join(', ')}`);
          console.log(`[Socket.IO] Bidder socket ${socket.id} will NOT receive broadcast (already got bid_placed)`);
          console.log(`[Socket.IO] ${roomSize - 1} other socket(s) should receive auction_updated`);

          socket.broadcast.to(`auction:${auctionId}`).emit('auction_updated', {
            auctionId,
            currentBid: amount,
            bidCount: newBidCount,
            minBidIncrement: preBidAuction.minBidIncrement,
            leadingBidderId: user.id,
            newBid: {
              id: result.bid.id,
              amount,
              timestamp: result.bid.timestamp,
              displayName: bidderDisplayName,
            },
            autoExtended: result.autoExtended,
            newEndTime: result.autoExtendInfo?.newEndTime
          });

          console.log(`[Socket.IO] ✅ Broadcast complete for auction ${auctionId}`);

          // Notify previous leader they've been outbid
          const previousLeaderId = result.bid ? await getPreviousLeader(auctionId, user.id, connection) : null;
          
          if (previousLeaderId && previousLeaderId !== user.id) {
            const vehicleDesc = preBidAuction.vehicle
              ? `${preBidAuction.vehicle.year} ${preBidAuction.vehicle.make} ${preBidAuction.vehicle.model}`
              : 'Vehicle';
            
            await auctionScheduler.createNotification(
              previousLeaderId,
              'auction_outbid',
              'You\'ve Been Outbid!',
              `Someone bid EGP ${amount.toLocaleString()} on ${vehicleDesc}. Place a higher bid to stay in the lead.`,
              auctionId
            );

            // Trigger webhook
            await webhookService.triggerWebhook('user.outbid', {
              auctionId,
              vehicle: vehicleDesc,
              newBid: amount,
              previousBid: preBidAuction.currentBid
            }, previousLeaderId);

            // Emit real-time notification to outbid user
            io.to(`user:${previousLeaderId}`).emit('user_outbid', {
              auctionId,
              newBid: amount,
              yourBid: preBidAuction.currentBid
            });
            console.log(`[Socket.IO] Emitted user_outbid to user:${previousLeaderId}`);
          }

          // Trigger bid.placed webhook
          await webhookService.triggerWebhook('bid.placed', {
            auctionId,
            bidderId: user.id,
            amount,
            timestamp: result.bid.timestamp
          });

          console.log(`[Socket.IO] Bid placed: ${auctionId} - ${amount} by ${user.id}`);

      } catch (err) {
        console.error(`[Socket.IO] Error placing bid:`, err);
        socket.emit('bid_error', { message: 'Failed to process bid' });
      } finally {
        if (connection) {
          try {
            await connection.close();
          } catch (e) {
            console.error('Connection close error:', e);
          }
        }
      }
    });

    // ===== LEAVE_AUCTION Event =====
    socket.on('leave_auction', (data) => {
      const { auctionId } = data;

      if (auctionId && socket.currentAuctionId === auctionId) {
        socket.leave(`auction:${auctionId}`);
        socket.currentAuctionId = null;
        const roomSize = io.sockets.adapter.rooms.get(`auction:${auctionId}`)?.size || 0;
        console.log(`[Socket.IO] User ${socket.userId} (${socket.id}) left auction ${auctionId}`);
        console.log(`[Socket.IO] Room auction:${auctionId} now has ${roomSize} members`);
      }
    });

    // ===== VERIFY_ROOM Event — Health check to confirm room membership =====
    socket.on('verify_room', (data) => {
      const { auctionId } = data;
      if (!auctionId) return;

      const room = io.sockets.adapter.rooms.get(`auction:${auctionId}`);
      const isInRoom = room && room.has(socket.id);
      const roomSize = room?.size || 0;

      console.log(`[Socket.IO] verify_room check: User ${socket.userId} (${socket.id}) in auction:${auctionId}? ${isInRoom} (room size: ${roomSize})`);

      socket.emit('room_verified', {
        auctionId,
        inRoom: isInRoom,
        roomSize,
        socketId: socket.id
      });

      // If not in room but should be, auto-rejoin
      if (!isInRoom && socket.currentAuctionId === auctionId) {
        console.warn(`[Socket.IO] Auto-fixing: User ${socket.userId} should be in auction:${auctionId} but isn't. Rejoining...`);
        socket.join(`auction:${auctionId}`);
      }
    });

    // ===== DISCONNECT Event =====
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] User ${socket.userId} disconnected: ${socket.id}`);
    });
  });

  console.log('[Socket.IO] Auction handler initialized');
}

module.exports = initializeAuctionSocket;
