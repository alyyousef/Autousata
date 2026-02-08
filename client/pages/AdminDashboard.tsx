'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Users, ShieldCheck, AlertTriangle, FileCheck, Search, Filter, 
  MoreVertical, CheckCircle, XCircle, ArrowUpRight, BarChart3
} from 'lucide-react';
import { VehicleItem, getAdminVehicles, filterAdminVehicles, searchAdminVehicles, updateVehicleStatus, createInspectionReport, CreateInspectionPayload, getreport, editreport, KYCDocument, getPendingKYC, LiveAuction, PendingPayment, getPendingPayments, getAllAuctions, filterAuctions, searchAuctions, updateAuctionStatus, setAuctionStartTime, getAuctionById } from '../services/adminApi';

const AdminDashboard: React.FC = () => {
  // Read token from route state (passed from LoginPage)
  const location = useLocation();
  const adminToken = (location.state as any)?.token as string | undefined;
  // Optional: fallback to localStorage if state is missing
  const effectiveToken = adminToken || localStorage.getItem('authToken') || undefined;
  const [activeTab, setActiveTab] = useState<'vehicles' | 'kyc' | 'auctions' | 'payments'>('vehicles');
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<string>('');
  const [showInspectionModal, setShowInspectionModal] = useState<{ open: boolean; vehicle?: VehicleItem; viewMode?: boolean }>(() => ({ open: false }));
  const [inspectionForm, setInspectionForm] = useState<CreateInspectionPayload | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [kycDocuments, setKycDocuments] = useState<KYCDocument[]>([]);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);
  const [auctions, setAuctions] = useState<LiveAuction[]>([]);
  const [auctionsLoading, setAuctionsLoading] = useState(false);
  const [auctionsError, setAuctionsError] = useState<string | null>(null);
  const [auctionSearch, setAuctionSearch] = useState('');
  const [auctionStatusFilter, setAuctionStatusFilter] = useState<string>('');
  const [editingAuction, setEditingAuction] = useState<{ id: string; field: 'status' | 'startTime'; value: string } | null>(null);
  const [selectedAuction, setSelectedAuction] = useState<LiveAuction | null>(null);
  const [showAuctionModal, setShowAuctionModal] = useState(false);
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const tabsRef = React.useRef<HTMLDivElement>(null);

  // Ensure the token passed via navigation is stored for API usage
  useEffect(() => {
    if (adminToken) {
      localStorage.setItem('authToken', adminToken);
    }
  }, [adminToken]);

  // Load vehicles based on search and filter
  useEffect(() => {
    const loadVehicles = async () => {
      setVehicleLoading(true);
      setVehicleError(null);
      try {
        let data: VehicleItem[];
        
        // Priority: search > filter > all
        if (vehicleSearch.trim()) {
          data = await searchAdminVehicles(vehicleSearch.trim(), effectiveToken);
        } else if (vehicleStatusFilter) {
          data = await filterAdminVehicles(vehicleStatusFilter, effectiveToken);
        } else {
          data = await getAdminVehicles(effectiveToken);
        }
        
        setVehicles(data);
      } catch (e) {
        setVehicleError(e instanceof Error ? e.message : 'Failed to load vehicles');
      } finally {
        setVehicleLoading(false);
      }
    };
    
    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      loadVehicles();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [vehicleSearch, vehicleStatusFilter, effectiveToken]);

  // Load KYC documents when KYC tab is active
  useEffect(() => {
    const loadKYC = async () => {
      if (activeTab !== 'kyc') return;
      
      setKycLoading(true);
      setKycError(null);
      try {
        const data = await getPendingKYC(effectiveToken);
        setKycDocuments(data || []);
      } catch (e) {
        console.error('KYC fetch error:', e);
        setKycError(e instanceof Error ? e.message : 'Failed to load KYC documents');
        setKycDocuments([]);
      } finally {
        setKycLoading(false);
      }
    };
    
    loadKYC();
  }, [activeTab, effectiveToken]);

  // Load auctions when auctions tab is active
  useEffect(() => {
    const loadAuctions = async () => {
      if (activeTab !== 'auctions') return;
      
      setAuctionsLoading(true);
      setAuctionsError(null);
      try {
        let data: LiveAuction[];
        
        // Priority: search > filter > all
        if (auctionSearch.trim()) {
          data = await searchAuctions(auctionSearch.trim(), effectiveToken);
        } else if (auctionStatusFilter) {
          data = await filterAuctions(auctionStatusFilter, effectiveToken);
        } else {
          data = await getAllAuctions(effectiveToken);
        }
        
        setAuctions(data || []);
      } catch (e) {
        console.error('Auctions fetch error:', e);
        setAuctionsError(e instanceof Error ? e.message : 'Failed to load auctions');
        setAuctions([]);
      } finally {
        setAuctionsLoading(false);
      }
    };
    
    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      loadAuctions();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [activeTab, auctionSearch, auctionStatusFilter, effectiveToken]);

  // Load payments when payments tab is active
  useEffect(() => {
    const loadPayments = async () => {
      if (activeTab !== 'payments') return;
      
      setPaymentsLoading(true);
      setPaymentsError(null);
      try {
        const data = await getPendingPayments(effectiveToken);
        setPayments(data || []);
      } catch (e) {
        console.error('Payments fetch error:', e);
        setPaymentsError(e instanceof Error ? e.message : 'Failed to load payments');
        setPayments([]);
      } finally {
        setPaymentsLoading(false);
      }
    };
    
    loadPayments();
  }, [activeTab, effectiveToken]);

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
<Link
  to="/admin/finance/revenue"
  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
>
  Revenue Dashboard
</Link>

            <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center gap-2 hover:bg-slate-50 transition-all">
              <BarChart3 size={18} />
              Platform Metrics
            </button>
          </div>
        </div>

        {/* Priority Queues */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div 
            className="bg-white/95 rounded-3xl p-6 shadow-sm border border-slate-200 flex items-center gap-4 premium-card-hover cursor-pointer"
            onClick={() => {
              setActiveTab('kyc');
              tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            <div className="bg-indigo-50 text-indigo-600 p-4 rounded-2xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pending KYC</p>
              <h3 className="text-2xl font-black text-slate-900">24</h3>
              <p className="text-[10px] text-indigo-600 font-bold mt-1">4 Urgent</p>
            </div>
          </div>
          <div 
            className="bg-white/95 rounded-3xl p-6 shadow-sm border border-slate-200 flex items-center gap-4 premium-card-hover cursor-pointer"
            onClick={() => {
              setActiveTab('auctions');
              tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Live Auctions</p>
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

        <div className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 overflow-hidden premium-card-hover" ref={tabsRef}>
          {/* Tabs */}
          <div className="px-8 border-b border-slate-100">
            <div className="flex gap-8">
              {['vehicles', 'kyc', 'auctions', 'payments'].map((tab) => (
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
                      placeholder="Search by make, model, or location..."
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
                    {!vehicleLoading && !vehicleError && vehicles.length === 0 && (
                      <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>No vehicles found.</td></tr>
                    )}
                    {!vehicleLoading && !vehicleError && vehicles.map((v) => {
                      const canEditStatus = v.inspection_req === 0 || Boolean(v.inspection_report);
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
                              value={String(v.status).toLowerCase()}
                              className={`px-2.5 py-2 rounded-lg text-[12px] font-bold uppercase tracking-wider border ${canEditStatus ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'}`}
                              onChange={async (e) => {
                                const newStatus = e.target.value;
                                const res = await updateVehicleStatus(v.id, newStatus, effectiveToken);
                                if (!res.ok) {
                                } else {
                                  // Reload vehicles after status update
                                  const data = vehicleSearch.trim() 
                                    ? await searchAdminVehicles(vehicleSearch.trim(), effectiveToken)
                                    : vehicleStatusFilter
                                    ? await filterAdminVehicles(vehicleStatusFilter, effectiveToken)
                                    : await getAdminVehicles(effectiveToken);
                                  setVehicles(data);
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
                                onClick={async () => {
                                  if (v.inspection_req === 0 && v.inspection_report) {
                                    // View mode: fetch report data
                                    try {
                                      const reportData = await getreport(v.inspection_report, effectiveToken);
                                      if (reportData) {
                                        const report = reportData as any;
                                        setInspectionForm({
                                          vehicleId: v.id,
                                          inspectorId: report.inspectorId || '',
                                          inspectionDate: report.inspectionDate ? new Date(report.inspectionDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                                          locationCity: report.locationCity || v.location || '',
                                          odometerReading: report.odometerReading || v.milage || 0,
                                          overallCondition: report.overallCondition || 'good',
                                          engineCond: report.engineCond || 'good',
                                          transmissionCond: report.transmissionCond || 'good',
                                          suspensionCond: report.suspensionCond || 'good',
                                          interiorCond: report.interiorCond || 'good',
                                          paintCond: report.paintCond || 'good',
                                          inspectorNotes: report.inspectorNotes || '',
                                          photosUrl: report.photosUrl || [],
                                          accidentHistory: report.accidentHistory || '',
                                          mechanicalIssues: report.mechanicalIssues || '',
                                          requiredRepairs: report.requiredRepairs || '',
                                          estimatedRepairCost: report.estimatedRepairCost,
                                          reportDocUrl: report.reportDocUrl || '',
                                          status: report.status || 'pending',
                                        });
                                        setShowInspectionModal({ open: true, vehicle: v, viewMode: true });
                                      }
                                    } catch (error) {
                                      console.error('Failed to fetch report:', error);
                                      
                                    }
                                  } else {
                                    // Create mode
                                    setShowInspectionModal({ open: true, vehicle: v, viewMode: false });
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
                                      inspectorNotes: '',
                                      photosUrl: [],
                                      status: 'pending',
                                    });
                                  }
                                }}
                              >
                                {v.inspection_req === 0 ? 'View Report' : 'Make Inspection Report'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'kyc' && (
              <div className="overflow-x-auto">
                {kycLoading && (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                )}
                
                {!kycLoading && kycError && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
                    {kycError}
                  </div>
                )}
                
                {!kycLoading && !kycError && (
                  <table className="w-full">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">User</th>
                        <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document Type</th>
                        <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Submitted</th>
                        <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-4 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {kycDocuments && kycDocuments.length > 0 ? (
                        kycDocuments.map((doc, index) => {
                          const firstName = doc.firstName || 'N/A';
                          const lastName = doc.lastName || '';
                          const email = doc.email || 'N/A';
                          const docType = doc.documentType ? doc.documentType.replace(/_/g, ' ') : 'N/A';
                          const submittedDate = doc.submittedAt ? new Date(doc.submittedAt).toLocaleDateString() : 'N/A';
                          const status = doc.kycDocStatus || 'pending';
                          
                          return (
                            <tr key={doc.kycId || doc.userId || `kyc-${index}`} className="hover:bg-slate-50/50 transition-all group">
                              <td className="px-4 py-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
                                    {firstName[0]?.toUpperCase() || 'U'}{lastName[0]?.toUpperCase() || ''}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900">{firstName} {lastName}</p>
                                    <p className="text-xs text-slate-400">{email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-6 text-sm text-slate-600 capitalize">{docType}</td>
                              <td className="px-4 py-6 text-sm text-slate-500">{submittedDate}</td>
                              <td className="px-4 py-6">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                  status === 'pending' ? 'bg-amber-50 text-amber-600' : 
                                  status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 
                                  'bg-rose-50 text-rose-600'
                                }`}>
                                  {status}
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
                                  <button className="p-2 text-slate-400 hover:text-slate-900 rounded-lg transition-all" title="More actions">
                                    <MoreVertical size={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                            No pending KYC documents
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'auctions' && (
              <div>
                {/* Search and Filter Bar */}
                <div className="p-6 border-b border-slate-100">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        placeholder="Search auctions by seller, vehicle, status..."
                        value={auctionSearch}
                        onChange={(e) => setAuctionSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div className="relative min-w-[200px]">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <select
                        value={auctionStatusFilter}
                        onChange={(e) => setAuctionStatusFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
                      >
                        <option value="">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="live">Live</option>
                        <option value="ended">Ended</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                {auctionsLoading && (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                )}
                
                {!auctionsLoading && auctionsError && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
                    {auctionsError}
                  </div>
                )}
                
                {!auctionsLoading && !auctionsError && (
                  <table className="w-full">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Seller</th>
                        <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Start Time</th>
                        <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Bid</th>
                        <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">End Time</th>
                        <th className="px-4 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auctions && auctions.length > 0 ? (
                        auctions.map((auction, index) => {
                          const sellerName = auction.sellerName || 'N/A';
                          const status = auction.status || 'draft';
                          const startTime = auction.startTime ? new Date(auction.startTime).toLocaleString() : 'N/A';
                          const currentBid = auction.currentBid ? `${auction.currentBid.toLocaleString()} EGP` : 'No bids';
                          const endTime = auction.endTime ? new Date(auction.endTime).toLocaleString() : 'N/A';
                          const isEditingStartTime = editingAuction?.id === auction.id && editingAuction?.field === 'startTime';
                          
                          return (
                            <tr key={auction.id || `auction-${index}`} className="hover:bg-slate-50/50 transition-all group">
                              <td className="px-4 py-6 text-sm text-slate-900">{sellerName}</td>
                              <td className="px-4 py-6">
                                <select
                                  value={status}
                                  className="px-2.5 py-2 rounded-lg text-[12px] font-bold uppercase tracking-wider border bg-white border-slate-200 text-slate-900"
                                  onChange={async (e) => {
                                    const newStatus = e.target.value;
                                    try {
                                      const res = await updateAuctionStatus(auction.id, newStatus, effectiveToken);
                                      if (res.ok) {
                                        // Reload auctions from backend
                                        let data;
                                        if (auctionSearch.trim()) {
                                          data = await searchAuctions(auctionSearch.trim(), effectiveToken);
                                        } else if (auctionStatusFilter) {
                                          data = await filterAuctions(auctionStatusFilter, effectiveToken);
                                        } else {
                                          data = await getAllAuctions(effectiveToken);
                                        }
                                        setAuctions(data || []);
                                      } else {
                                        alert(res.message || 'Failed to update status');
                                      }
                                    } catch (e) {
                                      alert('Failed to update status');
                                    }
                                  }}
                                >
                                  <option value="draft">Draft</option>
                                  <option value="scheduled">Scheduled</option>
                                  <option value="live">Live</option>
                                  <option value="ended">Ended</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              </td>
                              <td className="px-4 py-6">
                                {isEditingStartTime ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="datetime-local"
                                      value={editingAuction.value}
                                      onChange={(e) => setEditingAuction({ ...editingAuction, value: e.target.value })}
                                      className="border border-indigo-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <button
                                      onClick={async () => {
                                        try {
                                          // Format to Oracle format: YYYY-MM-DD HH24:MI:SS using local time
                                          const localDate = new Date(editingAuction.value);
                                          const year = localDate.getFullYear();
                                          const month = String(localDate.getMonth() + 1).padStart(2, '0');
                                          const day = String(localDate.getDate()).padStart(2, '0');
                                          const hours = String(localDate.getHours()).padStart(2, '0');
                                          const minutes = String(localDate.getMinutes()).padStart(2, '0');
                                          const seconds = String(localDate.getSeconds()).padStart(2, '0');
                                          const formattedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                                          
                                          const res = await setAuctionStartTime(auction.id, formattedTime, effectiveToken);
                                          if (res.ok) {
                                            // Reload auctions from backend
                                            let data;
                                            if (auctionSearch.trim()) {
                                              data = await searchAuctions(auctionSearch.trim(), effectiveToken);
                                            } else if (auctionStatusFilter) {
                                              data = await filterAuctions(auctionStatusFilter, effectiveToken);
                                            } else {
                                              data = await getAllAuctions(effectiveToken);
                                            }
                                            setAuctions(data || []);
                                            setEditingAuction(null);
                                          } else {
                                            alert(res.message || 'Failed to update start time');
                                          }
                                        } catch (e) {
                                          alert('Failed to update start time');
                                        }
                                      }}
                                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                    >
                                      <CheckCircle size={16} />
                                    </button>
                                    <button
                                      onClick={() => setEditingAuction(null)}
                                      className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                                    >
                                      <XCircle size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      // Convert database timestamp to local datetime-local format (YYYY-MM-DDTHH:mm)
                                      let localTimeStr;
                                      if (auction.startTime) {
                                        const date = new Date(auction.startTime);
                                        const year = date.getFullYear();
                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                        const day = String(date.getDate()).padStart(2, '0');
                                        const hours = String(date.getHours()).padStart(2, '0');
                                        const minutes = String(date.getMinutes()).padStart(2, '0');
                                        localTimeStr = `${year}-${month}-${day}T${hours}:${minutes}`;
                                      } else {
                                        const date = new Date();
                                        const year = date.getFullYear();
                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                        const day = String(date.getDate()).padStart(2, '0');
                                        const hours = String(date.getHours()).padStart(2, '0');
                                        const minutes = String(date.getMinutes()).padStart(2, '0');
                                        localTimeStr = `${year}-${month}-${day}T${hours}:${minutes}`;
                                      }
                                      setEditingAuction({ id: auction.id, field: 'startTime', value: localTimeStr });
                                    }}
                                    className="text-sm text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-all"
                                  >
                                    {startTime}
                                  </button>
                                )}
                              </td>
                              <td className="px-4 py-6 text-sm font-bold text-slate-900">{currentBid}</td>
                              <td className="px-4 py-6 text-sm text-slate-500">{endTime}</td>
                              <td className="px-4 py-6 text-right">
                                <button 
                                  className="p-2 text-slate-400 hover:text-slate-900 rounded-lg transition-all" 
                                  title="View details"
                                  onClick={async () => {
                                    try {
                                      const auctionDetails = await getAuctionById(auction.id, effectiveToken);
                                      if (auctionDetails) {
                                        setSelectedAuction(auctionDetails);
                                        setShowAuctionModal(true);
                                      }
                                    } catch (e) {
                                      alert('Failed to load auction details');
                                    }
                                  }}
                                >
                                  <ArrowUpRight size={18} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                            No auctions found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="overflow-x-auto">
                {paymentsLoading && (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                )}
                
                {!paymentsLoading && paymentsError && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
                    {paymentsError}
                  </div>
                )}
                
                {!paymentsLoading && !paymentsError && (
                  <table className="w-full">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment ID</th>
                        <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Buyer</th>
                        <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                        <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initiated</th>
                        <th className="px-4 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments && payments.length > 0 ? (
                        payments.map((payment, index) => {
                          const paymentId = payment.id || 'N/A';
                          const buyerName = payment.buyerName || 'N/A';
                          const amount = payment.amount ? `${payment.amount.toLocaleString()} ${payment.currency || 'EGP'}` : 'N/A';
                          const status = payment.status || 'N/A';
                          const initiated = payment.initiatedAt ? new Date(payment.initiatedAt).toLocaleString() : 'N/A';
                          
                          return (
                            <tr key={payment.id || `payment-${index}`} className="hover:bg-slate-50/50 transition-all group">
                              <td className="px-4 py-6 text-sm font-mono text-slate-600">{paymentId}</td>
                              <td className="px-4 py-6 text-sm text-slate-900">{buyerName}</td>
                              <td className="px-4 py-6 text-sm font-bold text-slate-900">{amount}</td>
                              <td className="px-4 py-6">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                  status === 'pending' ? 'bg-amber-50 text-amber-600' : 
                                  status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 
                                  status === 'failed' ? 'bg-rose-50 text-rose-600' :
                                  'bg-slate-50 text-slate-600'
                                }`}>
                                  {status}
                                </span>
                              </td>
                              <td className="px-4 py-6 text-sm text-slate-500">{initiated}</td>
                              <td className="px-4 py-6 text-right">
                                <button className="p-2 text-slate-400 hover:text-slate-900 rounded-lg transition-all" title="View details">
                                  <ArrowUpRight size={18} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                            No pending payments
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Auction Details Modal */}
        {showAuctionModal && selectedAuction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">
              {/* Header */}
              <div className="sticky top-0 p-6 border-b border-slate-200 flex items-center justify-between bg-white rounded-t-2xl">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Auction Details</p>
                  <h3 className="text-xl font-black text-slate-900">Auction #{selectedAuction.id}</h3>
                </div>
                <button 
                  className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all" 
                  onClick={() => {
                    setShowAuctionModal(false);
                    setSelectedAuction(null);
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(100vh-200px)] p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Seller Info */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Seller</p>
                    <p className="text-lg font-bold text-slate-900">{selectedAuction.sellerName || 'N/A'}</p>
                    <p className="text-xs text-slate-500">ID: {selectedAuction.sellerId}</p>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</p>
                    <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                      selectedAuction.status === 'live' ? 'bg-emerald-50 text-emerald-600' : 
                      selectedAuction.status === 'scheduled' ? 'bg-indigo-50 text-indigo-600' : 
                      selectedAuction.status === 'ended' ? 'bg-slate-100 text-slate-600' :
                      'bg-rose-50 text-rose-600'
                    }`}>
                      {selectedAuction.status}
                    </span>
                  </div>

                  {/* Vehicle Info */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vehicle ID</p>
                    <p className="text-base font-mono text-slate-900">{selectedAuction.vehicleId}</p>
                  </div>

                  {/* Timing */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Start Time</p>
                    <p className="text-base text-slate-900">{selectedAuction.startTime ? new Date(selectedAuction.startTime).toLocaleString() : 'N/A'}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">End Time</p>
                    <p className="text-base text-slate-900">{selectedAuction.endTime ? new Date(selectedAuction.endTime).toLocaleString() : 'N/A'}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Original End Time</p>
                    <p className="text-base text-slate-900">{selectedAuction.originalEndTime ? new Date(selectedAuction.originalEndTime).toLocaleString() : 'N/A'}</p>
                  </div>

                  {/* Bidding Info */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Starting Bid</p>
                    <p className="text-lg font-bold text-indigo-600">{selectedAuction.startingBid ? `${selectedAuction.startingBid.toLocaleString()} EGP` : 'N/A'}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Current Bid</p>
                    <p className="text-lg font-bold text-emerald-600">{selectedAuction.currentBid ? `${selectedAuction.currentBid.toLocaleString()} EGP` : 'No bids yet'}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Reserve Price</p>
                    <p className="text-base text-slate-900">{selectedAuction.reservePrice ? `${selectedAuction.reservePrice.toLocaleString()} EGP` : 'N/A'}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bid Count</p>
                    <p className="text-base text-slate-900">{selectedAuction.bidCount || 0} bids</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Min Bid Increment</p>
                    <p className="text-base text-slate-900">{selectedAuction.minBidIncrement ? `${selectedAuction.minBidIncrement.toLocaleString()} EGP` : 'N/A'}</p>
                  </div>

                  {/* Leading Bidder */}
                  {selectedAuction.leadingBidderId && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Leading Bidder</p>
                      <p className="text-base font-bold text-slate-900">{selectedAuction.leadingBidderName || 'N/A'}</p>
                      <p className="text-xs text-slate-500">ID: {selectedAuction.leadingBidderId}</p>
                    </div>
                  )}

                  {/* Winner */}
                  {selectedAuction.winnerId && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Winner</p>
                      <p className="text-base font-bold text-emerald-600">{selectedAuction.winnerName || 'N/A'}</p>
                      <p className="text-xs text-slate-500">ID: {selectedAuction.winnerId}</p>
                    </div>
                  )}

                  {/* Auto Extend Settings */}
                  <div className="space-y-2 col-span-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Auto Extension</p>
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-slate-500">Enabled</p>
                          <p className="text-sm font-bold text-slate-900">{selectedAuction.autoExtendEnabled ? 'Yes' : 'No'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Extension Minutes</p>
                          <p className="text-sm font-bold text-slate-900">{selectedAuction.autoExtendMinutes || 0} min</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Max Extensions</p>
                          <p className="text-sm font-bold text-slate-900">{selectedAuction.maxAutoExtensions || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Extensions Used</p>
                          <p className="text-sm font-bold text-slate-900">{selectedAuction.autoExtCount || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Created At</p>
                    <p className="text-sm text-slate-600">{selectedAuction.createdAt ? new Date(selectedAuction.createdAt).toLocaleString() : 'N/A'}</p>
                  </div>

                  {selectedAuction.startedAt && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Started At</p>
                      <p className="text-sm text-slate-600">{new Date(selectedAuction.startedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end">
                <button 
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
                  onClick={() => {
                    setShowAuctionModal(false);
                    setSelectedAuction(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inspection Modal - Rendered at root level */}
        {showInspectionModal.open && showInspectionModal.vehicle && inspectionForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
              {/* Header - Fixed */}
              <div className="sticky top-0 p-6 border-b border-slate-200 flex items-center justify-between bg-white rounded-t-2xl">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{showInspectionModal.viewMode ? 'View Inspection Report' : 'Create Inspection Report'}</p>
                  <h3 className="text-xl font-black text-slate-900">{showInspectionModal.vehicle.make} {showInspectionModal.vehicle.model} {showInspectionModal.vehicle.year}</h3>
                </div>
                <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all" onClick={() => setShowInspectionModal({ open: false })}>✕</button>
              </div>

              {/* Content - Scrollable */}
              <div className="overflow-y-auto max-h-[calc(100vh-280px)] p-6">
                <div className="space-y-5">
                  {/* Basic Info Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 mb-2">Inspector ID *</span>
                      <input 
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                        placeholder="Enter inspector ID"
                        value={inspectionForm.inspectorId} 
                        onChange={(e) => setInspectionForm({ ...inspectionForm, inspectorId: e.target.value })} 
                        disabled={showInspectionModal.viewMode && !editMode}
                      />
                    </label>
                    <label className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 mb-2">Inspection Date *</span>
                      <input 
                        type="date" 
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                        value={inspectionForm.inspectionDate} 
                        onChange={(e) => setInspectionForm({ ...inspectionForm, inspectionDate: e.target.value })} 
                        disabled={showInspectionModal.viewMode && !editMode}
                      />
                    </label>
                  </div>

                  {/* Location & Odometer */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 mb-2">Location City *</span>
                      <input 
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                        placeholder="Enter city"
                        value={inspectionForm.locationCity} 
                        onChange={(e) => setInspectionForm({ ...inspectionForm, locationCity: e.target.value })} 
                        disabled={showInspectionModal.viewMode && !editMode}
                      />
                    </label>
                    <label className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 mb-2">Odometer Reading (km) *</span>
                      <input 
                        type="number" 
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                        placeholder="0"
                        value={inspectionForm.odometerReading} 
                        onChange={(e) => setInspectionForm({ ...inspectionForm, odometerReading: Number(e.target.value) })} 
                        disabled={showInspectionModal.viewMode && !editMode}
                      />
                    </label>
                  </div>

                  {/* Condition Assessment - Organized */}
                  <div className="border-t border-slate-100 pt-5">
                    <h4 className="text-sm font-bold text-slate-900 mb-4">Condition Assessment</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { key: 'overallCondition', label: 'Overall Condition' },
                        { key: 'engineCond', label: 'Engine' },
                        { key: 'transmissionCond', label: 'Transmission' },
                        { key: 'suspensionCond', label: 'Suspension' },
                        { key: 'interiorCond', label: 'Interior' },
                        { key: 'paintCond', label: 'Paint' },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700 mb-2">{label}</span>
                          <select 
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                            value={(inspectionForm as any)[key]} 
                            onChange={(e) => setInspectionForm({ ...inspectionForm, [key]: e.target.value } as any)}
                            disabled={showInspectionModal.viewMode && !editMode}
                          >
                            <option value="excellent">Excellent</option>
                            <option value="good">Good</option>
                            <option value="fair">Fair</option>
                            <option value="poor">Poor</option>
                          </select>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Details Section */}
                  <div className="border-t border-slate-100 pt-5">
                    <h4 className="text-sm font-bold text-slate-900 mb-4">Inspection Details</h4>
                    <div className="space-y-4">
                      <label className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 mb-2">Accident History</span>
                        <textarea 
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" 
                          placeholder="Describe any accident history..."
                          rows={3}
                          value={(inspectionForm as any).accidentHistory || ''} 
                          onChange={(e) => setInspectionForm({ ...inspectionForm, accidentHistory: e.target.value })} 
                          disabled={showInspectionModal.viewMode && !editMode}
                        />
                      </label>
                      <label className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 mb-2">Mechanical Issues</span>
                        <textarea 
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" 
                          placeholder="List any mechanical issues found..."
                          rows={3}
                          value={(inspectionForm as any).mechanicalIssues || ''} 
                          onChange={(e) => setInspectionForm({ ...inspectionForm, mechanicalIssues: e.target.value })} 
                          disabled={showInspectionModal.viewMode && !editMode}
                        />
                      </label>
                      <label className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 mb-2">Required Repairs</span>
                        <textarea 
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" 
                          placeholder="List required repairs..."
                          rows={3}
                          value={(inspectionForm as any).requiredRepairs || ''} 
                          onChange={(e) => setInspectionForm({ ...inspectionForm, requiredRepairs: e.target.value })} 
                          disabled={showInspectionModal.viewMode && !editMode}
                        />
                      </label>
                      <label className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 mb-2">Inspector Notes</span>
                        <textarea 
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" 
                          placeholder="Additional inspector notes..."
                          rows={3}
                          value={(inspectionForm as any).inspectorNotes || ''} 
                          onChange={(e) => setInspectionForm({ ...inspectionForm, inspectorNotes: e.target.value })} 
                          disabled={showInspectionModal.viewMode && !editMode}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Cost & Document */}
                  <div className="border-t border-slate-100 pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 mb-2">Estimated Repair Cost (EGP)</span>
                      <input 
                        type="number" 
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                        placeholder="0"
                        value={(inspectionForm as any).estimatedRepairCost || ''} 
                        onChange={(e) => setInspectionForm({ ...inspectionForm, estimatedRepairCost: Number(e.target.value) })} 
                        disabled={showInspectionModal.viewMode && !editMode}
                      />
                    </label>
                    <label className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 mb-2">Photos URLs (comma-separated)</span>
                      <input 
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                        placeholder="https://..., https://..."
                        value={((inspectionForm as any).photosUrl || []).join(', ')} 
                        onChange={(e) => setInspectionForm({ ...inspectionForm, photosUrl: e.target.value.split(',').map(url => url.trim()).filter(url => url) })} 
                        disabled={showInspectionModal.viewMode && !editMode}
                      />
                    </label>
                    <label className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 mb-2">Report Document URL</span>
                      <input 
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                        placeholder="https://..."
                        value={(inspectionForm as any).reportDocUrl || ''} 
                        onChange={(e) => setInspectionForm({ ...inspectionForm, reportDocUrl: e.target.value })} 
                        disabled={showInspectionModal.viewMode && !editMode}
                      />
                    </label>
                    <label className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 mb-2">Report Status</span>
                      <select 
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                        value={(inspectionForm as any).status || 'pending'} 
                        onChange={(e) => setInspectionForm({ ...inspectionForm, status: e.target.value })}
                        disabled={showInspectionModal.viewMode && !editMode}
                      >
                        <option value="pending">Pending</option>
                        <option value="passed">Passed</option>
                        <option value="failed">Failed</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              {/* Footer - Fixed */}
              <div className="sticky bottom-0 p-6 border-t border-slate-200 flex justify-end gap-3 bg-white rounded-b-2xl">
                {showInspectionModal.viewMode && !editMode && (
                  <>
                    <button 
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-all" 
                      onClick={() => setShowInspectionModal({ open: false })}
                    >
                      Close
                    </button>
                    <button 
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all" 
                      onClick={() => setEditMode(true)}
                    >
                      Edit Report
                    </button>
                  </>
                )}
                {showInspectionModal.viewMode && editMode && (
                  <>
                    <button 
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-all" 
                      onClick={() => setEditMode(false)}
                    >
                      Cancel
                    </button>
                    <button 
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all" 
                      onClick={async () => {
                        // setShowInspectionModal({ open: false });
                        if (!inspectionForm || !showInspectionModal.vehicle?.inspection_report) return;
                        const res = await editreport(showInspectionModal.vehicle.inspection_report, inspectionForm, effectiveToken);
                        if (!res.ok) {
                        } else {
                          setEditMode(false);
                          // Reload vehicles after editing
                          const data = vehicleSearch.trim() 
                            ? await searchAdminVehicles(vehicleSearch.trim(), effectiveToken)
                            : vehicleStatusFilter
                            ? await filterAdminVehicles(vehicleStatusFilter, effectiveToken)
                            : await getAdminVehicles(effectiveToken);
                          setVehicles(data);
                        }
                      }}
                    >
                      Save Changes
                    </button>
                  </>
                )}
                {!showInspectionModal.viewMode && (
                  <>
                    <button 
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-all" 
                      onClick={() => setShowInspectionModal({ open: false })}
                    >
                      Cancel
                    </button>
                    <button 
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all" 
                      onClick={async () => {
                        if (!inspectionForm) return;
                        setShowInspectionModal({ open: false });
                        const res = await createInspectionReport(inspectionForm, effectiveToken);
                        
                        if (!res.ok) {
                        } else {
                          setShowInspectionModal({ open: false });
                          // Reload vehicles after creating inspection
                          const data = vehicleSearch.trim() 
                            ? await searchAdminVehicles(vehicleSearch.trim(), effectiveToken)
                            : vehicleStatusFilter
                            ? await filterAdminVehicles(vehicleStatusFilter, effectiveToken)
                            : await getAdminVehicles(effectiveToken);
                          setVehicles(data);
                        }
                      }}
                    >
                      Save Report
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;
