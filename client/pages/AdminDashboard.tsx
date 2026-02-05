 
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, ShieldCheck, AlertTriangle, FileCheck, Search, Filter, 
  MoreVertical, CheckCircle, XCircle, ArrowUpRight, BarChart3
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'kyc' | 'disputes' | 'reports'>('kyc');

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Admin Control Center</h1>
            <p className="text-slate-500 mt-1">Monitor platform health and handle user verifications.</p>
          </div>
          <div className="flex gap-4">
            <Link to="/admin/users" className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">
              User Moderation
            </Link>
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center gap-2 hover:bg-slate-50 transition-all">
              <BarChart3 size={18} />
              Platform Metrics
            </button>
          </div>
        </div>

        {/* Priority Queues */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="bg-white/95 rounded-3xl p-6 shadow-sm border border-slate-200 flex items-center gap-4 premium-card-hover">
            <div className="bg-indigo-50 text-indigo-600 p-4 rounded-2xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pending KYC</p>
              <h3 className="text-2xl font-black text-slate-900">24</h3>
              <p className="text-[10px] text-indigo-600 font-bold mt-1">4 Urgent</p>
            </div>
          </div>
          <div className="bg-white/95 rounded-3xl p-6 shadow-sm border border-slate-200 flex items-center gap-4 premium-card-hover">
            <div className="bg-amber-50 text-amber-600 p-4 rounded-2xl">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Disputes</p>
              <h3 className="text-2xl font-black text-slate-900">12</h3>
              <p className="text-[10px] text-amber-600 font-bold mt-1">2 New Claims</p>
            </div>
          </div>
          <div className="bg-white/95 rounded-3xl p-6 shadow-sm border border-slate-200 flex items-center gap-4 premium-card-hover">
            <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Flagged Content</p>
              <h3 className="text-2xl font-black text-slate-900">8</h3>
              <p className="text-[10px] text-rose-600 font-bold mt-1">Review Policy</p>
            </div>
          </div>
        </div>

        {/* Requirements Snapshot */}
        <div className="bg-white/95 rounded-3xl p-8 shadow-sm border border-slate-200 mb-12 premium-card-hover">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Requirements Overview</p>
              <h2 className="text-2xl font-black text-slate-900 mt-2">User Journey Coverage</h2>
              <p className="text-slate-500 text-sm mt-1">Track critical flows across authentication, KYC, listings, auctions, and payments.</p>
            </div>
            <button className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">
              Review Roadmap
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { title: 'Authentication & Access', detail: 'Register, login, reset, logout, session history', status: 'In Progress' },
              { title: 'User Profile & Verification', detail: 'Profile updates, phone/email verification, location', status: 'Planned' },
              { title: 'KYC & Compliance', detail: 'Document + selfie capture, review queue, approvals', status: 'Active' },
              { title: 'Listings, Auctions & Payments', detail: 'Listing lifecycle, bids, escrow, payments, disputes', status: 'Active' },
            ].map((item, idx) => (
              <div key={idx} className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
                <p className="text-xs font-bold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{item.detail}</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 mt-4">
                  <ArrowUpRight size={12} />
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 overflow-hidden premium-card-hover">
          {/* Tabs */}
          <div className="px-8 border-b border-slate-100">
            <div className="flex gap-8">
              {['kyc', 'disputes', 'reports'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`py-6 text-sm font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8">
            {activeTab === 'kyc' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">User</th>
                      <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
                      <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Submitted</th>
                      <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-4 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { name: 'Ahmed Sayed', email: 'ahmed@example.com', type: 'Dealer', date: '2h ago', status: 'Pending' },
                      { name: 'Mohamed Hamdy', email: 'mohamed@example.com', type: 'Seller', date: '5h ago', status: 'In Review' },
                      { name: 'Youssef Khaled', email: 'youssef@example.com', type: 'Buyer', date: '1d ago', status: 'Pending' }
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-4 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                              <img src={`https://picsum.photos/seed/${row.name}/40/40`} alt="" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{row.name}</p>
                              <p className="text-xs text-slate-400">{row.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-6 text-sm text-slate-600">{row.type}</td>
                        <td className="px-4 py-6 text-sm text-slate-500">{row.date}</td>
                        <td className="px-4 py-6">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${row.status === 'In Review' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-6 text-right">
                          <div className="flex justify-end gap-2">
                            <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Approve">
                              <CheckCircle size={18} />
                            </button>
                            <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Reject">
                              <XCircle size={18} />
                            </button>
                            <button
                              className="p-2 text-slate-400 hover:text-slate-900 rounded-lg transition-all"
                              title="More actions"
                              aria-label="More actions"
                            >
                              <MoreVertical size={18} />
                            </button>
                          </div>
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
    </div>
  );
};

export default AdminDashboard;
