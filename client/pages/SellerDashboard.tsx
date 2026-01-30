
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { 
  Plus, Package, DollarSign, TrendingUp, Users, Clock, 
  ChevronRight, ArrowUpRight, MoreHorizontal
} from 'lucide-react';
import { User } from '../types';

const data = [
  { name: 'Jan', sales: 4000, views: 2400 },
  { name: 'Feb', sales: 3000, views: 1398 },
  { name: 'Mar', sales: 2000, views: 9800 },
  { name: 'Apr', sales: 2780, views: 3908 },
  { name: 'May', sales: 1890, views: 4800 },
];

const SellerDashboard: React.FC<{ user: User }> = ({ user }) => {
  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Seller Dashboard</h1>
            <p className="text-slate-500 mt-1">Track your performance and manage your active listings.</p>
          </div>
          <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/30 transition-all">
            <Plus size={20} />
            Create New Listing
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Total Sales', value: '$412,500', trend: '+12.5%', icon: DollarSign, color: 'indigo' },
            { label: 'Active Listings', value: '8', trend: 'Stable', icon: Package, color: 'emerald' },
            { label: 'Avg. Views', value: '1.2k', trend: '+18.2%', icon: Users, color: 'amber' },
            { label: 'Sale Rate', value: '92%', trend: '+4.3%', icon: TrendingUp, color: 'rose' }
          ].map((stat, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-xl bg-${stat.color}-50 text-${stat.color}-600`}>
                  <stat.icon size={20} />
                </div>
                <span className={`text-xs font-bold ${stat.trend.startsWith('+') ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {stat.trend}
                </span>
              </div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stat.value}</h3>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-lg text-slate-900">Performance Analytics</h3>
              <select className="text-sm border-none bg-slate-50 rounded-lg px-3 py-1.5 focus:ring-0">
                <option>Last 30 Days</option>
                <option>Last 6 Months</option>
              </select>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Bar dataKey="views" fill="#818cf8" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Actions / Recent Activity */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
            <h3 className="font-bold text-lg text-slate-900 mb-6">Recent Activity</h3>
            <div className="space-y-6">
              {[
                { title: 'New bid on RS6 Avant', desc: 'From @user123 for $98,500', time: '2m ago' },
                { title: 'Listing Approved', desc: '2026 Porsche 911 is now live', time: '1h ago' },
                { title: 'Payout Processed', desc: 'Funds released for Ford Raptor sale', time: '5h ago' }
              ].map((act, idx) => (
                <div key={idx} className="flex gap-4 group cursor-pointer">
                  <div className="w-1.5 h-10 rounded-full bg-indigo-100 group-hover:bg-indigo-600 transition-all"></div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{act.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{act.desc}</p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-medium">{act.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-8 py-3 bg-slate-50 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all">
              View All History
            </button>
          </div>
        </div>

        {/* Listings Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-lg text-slate-900">Your Listings</h3>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">Active</button>
              <button className="px-3 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-400">Sold</button>
              <button className="px-3 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-400">Drafts</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vehicle</th>
                  <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Bid</th>
                  <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bids</th>
                  <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { name: '2021 Porsche 911', price: '$95,000', bids: 14, status: 'Active' },
                  { name: '2022 Tesla Model S', price: '$82,000', bids: 8, status: 'Active' },
                  { name: '2021 Ford Bronco', price: '$61,000', bids: 22, status: 'Active' }
                ].map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <img src={`https://picsum.photos/seed/${idx}/60/60`} className="w-12 h-12 rounded-xl object-cover shadow-sm" alt="" />
                        <span className="font-bold text-slate-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 font-bold text-indigo-600">{item.price}</td>
                    <td className="px-8 py-6 text-sm text-slate-500">{item.bids}</td>
                    <td className="px-8 py-6">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">{item.status}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg transition-all shadow-none hover:shadow-sm">
                        <MoreHorizontal size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SellerDashboard;
