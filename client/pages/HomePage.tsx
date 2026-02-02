import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Search, ShieldCheck, SlidersHorizontal, Tag, X } from 'lucide-react';
import { MOCK_AUCTIONS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

const DELISTED_STORAGE_KEY = 'autousata:delistedListings';

const loadDelistedIds = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELISTED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
};

const saveDelistedIds = (ids: Set<string>) => {
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
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}d ${remainingHours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

type SortOption = 'relevance' | 'priceAsc' | 'priceDesc' | 'endingSoon';

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [conditionFilter, setConditionFilter] = useState('All');
  const [showDelisted, setShowDelisted] = useState(false);
  const [delistedIds, setDelistedIds] = useState<Set<string>>(() => loadDelistedIds());
  const [sortBy, setSortBy] = useState<SortOption>('relevance');

  useEffect(() => {
    saveDelistedIds(delistedIds);
  }, [delistedIds]);

  const canManageListings = user?.role === UserRole.SELLER || user?.role === UserRole.ADMIN || user?.role === UserRole.DEALER;

  const listings = useMemo(() => {
    return MOCK_AUCTIONS.map(auction => ({
      id: auction.id,
      vehicle: auction.vehicle,
      currentBid: auction.currentBid,
      bidCount: auction.bidCount,
      endTime: auction.endTime
    }));
  }, []);

  const filteredListings = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const visible = listings.filter(listing => {
      const isDelisted = delistedIds.has(listing.id);
      if (!showDelisted && isDelisted) return false;
      const matchesCondition = conditionFilter === 'All' || listing.vehicle.condition === conditionFilter;
      const matchesQuery = !query || [
        listing.vehicle.make,
        listing.vehicle.model,
        listing.vehicle.year.toString(),
        listing.vehicle.location
      ].some(value => value.toLowerCase().includes(query));
      return matchesCondition && matchesQuery;
    });

    const sorted = [...visible];
    sorted.sort((a, b) => {
      if (sortBy === 'priceAsc') {
        return a.currentBid - b.currentBid;
      }
      if (sortBy === 'priceDesc') {
        return b.currentBid - a.currentBid;
      }
      if (sortBy === 'endingSoon') {
        const aTime = new Date(a.endTime).getTime();
        const bTime = new Date(b.endTime).getTime();
        return aTime - bTime;
      }
      // relevance: keep original order
      return 0;
    });

    return sorted;
  }, [conditionFilter, delistedIds, listings, searchTerm, showDelisted, sortBy]);

  const activeCount = listings.filter(listing => !delistedIds.has(listing.id)).length;
  const delistedCount = listings.length - activeCount;

  const handleDelist = (listingId: string) => {
    const confirmed = window.confirm('Delist this vehicle from active listings?');
    if (!confirmed) return;
    setDelistedIds(prev => {
      const next = new Set(prev);
      next.add(listingId);
      return next;
    });
  };

  const handleRestore = (listingId: string) => {
    setDelistedIds(prev => {
      const next = new Set(prev);
      next.delete(listingId);
      return next;
    });
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <section className="relative bg-slate-950 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.18),_transparent_55%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-2xl relative hero-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-200 mb-4 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              BUY WITH CONFIDENCE
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold mt-2 tracking-tight">
              Buy a car from verified sellers
            </h1>
            <p className="text-slate-200/90 mt-4 text-sm md:text-base max-w-xl">
              Explore our curated inventory, compare bids, and review condition details before you commit.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-4 text-xs md:text-sm text-slate-200/90 relative">
            <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-400" />Verified sellers</div>
            <div className="flex items-center gap-2"><Tag size={16} className="text-amber-300" />Transparent pricing</div>
            <div className="flex items-center gap-2"><Clock size={16} className="text-indigo-300" />Clear time remaining</div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10">
        <div className="bg-white/95 rounded-3xl shadow-lg border border-slate-200 p-6 md:p-8 premium-card-hover backdrop-blur-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.6fr] gap-6 items-center">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by make, model, year, or location"
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                <SlidersHorizontal size={16} />
                Filters
              </div>
              <div className="flex flex-wrap gap-2">
                {['All', 'Mint', 'Excellent', 'Good', 'Fair'].map(option => (
                  <button
                    key={option}
                    onClick={() => setConditionFilter(option)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors pill-anim ${
                      conditionFilter === option
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex flex-wrap items-center gap-4 text-slate-500">
              <span>Active listings: <strong className="text-slate-900">{activeCount}</strong></span>
              <span>Delisted: <strong className="text-slate-900">{delistedCount}</strong></span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                <SlidersHorizontal size={14} />
                Sort by
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'relevance', label: 'Relevance' },
                  { id: 'priceAsc', label: 'Price ↑' },
                  { id: 'priceDesc', label: 'Price ↓' },
                  { id: 'endingSoon', label: 'Ending soon' }
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => setSortBy(option.id as SortOption)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors pill-anim ${
                      sortBy === option.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {canManageListings && (
                <button
                  onClick={() => setShowDelisted(prev => !prev)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
                >
                  {showDelisted ? 'Hide delisted' : 'Show delisted'}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {filteredListings.length === 0 ? (
          <div className="bg-white/95 border border-slate-200 rounded-2xl p-8 text-center text-slate-600 premium-card-hover">
            <p className="text-lg font-semibold text-slate-900 mb-2">No listings match your filters</p>
            <p className="text-sm">Try adjusting the search or clearing filters.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredListings.map(listing => {
              const isDelisted = delistedIds.has(listing.id);
              return (
                <div
                  key={listing.id}
                  className="bg-white/95 border border-slate-200 rounded-2xl overflow-hidden premium-card-hover backdrop-blur-sm"
                >
                  <div className="relative">
                    <img
                      src={listing.vehicle.images[0]}
                      alt={`${listing.vehicle.year} ${listing.vehicle.make} ${listing.vehicle.model}`}
                      className="h-48 w-full object-cover"
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
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {listing.vehicle.year} {listing.vehicle.make} {listing.vehicle.model}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                          <MapPin size={14} />
                          {listing.vehicle.location}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase tracking-wider">Current bid</p>
                        <p className="text-lg font-bold text-indigo-600">EGP {listing.currentBid.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <div className="flex items-center gap-2">
                        <Clock size={14} />
                        {formatTimeRemaining(listing.endTime)}
                      </div>
                      <span>{listing.bidCount} bids</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                      <span>Mileage: <strong className="text-slate-900">{listing.vehicle.mileage.toLocaleString()} km</strong></span>
                      <span>Condition: <strong className="text-slate-900">{listing.vehicle.condition}</strong></span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        to={`/listing/${listing.id}`}
                        className="flex-1 text-center px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
                      >
                        View details
                      </Link>
                      {canManageListings && (
                        <button
                          onClick={() => (isDelisted ? handleRestore(listing.id) : handleDelist(listing.id))}
                          className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                            isDelisted
                              ? 'border border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              : 'border border-rose-200 text-rose-600 hover:bg-rose-50'
                          }`}
                        >
                          {isDelisted ? 'Restore' : 'Delist'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
