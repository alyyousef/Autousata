
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Gavel, Clock, MapPin, Share2, Heart, ShieldCheck, 
  ChevronLeft, ChevronRight, Calculator, AlertCircle, Info,
  History, MessageCircle, FileText, Bell, XCircle, Wallet, Ban
} from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { geminiService } from '../geminiService';
import ImageLightbox from '../components/ImageLightbox';
import CustomSelect, { CustomSelectOption } from '../components/CustomSelect';
import RealTimeBidHistory, { RealTimeBid } from '../components/RealTimeBidHistory';
import * as socketService from '../services/socketService';
import { apiService } from '../services/api';

const MIN_BID = 10000;
const MIN_INCREMENT = 500;
const RETRACTION_WINDOW_MINUTES = 5;
const CANCEL_WINDOW_MINUTES = 120;
const PLATFORM_FEE_RATE = 0.05;
const BID_STATE_KEY = 'AUTOUSATA:bidState';
const PAYMENT_NOTICE_KEY = 'AUTOUSATA:paymentNotice';
const PAYMENT_STATUS_KEY = 'AUTOUSATA:paymentStatus';

type Notification = {
  id: string;
  message: string;
  time: number;
  tone: 'info' | 'warn' | 'success';
};

const writeBidState = (auctionId: string, currentBid: number, bidCount: number) => {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(BID_STATE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, { currentBid: number; bidCount: number }>) : {};
    parsed[auctionId] = { currentBid, bidCount };
    localStorage.setItem(BID_STATE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore storage issues
  }
};

const readBidState = (auctionId: string) => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BID_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, { currentBid: number; bidCount: number }>;
    return parsed?.[auctionId] ?? null;
  } catch {
    return null;
  }
};

const readPaymentNotice = (auctionId: string) => {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(PAYMENT_NOTICE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return Boolean(parsed?.[auctionId]);
  } catch {
    return false;
  }
};

