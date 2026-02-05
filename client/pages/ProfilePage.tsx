import React, { useState, useEffect } from 'react';
import { Shield, Mail, Phone, ExternalLink, Camera, ChevronRight, LogOut, MapPin, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { useNavigate } from 'react-router-dom';

const ProfilePage: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  
  // 1. Separate States for DB Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // 2. Initialize state when user data loads
  useEffect(() => {
    if (user) {
        setFirstName(user.firstName || '');
        setLastName(user.lastName || '');
        setPhone(user.phone || '');
        setCity(user.location?.city || '');
    }
  }, [user]);

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // 3. Updated Update Logic
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
          setSuccess('Profile picture updated');
        }
      } catch (error) {
        setError('Upload failed');
      } finally {
        setLoading(false);
      }
    }
  };

  const displayName = `${user.firstName} ${user.lastName}`.trim() || user.email;
  const displayAvatar = user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: Avatar & Bio */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="h-32 bg-slate-900"></div>
              <div className="px-6 pb-6 text-center">
                <div className="relative inline-block -mt-16 mb-4 group">
                  <img 
                    src={displayAvatar} 
                    className="w-32 h-32 rounded-3xl border-4 border-white shadow-xl bg-white object-cover" 
                    alt="Profile" 
                  />
                  <label className="absolute bottom-1 right-1 bg-white p-2 rounded-xl shadow-lg border border-slate-100 text-slate-500 hover:text-indigo-600 cursor-pointer transition-all hover:scale-110">
                    <Camera size={16} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={loading} />
                  </label>
                </div>

                <h2 className="text-xl font-black text-slate-900">{displayName}</h2>
                <p className="text-sm text-slate-500 mb-6">{user.email}</p>
                
                <button 
                  onClick={() => isEditing ? handleUpdateProfile() : setIsEditing(true)}
                  disabled={loading}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  {isEditing ? (loading ? 'Saving...' : 'Save Changes') : 'Edit Profile'}
                </button>
                
                {isEditing && (
                  <button
                    onClick={() => { setIsEditing(false); setError(''); setSuccess(''); }}
                    className="w-full mt-2 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
            
            <button onClick={handleLogout} className="w-full py-3 flex items-center justify-center gap-2 bg-white border border-red-100 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50">
                <LogOut size={14} /> Sign Out
            </button>
          </div>

          {/* RIGHT COLUMN: Edit Form */}
          <div className="lg:col-span-2 space-y-8">
            {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl">{error}</div>}
            {success && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl">{success}</div>}
            
            <div className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 p-8">
              <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2">
                <User size={20} /> Personal Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* First Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">First Name</label>
                  {isEditing ? (
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                      className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none font-semibold text-slate-900" />
                  ) : (
                    <p className="p-2 font-bold text-slate-900">{user.firstName || '-'}</p>
                  )}
                </div>

                {/* Last Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Name</label>
                  {isEditing ? (
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                      className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none font-semibold text-slate-900" />
                  ) : (
                    <p className="p-2 font-bold text-slate-900">{user.lastName || '-'}</p>
                  )}
                </div>

                {/* Email (Read Only) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                  <p className="p-2 font-bold text-slate-500 flex items-center gap-2">
                    <Mail size={14} /> {user.email}
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">Read-Only</span>
                  </p>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</label>
                  {isEditing ? (
                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none font-semibold text-slate-900" />
                  ) : (
                    <p className="p-2 font-bold text-slate-900 flex items-center gap-2">
                       {user.phone ? <><Phone size={14} /> {user.phone}</> : <span className="text-slate-400">Not set</span>}
                    </p>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary Location</label>
                  {isEditing ? (
                    <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Cairo"
                      className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none font-semibold text-slate-900" />
                  ) : (
                    <p className="p-2 font-bold text-slate-900 flex items-center gap-2">
                       {user.location?.city ? <><MapPin size={14} /> {user.location.city}</> : <span className="text-slate-400">Not set</span>}
                    </p>
                  )}
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProfilePage;