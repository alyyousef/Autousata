import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Tag, Trophy, ArrowRight, SlidersHorizontal } from 'lucide-react';
import { MOCK_AUCTIONS } from '../constants';

type SortOption = 'endingSoon' | 'highestBid' | 'mostBids';

const AuctionsPage: React.FC = () => {
  const [sortBy, setSortBy] = useState<SortOption>('endingSoon');
  const [now, setNow] = useState(() => Date.now());

  const sortedAuctions = useMemo(() => {
    const items = [...MOCK_AUCTIONS];

    switch (sortBy) {
      case 'highestBid':
        return items.sort((a, b) => b.currentBid - a.currentBid);
      case 'mostBids':
        return items.sort((a, b) => b.bidCount - a.bidCount);
      case 'endingSoon':
      default:
        return items.sort((a, b) => {
          const aTime = new Date(a.endTime).getTime();
          const bTime = new Date(b.endTime).getTime();
          return aTime - bTime;
        });
    }
  }, [sortBy]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const formatTimeRemaining = (endTime: string, nowTime: number) => {
    const end = new Date(endTime).getTime();
    const diff = end - nowTime;
    if (diff <= 0) return 'Ended';
    const totalSeconds = Math.max(0, Math.floor(diff / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <section className="relative bg-slate-950 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.22),_transparent_55%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-2xl mx-auto text-center hero-fade-in">
            <h1 className="text-4xl md:text-5xl font-semibold mt-2 tracking-tight">
              Auction room
            </h1>
            <p className="text-slate-200/90 mt-4 text-sm md:text-base max-w-xl mx-auto">
              Watch bids in real time and follow the most in-demand cars on the platform. Sort by ending soon,
              highest bid, or most competitive auctions.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 text-xs md:text-sm text-slate-200/90">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
                <Tag size={16} className="text-amber-300" />
                Reserve prices disclosed
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
                <Clock size={16} className="text-indigo-300" />
                Live closing timers
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
                <Trophy size={16} className="text-emerald-300" />
                Verified sellers only
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10">
        <div className="bg-white/95 rounded-3xl shadow-lg border border-slate-200 p-6 md:p-8 backdrop-blur-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <SlidersHorizontal size={18} className="text-slate-400" />
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Sort auctions by</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'endingSoon', label: 'Ending soon' },
              { id: 'highestBid', label: 'Highest bid' },
              { id: 'mostBids', label: 'Most bids' }
            ].map(option => (
              <button
                key={option.id}
                onClick={() => setSortBy(option.id as SortOption)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors pill-anim ${
                  sortBy === option.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {sortedAuctions.map((auction) => (
            <div
              key={auction.id}
              className="bg-white/95 border border-slate-200 rounded-2xl overflow-hidden premium-card-hover backdrop-blur-sm"
            >
              <div className="relative">
                <img
                  src={auction.vehicle.images[0]}
                  alt={`${auction.vehicle.year} ${auction.vehicle.make} ${auction.vehicle.model}`}
                  className="h-48 w-full object-cover"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700">
                    Live
                  </span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900/70 text-white">
                    {auction.vehicle.condition}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {auction.vehicle.year} {auction.vehicle.make} {auction.vehicle.model}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                      <MapPin size={14} />
                      {auction.vehicle.location}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Current bid</p>
                    <p className="text-lg font-bold text-indigo-600">EGP {auction.currentBid.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock size={14} />
                    {formatTimeRemaining(auction.endTime, now)}
                  </div>
                  <span>{auction.bidCount} bids</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Link
                    to={`/listing/${auction.id}`}
                    className="flex-1 text-center px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    Enter auction
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AuctionsPage;

