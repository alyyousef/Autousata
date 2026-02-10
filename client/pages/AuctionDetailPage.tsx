import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Gavel, Clock, MapPin, Share2, Heart, ShieldCheck,
  ChevronLeft, ChevronRight, Calculator, AlertCircle, Info,
  History, MessageCircle, FileText, Bell, XCircle, Wallet, Ban, ImageOff
} from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { geminiService } from '../geminiService';
import ImageLightbox from '../components/ImageLightbox';
import RealTimeBidHistory, { RealTimeBid } from '../components/RealTimeBidHistory';
import * as socketService from '../services/socketService';
import { apiService } from '../services/api';
import { handleApiError } from '../utils/errorHandler';
import { CardSkeleton, Skeleton } from '../components/LoadingSkeleton';

const MIN_BID = 50;
const RETRACTION_WINDOW_MINUTES = 5;
const CANCEL_WINDOW_MINUTES = 120;
const PLATFORM_FEE_RATE = 0.05;

type Notification = {
  id: string;
  message: string;
  time: number;
  tone: 'info' | 'warn' | 'success';
};

const AuctionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = user?.id || '';
  
  // Use ref to avoid re-registering socket listeners when userId changes
  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  const [auction, setAuction] = useState<any>(null);
  const [auctionLoading, setAuctionLoading] = useState(true);
  const [auctionError, setAuctionError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [currentBid, setCurrentBid] = useState(0);
  const [bidCount, setBidCount] = useState(0);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [minBidIncrement, setMinBidIncrement] = useState(50);
  const [proxyMax, setProxyMax] = useState<number | ''>('');
  const [bidHistory, setBidHistory] = useState<RealTimeBid[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [bidError, setBidError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'processing' | 'paid'>('unpaid');
  const [isCancelled, setIsCancelled] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [isFinancingOpen, setIsFinancingOpen] = useState(false);
  const [financeAdvice, setFinanceAdvice] = useState<any>(null);
  const [auctionEndTime, setAuctionEndTime] = useState<string>('');
  const [reservePrice, setReservePrice] = useState(0);
  const [startPrice, setStartPrice] = useState(0);
  const [auctionStatus, setAuctionStatus] = useState<string>('ACTIVE');
  const [socketConnected, setSocketConnected] = useState(false);
  const [bidJustUpdated, setBidJustUpdated] = useState(false);

  const auctionEndsAt = auctionEndTime ? new Date(auctionEndTime).getTime() : 0;
  const { addNotification: pushNotification } = useNotifications();

  // ============================================================
  // 1. FETCH AUCTION DATA FROM API
  // ============================================================
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const fetchAuction = async () => {
      setAuctionLoading(true);
      setAuctionError(null);
      try {
        const response = await apiService.getAuctionById(id);
        if (cancelled) return;

        if (response.error) {
          setAuctionError(response.error);
          return;
        }

        if (!response.data) {
          setAuctionError('Auction not found');
          return;
        }

        const data = response.data;

        const auctionData = {
          id: data._id || data.id,
          sellerId: data.sellerId,
          status: data.status,
          endTime: data.endTime,
          startPrice: data.startPrice || 0,
          reservePrice: data.reservePrice || 0,
          currentBid: data.currentBid || 0,
          bidCount: data.bidCount || 0,
          minBidIncrement: data.minBidIncrement || 50,
          vehicle: {
            id: data.vehicleId?.id || data.vehicleId?._id || '',
            make: data.vehicleId?.make || 'Unknown',
            model: data.vehicleId?.model || 'Unknown',
            year: data.vehicleId?.year || 0,
            mileage: data.vehicleId?.mileage || 0,
            vin: data.vehicleId?.vin || '',
            condition: data.vehicleId?.condition || 'Unknown',
            description: data.vehicleId?.description || 'No description available.',
            images: data.vehicleId?.images || [],
            location: data.vehicleId?.location || 'Unknown',
            features: data.vehicleId?.features || [],
          },
        };

        setAuction(auctionData);
        setCurrentBid(auctionData.currentBid);
        setBidCount(auctionData.bidCount);
        setMinBidIncrement(auctionData.minBidIncrement);
        setAuctionEndTime(auctionData.endTime);
        setReservePrice(auctionData.reservePrice);
        setStartPrice(auctionData.startPrice);
        setAuctionStatus(auctionData.status);
        setBidAmount(Math.max(auctionData.currentBid + auctionData.minBidIncrement, MIN_BID));

        if (auctionData.status === 'CANCELLED' || auctionData.status === 'ENDED') {
          setIsCancelled(true);
        }
      } catch (err) {
        if (!cancelled) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to load auction details';
          setAuctionError(errorMsg);
        }
      } finally {
        if (!cancelled) setAuctionLoading(false);
      }
    };

    fetchAuction();
    return () => { cancelled = true; };
  }, [id]);

  // ============================================================
  // 2. FETCH BID HISTORY FROM API (initial load)
  // ============================================================
  useEffect(() => {
    if (!id || !auction) return;
    let cancelled = false;

    const fetchBids = async () => {
      try {
        const response = await apiService.getAuctionBids(id, 20);
        if (cancelled) return;
        if (response.data?.bids) {
          const formattedBids: RealTimeBid[] = response.data.bids.map((b: any) => ({
            id: b.id || b._id || Math.random().toString(36).slice(2),
            bidderId: b.bidderId === currentUserId ? 'You' : (b.displayName || b.bidderId || 'Bidder'),
            amount: b.amount,
            timestamp: b.timestamp || b.createdAt,
            isYou: b.bidderId === currentUserId,
          }));
          setBidHistory(formattedBids);
        }
      } catch {
        // Bid history will come from WebSocket instead
      }
    };

    fetchBids();
    return () => { cancelled = true; };
  }, [id, auction, currentUserId]);

  // ============================================================
  // 3. FETCH FINANCE ADVICE (Gemini AI)
  // ============================================================
  useEffect(() => {
    if (!currentBid || currentBid <= 0) return;
    const fetchAdvice = async () => {
      try {
        const advice = await geminiService.getFinancingAdvice(currentBid, 'Excellent');
        setFinanceAdvice(advice);
      } catch {
        // AI advice is optional
      }
    };
    fetchAdvice();
  }, [currentBid]);

  // ============================================================
  // 4. COUNTDOWN TIMER
  // ============================================================
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // ============================================================
  // 5. CHECK PAYMENT STATUS FROM API
  // ============================================================
  useEffect(() => {
    if (!id || !auction) return;
    if (auctionStatus !== 'ENDED') return;

    const checkPayment = async () => {
      try {
        const response = await apiService.getPaymentByAuction(id);
        if (response.data?.payment) {
          const status = response.data.payment.status;
          if (status === 'completed' || status === 'escrowed') {
            setPaymentStatus('paid');
          } else if (status === 'pending' || status === 'processing') {
            setPaymentStatus('processing');
          }
        }
      } catch {
        // Payment check is optional
      }
    };

    checkPayment();
  }, [id, auction, auctionStatus]);

  // ============================================================
  // 6. SOCKET.IO — REAL-TIME AUCTION UPDATES
  // ============================================================
  useEffect(() => {
    if (!id) return;

    const socket = socketService.initializeSocket();
    setSocketConnected(socket.connected);

    socket.on('connect', () => {
      setSocketConnected(true);
      addLocalNotification('Connected to live updates', 'success');
    });
    
    socket.on('disconnect', () => {
      setSocketConnected(false);
      pushNotification(
        'Lost connection to live updates. Refresh to reconnect.',
        'error'
      );
      addLocalNotification('Connection lost. Refresh to reconnect.', 'warn');
    });

    // Join the auction room
    socketService.joinAuction(id);

    // Server sends current state on join
    const handleAuctionJoined = (data: socketService.AuctionJoinedEvent) => {
      setCurrentBid(data.currentBid);
      setBidCount(data.bidCount);
      setMinBidIncrement(data.minBidIncrement || 50);
      setAuctionEndTime(data.endTime);
      setAuctionStatus(data.status);
      setBidAmount(Math.max(data.currentBid + (data.minBidIncrement || 50), MIN_BID));
      if (data.status === 'ENDED' || data.status === 'CANCELLED') {
        setIsCancelled(true);
      }
    };

    // Server sends recent bid history on join
    const handleBidHistory = (data: { bids: any[] }) => {
      const formattedBids: RealTimeBid[] = (data.bids || []).map((b: any) => ({
        id: b.id || Math.random().toString(36).slice(2),
        bidderId: b.isYou ? 'You' : (b.displayName || 'Bidder'),
        amount: b.amount,
        timestamp: b.timestamp,
        isYou: b.isYou || false,
      }));
      setBidHistory(formattedBids);
    };

    // Bid placed confirmation (sent to bidder who placed it)
    const handleBidPlaced = (data: socketService.BidPlacedEvent) => {
      const bid = data.bid;
      if (bid) {
        const newBid: RealTimeBid = {
          id: bid.id,
          bidderId: 'You',
          amount: bid.amount,
          timestamp: bid.timestamp,
          isYou: true,
        };
        setBidHistory(prev => [newBid, ...prev]);
        addLocalNotification(
          `Your bid of EGP ${bid.amount.toLocaleString()} was placed successfully!`,
          'success'
        );

        if (data.autoExtended && data.autoExtendInfo?.newEndTime) {
          setAuctionEndTime(data.autoExtendInfo.newEndTime);
          addLocalNotification('Auction time extended due to late bid!', 'warn');
        }
      }
    };

    // Broadcast to all users in auction room
    const handleAuctionUpdated = (data: socketService.AuctionUpdate) => {
      console.log('[Real-time Update] New bid received:', {
        currentBid: data.currentBid,
        bidCount: data.bidCount,
        minBidIncrement: data.minBidIncrement
      });
      
      setCurrentBid(data.currentBid);
      setBidCount(data.bidCount);
      setMinBidIncrement(data.minBidIncrement || 50);
      setBidAmount(Math.max(data.currentBid + (data.minBidIncrement || 50), MIN_BID));
      
      // Visual feedback for bid update
      setBidJustUpdated(true);
      setTimeout(() => setBidJustUpdated(false), 2000);

      if (data.newBid) {
        const isYou = data.leadingBidderId === currentUserIdRef.current;
        const newBid: RealTimeBid = {
          id: data.newBid.id,
          bidderId: isYou ? 'You' : (data.newBid.displayName || 'Bidder'),
          amount: data.newBid.amount,
          timestamp: data.newBid.timestamp,
          isYou,
        };
        setBidHistory(prev => {
          if (prev.some(b => b.id === newBid.id)) return prev;
          return [newBid, ...prev];
        });
      }

      if (data.autoExtended && data.newEndTime) {
        setAuctionEndTime(data.newEndTime);
        addLocalNotification('Auction time extended due to late bid!', 'warn');
      }

      addLocalNotification(`New bid: EGP ${data.currentBid.toLocaleString()}`, 'info');
    };

    // User outbid notification
    const handleUserOutbid = (data: socketService.UserOutbidEvent) => {
      pushNotification(
        `You've been outbid! New leading bid: EGP ${data.newBid.toLocaleString()}`,
        'warn'
      );
      addLocalNotification(
        `You've been outbid! Your bid: EGP ${data.yourBid.toLocaleString()} → New bid: EGP ${data.newBid.toLocaleString()}`,
        'warn'
      );
    };

    // Auction ended
    const handleAuctionEnded = (data: socketService.AuctionEndedEvent) => {
      setIsCancelled(true);
      setAuctionStatus('ENDED');
      pushNotification(
        data.reserveMet
          ? `Auction ended. ${data.winnerId ? 'Winner declared!' : 'No winner.'}`
          : 'Auction ended. Reserve price not met.',
        data.reserveMet ? 'success' : 'info'
      );
      addLocalNotification('Auction has ended. Bidding is closed.', 'warn');
    };

    // Auction ending soon
    const handleAuctionEndingSoon = (data: { auctionId: string; minutesLeft: number }) => {
      addLocalNotification(
        `Auction ending in ${data.minutesLeft} minute${data.minutesLeft === 1 ? '' : 's'}!`,
        'warn'
      );
    };

    // Bid errors
    const handleBidError = (error: { message: string }) => {
      setBidError(error.message);
      addLocalNotification(error.message, 'warn');
    };

    socket.on('auction_joined', handleAuctionJoined);
    socket.on('bid_history', handleBidHistory);
    socket.on('bid_placed', handleBidPlaced);
    socket.on('auction_updated', handleAuctionUpdated);
    socketService.onUserOutbid(handleUserOutbid);
    socketService.onAuctionEnded(handleAuctionEnded);
    socketService.onAuctionEndingSoon(handleAuctionEndingSoon);
    socketService.onBidError(handleBidError);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('auction_joined', handleAuctionJoined);
      socket.off('bid_history', handleBidHistory);
      socket.off('bid_placed', handleBidPlaced);
      socket.off('auction_updated', handleAuctionUpdated);
      socketService.offUserOutbid(handleUserOutbid);
      socketService.offAuctionEnded(handleAuctionEnded);
      socketService.offAuctionEndingSoon(handleAuctionEndingSoon);
      socketService.offBidError(handleBidError);
      socketService.leaveAuction(id);
    };
  }, [id]); // Only re-register when auction ID changes - prevents stale closures (chat message pattern)

  // ==================
  // HELPERS
  // ============================================================
  const addLocalNotification = useCallback((message: string, tone: Notification['tone']) => {
    setNotifications(prev => [
      { id: Math.random().toString(36).slice(2), message, tone, time: Date.now() },
      ...prev
    ].slice(0, 5));
  }, []);

  const formatTimeRemaining = (endTime: number, nowTime: number) => {
    const diff = endTime - nowTime;
    if (diff <= 0) return 'Ended';
    const totalSeconds = Math.max(0, Math.floor(diff / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  const isAuctionEnded = now >= auctionEndsAt || auctionStatus === 'ENDED' || auctionStatus === 'CANCELLED';
  const minAllowedBid = Math.max(MIN_BID, currentBid + minBidIncrement);
  const reserveMet = currentBid >= reservePrice;
  const images: string[] = auction?.vehicle?.images?.length > 0 ? auction.vehicle.images : [];

  // ============================================================
  // BID ACTIONS
  // ============================================================
  const handlePlaceBid = () => {
    if (!user) {
      setBidError('Please log in to place a bid.');
      return;
    }
    if (isCancelled || isAuctionEnded) {
      setBidError('Bidding has ended for this auction.');
      return;
    }
    if (bidAmount < minAllowedBid) {
      setBidError(`Minimum bid is EGP ${minAllowedBid.toLocaleString()}.`);
      return;
    }
    setBidError(null);

    if (!id) {
      setBidError('Invalid auction ID.');
      return;
    }

    socketService.placeBid(id, bidAmount);
    addLocalNotification(`Placing bid of EGP ${bidAmount.toLocaleString()}...`, 'info');
  };

  const handleSetProxy = () => {
    if (!proxyMax || proxyMax < minAllowedBid) {
      setBidError(`Proxy max must be at least EGP ${minAllowedBid.toLocaleString()}.`);
      return;
    }
    setBidError(null);
    addLocalNotification(`Proxy max set to EGP ${Number(proxyMax).toLocaleString()}.`, 'success');
  };

  const handleRetractBid = () => {
    if (!auction) return;
    const lastBid = bidHistory[0];
    if (!lastBid || !lastBid.isYou) {
      setBidError('Only your most recent bid can be retracted.');
      return;
    }
    const bidTime = new Date(lastBid.timestamp).getTime();
    if (Date.now() - bidTime > RETRACTION_WINDOW_MINUTES * 60 * 1000) {
      setBidError('Your retraction window has expired.');
      return;
    }
    setBidError(null);
    setBidHistory(prev => prev.slice(1));
    addLocalNotification('Your last bid was retracted.', 'info');
  };

  const handleCancelAuction = () => {
    setIsCancelled(true);
    setAuctionStatus('CANCELLED');
    addLocalNotification('Auction cancelled by seller. Bidding is closed.', 'warn');
  };

  const handlePayment = async () => {
    if (paymentStatus === 'paid' || !id) return;
    setPaymentStatus('processing');
    try {
      const response = await apiService.createPaymentIntent(id);
      if (response.data?.clientSecret) {
        navigate(`/payment/${id}`);
      } else {
        setPaymentStatus('unpaid');
        const errorMsg = response.error || 'Failed to initiate payment.';
        addLocalNotification(errorMsg, 'warn');
        pushNotification(errorMsg, 'error');
      }
    } catch (error) {
      setPaymentStatus('unpaid');
      const errorMsg = error instanceof Error ? error.message : 'Payment initiation failed.';
      addLocalNotification(errorMsg, 'warn');
      pushNotification(errorMsg, 'error');
    }
  };

  // ============================================================
  // LOADING / ERROR STATES
  // ============================================================
  if (auctionLoading) {
    return (
      <div className="bg-slate-50 min-h-screen py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <CardSkeleton className="h-96" />
              <div className="space-y-3">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
            <div className="space-y-6">
              <CardSkeleton className="h-80" />
              <CardSkeleton className="h-64" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (auctionError || !auction) {
    return (
      <div className="bg-slate-50 min-h-screen flex flex-col justify-center items-center gap-4">
        <AlertCircle size={48} className="text-rose-500" />
        <p className="text-lg text-slate-700 font-semibold">{auctionError || 'Auction not found'}</p>
        <Link to="/auctions" className="text-indigo-600 hover:underline text-sm font-medium">Back to Auctions</Link>
      </div>
    );
  }

  const { vehicle } = auction;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <>
      <div className="bg-slate-50 min-h-screen pb-20">
        {/* Top Breadcrumb & Actions */}
        <div className="bg-white/95 border-b border-slate-200/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <Link to="/auctions" className="text-slate-500 hover:text-slate-900 flex items-center gap-1 text-sm font-medium transition-colors">
              <ChevronLeft size={16} />
              Back to Auctions
            </Link>
            <div className="flex items-center gap-3">
              <span className={`flex items-center gap-1.5 text-xs font-medium ${socketConnected ? 'text-emerald-600' : 'text-slate-400'}`}>
                <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                {socketConnected ? 'Live' : 'Connecting...'}
              </span>
              <button title="Share" className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                <Share2 size={20} />
              </button>
              <button title="Save to favorites" className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                <Heart size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ========== Main Content (Left/Center) ========== */}
            <div className="lg:col-span-2 space-y-8">

              {/* Gallery */}
              <div className="bg-white/95 rounded-2xl border border-slate-200 overflow-hidden shadow-sm premium-card-hover">
                <div className="relative aspect-video group bg-slate-100">
                  {images.length > 0 ? (
                    <img
                      src={images[currentImageIndex]}
                      className="w-full h-full object-cover cursor-zoom-in"
                      alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                      onClick={() => setLightboxSrc(images[currentImageIndex])}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <ImageOff size={48} />
                      <p className="mt-2 text-sm">No images available</p>
                    </div>
                  )}
                  {images.length > 1 && (
                    <>
                      <button
                        title="Previous image"
                        onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <button
                        title="Next image"
                        onClick={() => setCurrentImageIndex(prev => Math.min(images.length - 1, prev + 1))}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronRight size={24} />
                      </button>
                    </>
                  )}
                  <div className="absolute bottom-4 right-4 bg-slate-900/60 backdrop-blur text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                </div>
                {images.length > 1 && (
                  <div className="p-4 grid grid-cols-6 gap-3 overflow-x-auto">
                    {images.map((img: string, idx: number) => (
                      <button
                        key={idx}
                        title={`View image ${idx + 1}`}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${currentImageIndex === idx ? 'border-indigo-600' : 'border-transparent opacity-60 hover:opacity-100'}`}
                      >
                        <img
                          src={img}
                          className="w-full h-full object-cover cursor-zoom-in"
                          alt=""
                          onClick={(event) => { event.stopPropagation(); setLightboxSrc(img); }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Vehicle Info */}
              <div className="bg-white/95 rounded-2xl border border-slate-200 p-8 shadow-sm premium-card-hover">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">{vehicle.year}</span>
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wider">{vehicle.condition}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    auctionStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' :
                    auctionStatus === 'ENDED' ? 'bg-rose-50 text-rose-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {auctionStatus}
                  </span>
                  <div className="flex items-center gap-1 text-slate-400 ml-auto">
                    <MapPin size={16} />
                    <span className="text-sm capitalize">{vehicle.location}</span>
                  </div>
                </div>
                <h1 className="text-3xl font-black text-slate-900 mb-6 capitalize">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h1>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-10 pb-10 border-b border-slate-100">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Mileage</p>
                    <p className="text-lg font-bold text-slate-900">{vehicle.mileage.toLocaleString()} km</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">VIN</p>
                    <p className="text-lg font-bold text-slate-900 break-all">{vehicle.vin || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Condition</p>
                    <p className="text-lg font-bold text-slate-900">{vehicle.condition}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Location</p>
                    <p className="text-lg font-bold text-slate-900 capitalize">{vehicle.location}</p>
                  </div>
                </div>

                <div className="prose prose-slate max-w-none">
                  <h3 className="text-xl font-bold mb-4">Description</h3>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                    {vehicle.description}
                  </p>

                  {vehicle.features && vehicle.features.length > 0 && (
                    <>
                      <h3 className="text-xl font-bold mt-8 mb-4">Features</h3>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8 list-none p-0">
                        {vehicle.features.map((feature: string, idx: number) => (
                          <li key={idx} className="flex items-center gap-2 text-slate-600 text-sm capitalize">
                            <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>

              {/* Auction Details Summary */}
              <div className="bg-white/95 rounded-2xl border border-slate-200 p-8 shadow-sm premium-card-hover">
                <h3 className="text-xl font-bold mb-6">Auction Details</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Starting Price</p>
                    <p className="text-lg font-bold text-slate-900">EGP {startPrice.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Reserve Price</p>
                    <p className="text-lg font-bold text-slate-900">EGP {reservePrice.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Min Increment</p>
                    <p className="text-lg font-bold text-slate-900">EGP {minBidIncrement.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">End Time</p>
                    <p className="text-lg font-bold text-slate-900">{new Date(auctionEndTime).toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Auction ID</p>
                    <p className="text-sm font-mono font-bold text-slate-600 break-all">{auction.id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Status</p>
                    <p className={`text-lg font-bold capitalize ${auctionStatus === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-900'}`}>{auctionStatus}</p>
                  </div>
                </div>
              </div>

              {/* Seller Info */}
              <div className="bg-white/95 rounded-2xl border border-slate-200 p-8 shadow-sm premium-card-hover">
                <h3 className="text-xl font-bold mb-6">Seller Information</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <MessageCircle size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Seller ID: {auction.sellerId?.slice(-8) || 'Unknown'}</h4>
                      <p className="text-sm text-slate-500 mt-1">
                        {auction.sellerId === currentUserId ? '(You are the seller)' : 'Verified seller'}
                      </p>
                    </div>
                  </div>
                  {auction.sellerId !== currentUserId && (
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100 transition-all">
                      <MessageCircle size={18} />
                      Message Seller
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ========== Sidebar (Bidding & Finance) ========== */}
            <div className="space-y-6">

              {/* Bidding Widget */}
              <div className="bg-white/95 rounded-2xl border-2 border-indigo-600 p-6 shadow-xl premium-card-hover">
                <div className="flex justify-between items-center mb-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${
                    isAuctionEnded
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isAuctionEnded ? 'bg-rose-600' : 'bg-indigo-600 animate-pulse'}`}></span>
                    {isAuctionEnded ? 'Auction Ended' : 'Bidding Ends In'}
                  </span>
                  {!isAuctionEnded && (
                    <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                      <Clock size={16} className="text-indigo-600" />
                      {formatTimeRemaining(auctionEndsAt, now)}
                    </div>
                  )}
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-slate-500">Current Bid</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-medium">{bidCount} bid{bidCount !== 1 ? 's' : ''}</span>
                      {bidJustUpdated && (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full animate-bounce">
                          NEW
                        </span>
                      )}
                    </div>
                  </div>
                  <div 
                    key={currentBid}
                    className={`text-4xl font-black transition-all duration-300 ${
                      bidJustUpdated 
                        ? 'text-indigo-600 scale-110' 
                        : 'text-slate-900 scale-100'
                    }`}
                  >
                    EGP {currentBid.toLocaleString()}
                    {bidJustUpdated && (
                      <span className="ml-2 text-sm text-indigo-600 animate-pulse">↑</span>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-semibold ${reserveMet ? 'text-emerald-600' : 'text-amber-600'}`}>
                    <ShieldCheck size={14} />
                    {reserveMet ? 'Reserve Met' : 'Reserve Not Met'}
                  </div>
                </div>

                {!isAuctionEnded && (
                  <div className="space-y-3">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">EGP</span>
                      <input
                        type="number"
                        title="Bid amount"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(parseInt(e.target.value) || 0)}
                        className="w-full pl-14 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-bold"
                        disabled={isCancelled || !user}
                        min={minAllowedBid}
                        step={minBidIncrement}
                      />
                    </div>
                    <button
                      onClick={handlePlaceBid}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={isCancelled || !user}
                    >
                      <Gavel size={20} />
                      {user ? 'Place Your Bid' : 'Login to Bid'}
                    </button>
                    {bidError && (
                      <p className="text-[11px] text-rose-600 text-center font-semibold">{bidError}</p>
                    )}
                    <p className="text-[10px] text-slate-400 text-center uppercase tracking-wider font-medium">
                      Next min bid: <span className="text-slate-600 font-bold">EGP {minAllowedBid.toLocaleString()}</span> &bull; Increment: EGP {minBidIncrement.toLocaleString()}
                    </p>
                  </div>
                )}

                {!isAuctionEnded && user && (
                  <div className="mt-6 space-y-3">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">EGP</span>
                      <input
                        type="number"
                        value={proxyMax}
                        onChange={(e) => setProxyMax(e.target.value ? parseInt(e.target.value) : '')}
                        className="w-full pl-14 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 text-sm font-semibold"
                        placeholder="Set proxy bid maximum"
                        disabled={isCancelled}
                      />
                    </div>
                    <button
                      onClick={handleSetProxy}
                      className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={isCancelled}
                    >
                      Set Proxy Maximum
                    </button>
                    <button
                      onClick={handleRetractBid}
                      className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      disabled={isCancelled}
                    >
                      <XCircle size={16} />
                      Retract Last Bid (within {RETRACTION_WINDOW_MINUTES} min)
                    </button>
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3">
                  <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex gap-2">
                    <AlertCircle size={16} className="text-amber-600 shrink-0" />
                    <p className="text-[10px] text-amber-800 leading-normal">
                      By bidding, you agree to pay the winning amount plus a {Math.round(PLATFORM_FEE_RATE * 100)}% platform fee if successful.
                    </p>
                  </div>
                  <div className="text-[10px] text-slate-400 text-center uppercase tracking-wider font-medium">
                    Seller can cancel until {Math.round(CANCEL_WINDOW_MINUTES / 60)}h before close.
                  </div>
                </div>
              </div>

              {/* Bid History & Payment */}
              <div className="bg-white/95 rounded-2xl border border-slate-200 p-6 shadow-sm premium-card-hover">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-slate-900">Bid History & Payments</h3>
                  <div className="flex items-center gap-2 text-slate-400">
                    <History size={16} />
                    <Wallet size={16} />
                  </div>
                </div>

                <div className="space-y-5">
                  <RealTimeBidHistory
                    bids={bidHistory}
                    currentUserId={currentUserId}
                  />

                  <div className="h-px bg-slate-100" />

                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <Bell size={16} className="text-slate-400" />
                      Live Notifications
                    </div>
                    <div className="mt-2 space-y-2">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-400">No notifications yet. Live updates will appear here.</p>
                      ) : (
                        notifications.map(note => (
                          <div
                            key={note.id}
                            className={`text-xs rounded-lg px-3 py-2 ${
                              note.tone === 'success'
                                ? 'bg-emerald-50 text-emerald-700'
                                : note.tone === 'warn'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-slate-50 text-slate-600'
                            }`}
                          >
                            {note.message}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="h-px bg-slate-100" />

                  {isAuctionEnded && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                          <Wallet size={16} className="text-slate-400" />
                          Payment Status
                        </div>
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            paymentStatus === 'paid'
                              ? 'bg-emerald-50 text-emerald-700'
                              : paymentStatus === 'processing'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {paymentStatus === 'paid' ? 'Paid' : paymentStatus === 'processing' ? 'Processing' : 'Unpaid'}
                        </span>
                      </div>
                      {paymentStatus !== 'paid' && (
                        <button
                          onClick={handlePayment}
                          className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                          disabled={paymentStatus === 'processing'}
                        >
                          {paymentStatus === 'processing' ? 'Processing...' : 'Proceed to Payment'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Finance AI Widget */}
              <div className="bg-slate-950 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative premium-card-hover">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-600 rounded-full blur-3xl opacity-30"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <Calculator size={20} className="text-indigo-400" />
                    <h3 className="font-bold text-lg">AutoFinance AI</h3>
                  </div>

                  {financeAdvice ? (
                    <div className="space-y-4">
                      <p className="text-xs text-indigo-200 leading-relaxed">
                        {financeAdvice.advice || 'Based on market trends, here are estimated financing terms.'}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/10 p-3 rounded-xl">
                          <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Est. Monthly</p>
                          <p className="text-xl font-bold">EGP {financeAdvice.monthlyPayment || '--'}</p>
                        </div>
                        <div className="bg-white/10 p-3 rounded-xl">
                          <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">APR</p>
                          <p className="text-xl font-bold">{financeAdvice.apr || '--'}%</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsFinancingOpen(true)}
                        className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl transition-all"
                      >
                        Apply Now
                      </button>
                    </div>
                  ) : (
                    <div className="animate-pulse space-y-4">
                      <div className="h-4 bg-white/10 rounded w-3/4"></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-12 bg-white/10 rounded-xl"></div>
                        <div className="h-12 bg-white/10 rounded-xl"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-white/95 rounded-2xl border border-slate-200 p-4 space-y-2 premium-card-hover">
                <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                      <FileText size={18} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Inspection Report</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
                <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                      <Info size={18} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Escrow Details</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
              </div>

              {/* Seller actions — only visible to the seller */}
              {auction.sellerId === currentUserId && !isCancelled && (
                <div className="bg-white/95 rounded-2xl border border-slate-200 p-5 shadow-sm premium-card-hover">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-900">Seller Actions</h4>
                    <Ban size={16} className="text-slate-400" />
                  </div>
                  <button
                    onClick={handleCancelAuction}
                    className="w-full py-2.5 rounded-xl border border-rose-200 text-rose-600 text-sm font-semibold hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                  >
                    Cancel Auction
                  </button>
                  <p className="text-[10px] text-slate-400 mt-2">
                    Cancellation allowed until {Math.round(CANCEL_WINDOW_MINUTES / 60)}h before close.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </>
  );
};

export default AuctionDetailPage;
