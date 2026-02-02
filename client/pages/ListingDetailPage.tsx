import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Clock, MapPin, ShieldCheck, Tag } from 'lucide-react';
import { MOCK_AUCTIONS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

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

const formatTimeRemaining = (endTime: string) => {
  const end = new Date(endTime).getTime();
  const diff = end - Date.now();
  if (diff <= 0) return 'Ended';
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (days > 0) return `${days}d ${remainingHours}h`;
  return `${hours}h`;
};

const ListingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [delistedIds, setDelistedIds] = useState<Set<string>>(() => readDelistedIds());

  const listing = useMemo(() => MOCK_AUCTIONS.find(auction => auction.id === id), [id]);

  const canManageListings = user?.role === UserRole.SELLER || user?.role === UserRole.ADMIN || user?.role === UserRole.DEALER;

  if (!listing) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-md">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Listing not found</h1>
          <p className="text-sm text-slate-500 mb-6">The listing may have been removed or is no longer active.</p>
          <Link to="/browse" className="px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold">
            Back to browse
          </Link>
        </div>
      </div>
    );
  }

  const isDelisted = delistedIds.has(listing.id);

  const handleDelist = () => {
    const confirmed = window.confirm('Delist this vehicle from active listings?');
    if (!confirmed) return;
    setDelistedIds(prev => {
      const next = new Set(prev);
      next.add(listing.id);
      updateDelistedIds(next);
      return next;
    });
  };

  const handleRestore = () => {
    setDelistedIds(prev => {
      const next = new Set(prev);
      next.delete(listing.id);
      updateDelistedIds(next);
      return next;
    });
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/browse" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ChevronLeft size={16} />
            Back to browse
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-4">
            <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
              <img
                src={listing.vehicle.images[0]}
                alt={`${listing.vehicle.year} ${listing.vehicle.make} ${listing.vehicle.model}`}
                className="w-full h-80 object-cover"
              />
              <div className="absolute top-4 left-4 flex gap-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isDelisted ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {isDelisted ? 'Delisted' : 'Active'}
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900/70 text-white">
                  {listing.vehicle.condition}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {listing.vehicle.images.slice(0, 3).map((image, index) => (
                <div key={index} className="rounded-2xl overflow-hidden border border-slate-200">
                  <img src={image} alt="" className="w-full h-24 object-cover" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">
                {listing.vehicle.year}
              </span>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wider">
                {listing.vehicle.condition}
              </span>
              <div className="flex items-center gap-2 text-slate-500 text-sm ml-auto">
                <MapPin size={14} />
                {listing.vehicle.location}
              </div>
            </div>

            <h1 className="text-3xl font-semibold text-slate-900">
              {listing.vehicle.year} {listing.vehicle.make} {listing.vehicle.model}
            </h1>
            <p className="text-slate-500 mt-2">{listing.vehicle.description}</p>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">Mileage</p>
                <p className="text-lg font-semibold text-slate-900">{listing.vehicle.mileage.toLocaleString()} mi</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">VIN</p>
                <p className="text-lg font-semibold text-slate-900">{listing.vehicle.vin.slice(-8)}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">Current bid</p>
                <p className="text-lg font-semibold text-indigo-600">EGP {listing.currentBid.toLocaleString()}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">Bids</p>
                <p className="text-lg font-semibold text-slate-900">{listing.bidCount}</p>
              </div>
            </div>

            <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Clock size={16} />
                Time remaining: <span className="text-slate-900 font-semibold">{formatTimeRemaining(listing.endTime)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold">
                <ShieldCheck size={14} />
                Verified listing
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/browse"
                className="px-5 py-3 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                Continue browsing
              </Link>
              <Link
                to="/how-it-works"
                className="px-5 py-3 rounded-full border border-slate-200 text-slate-600 text-sm font-semibold hover:border-indigo-500 hover:text-indigo-600 transition-colors"
              >
                How it works
              </Link>
              {canManageListings && (
                <button
                  onClick={isDelisted ? handleRestore : handleDelist}
                  className={`px-5 py-3 rounded-full text-sm font-semibold transition-colors ${
                    isDelisted
                      ? 'border border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                      : 'border border-rose-200 text-rose-600 hover:bg-rose-50'
                  }`}
                >
                  {isDelisted ? 'Restore listing' : 'Delist listing'}
                </button>
              )}
            </div>

            <div className="mt-10 bg-slate-900 text-white rounded-3xl p-6">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-300">
                <Tag size={14} />
                Listing highlights
              </div>
              <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-200">
                <li>Clean title, ready for inspection</li>
                <li>Verified seller history</li>
                <li>Secure escrow supported</li>
                <li>Nationwide transport available</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingDetailPage;
