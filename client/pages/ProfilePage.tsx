import React, { useState } from 'react';
import { Shield, Mail, Phone, ExternalLink, Camera, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { useNavigate } from 'react-router-dom';

const ProfilePage: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim());
  const [location, setLocation] = useState(user?.location?.city || '');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
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

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* User Bio Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 overflow-hidden premium-card-hover">
              <div className="h-32 bg-slate-900"></div>
              <div className="px-6 pb-6 text-center">
                <div className="relative inline-block -mt-16 mb-4 group">
                  <img 
                    src={displayAvatar} 
                    className="w-32 h-32 rounded-3xl border-4 border-white shadow-xl bg-white object-cover" 
                    alt="Profile" 
                  />
                  
                  {/* === NEW: File Input Label === */}
                  <label className="absolute bottom-1 right-1 bg-white p-2 rounded-xl shadow-lg border border-slate-100 text-slate-500 hover:text-indigo-600 cursor-pointer transition-all hover:scale-110">
                    <Camera size={16} />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      disabled={loading}
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                  {isEditing ? (
                    <input
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary Location</label>
                  {isEditing ? (
                    <input
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
