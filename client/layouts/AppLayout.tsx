import React, { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Bell, Car, LayoutDashboard, LogOut, Menu, PlusCircle, Shield, X } from 'lucide-react';
import { User, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

interface AppLayoutProps {
  user: User | null;
}

const AppLayout: React.FC<AppLayoutProps> = ({ user: userProp }) => {
  const { user: authUser, loading, logout } = useAuth();
  const { notifications, unreadCount, markAllRead, clearNotifications } = useNotifications();
  const user = userProp || authUser;
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [textDirection, setTextDirection] = useState<'ltr' | 'rtl'>(() => {
    if (typeof window === 'undefined') return 'ltr';
    const storedDir = window.localStorage.getItem('textDirection');
    return storedDir === 'rtl' ? 'rtl' : 'ltr';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('dir', textDirection);
    root.setAttribute('lang', textDirection === 'rtl' ? 'ar' : 'en');
    window.localStorage.setItem('textDirection', textDirection);
  }, [textDirection]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Browse', href: '/browse', icon: Car, roles: [UserRole.GUEST, UserRole.BUYER, UserRole.SELLER, UserRole.ADMIN] },
    { name: 'Sell Your Car', href: '/sell', icon: PlusCircle, roles: [UserRole.SELLER, UserRole.DEALER, UserRole.ADMIN] },
    { name: 'My Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: [UserRole.SELLER, UserRole.DEALER] },
    { name: 'Admin', href: '/admin', icon: Shield, roles: [UserRole.ADMIN] }
  ].filter(item => item.roles.includes(user.role));

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-white/95 border-b border-slate-200/80 sticky top-0 z-50 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 group">
                <div>
                  <img src="/assests/frontendPictures/logoBlackA.png" alt="AUTOUSATA logo" className="h-16 w-16" />
                </div>
                <span className="text-2xl font-bold text-slate-900 tracking-tight uppercase">AUTOUSATA</span>
              </Link>
              <div className="hidden md:ml-10 md:flex md:space-x-8">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="inline-flex items-center px-1 pt-1 text-base font-semibold text-slate-600 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent transition-all"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <div className="dir-toggle" role="group" aria-label="Language direction">
                <button
                  type="button"
                  onClick={() => setTextDirection('ltr')}
                  className={`dir-toggle-btn ${textDirection === 'ltr' ? 'dir-toggle-btn-active' : ''}`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setTextDirection('rtl')}
                  className={`dir-toggle-btn ${textDirection === 'rtl' ? 'dir-toggle-btn-active' : ''}`}
                >
                  AR
                </button>
              </div>
              <div className="relative">
                <button
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full relative overflow-visible"
                  aria-label="Notifications"
                  onClick={() => {
                    setIsNotifOpen(prev => !prev);
                    markAllRead();
                  }}
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
              <div className="h-6 w-[1px] bg-slate-200"></div>
              <Link to="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-900 leading-none">{user.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{user.role}</p>
                </div>
                <img
                  className="h-9 w-9 rounded-full ring-2 ring-indigo-50"
                  src={user.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name)}
                  alt=""
                />
              </Link>
            </div>

            <div className="-mr-2 flex items-center md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="bg-white inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 py-3">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={18} />
                    {item.name}
                  </div>
                </Link>
              ))}
            </div>
            <div className="pt-4 pb-3 border-t border-slate-200">
              <div className="px-4 pb-3">
                <div className="dir-toggle dir-toggle-mobile" role="group" aria-label="Language direction">
                  <button
                    type="button"
                    onClick={() => setTextDirection('ltr')}
                    className={`dir-toggle-btn ${textDirection === 'ltr' ? 'dir-toggle-btn-active' : ''}`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextDirection('rtl')}
                    className={`dir-toggle-btn ${textDirection === 'rtl' ? 'dir-toggle-btn-active' : ''}`}
                  >
                    Arabic
                  </button>
                </div>
              </div>
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  <img className="h-10 w-10 rounded-full" src={user.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name)} alt="" />
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-slate-800">{user.name}</div>
                  <div className="text-sm font-medium text-slate-500">{user.email}</div>
                </div>
              </div>
              <div className="mt-3 px-2 space-y-1">
                <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50">Profile</Link>
                <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 flex items-center gap-3">
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-grow">
        <Outlet />
      </main>

      <footer className="bg-slate-950 text-slate-200 border-t border-slate-800/70">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div>
                  <img src="/assests/frontendPictures/logoWhiteA.png" alt="AUTOUSATA logo" className="h-14 w-14" />
                </div>
                <span className="text-xl font-bold text-white tracking-tight uppercase">AUTOUSATA</span>
              </div>
              <p className="text-sm leading-6 max-w-xs text-slate-200">
                The world's most trusted online marketplace for buying and selling exceptional vehicles.
                Secure, transparent, and built for enthusiasts.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Company</h3>
              <ul className="space-y-3 text-sm text-slate-200">
                <li><Link to="/how-it-works" className="hover:text-indigo-400">How it Works</Link></li>
                <li><Link to="/terms" className="hover:text-indigo-400">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Marketplace</h3>
              <ul className="space-y-3 text-sm text-slate-200">
                <li><Link to="/browse" className="hover:text-indigo-400">Browse listings</Link></li>
                <li><Link to="/auctions" className="hover:text-indigo-400">Live auctions</Link></li>
                <li><Link to="/sell" className="hover:text-indigo-400">Sell a car</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Legal</h3>
              <ul className="space-y-3 text-sm text-slate-200">
                <li><Link to="/terms" className="hover:text-indigo-400">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-slate-800 text-xs text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4 text-slate-300">
            <div className="flex gap-6 text-slate-200">
              <span className="flex items-center gap-1.5"><Shield size={14} className="text-emerald-500" /> SECURE PAYMENTS</span>
              <span>PCI DSS COMPLIANT</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
