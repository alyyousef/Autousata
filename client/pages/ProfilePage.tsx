import React, { useState, useEffect } from 'react';
import { Shield, Mail, Phone, ExternalLink, Camera, ChevronRight, LogOut, MapPin, User, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { Navigate, useNavigate } from 'react-router-dom';
import ImageLightbox from '../components/ImageLightbox';

const ProfilePage: React.FC = () => {
  const { user, loading: authLoading, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  
  // 1. Separate State for each editable field
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // 2. Load user data into state when component mounts
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
      setCity(user.location?.city || '');
    }
  }, [user]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // 3. Updated Submit Logic (Sends separated fields)
  const handleUpdateProfile = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Send fields separately to match Database columns
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
      setLoading(true); // Show loading while uploading
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

  const displayName = `${user.firstName} ${user.lastName}`.trim() || user.email;
  const displayAvatar = user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;

  return (
    <div className="bg-slate-50 min-h-screen py-12 profile-static-cards">
      {isLightboxOpen && (
        <ImageLightbox src={displayAvatar} alt={displayName} onClose={() => setIsLightboxOpen(false)} />
      )}
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: Avatar & Bio */}
          <div className="lg:col-span-1 space-y-6">
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
                
                {/* Verification Badges */}
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

            <div className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 p-6 premium-card-hover">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">Verification Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail size={18} className={user.emailVerified ? "text-emerald-500" : "text-amber-500"} />
                    <span className="text-sm font-medium text-slate-700">Email Status</span>
                  </div>
                  {/* Status Indicator */}
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
              <button onClick={handleLogout} className="w-full mt-6 py-2.5 flex items-center justify-center gap-2 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600 hover:bg-red-100 transition-all">
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Editable Form */}
          <div className="lg:col-span-2 space-y-8">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl animate-pulse">{error}</div>}
            {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">{success}</div>}
            
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary Location</label>
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

            {/* Recent Activity (Static for now) */}
            <div className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 p-8 premium-card-hover">
              <h3 className="text-xl font-black text-slate-900 mb-8">Recent Activity</h3>
              <div className="space-y-4">
                {[
                  { action: 'Bid Placed', target: '2021 Porsche 911', date: '2 hours ago', amount: 'EGP 95,000' },
                  { action: 'Listing Created', target: '2022 Audi RS6', date: 'Yesterday', amount: 'N/A' },
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