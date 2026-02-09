import { io, Socket } from 'socket.io-client';

// Socket.IO client instance
let socket: Socket | null = null;

// Get authentication token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

// Initialize Socket.IO connection
export const initializeSocket = (): Socket => {
  if (socket) {
    return socket;
  }

  const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const token = getAuthToken();

  socket = io(serverUrl, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // Connection event listeners
  socket.on('connect', () => {
    console.log('[Socket.IO] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket.IO] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket.IO] Connection error:', error.message);
  });

  socket.on('error', (error) => {
    console.error('[Socket.IO] Error:', error);
  });

  return socket;
};

// Get existing socket instance
export const getSocket = (): Socket | null => {
  return socket;
};

// Disconnect socket
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[Socket.IO] Disconnected manually');
  }
};

// ===========================================
// AUCTION-SPECIFIC FUNCTIONS
// ===========================================

export interface BidData {
  id: string;
  bidderId: string;
  amount: number;
  timestamp: string;
}

export interface AuctionJoinedEvent {
  auctionId: string;
  currentBid: number;
  bidCount: number;
  endTime: string;
  status: string;
  minBidIncrement: number;
}

export interface AuctionUpdate {
  auctionId: string;
  currentBid: number;
  bidCount: number;
  leadingBidderId?: string;
  newBid?: {
    id: string;
    amount: number;
    timestamp: string;
    displayName: string;
    isYou: boolean;
  };
  autoExtended?: boolean;
  newEndTime?: string;
}

export interface BidPlacedEvent {
  bid: BidData;
  autoExtended?: boolean;
  autoExtendInfo?: { newEndTime: string };
}

export interface UserOutbidEvent {
  auctionId: string;
  newBid: number;
  yourBid: number;
}

export interface AuctionEndedEvent {
  auctionId: string;
  winnerId?: string;
  finalBid?: number;
  reserveMet: boolean;
}

// Join an auction room
export const joinAuction = (auctionId: string): void => {
  const activeSocket = socket || initializeSocket();
  activeSocket.emit('join_auction', { auctionId });
  console.log(`[Socket.IO] Joined auction: ${auctionId}`);
};

// Leave an auction room
export const leaveAuction = (auctionId: string): void => {
  if (socket) {
    socket.emit('leave_auction', { auctionId });
    console.log(`[Socket.IO] Left auction: ${auctionId}`);
  }
};

// Place a bid via Socket.IO
export const placeBid = (auctionId: string, amount: number): void => {
  if (socket) {
    socket.emit('place_bid', { auctionId, amount });
    console.log(`[Socket.IO] Placed bid: ${amount} EGP on auction ${auctionId}`);
  } else {
    console.error('[Socket.IO] Cannot place bid: Socket not connected');
  }
};

// Listen for bid placed events
export const onBidPlaced = (callback: (data: BidPlacedEvent) => void): void => {
  if (socket) {
    socket.on('bid_placed', callback);
  }
};

// Listen for auction updates
export const onAuctionUpdated = (callback: (data: AuctionUpdate) => void): void => {
  if (socket) {
    socket.on('auction_updated', callback);
  }
};

// Listen for user outbid events
export const onUserOutbid = (callback: (data: UserOutbidEvent) => void): void => {
  if (socket) {
    socket.on('user_outbid', callback);
  }
};

// Listen for auction ended events
export const onAuctionEnded = (callback: (data: AuctionEndedEvent) => void): void => {
  if (socket) {
    socket.on('auction_ended', callback);
  }
};

// Listen for auction ending soon notifications
export const onAuctionEndingSoon = (callback: (data: { auctionId: string; minutesLeft: number }) => void): void => {
  if (socket) {
    socket.on('auction_ending_soon', callback);
  }
};

// Remove event listeners
export const offBidPlaced = (callback?: (data: BidPlacedEvent) => void): void => {
  if (socket) {
    socket.off('bid_placed', callback);
  }
};

export const offAuctionUpdated = (callback?: (data: AuctionUpdate) => void): void => {
  if (socket) {
    socket.off('auction_updated', callback);
  }
};

export const offUserOutbid = (callback?: (data: UserOutbidEvent) => void): void => {
  if (socket) {
    socket.off('user_outbid', callback);
  }
};

export const offAuctionEnded = (callback?: (data: AuctionEndedEvent) => void): void => {
  if (socket) {
    socket.off('auction_ended', callback);
  }
};

export const offAuctionEndingSoon = (callback?: (data: { auctionId: string; minutesLeft: number }) => void): void => {
  if (socket) {
    socket.off('auction_ending_soon', callback);
  }
};

// ===========================================
// ERROR HANDLING
// ===========================================

export const onBidError = (callback: (error: { message: string }) => void): void => {
  if (socket) {
    socket.on('bid_error', callback);
  }
};

export const offBidError = (callback?: (error: { message: string }) => void): void => {
  if (socket) {
    socket.off('bid_error', callback);
  }
};
