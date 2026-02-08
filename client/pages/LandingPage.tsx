import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  Gavel,
  Truck
} from 'lucide-react';
import { fetchLandingStats, fetchLandingTeasers } from '../mockApi';
import { LandingStats, Vehicle } from '../types';
import placeholderImage from '../../assests/frontendPictures/placeHolder.jpg';
import rrTwoImage from '../../assests/carsPictures/RRTwo.jpg';
import rrOneImage from '../../assests/carsPictures/RROne.jpg';
import mcLarenImage from '../../assests/carsPictures/McLaren.avif';
import lamboOneImage from '../../assests/carsPictures/LamboOne.jpg';
import bugattiOneImage from '../../assests/carsPictures/bugattiOne.jpg';
import bmwI8Image from '../../assests/carsPictures/BmwI8.jpg';
import ferrariGif from '../../assests/carsPictures/ferrariGIF.gif';
import porscheGif from '../../assests/carsPictures/porscheGif.gif';
import { MOCK_AUCTIONS } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

const heroSlides = [
  {
    image: ferrariGif,
    headline: 'Engineered For Pure Emotion',
    headlineAr: 'مصممة لاحساس خالص',
    subhead: 'Experience iconic Ferrari motion and unmistakable performance.',
    subheadAr: 'استمتع بتجربة فيراري الايقونية واداء لا ينسى.',
    sponsor: 'Ferrari.',
    sponsorAr: 'فيراري.',
    sponsorLine: 'Race heritage, timeless design, and visceral sound.',
    sponsorLineAr: 'ارث سباقات وتصميم خالد وصوت مؤثر.'
  },
  {
    image: rrTwoImage,
    headline: 'Driving Luxury Since 1985',
    headlineAr: 'رفاهية على الطريق منذ 1985',
    subhead: 'Discover curated exotics and collector-grade vehicles with verified provenance.',
    subheadAr: 'اكتشف سيارات نادرة مختارة بعناية وباصل موثق.',
    sponsor: 'Rolls-Royce Cullinan.',
    sponsorAr: 'رولز رويس كولينان.',
    sponsorLine: 'For those who drive to feel. Pure V8 power.',
    sponsorLineAr: 'لعشاق الاحساس في القيادة. قوة V8 خالصة.'
  },
  {
    image: rrOneImage,
    headline: 'Built For Serious Collectors',
    headlineAr: 'مصممة لهواة الاقتناء الحقيقيين',
    subhead: 'Bid with confidence on concierge-verified listings and transparent auction terms.',
    subheadAr: 'زايد بثقة على سيارات موثقة وبشروط مزادات واضحة.',
    sponsor: 'Rolls-Royce Ghost.',
    sponsorAr: 'رولز رويس جوست.',
    sponsorLine: 'Track-bred precision, road-ready composure.',
    sponsorLineAr: 'دقة مستمدة من الحلبات وثبات على الطريق.'
  },
  {
    image: mcLarenImage,
    headline: 'Performance Without Compromise',
    headlineAr: 'اداء بلا تنازلات',
    subhead: 'Supercar engineering and verified listings in one premium marketplace.',
    subheadAr: 'هندسة سوبركار وسيارات موثقة في سوق فاخر واحد.',
    sponsor: 'McLaren.',
    sponsorAr: 'مكلارين.',
    sponsorLine: 'Lightweight design meets race-bred acceleration.',
    sponsorLineAr: 'تصميم خفيف وتسارع مستمد من السباقات.'
  },
  {
    image: lamboOneImage,
    headline: 'Where Icons Change Hands',
    headlineAr: 'حيث تنتقل الايقونات',
    subhead: 'Exclusive inventory built for collectors who expect excellence.',
    subheadAr: 'مخزون حصري لهواة التميز.',
    sponsor: 'Lamborghini.',
    sponsorAr: 'لامبورجيني.',
    sponsorLine: 'Bold lines, raw power, unmistakable character.',
    sponsorLineAr: 'خطوط جريئة وقوة خام وشخصية لا تخطئها العين.'
  },
  {
    image: porscheGif,
    headline: 'Precision In Every Curve',
    headlineAr: 'دقة في كل منعطف',
    subhead: 'Porsche handling, speed, and control built for drivers.',
    subheadAr: 'ثبات وسرعة وتحكم من بورشه لعشاق القيادة.',
    sponsor: 'Porsche.',
    sponsorAr: 'بورشه.',
    sponsorLine: 'Track-born confidence with everyday usability.',
    sponsorLineAr: 'ثقة مستمدة من الحلبات مع استخدام يومي سهل.'
  },
  {
    image: bugattiOneImage,
    headline: 'Extraordinary Cars, Trusted Process',
    headlineAr: 'سيارات استثنائية وخطوات موثوقة',
    subhead: 'From browsing to delivery, every step is transparent and secure.',
    subheadAr: 'من التصفح حتى التسليم، كل خطوة واضحة وامنة.',
    sponsor: 'Bugatti.',
    sponsorAr: 'بوغاتي.',
    sponsorLine: 'Engineering artistry at hypercar level.',
    sponsorLineAr: 'فن هندسي على مستوى هايبركار.'
  },
  {
    image: bmwI8Image,
    headline: 'Modern Exotics, Curated Weekly',
    headlineAr: 'سيارات مميزة حديثة تتجدد اسبوعيا',
    subhead: 'Fresh featured cars and auction-ready listings updated every week.',
    subheadAr: 'سيارات مميزة وقوائم جاهزة للمزاد تتحدث كل اسبوع.',
    sponsor: 'BMW i8.',
    sponsorAr: 'بي ام دبليو i8.',
    sponsorLine: 'Futuristic design with hybrid supercar spirit.',
    sponsorLineAr: 'تصميم مستقبلي بروح سوبركار هايبرد.'
  }
];

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState<LandingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [heroTab, setHeroTab] = useState<'buy' | 'sell'>('buy');
  const [searchTerm, setSearchTerm] = useState('');
  const { t, formatNumber, isArabic } = useLanguage();

  const loadLandingData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [statsResponse, vehicleResponse] = await Promise.all([
        fetchLandingStats(),
        fetchLandingTeasers()
      ]);
      setStats(statsResponse);
      setVehicles(vehicleResponse);
    } catch (err) {
      setError(t('We could not load the latest featured vehicles. Please try again.', 'تعذر تحميل السيارات المميزة حاليا. يرجى المحاولة مرة اخرى.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLandingData();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide(prev => (prev + 1) % heroSlides.length);
    }, 8000);
    return () => window.clearInterval(timer);
  }, []);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchTerm.trim();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    navigate(`/browse${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const currentSlide = heroSlides[activeSlide];

  const formatAvgTimeToSell = (value: string) => {
    if (!isArabic) return value;
    const match = value.match(/(\d+)/);
    if (!match) return value;
    const num = Number(match[1]);
    const arabicNumber = formatNumber(num);
    return `${arabicNumber} ايام`;
  };

  return (
    <>
      <div className="landing-serif">
        <section className="relative overflow-hidden py-6">
          <div className="max-w-[118rem] mx-auto px-2 sm:px-4 lg:px-6">
            <div className="relative overflow-hidden rounded-[36px] border border-white/10 shadow-[0_35px_80px_rgba(4,10,20,0.55)] landing-hero-shell">
              <div className="absolute inset-0">
                <img
                  key={currentSlide.image}
                  src={currentSlide.image}
                  alt={t(currentSlide.headline, currentSlide.headlineAr)}
                  className="h-full w-full object-cover scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/55 to-black/80" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_55%)]" />
              </div>

              <div className="relative z-10 px-6 md:px-14 pt-16 pb-20 text-center text-white">
                <h1 className="mt-4 text-3xl md:text-5xl font-semibold leading-tight">
                  {t(currentSlide.headline, currentSlide.headlineAr)}
                </h1>
                <p className="mt-4 text-sm md:text-lg text-white/80 max-w-2xl mx-auto">
                  {t(currentSlide.subhead, currentSlide.subheadAr)}
                </p>

                <div className="mt-8 flex flex-col items-center gap-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 p-1 backdrop-blur">
                    <button
                      type="button"
                      onClick={() => setHeroTab('buy')}
                      className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${
                        heroTab === 'buy'
                          ? 'bg-white text-slate-900'
                          : 'text-white/80 hover:text-white'
                      }`}
                    >
                      {t('Buy', 'شراء')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroTab('sell')}
                      className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${
                        heroTab === 'sell'
                          ? 'bg-white text-slate-900'
                          : 'text-white/80 hover:text-white'
                      }`}
                    >
                      {t('Sell/Trade', 'بيع/تبديل')}
                    </button>
                  </div>

                  <form
                    onSubmit={handleSearchSubmit}
                    className="hero-panel w-full max-w-3xl rounded-3xl border px-4 py-4 md:px-6 md:py-5 flex flex-col md:flex-row md:items-center gap-4"
                  >
                    <div className="hero-search flex-1 flex items-center gap-3 rounded-2xl px-4 py-2">
                      <Search size={18} />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder={t('Search for make and model', 'ابحث عن الماركة والموديل')}
                        className="hero-search-input w-full bg-transparent text-sm focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="hero-search-button px-6 py-3 rounded-2xl text-sm font-semibold transition-colors"
                    >
                      {t('Search', 'بحث')}
                    </button>
                  </form>
                </div>

                <div className="mt-12 flex flex-col md:flex-row md:items-end md:justify-between gap-8 text-left">
                  <div>
                    <h3 className="mt-2 text-2xl md:text-3xl font-semibold text-white">
                      {t(currentSlide.sponsor, currentSlide.sponsorAr)}
                    </h3>
                    <p className="mt-2 text-sm text-white/75 max-w-md">
                      {t(currentSlide.sponsorLine, currentSlide.sponsorLineAr)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {heroSlides.map((slide, index) => (
                        <button
                          key={slide.headline}
                          type="button"
                          onClick={() => setActiveSlide(index)}
                          className={`h-2.5 w-2.5 rounded-full border transition-all ${
                            activeSlide === index
                              ? 'bg-white border-white'
                              : 'bg-white/30 border-white/30 hover:bg-white/70'
                          }`}
                          aria-label={t(`Show slide ${index + 1}`, `اعرض الشريحة رقم ${index + 1}`)}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSlide(prev => (prev + 1) % heroSlides.length)}
                      className="h-10 w-10 rounded-full border border-white/40 text-white flex items-center justify-center hover:bg-white/10 transition-colors"
                      aria-label={t('Next slide', 'الشريحة التالية')}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-texture section-divider border-y border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
              <div>
                <p className="section-eyebrow">{t('Market snapshot', 'لمحة من السوق')}</p>
                <h2 className="section-title">{t('Marketplace signals', 'مؤشرات السوق')}</h2>
                <p className="section-subtitle max-w-xl">
                  {t(
                    'Weekly activity trends across bids, listings, and sell-through velocity.',
                    'اتجاهات أسبوعية للمزايدات والقوائم وسرعة البيع.'
                  )}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/browse"
                    className="market-cta-primary inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-colors"
                  >
                    {t('Explore inventory', 'استكشف السيارات')}
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    to="/sell"
                    className="market-cta-secondary inline-flex items-center gap-2 px-5 py-2 rounded-full border text-sm font-semibold transition-colors"
                  >
                    {t('List your car', 'اعرض سيارتك')}
                  </Link>
                </div>
              </div>
              <div className="value-card rounded-3xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{t('Updated weekly', 'يتم التحديث اسبوعيا')}</p>
                    <p className="text-lg font-semibold">{t('Market snapshot', 'لمحة من السوق')}</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {stats ? (
                    <>
                      <StatCard label={t('Active listings', 'قوائم نشطة')} value={formatNumber(stats.activeListings)} />
                      <StatCard label={t('AVERAGE time to sell', 'متوسط وقت البيع')} value={formatAvgTimeToSell(stats.avgTimeToSell)} />
                      <StatCard label={t('Escrow protected', 'حماية الاسكرو')} value={stats.escrowProtected} />
                      <StatCard label={t('Qualified buyers', 'مشترون مؤهلون')} value={formatNumber(86)} />
                    </>
                  ) : (
                    Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={`stat-skeleton-${index}`}
                        className="bg-white/10 border border-white/15 rounded-2xl p-4 animate-pulse"
                      >
                        <div className="h-5 w-20 bg-white/20 rounded mb-3"></div>
                        <div className="h-3 w-24 bg-white/20 rounded"></div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-texture section-divider border-y border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
              <div className="text-center mx-auto">
                <p className="section-eyebrow">{t('Trending now', 'الاكثر تداولا')}</p>
                <h2 className="section-title">{t('Vehicles trending this week', 'السيارات الاكثر تداولا هذا الاسبوع')}</h2>
                <p className="section-subtitle max-w-2xl mx-auto">
                  {t(
                    'High-interest listings with verified condition reports and active bids.',
                    'قوائم عليها طلب عالي بتقارير حالة موثقة ومزايدات شغالة.'
                  )}
                </p>
              </div>
              <Link to="/browse" className="market-link text-sm font-semibold inline-flex items-center gap-2">
                {t('Browse all listings', 'تصفح جميع القوائم')}
                <ArrowRight size={16} />
              </Link>
            </div>

            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={`vehicle-skeleton-${index}`} className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-pulse">
                    <div className="h-48 bg-slate-200"></div>
                    <div className="p-5 space-y-3">
                      <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-white border border-rose-200 rounded-2xl p-6 text-slate-700">
                <p className="text-sm text-rose-600 font-semibold mb-2">{t('Unable to load featured vehicles', 'تعذر تحميل السيارات المميزة')}</p>
                <p className="text-sm text-slate-600 mb-4">{error}</p>
                <button
                  onClick={loadLandingData}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors"
                >
                  {t('Try again', 'حاول مرة اخرى')}
                </button>
              </div>
            ) : vehicles.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-600">
                <p className="text-sm font-semibold mb-2">{t('No vehicles to show yet', 'لا توجد سيارات للعرض بعد')}</p>
                <p className="text-sm">{t('Check back soon or explore the full inventory.', 'عد لاحقا او استكشف جميع القوائم.')}</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                {vehicles.map(vehicle => {
                  const matchedAuction = MOCK_AUCTIONS.find(auction => auction.vehicle.id === vehicle.id);
                  return (
                    <VehicleCard
                      key={vehicle.id}
                      vehicle={vehicle}
                      listingId={matchedAuction?.id ?? vehicle.id}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="section-texture section-divider border-y border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
              <div className="text-center mx-auto">
                <p className="section-eyebrow">{t('Why AUTOUSATA', 'لماذا AUTOUSATA')}</p>
                <h2 className="section-title">{t('A premium experience, end to end', 'تجربة فاخرة من البداية للنهاية')}</h2>
                <p className="section-subtitle max-w-2xl mx-auto">
                  {t(
                    'We combine auction-grade diligence with concierge-level service so you can focus on the car, not the paperwork.',
                    'بنخلط دقة المزادات مع خدمة كونسييرج عشان تركز على العربية مش الورق.'
                  )}
                </p>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <ValueCard
                icon={<ShieldCheck size={22} />}
                title={t('Protected transactions', 'معاملات مؤمنة')}
                description={t(
                  'Escrow protection and verified seller profiles keep every purchase secure.',
                  'حماية إسكرو وباعة موثقين بيخلوا كل عملية آمنة.'
                )}
              />
              <ValueCard
                icon={<Sparkles size={22} />}
                title={t('Curated inventory', 'مخزون منسق بعناية')}
                description={t(
                  'Each listing is reviewed for authenticity, condition, and total cost of ownership.',
                  'كل قائمة بتتراجع من ناحية الأصالة والحالة وتكلفة الملكية.'
                )}
              />
              <ValueCard
                icon={<Trophy size={22} />}
                title={t('Concierge guidance', 'ارشاد متخصص')}
                description={t(
                  'Dedicated specialists help you bid, finance, and close with confidence.',
                  'متخصصين بيساعدوك في المزايدة والتمويل والإغلاق بثقة.'
                )}
              />
            </div>
          </div>
        </section>

        <section className="section-texture section-divider border-y border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mx-auto">
              <p className="section-eyebrow">{t('How it works', 'الية العمل')}</p>
              <h2 className="section-title">{t('A simple path from browse to delivery', 'مسار واضح من التصفح الى التسليم')}</h2>
              <p className="section-subtitle max-w-2xl mx-auto">
                {t(
                  'Follow a clear, guided process whether you are buying or selling your next vehicle.',
                  'امشي على خطوات واضحة سواء بتشتري أو بتبيع عربيتك الجاية.'
                )}
              </p>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <ValueCard
                icon={<Search size={22} />}
                title={t('Browse and shortlist', 'تصفح واختر')}
                description={t(
                  'Filter verified listings and compare condition reports in one place.',
                  'فلتر القوائم الموثقة وقارن تقارير الحالة في مكان واحد.'
                )}
              />
              <ValueCard
                icon={<Gavel size={22} />}
                title={t('Bid or list confidently', 'قدم مزايدة او اعرض بثقة')}
                description={t(
                  'Transparent bidding and instant status updates keep you in control.',
                  'مزايدات واضحة وتحديثات فورية بتخليك متحكم.'
                )}
              />
              <ValueCard
                icon={<Truck size={22} />}
                title={t('Close and deliver', 'انهاء وتسليم')}
                description={t(
                  'Secure payments and guided handover ensure a smooth finish.',
                  'مدفوعات آمنة وتسليم منظم بيخلوا النهاية سهلة.'
                )}
              />
            </div>
            <div className="mt-8 flex justify-center">
              <Link
                to="/how-it-works"
                className="market-cta-primary inline-flex items-center gap-2 px-6 py-2 rounded-full text-sm font-semibold transition-colors"
              >
                {t('Explore the full guide', 'استعرض الدليل الكامل')}
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

      </div>
    </>
  );
};

const ValueCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({
  icon,
  title,
  description
}) => (
  <div className="value-card rounded-2xl p-6 shadow-sm">
    <div className="flex items-center gap-3 value-card-icon mb-4">
      <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">{icon}</div>
      <h3 className="text-lg font-semibold value-card-title">{title}</h3>
    </div>
    <p className="text-sm value-card-text leading-relaxed">{description}</p>
  </div>
);

const StatCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="stat-card rounded-2xl p-4">
    <p className="text-xl font-semibold stat-value mb-1">{value}</p>
    <p className="text-[11px] uppercase tracking-[0.2em] stat-label">{label}</p>
  </div>
);

const VehicleCard: React.FC<{ vehicle: Vehicle; listingId: string }> = ({ vehicle, listingId }) => {
  const { t, formatNumber } = useLanguage();
  return (
    <Link
      to={`/listing/${listingId}`}
      className="group block bg-white/95 border border-slate-200/80 rounded-3xl overflow-hidden premium-card-hover backdrop-blur-sm shadow-[0_18px_45px_rgba(15,23,42,0.12)] hover:shadow-[0_30px_70px_rgba(15,23,42,0.18)] focus-visible:ring-2 focus-visible:ring-slate-900/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      aria-label={t(`View listing for ${vehicle.year} ${vehicle.make} ${vehicle.model}`, `عرض القائمة لسيارة ${vehicle.year} ${vehicle.make} ${vehicle.model}`)}
    >
      <div className="relative">
        <img
          src={vehicle.images?.[0] || placeholderImage}
          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          className="h-52 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent" />
        <div className="absolute left-4 bottom-4">
          <span className="inline-flex items-center rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-slate-900 shadow-sm ring-1 ring-slate-200/80">
            {t('Live auction', 'مزاد مباشر')}
          </span>
        </div>
      </div>
      <div className="p-5">
        <p className="text-lg font-semibold text-slate-900">{vehicle.year} {vehicle.make} {vehicle.model}</p>
        <p className="text-sm text-slate-500 mt-1">{vehicle.location}</p>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>{formatNumber(vehicle.mileage)} {t('miles', 'ميل')}</span>
          <span className="font-semibold text-slate-700">{vehicle.condition}</span>
        </div>
      </div>
    </Link>
  );
};

export default LandingPage;
