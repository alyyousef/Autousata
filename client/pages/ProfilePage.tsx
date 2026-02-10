import React, { useEffect, useState } from 'react';
import { Shield, Mail, Phone, ExternalLink, Camera, ChevronRight, LogOut, MapPin, User, FileText, CheckCircle, AlertTriangle, XCircle, UploadCloud, Lock, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { Navigate, useNavigate } from 'react-router-dom';
import ImageLightbox from '../components/ImageLightbox';
import { AuctionStatus, VehicleStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { ProfileSkeleton } from '../components/LoadingSkeleton';

const ProfilePage: React.FC = () => {
  const { user, loading: authLoading, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const [isEditing, setIsEditing] = useState(false);
  
  // 1. Separate State for each editable field
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // KYC Specific Loading State
  const [kycLoading, setKycLoading] = useState(false);
  
  // Password Reset States
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState('');
  const [sellerListings, setSellerListings] = useState<Array<{
    id: string;
    vehicle: {
      id: string;
      make: string;
      model: string;
      year?: number;
      price?: number;
      status?: VehicleStatus | string;
      images?: string[];
    };
    auctionStatus?: AuctionStatus | string;
  }>>([]);


  // =========================================================
  // ✅ FIX: Force Fetch Latest User Data on Mount
  // This ensures that even if local storage is stale, we get
  // the fresh Phone, KYC, and Verification status from DB.
  // =========================================================
  useEffect(() => {
    const fetchFreshProfile = async () => {
      try {
        const response = await apiService.getMe();
        if (response.data && response.data.user) {
          console.log("🔄 Profile Synced:", response.data.user);
          updateUser(response.data.user); // Updates Context + Local State via dependency below
        }
      } catch (err) {
        console.error("Background profile sync failed:", err);
        // We don't block the UI here, we just rely on existing cached data if this fails
      }
    };

    fetchFreshProfile();
  }, []); // Runs once on mount


  // 2. Load user data into local state whenever 'user' context updates
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || ''); // ✅ This will now populate correctly after the fetch above
      setCity(user.location?.city || '');
    }
  }, [user]);

