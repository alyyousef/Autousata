import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { fetchLandingStats, fetchLandingTeasers } from '../mockApi';
import { LandingStats, Vehicle } from '../types';

const LandingPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState<LandingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="bg-slate-50">
      <section className="relative overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0">
          <img
            src="https://picsum.photos/seed/landing-hero/1600/900"
            alt="Luxury vehicles on a showroom floor"
            className="h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.4em] text-indigo-300 mb-4">Premium marketplace</p>
            <h1 className="text-4xl md:text-6xl font-semibold leading-tight mb-6">
              Discover rare and remarkable cars, with trust built in.
            </h1>
            <p className="text-lg text-slate-200 leading-relaxed mb-10">
              Autousata connects collectors and first-time buyers with verified sellers, transparent bidding, and escrow-backed transactions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/browse"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
              >
                Browse Cars
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/sell"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-white/30 text-white font-semibold hover:bg-white/10 transition-colors"
              >
                Sell a Car
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-white/30 text-white font-semibold hover:bg-white/10 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-slate-900 font-semibold hover:bg-slate-100 transition-colors"
              >
                Sign up
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-slate-200">
              <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" />Verified listings</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" />Escrow-backed payments</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" />Concierge support</div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          <ValueCard
            icon={<ShieldCheck size={22} />}
            title="Protected transactions"
            description="Escrow protection and verified seller profiles keep every purchase secure."
          />
          <ValueCard
            icon={<Sparkles size={22} />}
            title="Curated inventory"
            description="Every vehicle is vetted for quality, history, and authenticity before listing."
          />
          <ValueCard
            icon={<Trophy size={22} />}
            title="Concierge guidance"
            description="Dedicated specialists help you bid, finance, and close with confidence."
          />
        </div>
      </section>

      <section className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid gap-6 md:grid-cols-4">
            {stats ? (
              <>
                <StatCard label="Active listings" value={stats.activeListings.toLocaleString()} />
                <StatCard label="Verified sellers" value={stats.verifiedSellers.toLocaleString()} />
                <StatCard label="Avg. time to sell" value={stats.avgTimeToSell} />
                <StatCard label="Escrow protected" value={stats.escrowProtected} />
              </>
            ) : (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={`stat-skeleton-${index}`} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 animate-pulse">
                  <div className="h-6 w-20 bg-slate-200 rounded mb-3"></div>
                  <div className="h-4 w-24 bg-slate-200 rounded"></div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Featured inventory</p>
            <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-3">Vehicles trending this week</h2>
          </div>
          <Link to="/browse" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-2">
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
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-3xl font-semibold mb-3">Ready to list your car?</h2>
              <p className="text-indigo-100">Reach serious buyers with auction-grade exposure and white-glove support.</p>
            </div>
            <Link
              to="/sell"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-indigo-700 font-semibold hover:bg-indigo-50 transition-colors"
            >
              Start selling
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

const ValueCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({
  icon,
  title,
  description
}) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
    <div className="flex items-center gap-3 text-indigo-600 mb-4">
      <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
    </div>
    <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
  </div>
);

const StatCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
    <p className="text-2xl font-semibold text-slate-900 mb-2">{value}</p>
    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
  </div>
);

const VehicleCard: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => (
  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
    <img src={vehicle.images[0]} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} className="h-48 w-full object-cover" />
    <div className="p-5">
      <p className="text-lg font-semibold text-slate-900">{vehicle.year} {vehicle.make} {vehicle.model}</p>
      <p className="text-sm text-slate-500 mt-1">{vehicle.location}</p>
      <p className="text-xs text-slate-400 mt-3">{vehicle.mileage.toLocaleString()} miles • {vehicle.condition}</p>
    </div>
  </div>
);

export default LandingPage;
