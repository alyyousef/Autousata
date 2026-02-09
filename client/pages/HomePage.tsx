import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Clock, MapPin, Search, ShieldCheck, SlidersHorizontal, Tag, X, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiService } from '../services/api';
import ImageLightbox from '../components/ImageLightbox';
import CustomSelect, { CustomSelectOption } from '../components/CustomSelect';

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'year_desc';
type SearchFilter = 'all' | 'make' | 'model' | 'year' | 'location';

interface BrowseVehicle {
  _id: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  color: string;
  bodyType: string;
  transmission: string;
  fuelType: string;
  seats: number;
  condition: string;
  price: number;
  description: string;
  location: string;
  features: string[];
  images: string[];
  status: string;
  saleType: string;
  sellerName?: string;
}

const HomePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryFromUrl = searchParams.get('q') ?? '';
  const { t, formatNumber, formatCurrencyEGP } = useLanguage();

  const [searchTerm, setSearchTerm] = useState(queryFromUrl);
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('all');
  const [conditionFilter, setConditionFilter] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const [vehicles, setVehicles] = useState<BrowseVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const conditionOptions: CustomSelectOption[] = [
    { value: 'All', label: t('All', 'الكل') },
    { value: 'Excellent', label: t('Excellent', 'ممتازة') },
    { value: 'Good', label: t('Good', 'جيدة') },
    { value: 'Fair', label: t('Fair', 'مقبولة') },
    { value: 'Poor', label: t('Poor', 'ضعيفة') }
  ];
  const sortOptions: CustomSelectOption[] = [
    { value: 'newest', label: t('Newest', 'الأحدث') },
    { value: 'price_asc', label: t('Price: low to high', 'السعر من الأقل للأعلى') },
    { value: 'price_desc', label: t('Price: high to low', 'السعر من الأعلى للأقل') },
    { value: 'year_desc', label: t('Newest model year', 'أحدث سنة') }
  ];

  const conditionLabel = (condition: string) => {
    const key = condition.toLowerCase();
    if (key === 'excellent') return t('Excellent', 'ممتازة');
    if (key === 'good') return t('Good', 'جيدة');
    if (key === 'fair') return t('Fair', 'مقبولة');
    if (key === 'poor') return t('Poor', 'ضعيفة');
    return condition;
  };

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sortMap: Record<SortOption, string | undefined> = {
        newest: undefined,
        price_asc: 'price_asc',
        price_desc: 'price_desc',
        year_desc: 'year_desc',
      };
      const res = await apiService.browseVehicles({
        page,
        limit: 12,
        sort: sortMap[sortBy],
      });
      if (res.data) {
        setVehicles(res.data.vehicles);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      } else {
        setError(res.error || 'Failed to load vehicles');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [page, sortBy]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  useEffect(() => {
    setSearchTerm(queryFromUrl);
  }, [queryFromUrl]);

  // Search suggestions derived from fetched vehicles
  const searchSuggestions = useMemo(() => {
    const values = new Set<string>();
    vehicles.forEach(v => {
      if (searchFilter === 'make') values.add(v.make);
      else if (searchFilter === 'model') values.add(v.model);
      else if (searchFilter === 'year') values.add(String(v.year));
      else if (searchFilter === 'location') values.add(v.location);
      else {
        values.add(v.make);
        values.add(v.model);
        values.add(String(v.year));
        if (v.location) values.add(v.location);
      }
    });
    const query = searchTerm.trim().toLowerCase();
    const allValues = Array.from(values);
    const filtered = query
      ? allValues.filter(value => value.toLowerCase().includes(query))
      : allValues;
    const sorted = filtered.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const aStarts = query ? aLower.startsWith(query) : false;
      const bStarts = query ? bLower.startsWith(query) : false;
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return aLower.localeCompare(bLower);
    });
    return sorted.slice(0, 40);
  }, [vehicles, searchFilter, searchTerm]);

  // Client-side filtering (search + condition) on top of server-side results
  const filteredVehicles = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return vehicles.filter((v) => {
      const matchesCondition = conditionFilter === 'All' || v.condition === conditionFilter;
      const matchesQuery = !query || (() => {
        if (searchFilter === 'make') return v.make.toLowerCase().includes(query);
        if (searchFilter === 'model') return v.model.toLowerCase().includes(query);
        if (searchFilter === 'year') return v.year.toString().includes(query);
        if (searchFilter === 'location') return (v.location || '').toLowerCase().includes(query);
        return [v.make, v.model, v.year.toString(), v.location].some(val => (val || '').toLowerCase().includes(query));
      })();
      return matchesCondition && matchesQuery;
    });
  }, [vehicles, searchTerm, searchFilter, conditionFilter]);

  return (
    <>
      <div className="bg-slate-50 min-h-screen pb-20">
        {/* Hero */}
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

        {/* Search & Filters */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 relative z-30">
          <div className="bg-white/95 rounded-3xl shadow-lg border border-slate-200 p-6 md:p-8 backdrop-blur-sm relative z-30">
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
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab' && searchSuggestions.length > 0) {
                        setSearchTerm(searchSuggestions[0]);
                        e.preventDefault();
                      }
                    }}
                    list="buy-search-suggestions"
                    placeholder={t('Search by make, model, year, or location', 'ابحث بالمصنع او الموديل او السنة او الموقع')}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <datalist id="buy-search-suggestions">
              {searchSuggestions.map(value => (
                <option key={value} value={value} />
              ))}
            </datalist>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
              {[
                { value: 'all', label: t('All', 'الكل') },
                { value: 'make', label: t('Make', 'الماركة') },
                { value: 'model', label: t('Model', 'الموديل') },
                { value: 'year', label: t('Year', 'السنة') },
                { value: 'location', label: t('Location', 'الموقع') }
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSearchFilter(option.value as SearchFilter)}
                  className={`rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors ${
                    searchFilter === option.value
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-900 hover:text-slate-900'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  {t('Available', 'متاحة')}
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-emerald-800 shadow-sm">
                    {formatNumber(total)}
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
                    <CustomSelect
                      value={conditionFilter}
                      options={conditionOptions}
                      onChange={(value) => setConditionFilter(String(value))}
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400 mb-3">
                    <SlidersHorizontal size={14} />
                    {t('Sort by', 'ترتيب حسب')}
                  </label>
                  <div className="relative">
                    <CustomSelect
                      value={sortBy}
                      options={sortOptions}
                      onChange={(value) => { setSortBy(value as SortOption); setPage(1); }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Vehicle Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
          ) : error ? (
            <div className="bg-white/95 border border-rose-200 rounded-2xl p-8 text-center">
              <p className="text-lg font-semibold text-rose-700 mb-2">{t('Error loading vehicles', 'خطأ في تحميل السيارات')}</p>
              <p className="text-sm text-slate-500">{error}</p>
              <button onClick={fetchVehicles} className="mt-4 px-6 py-2 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800">
                {t('Retry', 'اعد المحاولة')}
              </button>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="bg-white/95 border border-slate-200 rounded-2xl p-8 text-center text-slate-600">
              <p className="text-lg font-semibold text-slate-900 mb-2">{t('No vehicles found', 'لا توجد سيارات')}</p>
              <p className="text-sm">{t('Try adjusting the search or clearing filters.', 'جرب تعديل البحث او مسح الفلاتر')}</p>
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredVehicles.map(vehicle => (
                  <div
                    key={vehicle._id}
                    className="bg-white/95 border border-slate-200 rounded-2xl overflow-hidden premium-card-hover backdrop-blur-sm"
                  >
                    <div className="relative">
                      {vehicle.images[0] ? (
                        <img
                          src={vehicle.images[0]}
                          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                          className="h-48 w-full object-cover cursor-zoom-in"
                          onClick={() => setLightboxSrc(vehicle.images[0])}
                        />
                      ) : (
                        <div className="h-48 w-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <Tag size={32} />
                        </div>
                      )}
                      <div className="absolute top-4 left-4 flex gap-2">
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600">
                          {t('Buy Now', 'اشترِ الان')}
                        </span>
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900/70 text-white">
                          {conditionLabel(vehicle.condition)}
                        </span>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                            <MapPin size={14} />
                            {vehicle.location || t('Egypt', 'مصر')}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 uppercase tracking-wider">{t('Price', 'السعر')}</p>
                          <p className="text-lg font-bold text-emerald-600">{formatCurrencyEGP(vehicle.price)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                        <span>{t('Mileage', 'المسافة')}: <strong className="text-slate-900">{formatNumber(vehicle.mileage)} {t('km', 'كم')}</strong></span>
                        <span>{t('Condition', 'الحالة')}: <strong className="text-slate-900">{conditionLabel(vehicle.condition)}</strong></span>
                      </div>
                      <Link
                        to={`/listing/${vehicle._id}`}
                        className="block w-full text-center px-4 py-2.5 rounded-full bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
                      >
                        {t('View & Buy', 'عرض وشراء')}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-10">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-4 py-2 rounded-full border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t('Previous', 'السابق')}
                  </button>
                  <span className="text-sm text-slate-500">
                    {t('Page', 'صفحة')} {formatNumber(page)} / {formatNumber(totalPages)}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="px-4 py-2 rounded-full border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t('Next', 'التالي')}
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
          alt="Vehicle image"
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </>
  );
};

export default HomePage;
