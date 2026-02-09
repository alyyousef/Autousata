
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, Package, DollarSign, TrendingUp, 
  ChevronRight, Tag, Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

interface SellerVehicle {
  _id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  status: string;
  images: string[];
}

const SellerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t, formatNumber, formatCurrencyEGP } = useLanguage();

  const [vehicles, setVehicles] = useState<SellerVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getSellerVehicles();
      if (res.data) {
        setVehicles(res.data as SellerVehicle[]);
      } else {
        setError(res.error || t('Failed to load listings', 'فشل تحميل القوائم'));
      }
    } catch {
      setError(t('Network error', 'خطأ في الشبكة'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  const activeCount = vehicles.filter(v => v.status === 'active').length;
  const soldCount = vehicles.filter(v => v.status === 'sold').length;
  const totalRevenue = vehicles
    .filter(v => v.status === 'sold')
    .reduce((sum, v) => sum + (v.price || 0), 0);

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl font-black text-slate-900">{t('Seller Dashboard', 'لوحة تحكم البائع')}</h1>
            <p className="text-slate-500 mt-1">{t('Track your performance and manage your active listings.', 'تابع أداءك وأدر قوائمك النشطة.')}</p>
          </div>
          <Link to="/sell" className="px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/30 transition-all">
            <Plus size={20} />
            {t('Create New Listing', 'إنشاء قائمة جديدة')}
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/95 rounded-3xl p-6 shadow-sm border border-slate-200 premium-card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600"><DollarSign size={20} /></div>
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{t('Total Revenue', 'إجمالي الإيرادات')}</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{formatCurrencyEGP(totalRevenue)}</h3>
          </div>
          <div className="bg-white/95 rounded-3xl p-6 shadow-sm border border-slate-200 premium-card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><Package size={20} /></div>
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{t('Active Listings', 'القوائم النشطة')}</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{formatNumber(activeCount)}</h3>
          </div>
          <div className="bg-white/95 rounded-3xl p-6 shadow-sm border border-slate-200 premium-card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600"><TrendingUp size={20} /></div>
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{t('Vehicles Sold', 'سيارات مباعة')}</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{formatNumber(soldCount)}</h3>
          </div>
        </div>

        {/* Listings Table */}
        <div className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 overflow-hidden premium-card-hover">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-lg text-slate-900">{t('Your Listings', 'قوائمك')}</h3>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-sm text-rose-600 mb-4">{error}</p>
              <button onClick={fetchData} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold">
                {t('Retry', 'إعادة المحاولة')}
              </button>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Package size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="font-semibold">{t('No listings yet', 'لا توجد قوائم بعد')}</p>
              <p className="text-sm mt-1">{t('Create your first listing to get started.', 'أنشئ قائمتك الأولى للبدء.')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Vehicle', 'السيارة')}</th>
                    <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Price', 'السعر')}</th>
                    <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Status', 'الحالة')}</th>
                    <th className="px-8 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Action', 'إجراء')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicles.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          {item.images?.[0] ? (
                            <img src={item.images[0]} className="w-12 h-12 rounded-xl object-cover shadow-sm" alt={`${item.year} ${item.make} ${item.model}`} />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300"><Tag size={20} /></div>
                          )}
                          <span className="font-bold text-slate-900">{item.year} {item.make} {item.model}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 font-bold text-indigo-600">{formatCurrencyEGP(item.price)}</td>
                      <td className="px-8 py-6">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          item.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                          item.status === 'sold' ? 'bg-blue-50 text-blue-600' :
                          'bg-slate-50 text-slate-500'
                        }`}>
                          {item.status === 'active' ? t('Active', 'نشطة') : 
                           item.status === 'sold' ? t('Sold', 'مباعة') :
                           item.status === 'draft' ? t('Draft', 'مسودة') : item.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <Link to={`/listing/${item._id}`} className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-semibold">
                          {t('View', 'عرض')} <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default SellerDashboard;
