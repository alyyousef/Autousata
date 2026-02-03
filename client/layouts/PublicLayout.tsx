import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const PublicLayout: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const hideFooter = isAuthPage;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium tracking-tight transition-colors ${isActive
      ? 'text-indigo-600'
      : 'text-slate-600 hover:text-indigo-600'}`;

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/95 border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center gap-2 group" aria-label="Autousata home">
              <div>
                <img src="/assests/frontendPictures/logoBlackA.png" alt="Autousata logo" className="h-16 w-16" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-slate-900 uppercase">
                AUTOUSATA
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
              <NavLink to="/browse" className={navLinkClass}>Buy</NavLink>
              <NavLink to="/sell" className={navLinkClass}>Sell</NavLink>
              <NavLink to="/auctions" className={navLinkClass}>Auction</NavLink>
              <NavLink to="/how-it-works" className={navLinkClass}>How it Works</NavLink>
              <NavLink to="/about" className={navLinkClass}>About</NavLink>
            </nav>

            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-full text-sm font-semibold shadow-md shadow-slate-900/30 transition-all"
                >
                  Sign out
                </button>
              ) : (
                <>
                  <NavLink
                    to="/login"
                    className="text-slate-600 hover:text-indigo-600 text-sm font-semibold transition-colors"
                  >
                    Login
                  </NavLink>
                  <NavLink
                    to="/signup"
                    className="bg-indigo-500 text-white hover:bg-indigo-400 px-4 py-2 rounded-full text-sm font-semibold shadow-md shadow-indigo-500/30 transition-all"
                  >
                    Sign up
                  </NavLink>
                </>
              )}
            </div>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md text-slate-500 hover:bg-slate-100"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white">
            <div className="px-4 py-4 space-y-3">
              <NavLink to="/browse" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>Buy</NavLink>
              <NavLink to="/sell" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>Sell</NavLink>
              <NavLink to="/auctions" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>Auction</NavLink>
              <NavLink to="/how-it-works" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>How it Works</NavLink>
              <NavLink to="/about" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>About</NavLink>
              <div className="pt-2 border-t border-slate-200 flex gap-3">
                {user ? (
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 shadow-md shadow-slate-900/30 transition-all"
                  >
                    Sign out
                  </button>
                ) : (
                  <>
                    <NavLink
                      to="/login"
                      className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Login
                    </NavLink>
                    <NavLink
                      to="/signup"
                      className="px-3 py-1.5 rounded-full bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-400 shadow-md shadow-indigo-500/30 transition-all"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign up
                    </NavLink>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow">
        <Outlet />
      </main>

      {!hideFooter && (
        <footer className="bg-slate-950 text-slate-200 border-t border-slate-800/70">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 md:grid-cols-[1.3fr_0.7fr_0.7fr]">
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <div>
                    <img src="/assests/frontendPictures/logoWhiteA.png" alt="Autousata logo" className="h-14 w-14" />
                  </div>
                  <span className="text-xl font-bold text-white tracking-tight uppercase">AUTOUSATA</span>
                </div>
                <p className="text-sm leading-6 max-w-sm text-slate-200">
                  A premium marketplace built for collectors and daily drivers alike. Transparent auctions,
                  verified sellers, and concierge support from first click to final handover.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Explore</h3>
                <ul className="space-y-3 text-sm text-slate-200">
                  <li><Link to="/browse" className="hover:text-indigo-400">Buy a car</Link></li>
                  <li><Link to="/how-it-works" className="hover:text-indigo-400">How it Works</Link></li>
                  <li><Link to="/sell" className="hover:text-indigo-400">Sell a Car</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Company</h3>
                <ul className="space-y-3 text-sm text-slate-200">
                  <li><Link to="/about" className="hover:text-indigo-400">About</Link></li>
                  <li><Link to="/terms" className="hover:text-indigo-400">Terms of Service</Link></li>
                  <li><Link to="/about" className="hover:text-indigo-400">Contact</Link></li>
                  <li><Link to="/about" className="hover:text-indigo-400">Press</Link></li>
                </ul>
              </div>
            </div>
            <div className="mt-10 pt-6 border-t border-slate-800 text-xs text-center md:text-left text-slate-300">
              &copy; 2026 AUTOUSATA, Inc. All rights reserved.
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default PublicLayout;