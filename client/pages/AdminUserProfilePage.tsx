import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Ban, CreditCard, Gavel, Shield, User, Wallet  ,PauseCircle, PlayCircle, FileText, Link as LinkIcon, AlertTriangle } from "lucide-react";
import { getUserTransactions, type AdminUserSearchResult, type TransactionType, type UserTransactionItem , suspendUser, reactivateUser, banUser  } from "../services/adminApi";



const LIMIT = 20;

const badge = (kind: "good" | "warn" | "bad", text: string) => {
  const cls =
    kind === "good"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : kind === "warn"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-rose-50 text-rose-600 border-rose-200";
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${cls}`}>
      {text}
    </span>
  );
};

function formatDate(d: string) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleString();
}

const TypeIcon: React.FC<{ type: TransactionType }> = ({ type }) => {
  if (type === "payment") return <CreditCard size={16} className="text-slate-700" />;
  if (type === "escrow") return <Wallet size={16} className="text-slate-700" />;
  return <Gavel size={16} className="text-slate-700" />;
};

const AdminUserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const location = useLocation();

  // We prefer to receive basic user data from previous page via Link state
const passedUser = (location.state as any)?.user as AdminUserSearchResult | undefined;

  const [tab, setTab] = useState<"overview" | "transactions">("overview");

  const [type, setType] = useState<TransactionType | "">("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<UserTransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
const [user, setUser] = useState<AdminUserSearchResult | undefined>(passedUser);

const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

const [suspendModalOpen, setSuspendModalOpen] = useState(false);
const [banModalOpen, setBanModalOpen] = useState(false);
const [confirmReactivateOpen, setConfirmReactivateOpen] = useState(false);

const [reason, setReason] = useState("");
const [evidenceLinks, setEvidenceLinks] = useState<string>(""); // one per line
const [evidenceNotes, setEvidenceNotes] = useState<string>("");

const [actionLoading, setActionLoading] = useState(false);

 const displayName = useMemo(() => {
  const fn = user?.firstName || "";
  const ln = user?.lastName || "";
  const full = `${fn} ${ln}`.trim();
  return full || "User";
}, [user]);

const initials = useMemo(() => {
  const fn = (user?.firstName || "").trim();
  const ln = (user?.lastName || "").trim();
  const a = fn ? fn[0] : "U";
  const b = ln ? ln[0] : "";
  return (a + b).toUpperCase();
}, [user]);


  const showToast = (type: "ok" | "err", msg: string) => {
  setToast({ type, msg });
  setTimeout(() => setToast(null), 2500);
};

const isBanned = user?.isBanned === "1";
const isSuspended = user?.isActive === "0" && !isBanned;
const isActive = user?.isActive !== "0" && !isBanned;

  const canPrev = page > 1;
  // backend currently returns only {page,limit,items} (no totalPages)
  // so "Next" is allowed if we got LIMIT items (means there might be more).
  const canNext = items.length === LIMIT;

  const loadTransactions = async (p: number) => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const res = await getUserTransactions(userId, {
        page: p,
        limit: LIMIT,
        type,
        status,
      });
      setItems(res.items || []);
      setPage(res.page || p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transactions");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const onSuspend = async () => {
  if (!userId) return;
  const r = reason.trim();
  if (r.length < 3) {
    showToast("err", "Reason must be at least 3 characters.");
    return;
  }

  setActionLoading(true);
  try {
    await suspendUser(userId, r);
    setUser((prev) => prev ? ({ ...prev, isActive: "0" }) : prev);
    setSuspendModalOpen(false);
    setReason("");
    showToast("ok", "User suspended successfully.");
  } catch (e) {
    showToast("err", e instanceof Error ? e.message : "Failed to suspend user");
  } finally {
    setActionLoading(false);
  }
};

const onReactivate = async () => {
  if (!userId) return;
  setActionLoading(true);
  try {
    await reactivateUser(userId);
    setUser((prev) => prev ? ({ ...prev, isActive: "1" }) : prev);
    setConfirmReactivateOpen(false);
    showToast("ok", "User reactivated successfully.");
  } catch (e) {
    showToast("err", e instanceof Error ? e.message : "Failed to reactivate user");
  } finally {
    setActionLoading(false);
  }
};

const onBan = async () => {
  if (!userId) return;

  const r = reason.trim();
  if (r.length < 3) {
    showToast("err", "Reason must be at least 3 characters.");
    return;
  }

  const links = evidenceLinks
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  const evidence =
    links.length || evidenceNotes.trim()
      ? { links, notes: evidenceNotes.trim() }
      : undefined;

  setActionLoading(true);
  try {
    await banUser(userId, { reason: r, evidence });
    setUser((prev) => prev ? ({ ...prev, isBanned: "1", isActive: "0" }) : prev);
    setBanModalOpen(false);
    setReason("");
    setEvidenceLinks("");
    setEvidenceNotes("");
    showToast("ok", "User permanently banned.");
  } catch (e) {
    showToast("err", e instanceof Error ? e.message : "Failed to ban user");
  } finally {
    setActionLoading(false);
  }
};

  useEffect(() => {
    if (tab === "transactions") {
      loadTransactions(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Reload when filters change (only in transactions tab)
  useEffect(() => {
    if (tab === "transactions") {
      loadTransactions(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status]);

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {suspendModalOpen && (
  <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl">
      <div className="p-6 border-b border-slate-200 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Suspend User</p>
          <h3 className="text-xl font-black text-slate-900">Provide a suspension reason</h3>
        </div>
        <button className="p-2 text-slate-400 hover:text-slate-900" onClick={() => setSuspendModalOpen(false)}>✕</button>
      </div>

      <div className="p-6">
        <label className="text-xs font-bold text-slate-700">Reason</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          rows={4}
          placeholder="Explain what happened (fraud attempts, harassment, suspicious bidding)..."
        />
      </div>

      <div className="p-6 border-t border-slate-200 flex justify-end gap-2">
        <button
          className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-bold"
          onClick={() => setSuspendModalOpen(false)}
          disabled={actionLoading}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 disabled:opacity-50"
          onClick={onSuspend}
          disabled={actionLoading}
        >
          {actionLoading ? "Suspending..." : "Suspend"}
        </button>
      </div>
    </div>
  </div>
)}
{confirmReactivateOpen && (
  <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl">
      <div className="p-6 border-b border-slate-200 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Reactivate User</p>
          <h3 className="text-xl font-black text-slate-900">Restore account access</h3>
        </div>
        <button className="p-2 text-slate-400 hover:text-slate-900" onClick={() => setConfirmReactivateOpen(false)}>✕</button>
      </div>

      <div className="p-6 text-sm text-slate-600">
        This will set the account back to <span className="font-bold text-slate-900">Active</span>.
      </div>

      <div className="p-6 border-t border-slate-200 flex justify-end gap-2">
        <button
          className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-bold"
          onClick={() => setConfirmReactivateOpen(false)}
          disabled={actionLoading}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
          onClick={onReactivate}
          disabled={actionLoading}
        >
          {actionLoading ? "Reactivating..." : "Reactivate"}
        </button>
      </div>
    </div>
  </div>
)}
{banModalOpen && (
  <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
      <div className="p-6 border-b border-slate-200 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Permanent Ban</p>
          <h3 className="text-xl font-black text-slate-900">Document reason & evidence</h3>
        </div>
        <button className="p-2 text-slate-400 hover:text-slate-900" onClick={() => setBanModalOpen(false)}>✕</button>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="text-xs font-bold text-slate-700">Ban Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            rows={4}
            placeholder="Clear explanation for audit..."
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <LinkIcon size={16} className="text-slate-400" />
            <label className="text-xs font-bold text-slate-700">Evidence Links (one per line)</label>
          </div>
          <textarea
            value={evidenceLinks}
            onChange={(e) => setEvidenceLinks(e.target.value)}
            className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            rows={5}
            placeholder="https://...\nhttps://..."
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-slate-400" />
            <label className="text-xs font-bold text-slate-700">Notes</label>
          </div>
          <textarea
            value={evidenceNotes}
            onChange={(e) => setEvidenceNotes(e.target.value)}
            className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            rows={5}
            placeholder="Short notes for audit..."
          />
        </div>

        <div className="md:col-span-2 p-4 rounded-2xl border border-rose-200 bg-rose-50">
          <p className="text-sm font-black text-rose-700">Warning</p>
          <p className="text-xs text-rose-700 mt-1">
            This action is permanent and will disable the account immediately.
          </p>
        </div>
      </div>

      <div className="p-6 border-t border-slate-200 flex justify-end gap-2">
        <button
          className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-bold"
          onClick={() => setBanModalOpen(false)}
          disabled={actionLoading}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 disabled:opacity-50"
          onClick={onBan}
          disabled={actionLoading}
        >
          {actionLoading ? "Banning..." : "Ban User"}
        </button>
      </div>
    </div>
  </div>
)}

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
              to="/admin/users"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
            >
              <ArrowLeft size={16} />
              Back
            </Link>
            <div className="text-sm text-slate-400">Admin / Users / Profile</div>
          </div>
        </div>

        {/* Profile Header Card */}
        <div className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 overflow-hidden premium-card-hover mb-8">
          <div className="p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl">
                {initials}
              </div>

              {/* Identity */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-black text-slate-900">{displayName}</h1>
                  {user?.isBanned === "1"
                    ? badge("bad", "BANNED")
                    : user?.isActive === "0"
                    ? badge("warn", "SUSPENDED")
                    : badge("good", "ACTIVE")}
                  {user?.kycStatus ? badge("good", `KYC: ${user.kycStatus}`) : null}
                </div>

                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                  <div className="inline-flex items-center gap-2">
                    <User size={16} className="text-slate-400" />
                    <span className="font-semibold text-slate-900">{user?.role || "-"}</span>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <BadgeCheck size={16} className="text-slate-400" />
                    <span>{user?.email || "-"}</span>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <Shield size={16} className="text-slate-400" />
                    <span>{user?.phone || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Actions (later you can wire suspend/ban buttons here) */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setTab("transactions")}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all inline-flex items-center gap-2"
                >
                  <Wallet size={16} />
                  View Transactions
                </button>

                <button
                  disabled
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-400 cursor-not-allowed inline-flex items-center gap-2"
                >
                  <Ban size={16} />
                  Ban (wire later)
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-8 border-b border-slate-200">
              <div className="flex gap-6">
                <button
                  onClick={() => setTab("overview")}
                  className={`pb-4 text-sm font-black ${
                    tab === "overview" ? "text-slate-900 border-b-2 border-slate-900" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setTab("transactions")}
                  className={`pb-4 text-sm font-black ${
                    tab === "transactions"
                      ? "text-slate-900 border-b-2 border-slate-900"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Transactions
                </button>
              </div>
            </div>

          {/* Tab Content (Left) + Moderation (Right) */}
<div className="pt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* LEFT: your current tab content */}
  <div className="lg:col-span-2">
    {tab === "overview" && (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">User ID</div>
            <div className="mt-2 font-mono text-xs text-slate-700 break-all">{userId}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Role</div>
            <div className="mt-2 text-sm font-bold text-slate-900">{user?.role || "-"}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Status</div>
            <div className="mt-2 text-sm font-bold text-slate-900">
              {user?.isBanned === "1" ? "Banned" : user?.isActive === "0" ? "Suspended" : "Active"}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Open the Transactions tab to see history before taking action.
            </div>
          </div>
        </div>
      </div>
    )}

    {tab === "transactions" && (
      <div>
        {/* (paste your existing transactions JSX here exactly as you have it now) */}
        {/* START: your existing transactions block */}
        <div>
          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-3 lg:items-end lg:justify-between mb-6">
            <div className="flex flex-col md:flex-row gap-3">
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Type</div>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="">All</option>
                  <option value="payment">Payments</option>
                  <option value="escrow">Escrows</option>
                  <option value="bid">Bids</option>
                </select>
              </div>

              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</div>
                <input
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  placeholder="e.g. completed / held / accepted"
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>

            {/* Pagination controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadTransactions(page - 1)}
                disabled={loading || !canPrev}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                Prev
              </button>
              <div className="text-sm text-slate-600 px-2">
                Page <span className="font-black text-slate-900">{page}</span>
              </div>
              <button
                onClick={() => loadTransactions(page + 1)}
                disabled={loading || !canNext}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full">
              <thead className="bg-slate-50/70">
                <tr>
                  <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                  <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">When</th>
                  <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                  <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                  <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Auction</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-sm text-slate-500">
                      Loading...
                    </td>
                  </tr>
                )}

                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-sm text-slate-500">
                      No transactions found.
                    </td>
                  </tr>
                )}

                {!loading &&
                  items.map((t) => (
                    <tr key={`${t.type}-${t.id}`} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-4 py-5 text-sm font-bold text-slate-900">
                        <span className="inline-flex items-center gap-2">
                          <TypeIcon type={t.type} />
                          {t.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-5">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-50 text-slate-700 border border-slate-200">
                          {t.status || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-sm text-slate-700">{t.occurredAt ? formatDate(t.occurredAt) : "-"}</td>
                      <td className="px-4 py-5 text-sm text-slate-700">{t.role || "-"}</td>
                      <td className="px-4 py-5 text-sm text-slate-700">
                        {typeof t.amountEgp === "number"
                          ? `${t.amountEgp.toLocaleString()} EGP`
                          : t.type === "bid"
                          ? `${t.details?.bidAmountEgp ?? "-"} EGP`
                          : "-"}
                      </td>
                      <td className="px-4 py-5 text-xs font-mono text-slate-600 break-all">{t.auctionId || "-"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Tip: Use filters to quickly detect suspicious behavior (many bids, failed payments, disputes).
          </div>
        </div>
        {/* END */}
      </div>
    )}
  </div>

  {/* RIGHT: Moderation panel */}
  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Moderation</p>
    <h3 className="text-lg font-black text-slate-900 mt-2">Account Actions</h3>
    <p className="text-sm text-slate-500 mt-1">
      Use transaction history to understand behavior before taking action.
    </p>

    <div className="mt-5 space-y-3">
      <button
        disabled={actionLoading || isBanned || isSuspended}
        onClick={() => { setReason(""); setSuspendModalOpen(true); }}
        className="w-full px-4 py-3 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
      >
        <span className="inline-flex items-center gap-2">
          <PauseCircle size={18} className="text-amber-600" />
          Suspend User
        </span>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Temporary</span>
      </button>

      <button
        disabled={actionLoading || isBanned || isActive}
        onClick={() => setConfirmReactivateOpen(true)}
        className="w-full px-4 py-3 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
      >
        <span className="inline-flex items-center gap-2">
          <PlayCircle size={18} className="text-emerald-600" />
          Reactivate User
        </span>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Restore</span>
      </button>

      <button
        disabled={actionLoading || isBanned}
        onClick={() => { setReason(""); setEvidenceLinks(""); setEvidenceNotes(""); setBanModalOpen(true); }}
        className="w-full px-4 py-3 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
      >
        <span className="inline-flex items-center gap-2">
          <Ban size={18} className="text-rose-300" />
          Permanently Ban
        </span>
        <span className="text-[10px] font-black text-rose-200 uppercase tracking-widest">Permanent</span>
      </button>
    </div>

    <div className="mt-5 p-4 rounded-2xl bg-white border border-slate-200">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
          <AlertTriangle size={18} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">Audit Reminder</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Suspensions and bans should include a clear reason. Bans can include evidence links/notes for audits.
          </p>
        </div>
      </div>
    </div>
  </div>
</div>

          </div>
        </div>
      </div>
    </div>

    
  );
};

export default AdminUserProfilePage;
