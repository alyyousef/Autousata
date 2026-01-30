
import React from 'react';
import { User, Shield, Mail, Phone, MapPin, ExternalLink, Camera, ChevronRight } from 'lucide-react';
import { User as UserType } from '../types';

const ProfilePage: React.FC<{ user: UserType }> = ({ user }) => {
  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* User Bio Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="h-32 bg-indigo-600"></div>
              <div className="px-6 pb-6 text-center">
                <div className="relative inline-block -mt-16 mb-4">
                  <img src={user.avatar} className="w-32 h-32 rounded-3xl border-4 border-white shadow-xl bg-white" alt="" />
                  <button className="absolute bottom-1 right-1 bg-white p-2 rounded-xl shadow-lg border border-slate-100 text-slate-500 hover:text-indigo-600 transition-all">
                    <Camera size={16} />
                  </button>
                </div>
                <h2 className="text-xl font-black text-slate-900">{user.name}</h2>
                <p className="text-sm text-slate-500 mb-6">{user.email}</p>
                <div className="flex justify-center gap-2 mb-6">
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">{user.role}</span>
                  {user.isKycVerified && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Shield size={10} /> Verified
                    </span>
                  )}
                </div>
                <button className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all">
                  Edit Profile
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">Verification Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail size={18} className="text-emerald-500" />
                    <span className="text-sm font-medium text-slate-700">Email Verified</span>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Phone size={18} className="text-emerald-500" />
                    <span className="text-sm font-medium text-slate-700">Phone Verified</span>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield size={18} className="text-indigo-600" />
                    <span className="text-sm font-medium text-slate-700">Identity KYC</span>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                </div>
              </div>
              <button className="w-full mt-6 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all">
                Update Security Settings
              </button>
            </div>
          </div>

          {/* Main Profile Info */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
              <h3 className="text-xl font-black text-slate-900 mb-8">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                  <p className="text-slate-900 font-bold pb-2 border-b border-slate-100">{user.name}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                  <p className="text-slate-900 font-bold pb-2 border-b border-slate-100">{user.email}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</label>
                  <p className="text-slate-900 font-bold pb-2 border-b border-slate-100">+1 (555) 123-4567</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary Location</label>
                  <p className="text-slate-900 font-bold pb-2 border-b border-slate-100">San Francisco, CA</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
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
