import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowLeft, RefreshCw } from "lucide-react";
import { apiService } from "../services/api";
import type { ActivityAnalyticsResponse } from "../types/activity";

const badge = (kind: "good" | "warn" | "bad", text: string) => {
  const cls =
    kind === "good"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : kind === "warn"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-rose-50 text-rose-600 border-rose-200";
  return (
    <span
      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${cls}`}
    >
      {text}
    </span>
  );
};

const AdminActivityAnalyticsPage: React.FC = () => {
  const [from, setFrom] = useState("2026-02-01T00:00:00Z");
  const [to, setTo] = useState("2026-02-11T23:59:59Z");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<ActivityAnalyticsResponse | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiService.adminGetActivityAnalytics({ from, to });
      if (res.error) throw new Error(res.error);
      setData(res.data as any);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxTrend = useMemo(() => {
    const arr = data?.trend || [];
    return Math.max(1, ...arr.map((x) => x.count || 0));
  }, [data]);

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/activity"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
            >
              <ArrowLeft size={16} />
              Back
            </Link>
            <div className="text-sm text-slate-400">
              Admin / Activity / Analytics
            </div>
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Insights
                </p>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
                  Activity Analytics
                </h1>
                <p className="text-sm text-slate-500 mt-2">
                  Counts by severity, actions, and activity trend.
                </p>
              </div>

              <div className="flex items-end gap-2">
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    From
                  </div>
                  <input
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    To
                  </div>
                  <input
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <button
                  onClick={load}
                  className="px-4 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
                >
                  Apply
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold">
                {error}
              </div>
            )}

            {!data && !loading && (
              <div className="mt-6 text-sm text-slate-500">No data.</div>
            )}

            {data && (
              <>
                {/* KPIs */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Total Events
                    </div>
                    <div className="mt-2 text-3xl font-black text-slate-900">
                      {data.kpis.total}
                    </div>
                    <div className="mt-2">{badge("good", "ALL")}</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Alerts
                    </div>
                    <div className="mt-2 text-3xl font-black text-slate-900">
                      {data.kpis.alerts}
                    </div>
                    <div className="mt-2">{badge("bad", "ALERT")}</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Suspicious
                    </div>
                    <div className="mt-2 text-3xl font-black text-slate-900">
                      {data.kpis.suspicious}
                    </div>
                    <div className="mt-2">{badge("warn", "FLAGGED")}</div>
                  </div>
                </div>

                {/* By severity */}
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black text-slate-900">
                        By Severity
                      </h3>
                      <Activity size={18} className="text-slate-400" />
                    </div>
                    <div className="mt-4 space-y-3">
                      {(data.bySeverity || []).map((x) => (
                        <div
                          key={x.severity}
                          className="flex items-center gap-3"
                        >
                          <div className="w-24">
                            {badge(
                              x.severity === "INFO"
                                ? "good"
                                : x.severity === "WARN"
                                  ? "warn"
                                  : "bad",
                              x.severity,
                            )}
                          </div>
                          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-3 bg-slate-900"
                              style={{
                                width: `${Math.min(100, (x.count / Math.max(1, data.kpis.total)) * 100)}%`,
                              }}
                            />
                          </div>
                          <div className="w-14 text-right text-sm font-black text-slate-900">
                            {x.count}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Trend */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h3 className="text-lg font-black text-slate-900">Trend</h3>
                    <div className="mt-4 space-y-2">
                      {(data.trend || []).map((x) => (
                        <div key={x.date} className="flex items-center gap-3">
                          <div className="w-28 text-xs font-mono text-slate-600">
                            {x.date}
                          </div>
                          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-3 bg-slate-900"
                              style={{
                                width: `${(x.count / maxTrend) * 100}%`,
                              }}
                            />
                          </div>
                          <div className="w-14 text-right text-sm font-black text-slate-900">
                            {x.count}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top actions */}
                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
                  <h3 className="text-lg font-black text-slate-900">
                    Top Actions
                  </h3>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(data.topActions || []).slice(0, 10).map((x) => (
                      <div
                        key={x.action}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="text-sm font-black text-slate-900">
                          {x.action}
                        </div>
                        <div className="mt-2 text-xs text-slate-500">Count</div>
                        <div className="text-2xl font-black text-slate-900">
                          {x.count}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {loading && (
              <div className="mt-6 text-sm text-slate-500">Loading...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminActivityAnalyticsPage;
