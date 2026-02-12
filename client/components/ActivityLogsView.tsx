import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  ShieldAlert,
  RefreshCw,
  Filter,
  Eye,
  Copy,
  Activity,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import { apiService } from "../services/api"; // adjust if needed
import type {
  ActivityLogItem,
  ActivitySeverity,
  ActivityQuery,
  PagedActivityLogs,
} from "../types/activity";
import { connectAdminSocket } from "../services/adminSocket";

const LIMIT = 25;

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

function formatDate(d: string) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleString();
}

function severityPill(sev: ActivitySeverity) {
  if (sev === "INFO") return badge("good", "INFO");
  if (sev === "WARN") return badge("warn", "WARN");
  if (sev === "ALERT") return badge("bad", "ALERT");
  return badge("bad", "ERROR");
}

const copyText = async (t: string) => {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    return false;
  }
};

export type ActivityLogsPreset = Partial<ActivityQuery> & {
  title?: string;
  subtitle?: string;
  backTo?: string; // default "/admin"
  crumb?: string; // default "Admin / Activity Logs"
};

const ActivityLogsView: React.FC<{ preset?: ActivityLogsPreset }> = ({
  preset,
}) => {
  // Defaults (can be overridden by preset)
  const initialTitle = preset?.title ?? "Admin Activity Log";
  const initialSubtitle =
    preset?.subtitle ??
    "Search, filter, investigate suspicious actions, and audit all system events.";
  const backTo = preset?.backTo ?? "/admin";
  const crumb = preset?.crumb ?? "Admin / Activity Logs";

  // Filters
  const [search, setSearch] = useState(preset?.search ?? "");
  const [severity, setSeverity] = useState<string>(preset?.severity ?? "");
  const [role, setRole] = useState<string>(preset?.role ?? "");
  const [action, setAction] = useState<string>(preset?.action ?? "");
  const [entityType, setEntityType] = useState<string>(
    preset?.entityType ?? "",
  );
  const [entityId, setEntityId] = useState<string>(preset?.entityId ?? "");
  const [suspiciousOnly, setSuspiciousOnly] = useState<boolean>(
    preset?.suspiciousOnly ?? false,
  );

  // Date range
  const [from, setFrom] = useState<string>(preset?.from ?? "");
  const [to, setTo] = useState<string>(preset?.to ?? "");

  // Pagination
  const [page, setPage] = useState(preset?.page ?? 1);

  // Data
  const [items, setItems] = useState<ActivityLogItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<ActivityLogItem | null>(null);

  // Live feed
  const [livePaused, setLivePaused] = useState(false);
  const [live, setLive] = useState<ActivityLogItem[]>([]);
  const [toast, setToast] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2200);
  };

  const query = useMemo(
    () => ({
      page,
      limit: LIMIT,
      search: search.trim() || undefined,
      severity: severity || undefined,
      role: role || undefined,
      action: action.trim() || undefined,
      entityType: entityType || undefined,
      entityId: entityId.trim() || undefined,
      suspiciousOnly,
      from: from || undefined,
      to: to || undefined,
    }),
    [
      page,
      search,
      severity,
      role,
      action,
      entityType,
      entityId,
      suspiciousOnly,
      from,
      to,
    ],
  );

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const loadLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiService.adminGetActivityLogs(query);
      if (res.error) throw new Error(res.error);

      const data = res.data as any as PagedActivityLogs;

      setItems(data.items || []);
      setPage(data.page || page);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activity logs");
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Load initial & reload when query changes
  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    query.page,
    query.search,
    query.severity,
    query.role,
    query.action,
    query.entityType,
    query.entityId,
    query.suspiciousOnly,
    query.from,
    query.to,
  ]);

  // Reset to page 1 when filters change (except page)
  useEffect(() => {
    setPage(1);
  }, [
    search,
    severity,
    role,
    action,
    entityType,
    entityId,
    suspiciousOnly,
    from,
    to,
  ]);

  // Socket live feed
  useEffect(() => {
    const s = connectAdminSocket();

    const handler = (evt: ActivityLogItem) => {
      if (livePaused) return;
      setLive((prev) => [evt, ...prev].slice(0, 40));
    };

    s.on("activity:new", handler);

    return () => {
      s.off("activity:new", handler);
    };
  }, [livePaused]);

  const onCopy = async (t: string, label: string) => {
    const ok = await copyText(t);
    showToast(ok ? "ok" : "err", ok ? `${label} copied` : "Copy failed");
  };

  const clearFilters = () => {
    // If you want “Clear” to restore preset defaults (not empty), do this:
    setSearch(preset?.search ?? "");
    setSeverity(preset?.severity ?? "");
    setRole(preset?.role ?? "");
    setAction(preset?.action ?? "");
    setEntityType(preset?.entityType ?? "");
    setEntityId(preset?.entityId ?? "");
    setSuspiciousOnly(preset?.suspiciousOnly ?? false);
    setFrom(preset?.from ?? "");
    setTo(preset?.to ?? "");
  };

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50">
            <div
              className={`px-4 py-3 rounded-2xl shadow-lg border text-sm font-bold ${
                toast.type === "ok"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-rose-50 border-rose-200 text-rose-700"
              }`}
            >
              {toast.msg}
            </div>
          </div>
        )}

        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link
              to={backTo}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
            >
              <ArrowLeft size={16} />
              Back
            </Link>
            <div className="text-sm text-slate-400">{crumb}</div>
          </div>

          <div className="flex gap-2">
            <Link
              to="/admin/activity/alerts"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
            >
              <ShieldAlert size={16} />
              Alerts
            </Link>
            <Link
              to="/admin/activity/analytics"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
            >
              <Activity size={16} />
              Analytics
            </Link>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8">
          <div className="p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Monitoring
                </p>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
                  {initialTitle}
                </h1>
                <p className="text-sm text-slate-500 mt-2">{initialSubtitle}</p>
              </div>

              <button
                onClick={loadLogs}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>

            {/* Filters */}
            <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Filter size={14} />
                Filters
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="md:col-span-2">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Search
                  </div>
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="action / description / email / ip / entityId..."
                      className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Severity
                  </div>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="">All</option>
                    <option value="INFO">INFO</option>
                    <option value="WARN">WARN</option>
                    <option value="ERROR">ERROR</option>
                    <option value="ALERT">ALERT</option>
                  </select>
                </div>

                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Role
                  </div>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="">All</option>
                    <option value="admin">admin</option>
                    <option value="client">client</option>
                    <option value="inspector">inspector</option>
                    <option value="system">system</option>
                  </select>
                </div>

                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Entity Type
                  </div>
                  <input
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    placeholder="PAYMENT / AUCTION / USER..."
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Action
                  </div>
                  <input
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    placeholder="LOGIN_SUCCESS..."
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Entity ID
                  </div>
                  <input
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    placeholder="optional"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    From (ISO)
                  </div>
                  <input
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    placeholder="2026-02-11T00:00:00Z"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    To (ISO)
                  </div>
                  <input
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="2026-02-11T23:59:59Z"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div className="md:col-span-2 flex items-end">
                  <label className="inline-flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 w-full">
                    <input
                      type="checkbox"
                      checked={suspiciousOnly}
                      onChange={(e) => setSuspiciousOnly(e.target.checked)}
                      className="w-4 h-4"
                    />
                    Suspicious only
                  </label>
                </div>

                <div className="md:col-span-2 flex items-end gap-2">
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                  >
                    Clear
                  </button>

                  <button
                    onClick={() => loadLogs()}
                    className="w-full px-4 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>

            {/* Content grid: table + live feed */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* LEFT: Table */}
              <div className="lg:col-span-2">
                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold">
                    {error}
                  </div>
                )}

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full">
                    <thead className="bg-slate-50/70">
                      <tr>
                        <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          When
                        </th>
                        <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Severity
                        </th>
                        <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Action
                        </th>
                        <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          User
                        </th>
                        <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Entity
                        </th>
                        <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          IP
                        </th>
                        <th className="px-4 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          View
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {loading && (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-8 text-sm text-slate-500"
                          >
                            Loading...
                          </td>
                        </tr>
                      )}

                      {!loading && items.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-8 text-sm text-slate-500"
                          >
                            No logs found.
                          </td>
                        </tr>
                      )}

                      {!loading &&
                        items.map((x) => (
                          <tr
                            key={x.id}
                            className="hover:bg-slate-50/50 transition-all"
                          >
                            <td className="px-4 py-5 text-sm text-slate-700">
                              {formatDate(x.createdAt)}
                            </td>
                            <td className="px-4 py-5">
                              {severityPill(x.severity)}
                            </td>
                            <td className="px-4 py-5 text-sm font-black text-slate-900">
                              {x.action}
                            </td>
                            <td className="px-4 py-5 text-sm text-slate-700">
                              <div className="font-bold">
                                {x.userRole || "-"}
                              </div>
                              <div className="text-xs text-slate-500">
                                {x.userEmail || x.userId || "-"}
                              </div>
                            </td>
                            <td className="px-4 py-5 text-sm text-slate-700">
                              <div className="font-bold">
                                {x.entityType || "-"}
                              </div>
                              <div className="text-xs font-mono text-slate-500 break-all">
                                {x.entityId || "-"}
                              </div>
                            </td>
                            <td className="px-4 py-5 text-xs font-mono text-slate-600">
                              {x.ipAddress || "-"}
                            </td>
                            <td className="px-4 py-5 text-right">
                              <button
                                onClick={() => setSelected(x)}
                                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-50 transition-all"
                              >
                                <Eye size={14} />
                                Details
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    Page{" "}
                    <span className="font-black text-slate-900">{page}</span> /{" "}
                    <span className="font-black text-slate-900">
                      {totalPages}
                    </span>{" "}
                    · <span className="font-black text-slate-900">{total}</span>{" "}
                    total
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => p - 1)}
                      disabled={loading || !canPrev}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={loading || !canNext}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  Tip: Click “Details” to see full description, user agent,
                  metadata, and copy values for investigation.
                </div>
              </div>

              {/* RIGHT: Live Feed */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Realtime
                </p>
                <h3 className="text-lg font-black text-slate-900 mt-2">
                  Live Activity Feed
                </h3>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setLivePaused((v) => !v)}
                    className="w-full px-4 py-3 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    {livePaused ? (
                      <PlayCircle size={18} className="text-emerald-600" />
                    ) : (
                      <PauseCircle size={18} className="text-amber-600" />
                    )}
                    {livePaused ? "Resume" : "Pause"}
                  </button>
                  <button
                    onClick={() => setLive([])}
                    className="px-4 py-3 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all"
                  >
                    Clear
                  </button>
                </div>

                <div className="mt-5 space-y-2 max-h-[520px] overflow-auto pr-1">
                  {live.length === 0 && (
                    <div className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-4">
                      Waiting for new events...
                    </div>
                  )}

                  {live.map((x) => (
                    <button
                      key={`live-${x.id}`}
                      onClick={() => setSelected(x)}
                      className="w-full text-left bg-white border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-black text-slate-900">
                          {x.action}
                        </div>
                        <div>{severityPill(x.severity)}</div>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {formatDate(x.createdAt)}
                      </div>
                      <div className="text-xs text-slate-600 mt-2 line-clamp-2">
                        {x.description || "-"}
                      </div>
                      <div className="mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {x.userRole || "unknown"} · {x.entityType || "entity"} ·{" "}
                        {x.ipAddress || "ip"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details Drawer */}
        {selected && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setSelected(null)}
            />
            <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl border-l border-slate-200">
              <div className="p-6 border-b border-slate-200 flex items-start justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Log Details
                  </p>
                  <h3 className="text-xl font-black text-slate-900 mt-1">
                    {selected.action}
                  </h3>
                  <div className="mt-2 flex items-center gap-2">
                    {severityPill(selected.severity)}
                    {selected.suspicious
                      ? badge("bad", "SUSPICIOUS")
                      : badge("good", "NORMAL")}
                  </div>
                </div>
                <button
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                  onClick={() => setSelected(null)}
                >
                  Close
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-auto h-[calc(100%-80px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Time
                    </div>
                    <div className="mt-2 text-sm font-bold text-slate-900">
                      {formatDate(selected.createdAt)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      User
                    </div>
                    <div className="mt-2 text-sm font-bold text-slate-900">
                      {selected.userRole || "-"}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      {selected.userEmail || selected.userId || "-"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Entity
                    </div>
                    <div className="mt-2 text-sm font-bold text-slate-900">
                      {selected.entityType || "-"}
                    </div>
                    <div className="text-xs font-mono text-slate-600 break-all mt-1">
                      {selected.entityId || "-"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      IP
                    </div>
                    <div className="mt-2 text-xs font-mono text-slate-900">
                      {selected.ipAddress || "-"}
                    </div>
                    {selected.ipAddress && (
                      <button
                        onClick={() => onCopy(selected.ipAddress!, "IP")}
                        className="mt-2 inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-50 transition-all"
                      >
                        <Copy size={14} />
                        Copy
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Description
                  </div>
                  <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                    {selected.description || "-"}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    User Agent
                  </div>
                  <div className="mt-2 text-xs text-slate-700 break-words">
                    {selected.userAgent || "-"}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Metadata
                  </div>
                  <pre className="mt-2 text-xs bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-auto">
                    {JSON.stringify(selected.metadata ?? {}, null, 2)}
                  </pre>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Log ID
                  </div>
                  <div className="mt-2 text-xs font-mono text-slate-700 break-all">
                    {selected.id}
                  </div>
                  <button
                    onClick={() => onCopy(selected.id, "Log ID")}
                    className="mt-2 inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-50 transition-all"
                  >
                    <Copy size={14} />
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogsView;
