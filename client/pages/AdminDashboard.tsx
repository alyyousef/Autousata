 
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Users, ShieldCheck, AlertTriangle, FileCheck, Search, Filter, 
  MoreVertical, CheckCircle, XCircle, ArrowUpRight, BarChart3
} from 'lucide-react';
import { VehicleItem, getAdminVehicles, filterAdminVehicles, updateVehicleStatus, createInspectionReport, CreateInspectionPayload } from '../services/adminApi';

const AdminDashboard: React.FC = () => {
  // Read token from route state (passed from LoginPage)
  const location = useLocation();
  const adminToken = (location.state as any)?.token as string | undefined;
  // Optional: fallback to localStorage if state is missing
  const effectiveToken = adminToken || localStorage.getItem('authToken') || undefined;
  const [activeTab, setActiveTab] = useState<'vehicles' | 'kyc' | 'disputes' | 'reports'>('vehicles');
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<string>('');
  const [showInspectionModal, setShowInspectionModal] = useState<{ open: boolean; vehicle?: VehicleItem }>(() => ({ open: false }));
  const [inspectionForm, setInspectionForm] = useState<CreateInspectionPayload | null>(null);

  // Ensure the token passed via navigation is stored for API usage
  useEffect(() => {
    if (adminToken) {
      localStorage.setItem('authToken', adminToken);
    }
  }, [adminToken]);

  useEffect(() => {
    const loadVehicles = async () => {
      setVehicleLoading(true);
      setVehicleError(null);
      try {
        const data = vehicleStatusFilter
          ? await filterAdminVehicles(vehicleStatusFilter, effectiveToken)
          : await getAdminVehicles(effectiveToken);
        setVehicles(data);
      } catch (e) {
        setVehicleError(e instanceof Error ? e.message : 'Failed to load vehicles');
      } finally {
        setVehicleLoading(false);
      }
    };
    loadVehicles();
  }, [vehicleStatusFilter, effectiveToken]);

  const filteredVehicles = useMemo(() => {
    const q = vehicleSearch.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(v => (
      [v.make, v.model, v.vin, v.plate_number, v.color, v.location]
        .filter(Boolean)
        .some(val => String(val).toLowerCase().includes(q))
    ));
  }, [vehicles, vehicleSearch]);

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
              {['vehicles', 'kyc', 'disputes', 'reports'].map((tab) => (
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
            {activeTab === 'vehicles' && (
              <div className="overflow-x-auto">
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                  <div className="relative flex-grow">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={vehicleSearch}
                      onChange={(e) => setVehicleSearch(e.target.value)}
                      placeholder="Search by make, model, VIN, plate, color..."
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter size={18} className="text-slate-500" />
                    <select
                      value={vehicleStatusFilter}
                      onChange={(e) => setVehicleStatusFilter(e.target.value)}
                      className="px-3 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                    >
                      <option value="">All statuses</option>
                      <option value="active">active</option>
                      <option value="draft">draft</option>
                      <option value="sold">sold</option>
                      <option value="delisted">delisted</option>
                    </select>
                  </div>
                </div>

                <table className="w-full">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vehicle</th>
                      <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Info</th>
                      <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inspection</th>
                      <th className="px-4 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vehicleLoading && (
                      <tr><td className="px-4 py-6" colSpan={5}>Loading vehicles…</td></tr>
                    )}
                    {vehicleError && !vehicleLoading && (
                      <tr><td className="px-4 py-6 text-rose-600" colSpan={5}>{vehicleError}</td></tr>
                    )}
                    {!vehicleLoading && !vehicleError && filteredVehicles.length === 0 && (
                      <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>No vehicles found.</td></tr>
                    )}
                    {!vehicleLoading && !vehicleError && filteredVehicles.map((v) => {
                      const canEditStatus = !(v.inspection_req === 1 && !v.inspection_report);
                      const inspectionDone = Boolean(v.inspection_report);
                      return (
                        <tr key={v.id} className="hover:bg-slate-50/50 transition-all group">
                          <td className="px-4 py-6">
                            <p className="font-bold text-slate-900">{v.make} {v.model} {v.year}</p>
                            <p className="text-xs text-slate-400">VIN: {v.vin || '—'} · Plate: {v.plate_number || '—'}</p>
                          </td>
                          <td className="px-4 py-6 text-sm text-slate-600">
                            <div className="space-y-1">
                              <p>Color: {v.color || '—'} · Body: {v.body_type || '—'} · Trans: {v.transmission || '—'}</p>
                              <p>Mileage: {v.milage?.toLocaleString() ?? '—'} km · Location: {v.location || '—'}</p>
                              <p>Condition: {v.car_condition || '—'} · Price: {v.price ? `${v.price} ${v.currency || 'EGP'}` : '—'}</p>
                            </div>
                          </td>
                          <td className="px-4 py-6">
                            <select
                              disabled={!canEditStatus}
                              defaultValue={String(v.status).toLowerCase()}
                              className={`px-2.5 py-2 rounded-lg text-[12px] font-bold uppercase tracking-wider border ${canEditStatus ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'}`}
                              onChange={async (e) => {
                                const newStatus = e.target.value;
                                const res = await updateVehicleStatus(v.id, newStatus, effectiveToken);
                                if (!res.ok) {
                                  alert(res.message);
                                  e.target.value = String(v.status).toLowerCase();
                                }
                              }}
                            >
                              <option value="active">active</option>
                              <option value="draft">draft</option>
                              <option value="sold">sold</option>
                              <option value="delisted">delisted</option>
                            </select>
                          </td>
                          <td className="px-4 py-6">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${inspectionDone ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                              {inspectionDone ? 'Report Ready' : (v.inspection_req === 1 ? 'Required' : 'Optional')}
                            </span>
                          </td>
                          <td className="px-4 py-6 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
                                onClick={() => {
                                  setShowInspectionModal({ open: true, vehicle: v });
                                  setInspectionForm({
                                    vehicleId: v.id,
                                    inspectorId: '',
                                    inspectionDate: new Date().toISOString().slice(0, 10),
                                    locationCity: v.location || '',
                                    odometerReading: v.milage || 0,
                                    overallCondition: 'good',
                                    engineCond: 'good',
                                    transmissionCond: 'good',
                                    suspensionCond: 'good',
                                    interiorCond: 'good',
                                    paintCond: 'good',
                                  });
                                }}
                              >
                                Make Inspection Report
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {showInspectionModal.open && showInspectionModal.vehicle && inspectionForm && (
                  <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl">
                      <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Inspection Report</p>
                          <h3 className="text-xl font-black text-slate-900">{showInspectionModal.vehicle.make} {showInspectionModal.vehicle.model} {showInspectionModal.vehicle.year}</h3>
                        </div>
                        <button className="p-2 text-slate-400 hover:text-slate-900" onClick={() => setShowInspectionModal({ open: false })}>✕</button>
                      </div>
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="text-xs font-bold text-slate-700">Inspector ID
                          <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" value={inspectionForm.inspectorId} onChange={(e) => setInspectionForm({ ...inspectionForm, inspectorId: e.target.value })} />
                        </label>
                        <label className="text-xs font-bold text-slate-700">Inspection Date
                          <input type="date" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" value={inspectionForm.inspectionDate} onChange={(e) => setInspectionForm({ ...inspectionForm, inspectionDate: e.target.value })} />
                        </label>
                        <label className="text-xs font-bold text-slate-700">Location City
                          <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" value={inspectionForm.locationCity} onChange={(e) => setInspectionForm({ ...inspectionForm, locationCity: e.target.value })} />
                        </label>
                        <label className="text-xs font-bold text-slate-700">Odometer Reading
                          <input type="number" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" value={inspectionForm.odometerReading} onChange={(e) => setInspectionForm({ ...inspectionForm, odometerReading: Number(e.target.value) })} />
                        </label>
                        {['overallCondition','engineCond','transmissionCond','suspensionCond','interiorCond','paintCond'].map((k) => (
                          <label key={k} className="text-xs font-bold text-slate-700">{k}
                            <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" value={(inspectionForm as any)[k]} onChange={(e) => setInspectionForm({ ...inspectionForm, [k]: e.target.value } as any)}>
                              <option value="excellent">excellent</option>
                              <option value="good">good</option>
                              <option value="fair">fair</option>
                              <option value="poor">poor</option>
                            </select>
                          </label>
                        ))}
                        <label className="text-xs font-bold text-slate-700 col-span-full">Accident History
                          <textarea className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" onChange={(e) => setInspectionForm({ ...inspectionForm, accidentHistory: e.target.value })} />
                        </label>
                        <label className="text-xs font-bold text-slate-700 col-span-full">Mechanical Issues
                          <textarea className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" onChange={(e) => setInspectionForm({ ...inspectionForm, mechanicalIssues: e.target.value })} />
                        </label>
                        <label className="text-xs font-bold text-slate-700 col-span-full">Required Repairs
                          <textarea className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" onChange={(e) => setInspectionForm({ ...inspectionForm, requiredRepairs: e.target.value })} />
                        </label>
                        <label className="text-xs font-bold text-slate-700">Estimated Repair Cost (EGP)
                          <input type="number" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" onChange={(e) => setInspectionForm({ ...inspectionForm, estimatedRepairCost: Number(e.target.value) })} />
                        </label>
                        <label className="text-xs font-bold text-slate-700 col-span-full">Report Document URL
                          <input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" onChange={(e) => setInspectionForm({ ...inspectionForm, reportDocUrl: e.target.value })} />
                        </label>
                      </div>
                      <div className="p-6 border-t border-slate-200 flex justify-end gap-2">
                        <button className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-bold" onClick={() => setShowInspectionModal({ open: false })}>Cancel</button>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold" onClick={async () => {
                          if (!inspectionForm) return;
                          const res = await createInspectionReport(inspectionForm, effectiveToken);
                          if (!res.ok) {
                            alert(res.message);
                          } else {
                            setShowInspectionModal({ open: false });
                          }
                        }}>Save Report</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

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
