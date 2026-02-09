import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Wallet,
  TrendingUp,
  Receipt,
  ShieldAlert,
} from "lucide-react";
import {
  getRevenueDashboard,
  type RevenueDashboardResponse,
  type RevenueGroupBy,
} from "../services/adminApi";

const kpiCard = (
  title: string,
  value: string,
  icon: React.ReactNode,
  hint?: string
) => (
  <div className="bg-white/95 rounded-3xl p-6 shadow-sm border border-slate-200 premium-card-hover">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          {title}
        </p>
        <h3 className="text-2xl font-black text-slate-900 mt-2">{value}</h3>
        {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      </div>
      <div className="p-4 rounded-2xl bg-slate-50 text-slate-700">{icon}</div>
    </div>
  </div>
);

const money = (n: number) => `${Math.round(n).toLocaleString()} EGP`;
const toDateOnly = (d: Date) => d.toISOString().slice(0, 10);

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toDateOnly(d);
}

function diffDaysInclusive(from: string, to: string) {
  const a = new Date(from + "T00:00:00").getTime();
  const b = new Date(to + "T00:00:00").getTime();
  const ms = b - a;
  const days = Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
  return Math.max(1, days);
}

function downloadCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const AdminRevenueDashboard: React.FC = () => {
  const today = new Date();
  const toDefault = toDateOnly(today);
  const fromDefault = toDateOnly(
    new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  );

  const [from, setFrom] = useState(fromDefault);
  const [to, setTo] = useState(toDefault);
  const [groupBy, setGroupBy] = useState<RevenueGroupBy>("day");

  const [data, setData] = useState<RevenueDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [compareLoading, setCompareLoading] = useState(false);
  const [prevCommission, setPrevCommission] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getRevenueDashboard(from, to, groupBy);
      setData(res);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load revenue dashboard"
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const loadComparison = async () => {
    const days = diffDaysInclusive(from, to);
    const prevTo = addDays(from, -1);
    const prevFrom = addDays(from, -days);

    setCompareLoading(true);
    try {
      const prev = await getRevenueDashboard(prevFrom, prevTo, groupBy);
      setPrevCommission(prev.kpis?.commissionEgp ?? 0);
    } catch {
      setPrevCommission(null);
    } finally {
      setCompareLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadComparison();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, groupBy]);

  const kpis = data?.kpis;

  const netRevenue = useMemo(() => {
    if (!kpis) return 0;
    return kpis.commissionEgp - kpis.processorFeesEgp;
  }, [kpis]);

  const avgPerBucket = useMemo(() => {
    const series = data?.series || [];
    if (!series.length) return 0;
    const sum = series.reduce((acc, r) => acc + (r.commissionEgp || 0), 0);
    return sum / series.length;
  }, [data]);

  const trend = useMemo(() => {
    const current = data?.kpis?.commissionEgp ?? 0;
    const prev = prevCommission ?? 0;
    if (prevCommission === null) return null;
    const delta = current - prev;
    const pct = prev === 0 ? null : (delta / prev) * 100;
    return { delta, pct };
  }, [data, prevCommission]);

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
            >
              <ArrowLeft size={16} />
              Back
            </Link>
            <div className="text-sm text-slate-400">Admin / Finance / Revenue</div>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <BarChart3 className="text-slate-900" size={22} />
              <h1 className="text-3xl font-black text-slate-900">
                Revenue Dashboard
              </h1>
            </div>
            <p className="text-slate-500 mt-1">
              Track platform income and key financial KPIs (earned on escrow
              release).
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white/95 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
            {/* Presets + Export */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  const t = toDateOnly(new Date());
                  setFrom(t);
                  setTo(t);
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-white"
              >
                Today
              </button>

              <button
                onClick={() => {
                  const t = toDateOnly(new Date());
                  setTo(t);
                  setFrom(toDateOnly(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)));
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-white"
              >
                Last 7 days
              </button>

              <button
                onClick={() => {
                  const t = toDateOnly(new Date());
                  setTo(t);
                  setFrom(toDateOnly(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)));
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-white"
              >
                Last 30 days
              </button>

              <button
                onClick={() => {
                  const now = new Date();
                  const first = new Date(now.getFullYear(), now.getMonth(), 1);
                  setFrom(toDateOnly(first));
                  setTo(toDateOnly(now));
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-white"
              >
                This month
              </button>

              <button
                onClick={() => {
                  const rows =
                    (data?.series || []).map((r) => ({
                      bucket: r.bucket,
                      commissionEgp: r.commissionEgp,
                      gmvEgp: r.gmvEgp,
                      releasedEscrowsCount: r.releasedEscrowsCount,
                    })) || [];
                  downloadCsv(`revenue_${from}_to_${to}_${groupBy}.csv`, rows);
                }}
                disabled={!data?.series?.length}
                className="ml-auto px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Export CSV
              </button>
            </div>

            {/* Inputs */}
            <div className="flex flex-col md:flex-row gap-3">
              <label className="text-xs font-bold text-slate-700">
                From
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
                />
              </label>

              <label className="text-xs font-bold text-slate-700">
                To
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
                />
              </label>

              <label className="text-xs font-bold text-slate-700">
                Group By
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as RevenueGroupBy)}
                  className="mt-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </label>

              <button
                onClick={load}
                disabled={loading}
                className="self-end md:self-auto px-4 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {loading ? "Loading..." : "Apply"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {kpiCard(
            "Platform Revenue",
            money(kpis?.commissionEgp || 0),
            <TrendingUp size={22} />,
            "Commission earned"
          )}
          {kpiCard(
            "GMV",
            money(kpis?.gmvEgp || 0),
            <Wallet size={22} />,
            "Total transaction volume"
          )}
          {kpiCard(
            "Seller Payout",
            money(kpis?.sellerPayoutEgp || 0),
            <Receipt size={22} />,
            "Paid out to sellers"
          )}
          {kpiCard(
            "Gateway Fees",
            money(kpis?.processorFeesEgp || 0),
            <ShieldAlert size={22} />,
            "Processor costs"
          )}
        </div>

        {/* Report Summary (full width) */}
        <div className="bg-white/95 rounded-3xl p-6 shadow-sm border border-slate-200 premium-card-hover mb-8">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Report Summary
          </p>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Average per bucket
              </div>
              <div className="mt-2 text-lg font-black text-slate-900">
                {money(avgPerBucket)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Based on commission
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Trend vs previous period
              </div>
              <div className="mt-2 text-lg font-black text-slate-900">
                {compareLoading || trend === null
                  ? "—"
                  : trend.delta === 0
                  ? "No change"
                  : trend.delta > 0
                  ? `Up ${money(trend.delta)}`
                  : `Down ${money(Math.abs(trend.delta))}`}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {trend?.pct == null ? "No baseline" : `${trend.pct.toFixed(1)}%`}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Period
              </div>
              <div className="mt-2 text-sm font-black text-slate-900">
                {from} → {to}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Grouped by {groupBy}
              </div>
            </div>
          </div>
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/95 rounded-3xl p-6 shadow-sm border border-slate-200 premium-card-hover">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Net Revenue
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-2">
              {money(netRevenue)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Commission minus gateway fees
            </p>
          </div>

          <div className="bg-white/95 rounded-3xl p-6 shadow-sm border border-slate-200 premium-card-hover">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Completed Payments
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-2">
              {(kpis?.completedPaymentsCount || 0).toLocaleString()}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Payment gateway completions
            </p>
          </div>

          <div className="bg-white/95 rounded-3xl p-6 shadow-sm border border-slate-200 premium-card-hover">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Refunded Amount
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-2">
              {money(kpis?.refundedAmountEgp || 0)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Refunded transactions
            </p>
          </div>
        </div>

        {/* Series Table */}
        <div className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 overflow-hidden premium-card-hover mb-8">
          <div className="p-8 border-b border-slate-100">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Revenue Over Time
            </p>
            <h2 className="text-xl font-black text-slate-900 mt-2">Trends</h2>
            <p className="text-sm text-slate-500 mt-1">
              Grouped by {groupBy} using ESCROWS.RELEASED_AT.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Bucket
                  </th>
                  <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Commission
                  </th>
                  <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    GMV
                  </th>
                  <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Released
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-sm text-slate-500">
                      Loading...
                    </td>
                  </tr>
                )}

                {!loading && (data?.series?.length || 0) === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-sm text-slate-500">
                      No data for this range.
                    </td>
                  </tr>
                )}

                {!loading &&
                  (data?.series || []).map((r) => (
                    <tr key={r.bucket} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-4 py-5 text-sm font-bold text-slate-900">
                        {r.bucket}
                      </td>
                      <td className="px-4 py-5 text-sm text-slate-700">
                        {money(r.commissionEgp)}
                      </td>
                      <td className="px-4 py-5 text-sm text-slate-700">
                        {money(r.gmvEgp)}
                      </td>
                      <td className="px-4 py-5 text-sm text-slate-700">
                        {r.releasedEscrowsCount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Escrows by Status */}
        <div className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 overflow-hidden premium-card-hover">
          <div className="p-8 border-b border-slate-100">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Escrows
            </p>
            <h2 className="text-xl font-black text-slate-900 mt-2">
              Status Breakdown
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Helps you see money flow & operational risk.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Count
                  </th>
                  <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Total Amount
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {(data?.escrowsByStatus || []).map((s) => (
                  <tr key={s.status} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-4 py-5 text-sm font-bold text-slate-900">
                      {s.status}
                    </td>
                    <td className="px-4 py-5 text-sm text-slate-700">
                      {s.count.toLocaleString()}
                    </td>
                    <td className="px-4 py-5 text-sm text-slate-700">
                      {money(s.totalAmountEgp)}
                    </td>
                  </tr>
                ))}

                {!loading && (data?.escrowsByStatus?.length || 0) === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-sm text-slate-500">
                      No escrows found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRevenueDashboard;