const writePaymentNotice = (auctionId: string) => {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(PAYMENT_NOTICE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    parsed[auctionId] = true;
    localStorage.setItem(PAYMENT_NOTICE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore storage issues
  }
};

const readPaymentStatus = (auctionId: string) => {
  if (typeof window === 'undefined') return 'unpaid' as const;
  try {
    const raw = localStorage.getItem(PAYMENT_STATUS_KEY);
    if (!raw) return 'unpaid' as const;
    const parsed = JSON.parse(raw) as Record<string, string>;
    return (parsed?.[auctionId] as 'paid' | 'unpaid') ?? 'unpaid';
  } catch {
    return 'unpaid' as const;
  }
};

const AuctionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [auction, setAuction] = useState<any>(null);
  const [auctionLoading, setAuctionLoading] = useState(true);
  const [auctionError, setAuctionError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [currentBid, setCurrentBid] = useState(0);
  const [bidCount, setBidCount] = useState(0);
  const [bidAmount, setBidAmount] = useState<number>(MIN_BID);
  const [minBidIncrement, setMinBidIncrement] = useState(MIN_INCREMENT);
  const [proxyMax, setProxyMax] = useState<number | ''>('');
  const [bidHistory, setBidHistory] = useState<RealTimeBid[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [bidError, setBidError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'processing' | 'paid'>('unpaid');
  const [isCancelled, setIsCancelled] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [isFinancingOpen, setIsFinancingOpen] = useState(false);
  const [financeAdvice, setFinanceAdvice] = useState<any>(null);
  const paymentMethodOptions: CustomSelectOption[] = [
    { value: 'card', label: 'Card (Stripe placeholder)' },
    { value: 'bank', label: 'Bank transfer' },
    { value: 'wallet', label: 'Wallet balance' }
  ];
  const auctionEndsAt = auction ? new Date(auction.endTime).getTime() : 0;
  const { addNotification: pushNotification } = useNotifications();

  // Fetch auction data from API
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
        } else if (response.data) {
          const data = response.data;
          // Transform API response to match expected shape
          const transformedAuction = {
            id: data._id,
            vehicle: {
              id: data.vehicleId?.id || '',
              make: data.vehicleId?.make || '',
              model: data.vehicleId?.model || '',
              year: data.vehicleId?.year || 0,
              mileage: data.vehicleId?.mileage || 0,
              vin: data.vehicleId?.vin || '',
              condition: data.vehicleId?.condition || 'Good',
              description: data.vehicleId?.description || '',
              images: data.vehicleId?.images || [],
              location: data.vehicleId?.location || '',
              features: data.vehicleId?.features || [],
            },
            sellerId: data.sellerId,
            currentBid: data.currentBid || 0,
            startingBid: data.startPrice || 0,
            reservePrice: data.reservePrice || 0,
            bidCount: data.bidCount || 0,
            minBidIncrement: data.minBidIncrement || MIN_INCREMENT,
            endTime: data.endTime,
            status: data.status,
            bids: [],
          };
          setAuction(transformedAuction);

          // Initialize bid state from stored or API data
          const stored = readBidState(transformedAuction.id);
          const initialBid = stored?.currentBid ?? transformedAuction.currentBid;
          const initialCount = stored?.bidCount ?? transformedAuction.bidCount;
          setCurrentBid(initialBid);
          setBidCount(initialCount);
          setMinBidIncrement(transformedAuction.minBidIncrement);
          setBidAmount(Math.max(initialBid + (transformedAuction.minBidIncrement || MIN_INCREMENT), MIN_BID));
          setPaymentStatus(readPaymentStatus(transformedAuction.id));
        }
      } catch (err) {
        if (!cancelled) {
          setAuctionError('Failed to load auction details');
        }
      } finally {
        if (!cancelled) setAuctionLoading(false);
      }
    };
    fetchAuction();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    // Background fetch finance advice using Gemini
    const fetchAdvice = async () => {
      const advice = await geminiService.getFinancingAdvice(currentBid, 'Excellent');
      setFinanceAdvice(advice);
    };
    fetchAdvice();
  }, [currentBid]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!auction) return;
    if (Date.now() < auctionEndsAt) return;
    if (readPaymentStatus(auction.id) === 'paid') return;
    if (readPaymentNotice(auction.id)) return;
    pushNotification(
      `Auction ended. Please complete payment for ${auction.vehicle.year} ${auction.vehicle.make} ${auction.vehicle.model}.`,
      'warn'
    );
    writePaymentNotice(auction.id);
  }, [auction, auctionEndsAt, pushNotification]);

  // Socket.IO Integration - Real-time auction updates
  useEffect(() => {
    if (!id || !auction) return;

    // Initialize Socket.IO connection
    const socket = socketService.initializeSocket();

    // Join the auction room
    socketService.joinAuction(id);

    // Listen for auction_joined — server sends current state & bid history
    const handleAuctionJoined = (data: any) => {
      setCurrentBid(data.currentBid);
      setBidCount(data.bidCount);
      setMinBidIncrement(data.minBidIncrement || MIN_INCREMENT);
      setBidAmount(Math.max(data.currentBid + (data.minBidIncrement || MIN_INCREMENT), MIN_BID));
    };

    // Listen for bid_history — server sends recent bids on join
    const handleBidHistory = (data: { bids: any[] }) => {
      const formattedBids: RealTimeBid[] = (data.bids || []).map((b: any) => ({
        id: b.id,
        bidderId: b.displayName || 'Bidder',
        amount: b.amount,
        timestamp: b.timestamp,
        isYou: b.isYou || false,
      }));
      setBidHistory(formattedBids);
    };

    // Listen for bid placed events (sent only to the bidder who placed it)
    const handleBidPlaced = (data: any) => {
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
      }
    };

    // Listen for auction_updated — broadcast to all users in auction room
    const handleAuctionUpdated = (data: any) => {
      setCurrentBid(data.currentBid);
      setBidCount(data.bidCount);
      const increment = auction.minBidIncrement || MIN_INCREMENT;
      setBidAmount(Math.max(data.currentBid + increment, MIN_BID));

      // Add the new bid to history
      if (data.newBid) {
        const userId = localStorage.getItem('userId');
        const isYou = data.leadingBidderId === userId;
        const newBid: RealTimeBid = {
          id: data.newBid.id,
          bidderId: isYou ? 'You' : (data.newBid.displayName || 'Bidder'),
          amount: data.newBid.amount,
          timestamp: data.newBid.timestamp,
          isYou,
        };
        setBidHistory(prev => [newBid, ...prev]);
      }

      // Update local storage
      writeBidState(id, data.currentBid, data.bidCount);

      // Handle auto-extension
      if (data.autoExtended && data.newEndTime) {
        setAuction((prev: any) => prev ? { ...prev, endTime: data.newEndTime } : prev);
        addLocalNotification('Auction time extended due to late bid!', 'warn');
      }

      addLocalNotification(
        `New bid: EGP ${data.currentBid.toLocaleString()}`,
        'info'
      );
    };

    // Listen for user outbid notifications
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

    // Listen for auction ended events
    const handleAuctionEnded = (data: socketService.AuctionEndedEvent) => {
      setIsCancelled(true);
      pushNotification(
        data.reserveMet 
          ? `Auction ended. ${data.winnerId ? 'Winner declared!' : 'No winner.'}` 
          : 'Auction ended. Reserve price not met.',
        data.reserveMet ? 'success' : 'info'
      );
      addLocalNotification('Auction has ended. Bidding is closed.', 'warn');
    };

    // Listen for auction ending soon notifications
    const handleAuctionEndingSoon = (data: { auctionId: string; minutesLeft: number }) => {
      addLocalNotification(
        `Auction ending in ${data.minutesLeft} minute${data.minutesLeft === 1 ? '' : 's'}!`,
        'warn'
      );
    };

    // Listen for bid errors
    const handleBidError = (error: { message: string }) => {
      setBidError(error.message);
      addLocalNotification(error.message, 'warn');
    };

    // Register event listeners
    socket.on('auction_joined', handleAuctionJoined);
    socket.on('bid_history', handleBidHistory);
    socket.on('bid_placed', handleBidPlaced);
    socket.on('auction_updated', handleAuctionUpdated);
    socketService.onUserOutbid(handleUserOutbid);
    socketService.onAuctionEnded(handleAuctionEnded);
    socketService.onAuctionEndingSoon(handleAuctionEndingSoon);
    socketService.onBidError(handleBidError);

    // Cleanup on unmount
    return () => {
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
  }, [id, auction, pushNotification]);

  const addLocalNotification = (message: string, tone: Notification['tone']) => {
    setNotifications(prev => [
      { id: Math.random().toString(36).slice(2), message, tone, time: Date.now() },
      ...prev
    ].slice(0, 5));
  };

  // Fake competitor bid simulation removed — all bids come from Socket.IO now

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

  const minAllowedBid = Math.max(MIN_BID, currentBid + minBidIncrement);

  const handlePlaceBid = () => {
    if (isCancelled) {
      setBidError('This auction has been cancelled.');
      return;
    }
    if (Date.now() >= auctionEndsAt) {
      setBidError('Bidding has ended for this auction.');
      return;
    }
    if (bidAmount < minAllowedBid) {
      setBidError(`Minimum bid is EGP ${minAllowedBid.toLocaleString()}.`);
      return;
    }
    setBidError(null);

    // Place bid via Socket.IO
    if (!id) {
      setBidError('Invalid auction ID.');
      return;
    }

    socketService.placeBid(id, bidAmount);
    
    // Optimistic UI update (will be corrected by server response)
    addLocalNotification(
      `Placing bid of EGP ${bidAmount.toLocaleString()}...`,
      'info'
    );
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
    const lastBid = bidHistory[0]; // bids are newest-first
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
    setBidHistory(prev => {
      const next = prev.slice(1);
      const previousAmount = next[0]?.amount ?? auction.currentBid;
      setCurrentBid(previousAmount);
      setBidCount(count => {
        const nextCount = Math.max(0, count - 1);
        writeBidState(auction.id, previousAmount, nextCount);
        return nextCount;
      });
      return next;
    });
    addLocalNotification('Your last bid was retracted.', 'info');
  };

  const handleCancelAuction = () => {
    setIsCancelled(true);
    addLocalNotification('Auction cancelled by seller. Bidding is closed.', 'warn');
  };

  const handlePayment = () => {
    if (paymentStatus === 'paid') return;
    setPaymentStatus('processing');
    window.setTimeout(() => {
      setPaymentStatus('paid');
      addLocalNotification('Payment confirmed. Thank you!', 'success');
    }, 1500);
  };

  // Loading / Error states
  if (auctionLoading) {
    return (
      <div className="bg-slate-50 min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
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

  return (
    <>
      <div className="bg-slate-50 min-h-screen pb-20">
      {/* Top Breadcrumb & Actions */}
      <div className="bg-white/95 border-b border-slate-200/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link to="/" className="text-slate-500 hover:text-slate-900 flex items-center gap-1 text-sm font-medium transition-colors">
            <ChevronLeft size={16} />
            Back to Marketplace
          </Link>
          <div className="flex gap-4">
            <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
              <Share2 size={20} />
            </button>
            <button className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
              <Heart size={20} />
            </button>
          </div>
        </div>
      </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
            {/* Main Content (Left/Center) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Gallery */}
              <div className="bg-white/95 rounded-2xl border border-slate-200 overflow-hidden shadow-sm premium-card-hover">
              <div className="relative aspect-video group">
                <img 
                  src={auction.vehicle.images[currentImageIndex]} 
                  className="w-full h-full object-cover cursor-zoom-in" 
                  alt="Vehicle" 
                  onClick={() => setLightboxSrc(auction.vehicle.images[currentImageIndex])}
                />
                <button 
                  onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={() => setCurrentImageIndex(prev => Math.min(auction.vehicle.images.length - 1, prev + 1))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight size={24} />
                </button>
                <div className="absolute bottom-4 right-4 bg-slate-900/60 backdrop-blur text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                  {currentImageIndex + 1} / {auction.vehicle.images.length}
                </div>
              </div>
              <div className="p-4 grid grid-cols-6 gap-3 overflow-x-auto">
                {auction.vehicle.images.map((img, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${currentImageIndex === idx ? 'border-indigo-600' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img
                      src={img}
                      className="w-full h-full object-cover cursor-zoom-in"
                      alt=""
                      onClick={(event) => {
                        event.stopPropagation();
                        setLightboxSrc(img);
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle Info */}
            <div className="bg-white/95 rounded-2xl border border-slate-200 p-8 shadow-sm premium-card-hover">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">{auction.vehicle.year}</span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wider">{auction.vehicle.condition}</span>
                <div className="flex items-center gap-1 text-slate-400 ml-auto">
                  <MapPin size={16} />
                  <span className="text-sm">{auction.vehicle.location}</span>
                </div>
              </div>
              <h1 className="text-3xl font-black text-slate-900 mb-6">{auction.vehicle.year} {auction.vehicle.make} {auction.vehicle.model}</h1>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-10 pb-10 border-b border-slate-100">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Mileage</p>
                  <p className="text-lg font-bold text-slate-900">{auction.vehicle.mileage.toLocaleString()} mi</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">VIN</p>
                  <p className="text-lg font-bold text-slate-900">{auction.vehicle.vin.slice(-8)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Engine</p>
                  <p className="text-lg font-bold text-slate-900">4.0L V8</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Trans</p>
                  <p className="text-lg font-bold text-slate-900">Automatic</p>
                </div>
              </div>

              <div className="prose prose-slate max-w-none">
                <h3 className="text-xl font-bold mb-4">Description</h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {auction.vehicle.description}
                </p>
                
                <h3 className="text-xl font-bold mt-8 mb-4">Features & Specs</h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8 list-none p-0">
                  <li className="flex items-center gap-2 text-slate-600 text-sm">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    Apple CarPlay & Android Auto
                  </li>
                  <li className="flex items-center gap-2 text-slate-600 text-sm">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    Bose Surround Sound System
                  </li>
                  <li className="flex items-center gap-2 text-slate-600 text-sm">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    Blind Spot Monitoring
                  </li>
                  <li className="flex items-center gap-2 text-slate-600 text-sm">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    Heated & Ventilated Seats
                  </li>
                </ul>
              </div>
            </div>

            {/* Seller Info & Q&A */}
            <div className="bg-white/95 rounded-2xl border border-slate-200 p-8 shadow-sm premium-card-hover">
              <h3 className="text-xl font-bold mb-6">Seller Information</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img src="https://picsum.photos/seed/seller/80/80" className="w-16 h-16 rounded-full" alt="Seller" />
                  <div>
                    <h4 className="font-bold text-slate-900">EuroAuto Sales</h4>
                    <div className="flex items-center gap-1 text-sm text-amber-500">
                      <span>★★★★★</span>
                      <span className="text-slate-400 ml-1">(4.9 • 120 sales)</span>
                    </div>
                  </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100 transition-all">
                  <MessageCircle size={18} />
                  Message Seller
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar (Bidding & Finance) */}
          <div className="space-y-6">
            {/* Bidding Widget */}
            <div className="bg-white/95 rounded-2xl border-2 border-indigo-600 p-6 shadow-xl premium-card-hover">
              <div className="flex justify-between items-center mb-6">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                  Bidding Ends In
                </span>
                <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                  <Clock size={16} className="text-indigo-600" />
                  {formatTimeRemaining(auctionEndsAt, now)}
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Current Bid</span>
                  <span className="text-slate-400 font-medium">{bidCount} bids</span>
                </div>
                <div className="text-4xl font-black text-slate-900">EGP {currentBid.toLocaleString()}</div>
                <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <ShieldCheck size={14} />
                  Reserve Met
                </div>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">EGP</span>
                  <input 
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(parseInt(e.target.value))}
                    className="w-full pl-8 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-bold"
                    disabled={isCancelled}
                  />
                </div>
                <button 
                  onClick={handlePlaceBid}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isCancelled}
                >
                  <Gavel size={20} />
                  Place Your Bid
                </button>
                {bidError && (
                  <p className="text-[11px] text-rose-600 text-center font-semibold">{bidError}</p>
                )}
                <p className="text-[10px] text-slate-400 text-center uppercase tracking-wider font-medium">
                  Next min bid: EGP {minAllowedBid.toLocaleString()} • Minimum bid: EGP {MIN_BID.toLocaleString()}
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">EGP</span>
                  <input
                    type="number"
                    value={proxyMax}
                    onChange={(e) => setProxyMax(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 text-sm font-semibold"
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

              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3">
                <button className="flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">
                  Buy It Now for EGP 105,000
                </button>
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

            <div className="bg-white/95 rounded-2xl border border-slate-200 p-6 shadow-sm premium-card-hover">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-slate-900">Bid history & payments</h3>
                <div className="flex items-center gap-2 text-slate-400">
                  <History size={16} />
                  <Wallet size={16} />
                </div>
              </div>

              <div className="space-y-5">
                {/* Real-Time Bid History Component */}
                <RealTimeBidHistory 
                  bids={bidHistory as RealTimeBid[]} 
                  currentUserId={localStorage.getItem('userId') || undefined}
                />

                <div className="h-px bg-slate-100" />

                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Bell size={16} className="text-slate-400" />
                    Outbid notifications
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

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <Wallet size={16} className="text-slate-400" />
                      Payment status
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
                  <div>
                    <label className="text-xs uppercase tracking-widest text-slate-400">Payment method</label>
                    <div className="mt-2">
                      <CustomSelect
                        value={paymentMethod}
                        options={paymentMethodOptions}
                        onChange={(value) => setPaymentMethod(String(value))}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handlePayment}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={paymentStatus === 'processing'}
                  >
                    Initiate payment
                  </button>
                  <p className="text-[10px] text-slate-400">
                    Payment methods and Stripe checkout are placeholders for API integration.
                  </p>
                </div>
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
                      {financeAdvice.advice || "Based on market trends, here are estimated terms for your credit profile."}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/10 p-3 rounded-xl">
                        <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Est. Monthly</p>
                        <p className="text-xl font-bold">EGP {financeAdvice.monthlyPayment || '1,250'}</p>
                      </div>
                      <div className="bg-white/10 p-3 rounded-xl">
                        <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">APR</p>
                        <p className="text-xl font-bold">{financeAdvice.apr || '5.4'}%</p>
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
                    <History size={18} />
                  </div>
                  <span className="text-sm font-bold text-slate-700">Bid History</span>
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

            <div className="bg-white/95 rounded-2xl border border-slate-200 p-5 shadow-sm premium-card-hover">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-900">Seller actions</h4>
                <Ban size={16} className="text-slate-400" />
              </div>
              <button
                onClick={handleCancelAuction}
                className="w-full py-2.5 rounded-xl border border-rose-200 text-rose-600 text-sm font-semibold hover:bg-rose-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={isCancelled}
              >
                Cancel auction
              </button>
              <p className="text-[10px] text-slate-400 mt-2">
                Cancellation allowed until {Math.round(CANCEL_WINDOW_MINUTES / 60)}h before close. Placeholder only.
              </p>
            </div>

          </div>
        </div>
      </div>
      </div>
      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt={`${auction.vehicle.year} ${auction.vehicle.make} ${auction.vehicle.model}`}
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </>
  );
};

export default AuctionDetailPage;
