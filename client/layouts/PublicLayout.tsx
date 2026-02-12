import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Car, ChevronDown, CircleHelp, Gavel, HandCoins, ListChecks, Menu, Moon, SearchCheck, Sun, X, User as UserIcon, Newspaper, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';

const PublicLayout: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const { user, loading, logout } = useAuth();
  const { notifications, unreadCount, markAllRead, clearNotifications } = useNotifications();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const hideFooter = isAuthPage;
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const storedTheme = window.localStorage.getItem('theme');
    if (storedTheme) return storedTheme === 'dark';
    return false;
  });
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!moreMenuRef.current) return;
      const target = event.target as Node;
      if (!moreMenuRef.current.contains(target)) {
        setIsMoreOpen(false);
      }
    };

    if (isMoreOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      const target = event.target as Node;
      if (!profileMenuRef.current.contains(target)) {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

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

  useEffect(() => {
    setIsMoreOpen(false);
    setIsProfileMenuOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('theme-dark');
      window.localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('theme-dark');
      window.localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);
  const navigate = useNavigate();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    setIsMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const logoSrc = isDarkMode
    ? '/assests/frontendPictures/logoWhiteA.png'
    : '/assests/frontendPictures/logoBlackA.png';

  const navItems = [
    { to: '/browse', label: t('Buy', 'شراء'), icon: SearchCheck },
    { to: '/sell', label: t('Sell', 'بيع'), icon: HandCoins },
    { to: '/auctions', label: t('Auction', 'المزادات'), icon: Gavel }
  ] as const;

  const moreItems = [
    { to: '/how-it-works', label: t('How it Works', 'الية العمل'), icon: CircleHelp },
    { to: '/press', label: t('Press', 'الصحافة'), icon: Newspaper }
  ] as const;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link gap-2 ${isActive ? 'nav-link-active' : ''}`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 backdrop-blur-md border-b nav-shell">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group" aria-label="AUTOUSATA home">
              <div className="h-12 w-12 rounded-full border border-white/10 bg-white/80 flex items-center justify-center shadow-sm nav-logo-badge">
                <img src={logoSrc} alt="AUTOUSATA logo" className="h-9 w-9" />
              </div>
              <div className="leading-none">
                <span className="block text-2xl font-semibold text-slate-900 tracking-tight nav-logo-title">AUTOUSATA</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6 px-6 py-2 rounded-full border nav-pill shadow-sm" aria-label="Primary">
              {navItems.map(item => (
                <NavLink key={item.to} to={item.to} className={navLinkClass}>
                  <span className="nav-link-glyph">
                    <item.icon size={14} />
                  </span>
                  {item.label}
                </NavLink>
              ))}
              <div className="relative" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsMoreOpen(prev => !prev)}
                  className={`nav-link gap-2 ${isMoreOpen ? 'nav-link-open' : ''}`}
                  aria-haspopup="menu"
                  aria-expanded={isMoreOpen}
                >
                  <span className="nav-link-glyph">
                    <MoreHorizontal size={16} />
                  </span>
                  {t('More', 'المزيد')}
                </button>
                {isMoreOpen && (
                  <div className="absolute top-full mt-3 right-0 w-56 rounded-2xl border border-slate-200 bg-slate-900/95 shadow-lg overflow-hidden z-50 backdrop-blur">
                    <div className="flex flex-col py-2">
                      {moreItems.map(item => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 hover:text-white"
                          onClick={() => setIsMoreOpen(false)}
                        >
                          <item.icon size={16} className="text-slate-300" />
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </nav>

            {/* Desktop User Actions */}
            <div className="hidden md:flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsDarkMode(prev => !prev)}
                className="relative inline-flex items-center w-14 h-8 rounded-full theme-toggle transition-colors"
                aria-label="Toggle dark mode"
              >
                <span className="absolute left-2 text-xs theme-toggle-icon">
                  <Sun size={14} />
                </span>
                <span className="absolute right-2 text-xs text-white/80">
                  <Moon size={14} />
                </span>
                <span
                  className={`absolute top-1 left-1 h-6 w-6 rounded-full theme-toggle-thumb shadow-md transition-transform ${
                    isDarkMode ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
              <div className="dir-toggle" role="group" aria-label={t('Language', 'اللغة')}>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`dir-toggle-btn ${language === 'en' ? 'dir-toggle-btn-active' : ''}`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('ar')}
                  className={`dir-toggle-btn ${language === 'ar' ? 'dir-toggle-btn-active' : ''}`}
                >
                  AR
                </button>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsNotifOpen(prev => !prev);
                    markAllRead();
                  }}
                  className="relative p-2 rounded-full nav-icon hover:bg-slate-100 transition-colors overflow-visible"
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
                      <span className="text-sm font-semibold text-slate-900">{t('Notifications', 'الإشعارات')}</span>
                      <button
                        type="button"
                        onClick={clearNotifications}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        {t('Clear', 'امسح')}
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-slate-500">
                          {t('No notifications yet.', 'لسه مفيش إشعارات.')}
                        </div>
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
                                ? t('Bid completed', 'تم تأكيد المزايدة')
                                : note.tone === 'warn'
                                  ? t('Alert', 'تنبيه')
                                  : note.tone === 'error'
                                    ? t('Error', 'خطأ')
                                    : t('Update', 'تحديث')}
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
              {loading ? (
                <div className="w-20 h-10"></div>
              ) : user ? (
                <div className="relative" ref={profileMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen(prev => !prev)}
                    className="flex items-center gap-2 rounded-full border-2 border-slate-200 px-1 py-1 hover:border-indigo-600 transition-all shadow-sm"
                    aria-haspopup="menu"
                    aria-expanded={isProfileMenuOpen}
                  >
                    <span className="flex items-center justify-center w-10 h-10 rounded-full overflow-hidden">
                      {user.profileImage ? (
                        <img src={user.profileImage} alt={t('Profile', 'الملف الشخصي')} className="w-full h-full object-cover" />
                      ) : (
                        <div className="bg-slate-100 w-full h-full flex items-center justify-center text-slate-400">
                          <UserIcon size={20} />
                        </div>
                      )}
                    </span>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-900">{user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                      <div className="flex flex-col py-2 text-sm text-slate-700">
                        <Link
                          to="/profile"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50"
                        >
                          <UserIcon size={16} />
                          {t('Profile', 'الملف الشخصي')}
                        </Link>
                        <Link
                          to="/my-listings"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50"
                        >
                          <ListChecks size={16} />
                          {t('My Listings', 'اعلاناتي')}
                        </Link>
                        <Link
                          to="/my-garage"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50"
                        >
                          <Car size={16} />
                          {t('My Garage', 'جراجي')}
                        </Link>
                      </div>
                      <div className="border-t border-slate-100">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          {t('Sign Out', 'تسجيل خروج')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // === User is Guest ===
                <>
                <NavLink
                    to="/login"
                    className="nav-link text-sm"
                  >
                    {t('Login', 'تسجيل دخول')}
                  </NavLink>
                  <NavLink
                    to="/signup"
                    className="nav-cta px-5 py-2 rounded-full text-sm font-semibold transition-all hover:brightness-110"
                  >
                    {t('Sign up', 'اعمل حساب')}
                  </NavLink>
                </>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md nav-icon hover:bg-slate-100"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white nav-mobile">
            <div className="px-4 py-4 space-y-3">
              {navItems.map(item => (
                <NavLink key={item.to} to={item.to} className={navLinkClass} onClick={() => setIsMenuOpen(false)}>
                  <span className="nav-link-glyph">
                    <item.icon size={14} />
                  </span>
                  {item.label}
                </NavLink>
              ))}
              <div className="pt-2 border-t border-slate-200">
                {moreItems.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={navLinkClass}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="nav-link-glyph">
                      <item.icon size={14} />
                    </span>
                    {item.label}
                  </NavLink>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsDarkMode(prev => !prev)}
                className="flex items-center justify-between w-full px-4 py-2 rounded-full border nav-pill text-sm font-semibold"
              >
                <span className="flex items-center gap-2">
                  {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
                  {isDarkMode ? t('Dark mode', 'الوضع الداكن') : t('Light mode', 'الوضع الفاتح')}
                </span>
                <span className={`h-4 w-8 rounded-full relative theme-toggle`}>
                  <span
                    className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full theme-toggle-thumb transition-transform ${
                      isDarkMode ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </span>
              </button>
              <div className="dir-toggle dir-toggle-mobile" role="group" aria-label={t('Language', 'اللغة')}>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`dir-toggle-btn ${language === 'en' ? 'dir-toggle-btn-active' : ''}`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('ar')}
                  className={`dir-toggle-btn ${language === 'ar' ? 'dir-toggle-btn-active' : ''}`}
                >
                  عربي (مصري)
                </button>
              </div>
              
              <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
                {loading ? (
                  <div className="p-2 text-sm text-slate-400">{t('Loading...', 'تحميل...')}</div>
                ) : user ? (
                  <>
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
                        <p className="text-xs text-slate-500">{t('Profile', 'الملف الشخصي')}</p>
                      </div>
                    </Link>
                    <Link
                      to="/my-listings"
                      className="w-full p-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t('My Listings', 'اعلاناتي')}
                    </Link>
                    <Link
                      to="/my-garage"
                      className="w-full p-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t('My Garage', 'جراجي')}
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full p-2 rounded-lg bg-red-50 text-red-600 text-sm font-semibold border border-red-100 hover:bg-red-100 transition-colors"
                    >
                      {t('Sign Out', 'تسجيل خروج')}
                    </button>
                  </>
                ) : (
                  <>
                    <NavLink
                      to="/login"
                      className="nav-link nav-mobile-auth text-sm"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t('Login', 'تسجيل دخول')}
                    </NavLink>
                    <NavLink
                      to="/signup"
                      className="nav-mobile-auth rounded-full bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-400 shadow-md shadow-indigo-500/30 transition-all"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t('Sign up', 'اعمل حساب')}
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
        <footer className="site-footer bg-slate-950 text-slate-200 border-t border-slate-800/70">
          {/* Footer content unchanged */}
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
                  {t(
                    'A premium marketplace built for collectors and daily drivers alike. Transparent auctions, verified sellers, and concierge support from first click to final handover.',
                    'سوق فاخر لهواة الاقتناء والمستخدمين اليوميين. مزادات واضحة، بائعون موثقون، ودعم متخصص من أول خطوة حتى التسليم.'
                  )}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
                  {t('Explore', 'استكشف')}
                </h3>
                <ul className="space-y-3 text-sm text-slate-200">
                  <li><Link to="/browse" className="hover:text-indigo-400">{t('Buy a car', 'اشتري عربية')}</Link></li>
                  <li><Link to="/auctions" className="hover:text-indigo-400">{t('Live auctions', 'مزادات مباشرة')}</Link></li>
                  <li><Link to="/sell" className="hover:text-indigo-400">{t('Sell a Car', 'بيع عربية')}</Link></li>
                  <li><Link to="/press" className="hover:text-indigo-400">{t('Press', 'الصحافة')}</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
                  {t('Company', 'الشركة')}
                </h3>
                <ul className="space-y-3 text-sm text-slate-200">
                  <li><Link to="/how-it-works" className="hover:text-indigo-400">{t('How it Works', 'الية العمل')}</Link></li>
                  <li><Link to="/terms" className="hover:text-indigo-400">{t('Terms of Service', 'شروط الخدمة')}</Link></li>
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