// 3. Load Seller Listings
  useEffect(() => {
    let isMounted = true;

    const loadSellerListings = async () => {
      if (!user) {
        setListingsLoading(false);
        setSellerListings([]);
        return;
      }

      setListingsLoading(true);
      setListingsError('');

      try {
        const [vehiclesResponse, auctionsResponse] = await Promise.all([
          apiService.getSellerVehicles(),
          apiService.getSellerAuctions()
        ]);

        if (!isMounted) return;

        if (vehiclesResponse.error) {
          setListingsError(vehiclesResponse.error);
          setSellerListings([]);
          return;
        }

        const vehicles = vehiclesResponse.data || [];
        const auctions = auctionsResponse.data?.auctions || [];
        const auctionMap = new Map(auctions.map((auction: any) => [auction.vehicleId, auction]));

        const vehicleMap = new Map(vehicles.map((vehicle: any) => [vehicle._id || vehicle.id, vehicle]));

        // Fetch missing vehicles if needed
        const missingVehicleIds = Array.from(auctionMap.keys()).filter((vehicleId) => !vehicleMap.has(vehicleId));
        if (missingVehicleIds.length > 0) {
          const fetchedVehicles = await Promise.all(
            missingVehicleIds.map((vehicleId) => apiService.getVehicleById(vehicleId))
          );

          fetchedVehicles.forEach((response) => {
            if (response.data) {
              const vehicleId = response.data._id || response.data.id;
              if (vehicleId) {
                vehicleMap.set(vehicleId, response.data);
              }
            }
          });
        }

        const listings = Array.from(vehicleMap.values()).map((vehicle: any) => {
          const vehicleId = vehicle._id || vehicle.id;
          const auction = auctionMap.get(vehicleId);
          return {
            id: vehicleId,
            vehicle: {
              id: vehicleId,
              make: vehicle?.make,
              model: vehicle?.model,
              year: vehicle?.year,
              price: vehicle?.price,
              status: vehicle?.status,
              images: vehicle?.images || []
            },
            auctionStatus: auction?.status
          };
        });

        setSellerListings(listings);
        if (auctionsResponse.error) {
          setListingsError(auctionsResponse.error);
        }
      } catch (err) {
        if (isMounted) setListingsError('Failed to load listings');
      } finally {
        if (isMounted) setListingsLoading(false);
      }
    };

    if (user) {
      loadSellerListings();
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

// 4. Return early if loading or no user
  if (authLoading) {
    return (
      <div className="bg-slate-50 min-h-screen py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleUpdateProfile = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await apiService.updateProfile({
        firstName,
        lastName,
        phone,
        location: { city }
      });

      if (response.data?.user) {
        updateUser(response.data.user);
        setSuccess('Profile updated successfully');
        setIsEditing(false);
      } else {
        setError(response.error || 'Failed to update profile');
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLoading(true); 
      try {
        const response = await apiService.updateAvatar(file);
        if (response.data?.avatar) {
          updateUser({ profileImage: response.data.avatar });
          setSuccess('Profile picture updated successfully');
        } else {
          setError(response.error || 'Failed to update avatar');
        }
      } catch (error) {
        setError('Network error during upload');
      } finally {
        setLoading(false);
      }
    }
  };

  // --- KYC Upload Handler ---
  const handleKycUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Basic client-side validation
      if (file.type !== 'application/pdf') {
        setError('Only PDF documents are allowed for KYC.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        setError('File size must be less than 10MB.');
        return;
      }

      setKycLoading(true);
      setError('');
      setSuccess('');

      try {
        const res = await apiService.uploadKYC(file);
        if (res.data) {
          // Manually construct the update to ensure UI reflects it immediately
          updateUser({ 
            kycStatus: res.data.kycStatus || 'pending',
            kycDocumentUrl: res.data.kycDocumentUrl 
          });
          setSuccess('KYC Document uploaded successfully!');
        } else {
          setError(res.error || 'KYC Upload failed');
        }
      } catch (err) {
        setError('Network error during KYC upload');
      } finally {
        setKycLoading(false);
      }
    }
  };

  // --- Password Reset Execution (Triggered by Modal) ---
  const executePasswordReset = async () => {
    setResetLoading(true);
    setShowResetModal(false); // Close modal immediately
    setError('');
    setSuccess('');

    try {
      await apiService.forgotPassword(user.email);
      setSuccess('Password reset link sent! Check your email.');
    } catch (err) {
      setError('Failed to send reset link.');
    } finally {
      setResetLoading(false);
    }
  };

  const displayName = `${user.firstName} ${user.lastName}`.trim() || user.email;
  const displayAvatar = user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;

  const formatEgp = (value?: number) => {
    if (value === undefined || value === null) return 'EGP 0';
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(value);
  };

  const getVehicleStatusBadge = (status?: VehicleStatus | string) => {
    const normalized = typeof status === 'string' ? status.toLowerCase() : 'draft';
    const map: Record<string, { label: string; className: string }> = {
      draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600' },
      active: { label: 'Active', className: 'bg-emerald-50 text-emerald-600' },
      sold: { label: 'Sold', className: 'bg-rose-50 text-rose-600' },
      delisted: { label: 'Delisted', className: 'bg-amber-50 text-amber-700' }
    };
    return map[normalized] || { label: 'Unknown', className: 'bg-slate-100 text-slate-500' };
  };

  const getAuctionStatusBadge = (status?: AuctionStatus | string) => {
    if (!status) {
      return { label: 'No Auction', className: 'bg-slate-100 text-slate-500' };
    }
    const normalized = typeof status === 'string' ? status.toLowerCase() : 'draft';
    const map: Record<string, { label: string; className: string }> = {
      draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600' },
      scheduled: { label: 'Scheduled', className: 'bg-indigo-50 text-indigo-600' },
      live: { label: 'Live', className: 'bg-emerald-50 text-emerald-600' },
      ended: { label: 'Ended', className: 'bg-rose-50 text-rose-600' },
      settled: { label: 'Settled', className: 'bg-sky-50 text-sky-600' },
      cancelled: { label: 'Cancelled', className: 'bg-amber-50 text-amber-700' }
    };
    return map[normalized] || { label: 'Unknown', className: 'bg-slate-100 text-slate-500' };
  };

const renderKycBadge = () => {
    const status = user.kycStatus || 'not_uploaded';
    switch (status) {
      case 'approved':
        return <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-1 rounded"><CheckCircle size={10} /> Verified</span>;
      case 'pending':
        return <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-1 rounded"><AlertTriangle size={10} /> Pending</span>;
      case 'denied':
        return <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 px-2 py-1 rounded"><XCircle size={10} /> Denied</span>;
      default:
        return <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded">Not Uploaded</span>;
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-12 profile-static-cards profile-page relative">
      {isLightboxOpen && (
        <ImageLightbox
          src={displayAvatar}
          alt={`${displayName} profile`}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}

      {/* ✅ CUSTOM PASSWORD RESET MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowResetModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowResetModal(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4">
                <Lock size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Reset Password?</h3>
              <p className="text-sm text-slate-500 mb-6">
                We will send a secure reset link to <strong>{user.email}</strong>. This will allow you to create a new password.
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={executePasswordReset}
                  className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
                >
                  Send Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: Avatar, Contact Verification, KYC, Security */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* 1. Avatar Card */}
            <div className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 overflow-hidden premium-card-hover">
              <div className="h-32 bg-slate-900"></div>
              <div className="px-6 pb-6 text-center">
                <div className="relative inline-block -mt-16 mb-4 group">
                  <button onClick={() => setIsLightboxOpen(true)} className="block no-hover-rise">
                    <img src={displayAvatar} className="w-32 h-32 rounded-3xl border-4 border-white shadow-xl bg-white object-cover" alt="Profile" />
                  </button>
                  <label className="absolute bottom-1 right-1 bg-white p-2 rounded-xl shadow-lg border border-slate-100 text-slate-500 hover:text-indigo-600 cursor-pointer transition-all hover:scale-110">
                    <Camera size={16} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={loading} />
                  </label>
                </div>

                <h2 className="text-xl font-black text-slate-900">{displayName}</h2>
                <p className="text-sm text-slate-500 mb-6">{user.email}</p>
                
                {/* Role & Email Verification Badges */}
                <div className="flex justify-center gap-2 mb-6">
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">{user.role}</span>
                  {user.emailVerified && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Shield size={10} /> Verified
                    </span>
                  )}
                </div>

                {/* Edit Button */}
                <button 
                  onClick={() => isEditing ? handleUpdateProfile() : setIsEditing(true)}
                  disabled={loading}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 shadow-lg shadow-slate-900/20"
                >
                  {isEditing ? (loading ? 'Saving...' : 'Save Changes') : 'Edit Profile'}
                </button>
                
                {isEditing && (
                  <button
                    onClick={() => { setIsEditing(false); setError(''); setSuccess(''); }}
                    className="w-full mt-2 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* 2. Contact Verification Status */}
            <div className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 p-6 premium-card-hover">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">Contact Verification</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail size={18} className={user.emailVerified ? "text-emerald-500" : "text-amber-500"} />
                    <span className="text-sm font-medium text-slate-700">Email Status</span>
                  </div>
                  {user.emailVerified ? (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Verified</span>
                  ) : (
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">Pending</span>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Phone size={18} className={user.phoneVerified ? "text-emerald-500" : "text-slate-400"} />
                    <span className="text-sm font-medium text-slate-700">Phone Status</span>
                  </div>
                   <div className={`w-2 h-2 rounded-full ${user.phoneVerified ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                </div>
              </div>
            </div>

            {/* 3. KYC Verification Card */}
            <div className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 p-6 premium-card-hover">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
                <FileText size={16} /> Identity Verification (KYC)
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Document Status</span>
                  {renderKycBadge()}
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  {(!user.kycStatus || user.kycStatus === 'not_uploaded') && "To sell or bid, please upload a government-issued ID (PDF only)."}
                  {user.kycStatus === 'pending' && "Your document is under review by our team. This usually takes 24 hours."}
                  {user.kycStatus === 'approved' && "You are fully verified to buy and sell vehicles."}
                  {user.kycStatus === 'denied' && "Your document was rejected. Please upload a clear, valid PDF."}
                </p>

                {user.kycStatus !== 'approved' && (user.kycStatus !== 'pending') && (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-indigo-400 transition-all group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {kycLoading ? (
                        <span className="text-xs text-slate-500 flex items-center gap-2">
                          <span className="animate-spin h-3 w-3 border-2 border-indigo-500 border-t-transparent rounded-full"/> 
                          Uploading...
                        </span>
                      ) : (
                        <>
                          <div className="mb-1 text-slate-400 group-hover:text-indigo-600 transition-colors">
                            <UploadCloud size={20} />
                          </div>
                          <p className="mb-1 text-xs text-slate-500 group-hover:text-indigo-600 font-bold">Click to upload PDF</p>
                        </>
                      )}
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="application/pdf"
                      onChange={handleKycUpload}
                      disabled={kycLoading}
                    />
                  </label>
                )}
                
                {user.kycDocumentUrl && (
                  <a 
                    href={user.kycDocumentUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center justify-center gap-1 w-full py-2 text-xs text-indigo-600 font-bold bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                  >
                    <ExternalLink size={12} /> View Uploaded Document
                  </a>
                )}
              </div>
            </div>

            {/* 4. Security Card */}
            <div className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 p-6 premium-card-hover">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Lock size={16} /> Security
              </h3>
              
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Need to update your password? We will send a secure reset link to <strong>{user.email}</strong>.
              </p>

              <button 
                onClick={() => setShowResetModal(true)}
                disabled={resetLoading}
                className="w-full py-2.5 flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {resetLoading ? (
                   <><div className="animate-spin h-3 w-3 border-2 border-white/30 border-t-white rounded-full"/> Sending...</>
                ) : (
                   'Change Password via Email'
                )}
              </button>
            </div>

            <button onClick={handleLogout} className="w-full mt-2 py-2.5 flex items-center justify-center gap-2 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600 hover:bg-red-100 transition-all">
               <LogOut size={14} /> Sign Out
            </button>
          </div>

          {/* RIGHT COLUMN: Editable Form */}
          <div className="lg:col-span-2 space-y-8">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl animate-pulse flex items-center gap-2"><AlertTriangle size={18}/> {error}</div>}
            {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2"><CheckCircle size={18}/> {success}</div>}
            
            <div className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 p-8 premium-card-hover">
              <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2">
                <User size={20} /> Personal Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* First Name (Editable) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">First Name</label>
                  {isEditing ? (
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                      className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none font-semibold text-slate-900" />
                  ) : (
                    <p className="p-2 font-bold text-slate-900 border-b border-slate-100">{user.firstName || '-'}</p>
                  )}
                </div>

                {/* Last Name (Editable) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Name</label>
                  {isEditing ? (
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                      className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none font-semibold text-slate-900" />
                  ) : (
                    <p className="p-2 font-bold text-slate-900 border-b border-slate-100">{user.lastName || '-'}</p>
                  )}
                </div>

                {/* EMAIL (READ ONLY / LOCKED) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                  <p className="p-2 font-bold text-slate-500 flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200/50">
                    <Mail size={14} /> {user.email}
                    {/* Lock Icon */}
                    <span className="ml-auto text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                       Locked
                    </span>
                  </p>
                </div>

                {/* Phone (Editable) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</label>
                  {isEditing ? (
                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none font-semibold text-slate-900" />
                  ) : (
                    <p className="p-2 font-bold text-slate-900 border-b border-slate-100 flex items-center gap-2">
                       {user.phone ? <><Phone size={14} /> {user.phone}</> : <span className="text-slate-400">Not set</span>}
                    </p>
                  )}
                </div>

                {/* Location (Editable) */}
                <div className="space-y-2">
                  <label htmlFor="profile-location" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary Location</label>
                  {isEditing ? (
                    <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Cairo"
                      className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none font-semibold text-slate-900" />
                  ) : (
                    <p className="p-2 font-bold text-slate-900 border-b border-slate-100 flex items-center gap-2">
                       {user.location?.city ? <><MapPin size={14} /> {user.location.city}</> : <span className="text-slate-400">Not set</span>}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* My Listings Section */}
            <div className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 p-8 premium-card-hover">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-900">My Listings</h3>
                {(user.role === 'SELLER' || user.role === 'DEALER') && (
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                    {sellerListings.length} total
                  </span>
                )}
              </div>

              {(user.role !== 'SELLER' && user.role !== 'DEALER') && (
                <div className="bg-slate-50 border border-slate-200 text-slate-600 px-4 py-3 rounded-2xl text-sm">
                  Listings are available for sellers only.
                </div>
              )}

              {(user.role === 'SELLER' || user.role === 'DEALER') && (
                <>
                  {listingsLoading && (
                    <div className="text-sm text-slate-500">Loading your listings...</div>
                  )}

                  {!listingsLoading && listingsError && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-2xl text-sm">
                      {listingsError}
                    </div>
                  )}

                  {!listingsLoading && !listingsError && sellerListings.length === 0 && (
                    <div className="bg-slate-50 border border-slate-200 text-slate-600 px-4 py-3 rounded-2xl text-sm">
                      You have no listings yet.
                    </div>
                  )}

                  {!listingsLoading && sellerListings.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {sellerListings.map((listing) => {
                        const vehicleBadge = getVehicleStatusBadge(listing.vehicle.status);
                        const auctionBadge = getAuctionStatusBadge(listing.auctionStatus);
                        const title = `${listing.vehicle.year || ''} ${listing.vehicle.make} ${listing.vehicle.model}`.trim();
                        const image = listing.vehicle.images?.[0];

                        return (
                          <div
                            key={listing.id}
                            className="p-5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 transition-all"
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">
                                {image ? (
                                  <img src={image} alt={title} className="w-full h-full object-cover" />
                                ) : (
                                  <span>{listing.vehicle.make?.slice(0, 2)?.toUpperCase() || 'CV'}</span>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <h4 className="font-bold text-slate-900">{title || 'Vehicle Listing'}</h4>
                                    <p className="text-xs text-slate-500 mt-1">{formatEgp(listing.vehicle.price)}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${vehicleBadge.className}`}>
                                      Vehicle: {vehicleBadge.label}
                                    </span>
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${auctionBadge.className}`}>
                                      Auction: {auctionBadge.label}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Recent Activity Section */}
            <div className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 p-8 premium-card-hover">
              <h3 className="text-xl font-black text-slate-900 mb-8">{t('Recent Activity', 'النشاط الأخير')}</h3>
              <div className="text-center py-8 text-slate-400">
                <ExternalLink size={32} className="mx-auto mb-3 text-slate-300" />
                <p className="font-semibold text-slate-500">{t('No recent activity', 'لا يوجد نشاط حديث')}</p>
                <p className="text-sm mt-1">{t('Your bids, purchases, and listings will appear here.', 'ستظهر مزايداتك ومشترياتك وقوائمك هنا.')}</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
export default ProfilePage;