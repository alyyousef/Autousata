
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Gavel, Clock, MapPin, Share2, Heart, ShieldCheck, 
  ChevronLeft, ChevronRight, Calculator, AlertCircle, Info,
  History, MessageCircle, FileText
} from 'lucide-react';
import { MOCK_AUCTIONS } from '../constants';
import { Auction } from '../types';
import { geminiService } from '../geminiService';

const AuctionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const auction = MOCK_AUCTIONS.find(a => a.id === id) || MOCK_AUCTIONS[0];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [bidAmount, setBidAmount] = useState<number>(auction.currentBid + 500);
  const [isFinancingOpen, setIsFinancingOpen] = useState(false);
  const [financeAdvice, setFinanceAdvice] = useState<any>(null);

  useEffect(() => {
    // Background fetch finance advice using Gemini
    const fetchAdvice = async () => {
      const advice = await geminiService.getFinancingAdvice(auction.currentBid, 'Excellent');
      setFinanceAdvice(advice);
    };
    fetchAdvice();
  }, [auction.currentBid]);

  const handlePlaceBid = () => {
    if (bidAmount <= auction.currentBid) {
      alert("Bid must be higher than the current bid");
      return;
    }
    alert(`Success! Your bid of EGP ${bidAmount.toLocaleString()} has been placed.`);
  };

  return (
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
                  className="w-full h-full object-cover" 
                  alt="Vehicle" 
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
                    <img src={img} className="w-full h-full object-cover" alt="" />
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
                  2d 14h 32m
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Current Bid</span>
                  <span className="text-slate-400 font-medium">{auction.bidCount} bids</span>
                </div>
                <div className="text-4xl font-black text-slate-900">EGP {auction.currentBid.toLocaleString()}</div>
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
                  />
                </div>
                <button 
                  onClick={handlePlaceBid}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <Gavel size={20} />
                  Place Your Bid
                </button>
                <p className="text-[10px] text-slate-400 text-center uppercase tracking-wider font-medium">
                  Next min bid: EGP {(auction.currentBid + 100).toLocaleString()}
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3">
                <button className="flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">
                  Buy It Now for EGP 105,000
                </button>
                <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex gap-2">
                  <AlertCircle size={16} className="text-amber-600 shrink-0" />
                  <p className="text-[10px] text-amber-800 leading-normal">
                    By bidding, you agree to pay the winning amount plus platform fees if successful.
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

          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionDetailPage;
