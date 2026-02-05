import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy
} from 'lucide-react';
import { fetchLandingStats, fetchLandingTeasers } from '../mockApi';
import { LandingStats, Vehicle } from '../types';
import placeholderImage from '../../assests/frontendPictures/placeHolder.jpg';
import landingHero from '../../assests/frontendPictures/landingPageBackT.jpg';
import landingHeroWide from '../../assests/frontendPictures/landingPageBack.jpg';
import landingHeroAlt from '../../assests/frontendPictures/carPlaceHolder.jpg';
import { MOCK_AUCTIONS } from '../constants';

const heroSlides = [
  {
    image: landingHero,
    headline: 'Driving Luxury Since 1985',
    subhead: 'Discover curated exotics and collector-grade vehicles with verified provenance.',
    sponsor: 'McLaren 750S.',
    sponsorLine: 'For those who drive to feel. Pure V8 power.'
  },
  {
    image: landingHeroWide,
    headline: 'Built For Serious Collectors',
    subhead: 'Bid with confidence on concierge-verified listings and transparent auction terms.',
    sponsor: 'Porsche 911 GT3 RS.',
    sponsorLine: 'Track-bred precision, road-ready composure.'
  },
  {
    image: landingHeroAlt,
    headline: 'The Registry For Rare Icons',
    subhead: 'Handpicked inventory, expert inspections, and white-glove delivery support.',
    sponsor: 'Aston Martin DB12.',
    sponsorLine: 'A grand tourer with effortless power and presence.'
  }
];

const LandingPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState<LandingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [heroTab, setHeroTab] = useState<'buy' | 'sell'>('buy');

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
      setError('We could not load the latest featured vehicles. Please try again.');
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

  const currentSlide = heroSlides[activeSlide];

  return (
    <>
      <div className="landing-serif">
        <section className="relative overflow-hidden py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-[36px] border border-white/10 shadow-[0_35px_80px_rgba(4,10,20,0.55)]">
              <div className="absolute inset-0">
                <img
                  key={currentSlide.image}
                  src={currentSlide.image}
                  alt={currentSlide.headline}
                  className="h-full w-full object-cover scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/55 to-black/80" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_55%)]" />
              </div>

              <div className="relative z-10 px-6 md:px-14 pt-16 pb-20 text-center text-white">
                <p className="text-[11px] uppercase tracking-[0.45em] text-white/70">AUTOUSATA Registry</p>
                <h1 className="mt-4 text-3xl md:text-5xl font-semibold leading-tight">
                  {currentSlide.headline}
                </h1>
                <p className="mt-4 text-sm md:text-lg text-white/80 max-w-2xl mx-auto">
                  {currentSlide.subhead}
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
                      Buy
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
                      Sell/Trade
                    </button>
                  </div>

                  <div className="hero-panel w-full max-w-3xl rounded-3xl border px-4 py-4 md:px-6 md:py-5 flex flex-col md:flex-row md:items-center gap-4">
                    <button
                      type="button"
                      className="hero-select flex items-center justify-between gap-3 rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm"
                    >
                      Used
                      <ChevronDown size={16} />
                    </button>
                    <div className="hero-search flex-1 flex items-center gap-3 rounded-2xl px-4 py-2">
                      <Search size={18} />
                      <input
                        type="text"
                        placeholder="Search for make and model"
                        className="hero-search-input w-full bg-transparent text-sm focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      className="hero-search-button px-6 py-3 rounded-2xl text-sm font-semibold transition-colors"
                    >
                      Search
                    </button>
                  </div>
                </div>

                <div className="mt-12 flex flex-col md:flex-row md:items-end md:justify-between gap-8 text-left">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-white/60">Sponsored</p>
                    <h3 className="mt-2 text-2xl md:text-3xl font-semibold text-white">
                      {currentSlide.sponsor}
                    </h3>
                    <p className="mt-2 text-sm text-white/75 max-w-md">
                      {currentSlide.sponsorLine}
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
                          aria-label={`Show slide ${index + 1}`}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSlide(prev => (prev + 1) % heroSlides.length)}
                      className="h-10 w-10 rounded-full border border-white/40 text-white flex items-center justify-center hover:bg-white/10 transition-colors"
                      aria-label="Next slide"
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
                <p className="section-eyebrow">Market snapshot</p>
                <h2 className="section-title">Live marketplace signals</h2>
                <p className="section-subtitle max-w-xl">
                  Weekly activity trends across bids, listings, and sell-through velocity.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/browse"
                    className="market-cta-primary inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-colors"
                  >
                    Explore inventory
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    to="/sell"
                    className="market-cta-secondary inline-flex items-center gap-2 px-5 py-2 rounded-full border text-sm font-semibold transition-colors"
                  >
                    List your car
                  </Link>
                </div>
              </div>
              <div className="value-card rounded-3xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Updated weekly</p>
                    <p className="text-lg font-semibold">Market snapshot</p>
                  </div>
                  <span className="text-xs text-slate-400">Live</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {stats ? (
                    <>
                      <StatCard label="Active listings" value={stats.activeListings.toLocaleString()} />
                      <StatCard label="AVERAGE time to sell" value={stats.avgTimeToSell} />
                      <StatCard label="Escrow protected" value={stats.escrowProtected} />
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
              <div className="text-center mx-auto">
                <p className="section-eyebrow">Why AUTOUSATA</p>
                <h2 className="section-title">A premium experience, end to end</h2>
                <p className="section-subtitle max-w-2xl mx-auto">
                  We combine auction-grade diligence with concierge-level service so you can focus on the car, not the paperwork.
                </p>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <ValueCard
                icon={<ShieldCheck size={22} />}
                title="Protected transactions"
                description="Escrow protection and verified seller profiles keep every purchase secure."
              />
              <ValueCard
                icon={<Sparkles size={22} />}
                title="Curated inventory"
                description="Each listing is reviewed for authenticity, condition, and total cost of ownership."
              />
              <ValueCard
                icon={<Trophy size={22} />}
                title="Concierge guidance"
                description="Dedicated specialists help you bid, finance, and close with confidence."
              />
            </div>
          </div>
        </section>

        <section className="section-texture section-divider border-y border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
              <div className="text-center mx-auto">
                <p className="section-eyebrow">Trending now</p>
                <h2 className="section-title">Vehicles trending this week</h2>
                <p className="section-subtitle max-w-2xl mx-auto">
                  High-interest listings with verified condition reports and active bids.
                </p>
              </div>
              <Link to="/browse" className="market-link text-sm font-semibold inline-flex items-center gap-2">
                Browse all listings
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
                <p className="text-sm text-rose-600 font-semibold mb-2">Unable to load featured vehicles</p>
                <p className="text-sm text-slate-600 mb-4">{error}</p>
                <button
                  onClick={loadLandingData}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors"
                >
                  Try again
                </button>
              </div>
            ) : vehicles.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-600">
                <p className="text-sm font-semibold mb-2">No vehicles to show yet</p>
                <p className="text-sm">Check back soon or explore the full inventory.</p>
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

        <section className="bg-slate-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 className="text-3xl font-semibold mb-3">Ready to list your car?</h2>
                <p className="text-slate-300">Reach serious buyers with auction-grade exposure and white-glove support.</p>
              </div>
              <Link
                to="/sell"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-slate-900 font-semibold hover:bg-slate-100 transition-colors"
              >
                Start selling
                <ArrowRight size={18} />
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

const VehicleCard: React.FC<{ vehicle: Vehicle; listingId: string }> = ({ vehicle, listingId }) => (
  <Link
    to={`/listing/${listingId}`}
    className="group block bg-white/95 border border-slate-200/80 rounded-3xl overflow-hidden premium-card-hover backdrop-blur-sm shadow-[0_18px_45px_rgba(15,23,42,0.12)] hover:shadow-[0_30px_70px_rgba(15,23,42,0.18)] focus-visible:ring-2 focus-visible:ring-slate-900/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
    aria-label={`View listing for ${vehicle.year} ${vehicle.make} ${vehicle.model}`}
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
          Live auction
        </span>
      </div>
    </div>
    <div className="p-5">
      <p className="text-lg font-semibold text-slate-900">{vehicle.year} {vehicle.make} {vehicle.model}</p>
      <p className="text-sm text-slate-500 mt-1">{vehicle.location}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span>{vehicle.mileage.toLocaleString()} miles</span>
        <span className="font-semibold text-slate-700">{vehicle.condition}</span>
      </div>
    </div>
  </Link>
);

export default LandingPage;
