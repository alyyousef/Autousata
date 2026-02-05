import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, X, User as UserIcon } from 'lucide-react'; // <--- Added UserIcon
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

const PublicLayout: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllRead, clearNotifications } = useNotifications();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const isProfilePage = location.pathname === '/profile';
  const hideFooter = isAuthPage;

  useEffect(() => {
    if (!isAuthPage) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isAuthPage]);
  const navigate = useNavigate();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium tracking-tight transition-colors ${isActive
      ? 'text-indigo-600'
      : 'text-slate-600 hover:text-indigo-600'}`;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/95 border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group" aria-label="AUTOUSATA home">
              <div>
                <img src="/assests/frontendPictures/logoBlackA.png" alt="AUTOUSATA logo" className="h-16 w-16" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-slate-900 uppercase">
                AUTOUSATA
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
              <NavLink to="/browse" className={navLinkClass}>Buy</NavLink>
              <NavLink to="/sell" className={navLinkClass}>Sell</NavLink>
              <NavLink to="/auctions" className={navLinkClass}>Auction</NavLink>
              <NavLink to="/how-it-works" className={navLinkClass}>How it Works</NavLink>
            </nav>

            {/* Desktop User Actions */}
            <div className="hidden md:flex items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsNotifOpen(prev => !prev);
                    markAllRead();
                  }}
                  className="relative p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 h-6 min-w-[24px] px-2 rounded-full bg-rose-500 text-white text-[11px] font-semibold flex items-center justify-center leading-none ring-2 ring-white shadow-[0_2px_6px_rgba(0,0,0,0.15)]">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {isNotifOpen && (
                  <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                      <span className="text-sm font-semibold text-slate-900">Notifications</span>
                      <button
                        type="button"
                        onClick={clearNotifications}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-slate-500">No notifications yet.</div>
                      ) : (
                        notifications.slice(0, 8).map(note => (
                          <div key={note.id} className="px-4 py-3 border-b border-slate-100 last:border-b-0">
                            <div
                              className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                                note.tone === 'success'
                                  ? 'text-emerald-600'
                                  : note.tone === 'warn'
                                    ? 'text-amber-600'
                                    : note.tone === 'error'
                                      ? 'text-rose-600'
                                      : 'text-slate-500'
                              }`}
                            >
                              {note.tone === 'success'
                                ? 'Bid completed'
                                : note.tone === 'warn'
                                  ? 'Alert'
                                  : note.tone === 'error'
                                    ? 'Error'
                                    : 'Update'}
                            </div>
                            <p className="text-sm text-slate-700 mt-1">{note.message}</p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              {new Date(note.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              {user ? (
                isProfilePage ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-4 py-2 rounded-full bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 border border-red-100 transition-colors"
                  >
                    Sign Out
                  </button>
                ) : (
                  // === NEW: PROFILE PICTURE BUTTON ===
                  <Link 
                    to="/profile" 
                    className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-slate-200 overflow-hidden hover:border-indigo-600 transition-all shadow-sm"
                    title="Go to Profile"
                  >
                    {user.profileImage ? (
                      <img 
                        src={user.profileImage} 
                        alt="Profile" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="bg-slate-100 w-full h-full flex items-center justify-center text-slate-400">
                        <UserIcon size={20} />
                      </div>
                    )}
                  </Link>
                )
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

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md text-slate-500 hover:bg-slate-100"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white">
            <div className="px-4 py-4 space-y-3">
              <NavLink to="/browse" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>Buy</NavLink>
              <NavLink to="/sell" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>Sell</NavLink>
              <NavLink to="/auctions" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>Auction</NavLink>
              <NavLink to="/how-it-works" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>How it Works</NavLink>
              
              <div className="pt-2 border-t border-slate-200 flex gap-3">
                {user ? (
                  isProfilePage ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full p-2 rounded-lg bg-red-50 text-red-600 text-sm font-semibold border border-red-100 hover:bg-red-100 transition-colors"
                    >
                      Sign Out
                    </button>
                  ) : (
                    // === NEW: MOBILE PROFILE LINK ===
                    <Link 
                      to="/profile" 
                      className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-slate-50 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                       <div className="w-10 h-10 rounded-full border border-slate-200 overflow-hidden flex-shrink-0">
                          {user.profileImage ? (
                            <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <div className="bg-slate-100 w-full h-full flex items-center justify-center text-slate-400">
                              <UserIcon size={20} />
                            </div>
                          )}
                       </div>
                       <div>
                          <p className="text-sm font-semibold text-slate-900">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-slate-500">View Profile</p>
                       </div>
                    </Link>
                  )
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
                    <img src="/assests/frontendPictures/logoWhiteA.png" alt="AUTOUSATA logo" className="h-14 w-14" />
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
                  <li><Link to="/terms" className="hover:text-indigo-400">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default PublicLayout;
