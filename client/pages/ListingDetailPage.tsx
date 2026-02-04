import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronLeft,
  Clock,
  MapPin,
  ShieldCheck,
  Tag,
  Gavel,
  TrendingUp,
  Eye,
  Award,
  Zap,
} from 'lucide-react';
import { MOCK_AUCTIONS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import ImageLightbox from '../components/ImageLightbox';

const DELISTED_STORAGE_KEY = 'autousata:delistedListings';

const readDelistedIds = () => {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const raw = localStorage.getItem(DELISTED_STORAGE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set<string>();
  }
};

const updateDelistedIds = (ids: Set<string>) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DELISTED_STORAGE_KEY, JSON.stringify(Array.from(ids)));
};

const formatTimeRemaining = (endTime: string, now: number) => {
  const end = new Date(endTime).getTime();
  const diff = end - now;
  if (diff <= 0) return 'Ended';
  const totalSeconds = Math.max(0, Math.floor(diff / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
};

const generateTimeStyles = (endTime: string, now: number) => {
  const end = new Date(endTime).getTime();
  const diff = end - now;
  const hours = diff / (1000 * 60 * 60);

  if (hours < 1) {
    return {
      iconText: 'text-rose-600',
      badgeBg: 'bg-rose-50 border-rose-200 text-rose-700',
    };
  }
  if (hours < 6) {
    return {
      iconText: 'text-amber-600',
      badgeBg: 'bg-amber-50 border-amber-200 text-amber-700',
    };
  }
  if (hours < 24) {
    return {
      iconText: 'text-emerald-600',
      badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    };
  }
  return {
    iconText: 'text-blue-600',
    badgeBg: 'bg-blue-50 border-blue-200 text-blue-700',
  };
};

const ListingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [delistedIds, setDelistedIds] = useState<Set<string>>(() => readDelistedIds());
  const [now, setNow] = useState(() => Date.now());
  const [isBidOpen, setIsBidOpen] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidError, setBidError] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [bidSuccess, setBidSuccess] = useState<number | null>(null);
  const [imageHover, setImageHover] = useState<number | null>(null);
  const [selectedSuggested, setSelectedSuggested] = useState<number | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingBidAmount, setPendingBidAmount] = useState<number | null>(null);

  const listing = useMemo(() => MOCK_AUCTIONS.find((auction) => auction.id === id), [id]);

  const canManageListings =
    user?.role === UserRole.SELLER || user?.role === UserRole.ADMIN || user?.role === UserRole.DEALER;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!listing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/90 backdrop-blur-sm rounded-3xl p-10 text-center shadow-2xl shadow-slate-200/50 border border-white/40">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <Zap className="w-10 h-10 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Listing Not Found</h1>
          <p className="text-slate-600 mb-8 leading-relaxed">This vehicle may have been sold or is no longer available.</p>
          <Link
            to="/browse"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40"
          >
            <ChevronLeft size={18} />
            Discover More Listings
          </Link>
        </div>
      </div>
    );
  }

  const isDelisted = delistedIds.has(listing.id);
  const timeStyles = generateTimeStyles(listing.endTime, now);

  const handleDelist = () => {
    const confirmed = window.confirm('Delist this vehicle from active listings?');
    if (!confirmed) return;
    setDelistedIds((prev) => {
      const next = new Set<string>(prev);
      next.add(listing.id);
      updateDelistedIds(next);
      return next;
    });
  };

  const handleRestore = () => {
    setDelistedIds((prev) => {
      const next = new Set<string>(prev);
      next.delete(listing.id);
      updateDelistedIds(next);
      return next;
    });
  };

  const handleBidSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(bidAmount);
    const maxAllowed = listing.currentBid * 3;
    if (!amount || Number.isNaN(amount)) {
      setBidError('Enter a valid bid amount.');
      return;
    }
    if (amount <= listing.currentBid) {
      setBidError(`Bid must be higher than EGP ${listing.currentBid.toLocaleString()}.`);
      return;
    }
    if (amount > maxAllowed) {
      setBidError(`Max bid is EGP ${maxAllowed.toLocaleString()} (3x current bid).`);
      return;
    }
    setBidError('');
    setPendingBidAmount(amount);
    setIsConfirmOpen(true);
  };

  const handleConfirmBid = () => {
    if (pendingBidAmount === null) return;
    setIsConfirmOpen(false);
    setIsBidOpen(false);
    setBidAmount('');
    setBidSuccess(pendingBidAmount);
    setPendingBidAmount(null);
    window.setTimeout(() => setBidSuccess(null), 3000);
  };

  const handleCancelConfirm = () => {
    setIsConfirmOpen(false);
    setPendingBidAmount(null);
  };

  const suggestedBids = [listing.currentBid * 1.1, listing.currentBid * 1.25, listing.currentBid * 1.5].map((amt) =>
    Math.ceil(amt / 100) * 100
  );

  return (
    <>
      {/* Background Gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 -z-10" />

      <div className="min-h-screen pb-24">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link to="/browse" className="group flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
                <div className="p-1.5 rounded-xl bg-white border border-slate-200 group-hover:border-slate-300 group-hover:shadow-sm transition-all">
                  <ChevronLeft size={16} />
                </div>
                <span className="font-medium">Back to Browse</span>
              </Link>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100 text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                  <Eye size={12} />
                  {Math.floor(Math.random() * 100) + 50} watching
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Images */}
            <div className="lg:col-span-2 space-y-6">
              {/* Main Image */}
              <div className="relative rounded-3xl overflow-hidden border border-white/40 bg-gradient-to-br from-white to-slate-50 shadow-2xl shadow-slate-200/50 group">
                <img
                  src={listing.vehicle.images[0]}
                  alt={`${listing.vehicle.year} ${listing.vehicle.make} ${listing.vehicle.model}`}
                  className="w-full h-[500px] object-cover cursor-zoom-in transition-transform duration-700 group-hover:scale-105"
                  onClick={() => setLightboxIndex(0)}
                />
                <div className="absolute top-5 left-5 flex flex-col gap-2">
                  <span
                    className={`px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider shadow-lg ${
                      isDelisted
                        ? 'bg-rose-600 text-white border border-rose-500/60'
                        : 'bg-emerald-600 text-white border border-emerald-500/60'
                    }`}
                  >
                    {isDelisted ? 'Delisted' : 'Live Auction'}
                  </span>
                  <span className="px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider shadow-lg bg-blue-600 text-white border border-blue-500/60">
                    {listing.vehicle.condition}
                  </span>
                </div>
                <div className="absolute bottom-5 right-5">
                  <button
                    onClick={() => setLightboxIndex(0)}
                    className="px-4 py-2.5 rounded-xl backdrop-blur-md bg-white/95 border border-white/70 text-slate-800 text-sm font-semibold hover:bg-white transition-all duration-300 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-slate-300/50"
                  >
                    View All Photos
                  </button>
                </div>
              </div>

              {/* Thumbnail Grid */}
              <div className="grid grid-cols-4 gap-4">
                {listing.vehicle.images.slice(0, 4).map((image, index) => (
                  <div
                    key={index}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-300 cursor-pointer ${
                      imageHover === index ? 'border-blue-500 shadow-lg shadow-blue-500/20 transform scale-105' : 'border-white hover:border-slate-200'
                    }`}
                    onMouseEnter={() => setImageHover(index)}
                    onMouseLeave={() => setImageHover(null)}
                    onClick={() => setLightboxIndex(index)}
                  >
                    <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200">
                      <img src={image} alt="" className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" />
                    </div>
                    {imageHover === index && <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Details & Bidding */}
            <div className="space-y-6">
              {/* Vehicle Title & Badges */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-sm font-semibold text-blue-700">
                    {listing.vehicle.year}
                  </span>
                  <div className="flex items-center gap-2 text-slate-600 text-sm">
                    <MapPin size={14} />
                    {listing.vehicle.location}
                  </div>
                </div>

                <h1 className="text-3xl font-bold text-slate-900 leading-tight">
                  {listing.vehicle.year} {listing.vehicle.make} {listing.vehicle.model}
                </h1>
                <p className="text-slate-600 leading-relaxed">{listing.vehicle.description}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl p-5 border border-slate-200/60 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                    <TrendingUp size={14} />
                    <span>Current Bid</span>
                  </div>
                  <div className="text-2xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text">
                    EGP {listing.currentBid.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 mt-2">{listing.bidCount} bids placed</div>
                </div>

                <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl p-5 border border-slate-200/60 shadow-sm">
                  <div className="text-slate-500 text-sm mb-1">Mileage</div>
                  <div className="text-2xl font-bold text-slate-900">
                    {listing.vehicle.mileage.toLocaleString()}
                    <span className="text-sm font-normal text-slate-500 ml-1">mi</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">Low mileage</div>
                </div>
              </div>

              {/* Unified Time + Verification + Bid (with subtle glow, no blur spam) */}
              <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
                {/* Time */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Clock size={16} className={timeStyles.iconText} />
                    <span className="text-sm font-medium">Time Remaining</span>
                  </div>
                  <span
                    className={[
                      'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold border',
                      timeStyles.badgeBg,
                    ].join(' ')}
                  >
                    {formatTimeRemaining(listing.endTime, now)}
                  </span>
                </div>

                <div className="h-px bg-slate-200/70" />

                {/* Verification */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    <span className="text-sm font-medium text-slate-700">Verified Listing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award size={14} className="text-amber-600" />
                    <span className="text-xs text-slate-600">Premium Seller</span>
                  </div>
                </div>

                {/* CTA */}
                <div className="px-5 pb-5">
                  <button
                    onClick={() => setIsBidOpen(true)}
                    className={[
                      'w-full rounded-2xl px-6 py-4',
                      'bg-emerald-600 text-white',
                      'text-base font-semibold tracking-wide',
                      'shadow-lg shadow-emerald-600/20',
                      'ring-1 ring-emerald-600/25',
                      'hover:bg-emerald-700 hover:shadow-emerald-600/30 hover:ring-emerald-600/35',
                      'active:scale-[0.99]',
                      'transition-all duration-200',
                      'flex items-center justify-center gap-3',
                      'focus:outline-none focus:ring-4 focus:ring-emerald-500/20',
                    ].join(' ')}
                  >
                    <Gavel size={18} />
                    Place your bid
                    <span className="text-white/85 text-sm font-medium">(EGP {listing.currentBid.toLocaleString()}+)</span>
                  </button>

                  <p className="text-center text-slate-700 text-sm font-semibold mt-3">
                    Join {listing.bidCount} other bidders in this auction
                  </p>
                </div>
              </div>

              {/* Additional Action Buttons */}
              {canManageListings && (
                <div className="flex gap-3">
                  <button
                    onClick={isDelisted ? handleRestore : handleDelist}
                    className={`flex-1 py-3.5 px-4 rounded-2xl text-sm font-semibold transition-all ${
                      isDelisted
                        ? 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 text-emerald-700 hover:from-emerald-100 hover:to-green-100 hover:shadow-md'
                        : 'bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 text-rose-700 hover:from-rose-100 hover:to-pink-100 hover:shadow-md'
                    }`}
                  >
                    {isDelisted ? '✨ Restore Listing' : 'Delist Listing'}
                  </button>
                  <button className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 text-slate-700 text-sm font-semibold hover:from-slate-100 hover:to-slate-200 hover:shadow-md transition-all">
                    Save
                  </button>
                </div>
              )}

              {/* Premium Highlights */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700/50 shadow-xl">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-4">
                  <Tag size={16} className="text-blue-400" />
                  Premium Features
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {['Clean Title', 'Verified Seller', 'Escrow Service', 'Nationwide Shipping'].map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-green-500" />
                      <span className="text-xs text-slate-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bid Modal */}
        {isBidOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in">
            <div
              className="absolute inset-0 bg-gradient-to-br from-slate-900/60 to-slate-950/80 backdrop-blur-lg"
              onClick={() => setIsBidOpen(false)}
            />

            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl shadow-slate-950/30 border border-white/20 overflow-hidden animate-slide-up">
              {/* Modal Header */}
              <div className="relative p-8 pb-0">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500" />
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Place Your Bid</h2>
                    <p className="text-slate-600 mt-2">Enter your offer for this premium vehicle</p>
                  </div>
                  <button onClick={() => setIsBidOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    ✕
                  </button>
                </div>

                {/* Current Bid Display */}
                <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-2xl p-6 mb-6 border border-slate-200">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-sm text-slate-500 mb-1">Current Bid</div>
                      <div className="text-2xl font-bold text-blue-600">EGP {listing.currentBid.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500 mb-1">Maximum Bid</div>
                      <div className="text-lg font-bold text-slate-900">EGP {(listing.currentBid * 3).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bid Form */}
              <div className="p-8 pt-0">
                {bidError && (
                  <div className="mb-6 rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 p-4 text-sm text-rose-700">
                    {bidError}
                  </div>
                )}

                <form onSubmit={handleBidSubmit}>
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-700 mb-3">Your Bid Amount (EGP)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500">EGP</span>
                      <input
                        type="number"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        min={listing.currentBid + 1}
                        max={listing.currentBid * 3}
                        className="w-full pl-12 pr-4 py-4 text-lg font-semibold rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none"
                        placeholder={`${listing.currentBid.toLocaleString()}`}
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2 mt-4">
                      {suggestedBids.map((suggested, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setBidAmount(suggested.toString());
                            setSelectedSuggested(suggested);
                          }}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                            selectedSuggested === suggested
                              ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300'
                              : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                        >
                          EGP {suggested.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsBidOpen(false)}
                      className="flex-1 py-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors shadow-md shadow-rose-500/30"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-4 rounded-full bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30"
                    >
                      Submit Bid
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Bid Modal */}
        {isConfirmOpen && pendingBidAmount !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md" onClick={handleCancelConfirm} />
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-slate-950/30 border border-white/20 overflow-hidden animate-slide-up">
              <div className="relative p-8">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500" />
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Confirm Your Bid</h2>
                    <p className="text-slate-600 mt-2">
                      Are you sure you want to bid{' '}
                      <span className="font-semibold text-slate-900">EGP {pendingBidAmount.toLocaleString()}</span>? This action cannot be undone.
                    </p>
                  </div>
                  <button onClick={handleCancelConfirm} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    ✕
                  </button>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCancelConfirm}
                    className="flex-1 py-3.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmBid}
                    className="flex-1 py-3.5 rounded-full bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30"
                  >
                    Confirm Bid
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Notification */}
        {bidSuccess !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md" />
            <div className="confetti-layer absolute inset-0 pointer-events-none">
              {Array.from({ length: 140 }).map((_, idx) => (
                <span
                  key={`confetti-${idx}`}
                  className="confetti-piece confetti-spray"
                  style={{
                    left: `${(idx * 100) / 140}%`,
                    animationDelay: `${idx * 10}ms`,
                    animationDuration: `${1400 + (idx % 6) * 120}ms`,
                    ['--confetti-drift' as string]: `${(idx % 2 === 0 ? 1 : -1) * (40 + (idx % 8) * 6)}px`,
                  }}
                />
              ))}
            </div>
            <div className="relative bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-2xl p-6 shadow-2xl shadow-emerald-500/30 border border-emerald-400/30 min-w-[280px] max-w-md w-full animate-slide-up">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <CheckCircle2 size={28} className="text-white" />
                </div>
                <div>
                  <div className="text-lg font-bold">Bid Placed Successfully!</div>
                  <div className="text-sm opacity-90">EGP {bidSuccess.toLocaleString()} is now live</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Sticky Bid Bar */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/85 backdrop-blur-xl lg:hidden">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <button
              onClick={() => setIsBidOpen(true)}
              className={[
                'w-full rounded-2xl px-5 py-3.5',
                'bg-emerald-600 text-white',
                'text-sm font-semibold',
                'shadow-lg shadow-emerald-600/20',
                'ring-1 ring-emerald-600/25',
                'hover:bg-emerald-700 hover:ring-emerald-600/35',
                'active:scale-[0.99]',
                'transition-all duration-200',
                'flex items-center justify-center gap-2',
                'focus:outline-none focus:ring-4 focus:ring-emerald-500/20',
              ].join(' ')}
            >
              <Gavel size={16} />
              Place bid
              <span className="text-white/85">(EGP {listing.currentBid.toLocaleString()}+)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add custom animations to global CSS */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={listing.vehicle.images}
          startIndex={lightboxIndex}
          alt={`${listing.vehicle.year} ${listing.vehicle.make} ${listing.vehicle.model}`}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
};

export default ListingDetailPage;
