import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Bell, Car, LayoutDashboard, LogOut, Menu, PlusCircle, Shield, X } from 'lucide-react';
import { User, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface AppLayoutProps {
  user: User | null;
}

const AppLayout: React.FC<AppLayoutProps> = ({ user: userProp }) => {
  const { user: authUser, logout } = useAuth();
  const user = userProp || authUser;
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!user) {
    navigate('/login');
    return null;
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
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                  <img src="/Autoustata.png" alt="Autousata logo" className="h-8 w-8" />
                </div>
                <span className="text-xl font-bold text-slate-900 tracking-tight">Autousata</span>
              </Link>
              <div className="hidden md:ml-10 md:flex md:space-x-8">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent transition-all"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <button className="p-2 text-slate-400 hover:text-slate-500 relative" aria-label="Notifications">
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
              </button>
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

      <footer className="bg-slate-900 text-slate-300">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                  <img src="/Autoustata.png" alt="Autousata logo" className="h-8 w-8" />
                </div>
                <span className="text-xl font-bold text-white tracking-tight">Autousata</span>
              </div>
              <p className="text-sm leading-6 max-w-xs">
                The world's most trusted online marketplace for buying and selling exceptional vehicles. Secure, transparent, and built for enthusiasts.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Marketplace</h3>
              <ul className="space-y-3 text-sm">
                <li><Link to="/browse" className="hover:text-indigo-400">All Auctions</Link></li>
                <li><Link to="/how-it-works" className="hover:text-indigo-400">How it Works</Link></li>
                <li><Link to="/about" className="hover:text-indigo-400">About</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Support</h3>
              <ul className="space-y-3 text-sm">
                <li><Link to="/about" className="hover:text-indigo-400">Help Center</Link></li>
                <li><Link to="/about" className="hover:text-indigo-400">Contact Us</Link></li>
                <li><Link to="/about" className="hover:text-indigo-400">Buyer Protections</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Legal</h3>
              <ul className="space-y-3 text-sm">
                <li><Link to="/about" className="hover:text-indigo-400">Privacy Policy</Link></li>
                <li><Link to="/about" className="hover:text-indigo-400">Terms of Service</Link></li>
                <li><Link to="/about" className="hover:text-indigo-400">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-800 text-xs text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
            <p>&copy; 2026 Autousata, Inc. All rights reserved.</p>
            <div className="flex gap-6">
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
