import React, { useEffect, useState } from 'react';
import { Shield, Mail, Phone, ExternalLink, Camera, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { Navigate, useNavigate } from 'react-router-dom';
import ImageLightbox from '../components/ImageLightbox';
import { AuctionStatus, VehicleStatus } from '../types';

const ProfilePage: React.FC = () => {
  const { user, loading: authLoading, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim());
  const [location, setLocation] = useState(user?.location?.city || '');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
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

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Handle Logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Handle Text Profile Updates
  const handleUpdateProfile = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await apiService.updateProfile({
        name,
        location: { city: location }
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

  // Handle Image Upload (New Logic)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setError('');
      setSuccess('');
      setLoading(true);

      try {
        // Call the updated API method
        const response = await apiService.updateAvatar(file);
        
        if (response.data?.avatar) {
          // Update local user state immediately so the image changes on screen
          updateUser({ profileImage: response.data.avatar });
          setSuccess('Profile picture updated successfully');
        } else {
          setError(response.error || 'Failed to update avatar');
        }
      } catch (error) {
        console.error(error);
        setError('Network error during upload');
      } finally {
        setLoading(false);
      }
    }
  };

  // Helper to get display name
  const displayName = user.firstName ? `${user.firstName} ${user.lastName}` : user.name;
  // Helper to get avatar
  const displayAvatar = user.profileImage || user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'User')}`;

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

      const [vehiclesResponse, auctionsResponse] = await Promise.all([
        apiService.getSellerVehicles(),
        apiService.getSellerAuctions()
      ]);

      if (!isMounted) return;

      if (vehiclesResponse.error) {
        setListingsError(vehiclesResponse.error);
        setSellerListings([]);
        setListingsLoading(false);
        return;
      }

      const vehicles = vehiclesResponse.data || [];
      const auctions = auctionsResponse.data?.auctions || [];
      const auctionMap = new Map(auctions.map((auction: any) => [auction.vehicleId, auction]));

      const vehicleMap = new Map(vehicles.map((vehicle: any) => [vehicle._id || vehicle.id, vehicle]));

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
      setListingsLoading(false);
    };

    loadSellerListings();

    return () => {
      isMounted = false;
    };
  }, [user]);

  return (
    <div className="bg-slate-50 min-h-screen py-12 profile-static-cards">
      {isLightboxOpen && (
        <ImageLightbox
          src={displayAvatar}
          alt={`${displayName} profile`}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* User Bio Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 overflow-hidden premium-card-hover">
              <div className="h-32 bg-slate-900"></div>
              <div className="px-6 pb-6 text-center">
                <div className="relative inline-block -mt-16 mb-4 group">
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className="block no-hover-rise"
                    aria-label="View profile picture full screen"
                  >
                    <img 
                      src={displayAvatar} 
                      className="w-32 h-32 rounded-3xl border-4 border-white shadow-xl bg-white object-cover" 
                      alt="Profile" 
                    />
                  </button>
                  
                  {/* === NEW: File Input Label === */}
                  <label htmlFor="profile-avatar-upload" className="absolute bottom-1 right-1 bg-white p-2 rounded-xl shadow-lg border border-slate-100 text-slate-500 hover:text-indigo-600 cursor-pointer transition-all hover:scale-110">
                    <Camera size={16} />
                    <input 
                      id="profile-avatar-upload"
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      disabled={loading}
                      aria-label="Upload profile picture"
                    />
                  </label>
                </div>

                <h2 className="text-xl font-black text-slate-900">{displayName}</h2>
                <p className="text-sm text-slate-500 mb-6">{user.email}</p>
                
                <div className="flex justify-center gap-2 mb-6">
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">{user.role}</span>
                  {user.isKycVerified && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Shield size={10} /> Verified
                    </span>
                  )}
                </div>

                <button 
                  onClick={() => {
                    if (isEditing) {
                      handleUpdateProfile();
                    } else {
                      setIsEditing(true);
                      setName(displayName || '');
                      setLocation(user.location?.city || '');
                    }
                  }}
                  disabled={loading}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 shadow-lg shadow-slate-900/20"
                >
                  {isEditing ? (loading ? 'Saving...' : 'Save Changes') : 'Edit Profile'}
                </button>
                
                {isEditing && (
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setError('');
                      setSuccess('');
                    }}
                    className="w-full mt-2 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Verification Status */}
            <div className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 p-6 premium-card-hover">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">Verification Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail size={18} className={user.emailVerified ? "text-emerald-500" : "text-slate-400"} />
                    <span className="text-sm font-medium text-slate-700">Email Verified</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${user.emailVerified ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Phone size={18} className={user.phoneVerified ? "text-emerald-500" : "text-slate-400"} />
                    <span className="text-sm font-medium text-slate-700">Phone Verified</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${user.phoneVerified ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                </div>
              </div>
              
              {/* Logout Button */}
              <button 
                onClick={handleLogout}
                className="w-full mt-6 py-2.5 flex items-center justify-center gap-2 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600 hover:bg-red-100 transition-all"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>

          {/* Main Profile Info */}
          <div className="lg:col-span-2 space-y-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl animate-pulse">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
                {success}
              </div>
            )}
            
            <div className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 p-8 premium-card-hover">
              <h3 className="text-xl font-black text-slate-900 mb-8">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label htmlFor="profile-full-name" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                  {isEditing ? (
                    <input
                      id="profile-full-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-slate-900 font-bold pb-2 border-b-2 border-indigo-500 focus:outline-none bg-transparent"
                    />
                  ) : (
                    <p className="text-slate-900 font-bold pb-2 border-b border-slate-100">{displayName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                  <p className="text-slate-900 font-bold pb-2 border-b border-slate-100">{user.email}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</label>
                  <p className="text-slate-900 font-bold pb-2 border-b border-slate-100">{user.phone || 'Not set'}</p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="profile-location" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary Location</label>
                  {isEditing ? (
                    <input
                      id="profile-location"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Enter city"
                      className="w-full text-slate-900 font-bold pb-2 border-b-2 border-indigo-500 focus:outline-none bg-transparent"
                    />
                  ) : (
                    <p className="text-slate-900 font-bold pb-2 border-b border-slate-100">{user.location?.city || 'Not set'}</p>
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
              <h3 className="text-xl font-black text-slate-900 mb-8">Recent Activity</h3>
              <div className="space-y-4">
                {[
                  { action: 'Bid Placed', target: '2021 Porsche 911', date: '2 hours ago', amount: 'EGP 95,000' },
                  { action: 'Listing Created', target: '2022 Audi RS6', date: 'Yesterday', amount: 'N/A' },
                  { action: 'Won Auction', target: '2019 Ford Raptor', date: '3 days ago', amount: 'EGP 68,500' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                        <ExternalLink size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{item.action}: {item.target}</h4>
                        <p className="text-xs text-slate-500">{item.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{item.amount}</p>
                      <ChevronRight size={16} className="text-slate-300 ml-auto mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
export default ProfilePage;
