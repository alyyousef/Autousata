import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, ChevronLeft, ChevronRight } from 'lucide-react';

import { listUsers, searchUsers, type AdminUserSearchResult } from '../services/adminApi';

const LIMIT = 20;

const AdminUsersPage: React.FC = () => {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<AdminUserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = async (query: string, p: number) => {
    setError('');
    setLoading(true);
    try {
      const isSearching = query.trim().length >= 1;

      const data = isSearching
        ? await searchUsers(query.trim(), p, LIMIT)
        : await listUsers(p, LIMIT);

      setUsers(data.items);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
      setUsers([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // Load ALL users on first render
  useEffect(() => {
    fetchData('', 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search: when q changes, reset to page 1 and fetch
  useEffect(() => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    debounceTimeoutRef.current = setTimeout(() => {
      fetchData(q, 1);
    }, 300);

    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const goToPage = (p: number) => {
    const next = Math.min(Math.max(p, 1), totalPages);
    fetchData(q, next);
  };

  const showingFrom = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const showingTo = Math.min(page * LIMIT, total);

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <Users className="text-slate-900" size={22} />
              <h1 className="text-3xl font-black text-slate-900">User Moderation</h1>
            </div>
            <p className="text-slate-500 mt-1">Browse all users, or search by name, email, or phone.</p>
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
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by name, email, phone"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <button
                onClick={() => fetchData(q, 1)}
                disabled={loading}
                className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Users size={18} />
                {q.trim().length >= 1 ? 'Search' : 'Refresh'}
              </button>
            </div>

            {/* Pagination header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
              <div className="text-sm text-slate-600">
                {loading ? 'Loading…' : `Showing ${showingFrom}-${showingTo} of ${total}`}
                {q.trim().length >= 1 && !loading && (
                  <span className="text-slate-400"> · filtered</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={loading || page <= 1}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-1">
                    <ChevronLeft size={16} /> Prev
                  </span>
                </button>

                <div className="text-sm text-slate-600 px-2">
                  Page <span className="font-semibold text-slate-900">{page}</span> / {totalPages}
                </div>

                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={loading || page >= totalPages}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-1">
                    Next <ChevronRight size={16} />
                  </span>
                </button>
              </div>
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

                  {!loading && users.length === 0 && !error && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-sm text-slate-500">
                        {q.trim().length >= 1 ? 'No users found.' : 'No users yet.'}
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-4 py-5 text-sm text-slate-700">{u.email || '-'}</td>
                        <td className="px-4 py-5 text-sm font-semibold text-slate-900">
                           <Link
    to={`/admin/users/${u.id}`}
    state={{ user: u }} // ✅ pass what you already have to avoid extra fetch
    className="hover:underline"
  >
                          {`${u.firstName || ''} ${u.lastName || ''}`.trim() || '-'}
                      </Link>  </td>
                        <td className="px-4 py-5 text-sm text-slate-700">{u.phone || '-'}</td>
                        <td className="px-4 py-5 text-sm text-slate-700">{u.role || '-'}</td>
                        <td className="px-4 py-5">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                              u.isBanned === '1'
                                ? 'bg-rose-50 text-rose-600'
                                : u.isActive === '0'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {u.isBanned === '1' ? 'BANNED' : u.isActive === '0' ? 'SUSPENDED' : 'ACTIVE'}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-sm text-slate-700">{u.kycStatus || '-'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Bottom pagination (optional duplicate) */}
            {totalPages > 1 && (
              <div className="flex justify-end mt-6">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={loading || page <= 1}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={loading || page >= totalPages}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsersPage;
