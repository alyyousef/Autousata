import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const PublicLayout: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const hideFooter = isAuthPage;
  const lockScroll = isAuthPage;

  useEffect(() => {
    if (!lockScroll) {
      document.body.classList.remove('overflow-hidden');
      return;
    }

    document.body.classList.add('overflow-hidden');
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [lockScroll]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${isAuthPage ? (isActive ? 'text-slate-900' : 'text-slate-700 hover:text-slate-900') : (isActive ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600')}`;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className={`sticky top-0 z-50 ${isAuthPage ? 'bg-gradient-to-r from-[#F7F2EC] via-[#E9E2D6] to-[#DCE6F2] border-b border-white/80' : 'bg-white border-b border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 group" aria-label="Autousata home">
              <div className={`p-2 rounded-xl shadow-sm ${isAuthPage ? 'bg-white/70 border border-white/80' : 'bg-white border border-slate-200'}`}>
                <img src="/Autoustata.png" alt="Autousata logo" className="h-8 w-8" />
              </div>
              <span className={`text-xl font-bold tracking-tight ${isAuthPage ? 'text-slate-900' : 'text-slate-900'}`}>Autousata</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
              <NavLink to="/browse" className={navLinkClass}>Browse Cars</NavLink>
              <NavLink to="/how-it-works" className={navLinkClass}>How it Works</NavLink>
              <NavLink to="/about" className={navLinkClass}>About</NavLink>
              <NavLink to="/sell" className={navLinkClass}>Sell a Car</NavLink>
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <NavLink to="/login" className={`${isAuthPage ? 'text-slate-700 hover:text-slate-900' : 'text-slate-600 hover:text-indigo-600'} text-sm font-semibold`}>Login</NavLink>
              <NavLink
                to="/signup"
                className={`${isAuthPage ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-indigo-600 text-white hover:bg-indigo-700'} px-4 py-2 rounded-full text-sm font-semibold transition-colors`}
              >
                Sign up
              </NavLink>
            </div>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`md:hidden p-2 rounded-md ${isAuthPage ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-500 hover:bg-slate-100'}`}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white">
            <div className="px-4 py-4 space-y-3">
              <NavLink to="/browse" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>Browse Cars</NavLink>
              <NavLink to="/how-it-works" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>How it Works</NavLink>
              <NavLink to="/about" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>About</NavLink>
              <NavLink to="/sell" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>Sell a Car</NavLink>
              <div className="pt-2 border-t border-slate-200 flex gap-3">
                <NavLink to="/login" className="text-sm font-semibold text-slate-600 hover:text-indigo-600" onClick={() => setIsMenuOpen(false)}>Login</NavLink>
                <NavLink
                  to="/signup"
                  className="px-3 py-1.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign up
                </NavLink>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow">
        <Outlet />
      </main>

      {!hideFooter && (
        <footer className="bg-slate-900 text-slate-300">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-[1.3fr_0.7fr_0.7fr]">
            <div>
              <div className="flex items-center gap-2 mb-5">
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                  <img src="/Autoustata.png" alt="Autousata logo" className="h-8 w-8" />
                </div>
                <span className="text-xl font-bold text-white tracking-tight">Autousata</span>
              </div>
              <p className="text-sm leading-6 max-w-sm">
                A premium marketplace built for collectors and daily drivers alike. Transparent auctions, verified sellers, and concierge support.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Explore</h3>
              <ul className="space-y-3 text-sm">
                <li><Link to="/browse" className="hover:text-indigo-400">Browse Cars</Link></li>
                <li><Link to="/how-it-works" className="hover:text-indigo-400">How it Works</Link></li>
                <li><Link to="/sell" className="hover:text-indigo-400">Sell a Car</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Company</h3>
              <ul className="space-y-3 text-sm">
                <li><Link to="/about" className="hover:text-indigo-400">About</Link></li>
                <li><Link to="/about" className="hover:text-indigo-400">Contact</Link></li>
                <li><Link to="/about" className="hover:text-indigo-400">Press</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-slate-800 text-xs text-center md:text-left">
            &copy; 2026 Autousata, Inc. All rights reserved.
          </div>
        </div>
        </footer>
      )}
    </div>
  );
};

export default PublicLayout;
