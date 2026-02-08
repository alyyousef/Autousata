import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Tag, Trophy, ArrowRight, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import ImageLightbox from '../components/ImageLightbox';
import { apiService } from '../services/api';
import { Auction } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

type SortOption = 'endingSoon' | 'highestBid' | 'mostBids';

const AuctionsPage: React.FC = () => {
  const [sortBy, setSortBy] = useState<SortOption>('endingSoon');
  const [now, setNow] = useState(() => Date.now());
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { t, formatNumber, formatCurrencyEGP } = useLanguage();

  useEffect(() => {
    const fetchAuctions = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiService.getAuctions(page, 9, sortBy);
        if (response.error) {
          setError(response.error);
        } else if (response.data) {
          // Transform API data to match Auction interface
          const transformedAuctions: Auction[] = response.data.auctions.map((item: any) => ({
            id: item._id,
            vehicle: item.vehicleId, // Backend populates 'vehicleId' with the object
            sellerId: item.sellerId,
            currentBid: item.currentBid,
            startingBid: item.startPrice,
            reservePrice: item.reservePrice,
            bidCount: item.bidCount,
            endTime: item.endTime,
            status: 'ACTIVE', // Map 'live' to 'ACTIVE'
            bids: [], // Not returned in list view
            buyItNowPrice: undefined 
          }));
          setAuctions(transformedAuctions);
          setTotalPages(response.data.pagination.pages);
        }
      } catch (err) {
        setError(t('Failed to load auctions', 'فشل تحميل المزادات'));
      } finally {
        setLoading(false);
      }
    };

    fetchAuctions();
  }, [page, sortBy]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const formatTimeRemaining = (endTime: string, nowTime: number) => {
    const end = new Date(endTime).getTime();
    const diff = end - nowTime;
    if (diff <= 0) return t('Ended', 'انتهى');
    const totalSeconds = Math.max(0, Math.floor(diff / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setPage(1); // Reset to first page on sort change
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      <div className="bg-slate-50 min-h-screen pb-20">
      <section className="relative bg-slate-950 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.22),_transparent_55%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-2xl mx-auto text-center hero-fade-in">
            <h1 className="text-4xl md:text-5xl font-semibold mt-2 tracking-tight">
              {t('Auction room', 'غرفة المزاد')}
            </h1>
            <p className="text-slate-200/90 mt-4 text-sm md:text-base max-w-xl mx-auto">
              {t(
                'Watch bids in real time and follow the most in-demand cars on the platform. Sort by ending soon, highest bid, or most competitive auctions.',
                'تابع المزايدات لحظة بلحظة وشوف العربيات الأكثر طلبا. رتب حسب الأقرب انتهاء أو أعلى مزايدة أو أكتر مزايدات.'
              )}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 text-xs md:text-sm text-slate-200/90">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
                <Tag size={16} className="text-amber-300" />
                {t('Reserve prices disclosed', 'سعر الحد الأدنى معلن')}
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
                <Clock size={16} className="text-indigo-300" />
                {t('Live closing timers', 'عدادات نهاية مباشرة')}
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
                <Trophy size={16} className="text-emerald-300" />
                {t('Verified sellers only', 'باعة موثقين فقط')}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10">
        <div className="bg-white/95 rounded-3xl shadow-lg border border-slate-200 p-6 md:p-8 backdrop-blur-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <SlidersHorizontal size={18} className="text-slate-400" />
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{t('Sort auctions by', 'رتب المزادات حسب')}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'endingSoon', label: t('Ending soon', 'بينتهي قريب') },
              { id: 'highestBid', label: t('Highest bid', 'أعلى مزايدة') },
              { id: 'mostBids', label: t('Most bids', 'أكتر مزايدات') }
            ].map(option => (
              <button
                key={option.id}
                onClick={() => handleSortChange(option.id as SortOption)}
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
        {loading ? (
           <div className="flex justify-center items-center h-64">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
           </div>
        ) : error ? (
           <div className="text-center text-red-500 py-10">{error}</div>
        ) : auctions.length === 0 ? (
           <div className="text-center text-slate-500 py-10">{t('No active auctions found.', 'مفيش مزادات شغالة دلوقتي.')}</div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {auctions.map((auction) => (
                <div
                  key={auction.id}
                  className="bg-white/95 border border-slate-200 rounded-2xl overflow-hidden premium-card-hover backdrop-blur-sm"
                >
                  <div className="relative">
                    {auction.vehicle.images && auction.vehicle.images.length > 0 ? (
                        <img
                        src={auction.vehicle.images[0]}
                        alt={`${auction.vehicle.year} ${auction.vehicle.make} ${auction.vehicle.model}`}
                        className="h-48 w-full object-cover cursor-zoom-in"
                        onClick={() => setLightboxSrc(auction.vehicle.images[0])}
                        />
                    ) : (
                        <div className="h-48 w-full bg-slate-200 flex items-center justify-center text-slate-400">
                            {t('No Image', 'مفيش صورة')}
                        </div>
                    )}
                    
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700">
                        {t('Live', 'لايف')}
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
                        <p className="text-xs text-slate-400 uppercase tracking-wider">{t('Current bid', 'أعلى مزايدة')}</p>
                        <p className="text-lg font-bold text-indigo-600">{formatCurrencyEGP(auction.currentBid)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                      <div className="flex items-center gap-2">
                        <Clock size={14} />
                        {formatTimeRemaining(auction.endTime, now)}
                      </div>
                      <span>{formatNumber(auction.bidCount)} {t('bids', 'مزايدات')}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        to={`/auction/${auction.id}`}
                        className="flex-1 text-center px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-2"
                      >
                        {t('Enter auction', 'ادخل المزاد')}
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center mt-10 gap-2">
                    <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                        className="p-2 rounded-full border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="flex items-center px-4 text-sm font-medium text-slate-700">
                        {t('Page', 'صفحة')} {page} {t('of', 'من')} {totalPages}
                    </span>
                    <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                        className="p-2 rounded-full border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}
          </>
        )}
      </section>
      </div>
      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt="Auction image"
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </>
  );
};

export default AuctionsPage;
