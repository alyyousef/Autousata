import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users } from 'lucide-react';

import { searchUsers, type AdminUserSearchResult } from '../services/adminApi';

const AdminUsersPage: React.FC = () => {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<AdminUserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (q.trim().length < 2) return;
    setError('');
    setLoading(true);
    try {
      const data = await searchUsers(q.trim());
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to search users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <Users className="text-slate-900" size={22} />
              <h1 className="text-3xl font-black text-slate-900">User Moderation</h1>
            </div>
            <p className="text-slate-500 mt-1">Search by name, email, or phone.</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/admin"
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 overflow-hidden premium-card-hover">
          <div className="p-8">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by name, email, phone"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading || q.trim().length < 2}
                className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Users size={18} />
                Search
              </button>
            </div>

            {error && (
              <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</th>
                    <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</th>
                    <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</th>
                    <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role</th>
                    <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">KYC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-sm text-slate-500">
                        Loading...
                      </td>
                    </tr>
                  )}

                  {!loading && q.trim().length > 0 && q.trim().length < 2 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-sm text-slate-500">
                        Type at least 2 characters to search.
                      </td>
                    </tr>
                  )}

                  {!loading && q.trim().length >= 2 && users.length === 0 && !error && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-sm text-slate-500">
                        No users found.
                      </td>
                    </tr>
                  )}

                  {!loading && users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-4 py-5 text-sm text-slate-700">{u.email || '-'}</td>
                      <td className="px-4 py-5 text-sm font-semibold text-slate-900">{`${u.firstName || ''} ${u.lastName || ''}`.trim() || '-'}</td>
                      <td className="px-4 py-5 text-sm text-slate-700">{u.phone || '-'}</td>
                      <td className="px-4 py-5 text-sm text-slate-700">{u.role || '-'}</td>
                      <td className="px-4 py-5">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${u.isBanned === '1' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}
                        >
                          {u.isBanned === '1' ? 'BANNED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-sm text-slate-700">{u.kycStatus || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsersPage;
