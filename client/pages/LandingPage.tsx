import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { fetchLandingStats, fetchLandingTeasers } from '../mockApi';
import { LandingStats, Vehicle } from '../types';
import placeholderImage from '../../assests/frontendPictures/placeHolder.jpg';
import landingHero from '../../assests/frontendPictures/landingPageBackT.jpg';
import ImageLightbox from '../components/ImageLightbox';

const LandingPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState<LandingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

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

  return (
    <>
      <div className="bg-slate-50 landing-serif">
      <section className="relative overflow-hidden bg-[#0B1117] text-white">
        <div className="absolute inset-0">
          <img
            src={landingHero}
            alt="Luxury vehicles on a showroom floor"
            className="h-full w-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0B1117]/95 via-[#101826]/85 to-[#0B1117]/30" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_60%)]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-start">
            <div className="hero-fade-in">
              <h1 className="text-4xl md:text-6xl font-semibold leading-[1.05] mb-6 tracking-tight">
                <span className="block text-slate-50">Buy rare vehicles with</span>
                <span className="block bg-gradient-to-r from-sky-200 via-slate-50 to-emerald-200 bg-clip-text text-transparent">
                  clarity, confidence, and full provenance.
                </span>
              </h1>
              <p className="text-base md:text-lg text-slate-200/85 leading-relaxed mb-10 max-w-xl">
                Autousata brings verified sellers, escrow-backed payments, and expert condition reviews into a single
                premium auction experience.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/browse"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-white text-slate-900 font-semibold shadow-lg shadow-slate-900/25 hover:bg-slate-100 transition-all"
                >
                  Explore inventory
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to="/sell"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-emerald-400/15 text-emerald-100 font-semibold border border-emerald-200/30 hover:bg-emerald-400/25 hover:border-emerald-200/50 transition-all"
                >
                  List your car
                </Link>
              </div>
              <div className="mt-10 grid gap-4 sm:grid-cols-3 text-xs md:text-sm text-slate-100/90">
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                  <CheckCircle2 size={16} className="text-emerald-300" />
                  Verified sellers
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                  <CheckCircle2 size={16} className="text-emerald-300" />
                  Transparent pricing
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                  <CheckCircle2 size={16} className="text-emerald-300" />
                  Concierge support
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-white/12 bg-white/8 p-6 backdrop-blur-sm shadow-[0_24px_60px_rgba(5,10,20,0.35)]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-200">Market snapshot</p>
                    <p className="text-lg font-semibold text-white">Live marketplace signals</p>
                  </div>
                  <span className="text-xs text-slate-300">Updated weekly</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {stats ? (
                    <>
                      <StatCard label="Active listings" value={stats.activeListings.toLocaleString()} />
                      <StatCard label="Verified sellers" value={stats.verifiedSellers.toLocaleString()} />
                      <StatCard label="Avg. time to sell" value={stats.avgTimeToSell} />
                      <StatCard label="Escrow protected" value={stats.escrowProtected} />
                    </>
                  ) : (
                    Array.from({ length: 4 }).map((_, index) => (
                      <div key={`stat-skeleton-${index}`} className="bg-white/10 border border-white/15 rounded-2xl p-4 animate-pulse">
                        <div className="h-5 w-20 bg-white/20 rounded mb-3"></div>
                        <div className="h-3 w-24 bg-white/20 rounded"></div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/12 bg-white/8 p-6 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-200 mb-4">How it works</p>
                <div className="space-y-4 text-sm text-slate-200">
                  <div className="flex items-start gap-3">
                    <span className="h-8 w-8 rounded-full bg-sky-400/20 text-sky-200 flex items-center justify-center text-xs font-semibold">01</span>
                    <div>
                      <p className="font-semibold text-white">Browse verified listings</p>
                      <p className="text-slate-200/80">Every vehicle is reviewed for history, title, and condition.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="h-8 w-8 rounded-full bg-sky-400/20 text-sky-200 flex items-center justify-center text-xs font-semibold">02</span>
                    <div>
                      <p className="font-semibold text-white">Bid with full transparency</p>
                      <p className="text-slate-200/80">Real-time bidding with clear pricing guidance.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="h-8 w-8 rounded-full bg-sky-400/20 text-sky-200 flex items-center justify-center text-xs font-semibold">03</span>
                    <div>
                      <p className="font-semibold text-white">Close with escrow support</p>
                      <p className="text-slate-200/80">Payments, paperwork, and delivery handled by our team.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-texture border-y border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div className="text-center mx-auto">
              <p className="section-eyebrow">Why Autousata</p>
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

      <section className="section-texture border-y border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div className="text-center mx-auto">
              <p className="section-eyebrow">Trending now</p>
              <h2 className="section-title">Vehicles trending this week</h2>
              <p className="section-subtitle max-w-2xl mx-auto">
                High-interest listings with verified condition reports and active bids.
              </p>
            </div>
            <Link to="/browse" className="text-sm font-semibold text-slate-900 hover:text-slate-700 inline-flex items-center gap-2">
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
              {vehicles.map(vehicle => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  onPreview={() => setLightboxSrc(vehicle.images?.[0] || placeholderImage)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-300 mb-3">Sell with confidence</p>
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
      {lightboxSrc && (
      <ImageLightbox
        src={lightboxSrc}
        alt="Vehicle preview"
        onClose={() => setLightboxSrc(null)}
      />
      )}
    </>
  );
};

const ValueCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({
  icon,
  title,
  description
}) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
    <div className="flex items-center gap-3 text-emerald-600 mb-4">
      <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
    </div>
    <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
  </div>
);

const StatCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-white/10 border border-white/15 rounded-2xl p-4">
    <p className="text-xl font-semibold text-white mb-1">{value}</p>
    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-300">{label}</p>
  </div>
);

const VehicleCard: React.FC<{ vehicle: Vehicle; onPreview: () => void }> = ({ vehicle, onPreview }) => (
  <div className="bg-white/90 border border-slate-200 rounded-2xl overflow-hidden premium-card-hover backdrop-blur-sm">
    <div className="relative">
      <img
        src={vehicle.images?.[0] || placeholderImage}
        alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
        className="h-48 w-full object-cover cursor-zoom-in"
        onClick={onPreview}
      />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/70 to-transparent" />
      <div className="absolute left-4 bottom-3 text-xs uppercase tracking-[0.3em] text-white/80">Live auction</div>
    </div>
    <div className="p-5">
      <p className="text-lg font-semibold text-slate-900">{vehicle.year} {vehicle.make} {vehicle.model}</p>
      <p className="text-sm text-slate-500 mt-1">{vehicle.location}</p>
      <p className="text-xs text-slate-500 mt-3">{vehicle.mileage.toLocaleString()} miles | {vehicle.condition}</p>
    </div>
  </div>
);

export default LandingPage;
