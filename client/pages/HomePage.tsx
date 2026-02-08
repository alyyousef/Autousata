import React, { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronDown, Clock, MapPin, Search, ShieldCheck, SlidersHorizontal, Tag, X } from 'lucide-react';
import { MOCK_AUCTIONS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import ImageLightbox from '../components/ImageLightbox';
import { useLanguage } from '../contexts/LanguageContext';

const DELISTED_STORAGE_KEY = 'AUTOUSATA:delistedListings';
const BID_STATE_KEY = 'AUTOUSATA:bidState';

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

const readBidState = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BID_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, { currentBid: number; bidCount: number }>;
    return parsed ?? null;
  } catch {
    return null;
  }
};

type SortOption = 'relevance' | 'priceAsc' | 'priceDesc' | 'endingSoon';

const HomePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryFromUrl = searchParams.get('q') ?? '';
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState(queryFromUrl);
  const [conditionFilter, setConditionFilter] = useState('All');
  const [showDelisted, setShowDelisted] = useState(false);
  const [delistedIds, setDelistedIds] = useState<Set<string>>(() => loadDelistedIds());
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [now, setNow] = useState(() => Date.now());
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const { t, isArabic, formatNumber, formatCurrencyEGP } = useLanguage();

  const formatTimeRemaining = (endTime: string) => {
    const end = new Date(endTime).getTime();
    const diff = end - now;
    if (diff <= 0) return t('Ended', 'انتهى');
    const totalSeconds = Math.max(0, Math.floor(diff / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (days > 0) {
      return isArabic
        ? `${formatNumber(days)} يوم ${formatNumber(hours)} ساعة ${formatNumber(minutes)} دقيقة`
        : `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return isArabic
        ? `${formatNumber(hours)} ساعة ${formatNumber(minutes)} دقيقة ${formatNumber(seconds)} ثانية`
        : `${hours}h ${minutes}m ${seconds}s`;
    }
    return isArabic
      ? `${formatNumber(minutes)} دقيقة ${formatNumber(seconds)} ثانية`
      : `${minutes}m ${seconds}s`;
  };

  const conditionLabel = (condition: string) => {
    const key = condition.toLowerCase();
    if (key === 'mint') return t('Mint', 'ممتازة جدا');
    if (key === 'excellent') return t('Excellent', 'ممتازة');
    if (key === 'good') return t('Good', 'جيدة');
    if (key === 'fair') return t('Fair', 'مقبولة');
    if (key === 'poor') return t('Poor', 'ضعيفة');
    return condition;
  };

  const locationLabel = (location: string) => {
    const map: Record<string, string> = {
      'Cairo, Egypt': 'القاهرة مصر',
      'Giza, Egypt': 'الجيزة مصر',
      'Alexandria, Egypt': 'الاسكندرية مصر'
    };
    return t(location, map[location] ?? location);
  };

  useEffect(() => {
    saveDelistedIds(delistedIds);
  }, [delistedIds]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setSearchTerm(queryFromUrl);
  }, [queryFromUrl]);

  const canManageListings = user?.role === UserRole.SELLER || user?.role === UserRole.ADMIN || user?.role === UserRole.DEALER;

  const listings = useMemo(() => {
    const stored = readBidState();
    return MOCK_AUCTIONS.map(auction => ({
      id: auction.id,
      vehicle: auction.vehicle,
      currentBid: stored?.[auction.id]?.currentBid ?? auction.currentBid,
      bidCount: stored?.[auction.id]?.bidCount ?? auction.bidCount,
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
      return 0;
    });

    return sorted;
  }, [conditionFilter, delistedIds, listings, searchTerm, showDelisted, sortBy]);

  const activeCount = listings.filter(listing => !delistedIds.has(listing.id)).length;
  const delistedCount = listings.length - activeCount;
  const buyerBidHistory = [
    { id: 'bh-1', vehicle: '2021 Porsche 911 Carrera', amount: 95000, status: 'Leading' },
    { id: 'bh-2', vehicle: '2022 Audi RS7', amount: 88000, status: 'Outbid' }
  ];
  const buyerNotifications = [
    'Outbid on 2022 Audi RS7. Increase your max to regain the lead.',
    'Proxy bid placed at EGP 95,000 on 2021 Porsche 911.'
  ];
  const buyerPayments = [
    { id: 'pay-1', vehicle: '2019 BMW M4 Competition', status: 'Unpaid', amount: 120000 }
  ];

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
    <>
      <div className="bg-slate-50 min-h-screen pb-20">
      <section className="relative bg-slate-950 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.18),_transparent_55%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-2xl mx-auto text-center relative hero-fade-in">
            <h1 className="text-4xl md:text-5xl font-semibold mt-2 tracking-tight">
              {t('Buy a car from verified sellers', 'اشتر سيارة من بائعين موثقين')}
            </h1>
            <p className="text-slate-200/90 mt-4 text-sm md:text-base max-w-xl">
              {t(
                'Explore our curated inventory, compare bids, and review condition details before you commit.',
                'استكشف العربيات المختارة بعناية، قارن المزايدات، وراجع تفاصيل الحالة قبل ما تقرر.'
              )}
            </p>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs md:text-sm text-slate-200/90 relative">
            <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-400" />{t('Verified sellers', 'بائعون موثقون')}</div>
            <div className="flex items-center gap-2"><Tag size={16} className="text-amber-300" />{t('Transparent pricing', 'اسعار واضحة')}</div>
            <div className="flex items-center gap-2"><Clock size={16} className="text-indigo-300" />{t('Clear time remaining', 'وقت متبق واضح')}</div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12">
        <div className="bg-white/95 rounded-3xl shadow-lg border border-slate-200 p-6 md:p-8 backdrop-blur-sm hero-panel">
          <div className="space-y-6">
            <div>
              <p className="text-sm uppercase tracking-[0.32em] text-slate-600 font-semibold mb-3 text-center">
                {t('Find your next car', 'ابحث عن سيارتك القادمة')}
              </p>
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={t('Search by make, model, year, or location', 'ابحث بالمصنع او الموديل او السنة او الموقع')}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                {t('Active listings', 'قوائم نشطة')}
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-emerald-800 shadow-sm">
                  {formatNumber(activeCount)}
                </span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
                {t('Delisted', 'قوائم موقوفة')}
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-rose-700 shadow-sm">
                  {formatNumber(delistedCount)}
                </span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div>
                <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400 mb-3">
                  <SlidersHorizontal size={14} />
                  {t('Condition', 'الحالة')}
                </label>
                <div className="relative">
                  <select
                    value={conditionFilter}
                    onChange={(event) => setConditionFilter(event.target.value)}
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {[
                      { value: 'All', label: t('All', 'الكل') },
                      { value: 'Mint', label: t('Mint', 'ممتاز جدا') },
                      { value: 'Excellent', label: t('Excellent', 'ممتاز') },
                      { value: 'Good', label: t('Good', 'جيد') },
                      { value: 'Fair', label: t('Fair', 'مقبول') }
                    ].map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400 mb-3">
                  <SlidersHorizontal size={14} />
                  {t('Sort by', 'ترتيب حسب')}
                </label>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as SortOption)}
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="relevance">{t('Relevance', 'الاكثر صلة')}</option>
                    <option value="priceAsc">{t('Price: low to high', 'السعر من الاقل للاعلى')}</option>
                    <option value="priceDesc">{t('Price: high to low', 'السعر من الاعلى للاقل')}</option>
                    <option value="endingSoon">{t('Ending soon', 'ينتهي قريبا')}</option>
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {canManageListings && (
                <button
                  onClick={() => setShowDelisted(prev => !prev)}
                  className="md:col-span-2 w-full px-4 py-2 rounded-full border border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-colors"
                >
                  {showDelisted ? t('Hide delisted', 'اخف القوائم الموقوفة') : t('Show delisted', 'اظهر القوائم الموقوفة')}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="buyer-insights-panel bg-white/95 border border-slate-200 rounded-2xl p-6 shadow-sm premium-card-hover">
          <div className="mb-5 text-center">
            <h3 className="text-lg font-semibold text-slate-900">{t('Bid history, notifications, and payments', 'سجل المزايدات والاشعارات والمدفوعات')}</h3>
          </div>
          <div className="grid gap-6 lg:grid-cols-3 text-center">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-3">{t('Bid history', 'سجل المزايدات')}</h4>
              <div className="space-y-3 text-sm">
                {buyerBidHistory.map(entry => (
                  <div key={entry.id} className="buyer-insights-item flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                    <div>
                      <p className="text-slate-800 font-semibold">{entry.vehicle}</p>
                      <span className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                        entry.status === 'Leading'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}>
                        {entry.status === 'Leading' ? t('Leading', 'متقدم') : t('Outbid', 'تم تجاوزك')}
                      </span>
                    </div>
                    <span className="buyer-insights-amount inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                      {formatCurrencyEGP(entry.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-3">{t('Outbid notifications', 'اشعارات تجاوز المزايدة')}</h4>
              <div className="space-y-3 text-sm text-slate-600">
                {buyerNotifications.map((note, index) => (
                  <div key={index} className="buyer-insights-note inline-flex w-full items-start rounded-full border border-slate-100 bg-slate-50 px-4 py-2 text-slate-700">
                    {t(note, 'اتسبقت في المزايدة. زود الحد الأقصى عشان ترجع الأول.')}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-3">{t('Payment status', 'حالة الدفع')}</h4>
              <div className="space-y-3 text-sm">
                {buyerPayments.map(payment => (
                  <div key={payment.id} className="buyer-insights-item flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                    <div>
                      <p className="text-slate-800 font-semibold">{payment.vehicle}</p>
                      <span className="mt-2 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                        {payment.status === 'Unpaid' ? t('Unpaid', 'غير مدفوع') : payment.status}
                      </span>
                    </div>
                    <span className="buyer-insights-amount inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                      {formatCurrencyEGP(payment.amount)}
                    </span>
                  </div>
                ))}
                <p className="buyer-insights-helper text-xs text-slate-400 mt-3">
                  {t(
                    'Payment methods and Stripe checkout are placeholders for API integration.',
                    'طرق الدفع وStripe دلوقتي مجرد شكل تجريبي لحد ما API يتوصل.'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {filteredListings.length === 0 ? (
          <div className="bg-white/95 border border-slate-200 rounded-2xl p-8 text-center text-slate-600 premium-card-hover">
            <p className="text-lg font-semibold text-slate-900 mb-2">{t('No listings match your filters', 'لا توجد قوائم مطابقة للفلاتر')}</p>
            <p className="text-sm">{t('Try adjusting the search or clearing filters.', 'جرب تعديل البحث او مسح الفلاتر')}</p>
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
                      className="h-48 w-full object-cover cursor-zoom-in"
                      onClick={() => setLightboxSrc(listing.vehicle.images[0])}
                    />
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isDelisted ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {isDelisted ? t('Delisted', 'موقوف') : t('Active', 'نشط')}
                      </span>
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900/70 text-white">
                        {conditionLabel(listing.vehicle.condition)}
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
                          {locationLabel(listing.vehicle.location)}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase tracking-wider">{t('Current bid', 'اعلى مزايدة')}</p>
                        <p className="text-lg font-bold text-indigo-600">{formatCurrencyEGP(listing.currentBid)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <div className="flex items-center gap-2">
                        <Clock size={14} />
                        {formatTimeRemaining(listing.endTime)}
                      </div>
                      <span>{formatNumber(listing.bidCount)} {t('bids', 'مزايدات')}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                      <span>{t('Mileage', 'المسافة')}: <strong className="text-slate-900">{formatNumber(listing.vehicle.mileage)} {t('km', 'كم')}</strong></span>
                      <span>{t('Condition', 'الحالة')}: <strong className="text-slate-900">{conditionLabel(listing.vehicle.condition)}</strong></span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        to={`/listing/${listing.id}`}
                        className="flex-1 text-center px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
                      >
                        {t('View details', 'عرض التفاصيل')}
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
                          {isDelisted ? t('Restore', 'استعادة') : t('Delist', 'ايقاف')}
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
      {lightboxSrc && (
      <ImageLightbox
        src={lightboxSrc}
        alt="Listing image"
        onClose={() => setLightboxSrc(null)}
      />
      )}
    </>
  );
};

export default HomePage;
