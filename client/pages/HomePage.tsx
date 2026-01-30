
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, MapPin, Clock, Gavel, CheckCircle2 } from 'lucide-react';
import { MOCK_AUCTIONS } from '../constants';
import { Auction } from '../types';

const HomePage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'live' | 'ending' | 'newest'>('live');

  return (
    <div className="pb-20">
      {/* Hero Section */}
      <div className="relative bg-slate-900 py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img 
            src="https://picsum.photos/seed/hero/1600/900" 
            className="w-full h-full object-cover" 
            alt="Hero Background"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
              The Next Generation of <br/>
              <span className="text-indigo-500">Automotive Auctions.</span>
            </h1>
            <p className="text-xl text-slate-300 mb-10 leading-relaxed">
              Find, bid, and win exceptional vehicles from verified sellers. Secure escrow and integrated financing included.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-grow max-w-lg">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by make, model, or year..."
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white/20 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/30">
                Explore Listings
              </button>
            </div>
            <div className="mt-8 flex items-center gap-6">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <CheckCircle2 size={16} className="text-emerald-500" />
                Verified Sellers
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <CheckCircle2 size={16} className="text-emerald-500" />
                Safe Escrow
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <CheckCircle2 size={16} className="text-emerald-500" />
                Easy Financing
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center p-1 bg-slate-100 rounded-lg self-start">
              <button
                onClick={() => setActiveTab('live')}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'live' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Live Auctions
              </button>
              <button
                onClick={() => setActiveTab('ending')}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'ending' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Ending Soon
              </button>
              <button
                onClick={() => setActiveTab('newest')}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'newest' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Newest Listings
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-all">
                <SlidersHorizontal size={18} />
                Filters
              </button>
              <select className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none transition-all cursor-pointer">
                <option>Most Recent</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Ending Soonest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {MOCK_AUCTIONS.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
        
        <div className="mt-16 text-center">
          <button className="px-10 py-4 bg-white border-2 border-slate-200 hover:border-indigo-600 hover:text-indigo-600 text-slate-600 font-bold rounded-xl transition-all shadow-sm">
            View All Active Auctions
          </button>
        </div>
      </div>
    </div>
  );
};

const AuctionCard: React.FC<{ auction: Auction }> = ({ auction }) => {
  const { vehicle } = auction;
  const timeLeft = '2d 4h 12m'; // Simulated

  return (
    <Link to={`/auction/${auction.id}`} className="group bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all flex flex-col h-full">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img 
          src={vehicle.images[0]} 
          alt={vehicle.model} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-4 left-4 flex gap-2">
          <span className="px-3 py-1 bg-white/90 backdrop-blur shadow-sm rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Live Now
          </span>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-lg text-white flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-indigo-400" />
              <span className="text-xs font-semibold">{timeLeft}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Gavel size={14} className="text-indigo-400" />
              <span className="text-xs font-semibold">{auction.bidCount} bids</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-5 flex-grow flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
            <div className="flex items-center gap-1 text-slate-500 text-xs mt-1">
              <MapPin size={12} />
              {vehicle.location}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400 font-medium">Current Bid</p>
            <p className="text-lg font-black text-indigo-600">EGP {auction.currentBid.toLocaleString()}</p>
          </div>
        </div>
        
        <p className="text-sm text-slate-600 line-clamp-2 mt-2 mb-4">
          {vehicle.description}
        </p>
        
        <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
          <div className="flex gap-2">
            <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-600 uppercase tracking-tight">{vehicle.mileage.toLocaleString()} mi</span>
            <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-600 uppercase tracking-tight">{vehicle.condition}</span>
          </div>
          <span className="text-indigo-600 font-bold text-sm flex items-center gap-1">
            Bid Now <ChevronRight size={16} />
          </span>
        </div>
      </div>
    </Link>
  );
};

const ChevronRight: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);

export default HomePage;
