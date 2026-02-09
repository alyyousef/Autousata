import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, ArrowRight, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// Define Validation Schema
const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  // ✅ 1. Get Logout Function
  const { logout } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // Redirect if no token is present
  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (!token) return;
    
    setStatus('loading');
    setServerError('');

    try {
      const res = await apiService.resetPassword(token, data.password);
      
      if (res.error) {
        setServerError(res.error);
        setStatus('idle');
      } else {
        // ✅ 2. FORCE LOGOUT ON SUCCESS
        // This clears the old token so the user is not "half-logged-in"
        await logout();
        
        setStatus('success');
        
        // Optional: Redirect after a delay
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (err) {
      setServerError('Failed to reset password. The link may have expired.');
      setStatus('idle');
    }
  };

  if (!token) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
        
        {/* Header Graphic */}
        <div className="h-32 bg-slate-900 relative overflow-hidden">
           <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
           <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>
        </div>

        <div className="p-8 -mt-10 relative z-10">
          <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-6 mx-auto">
            <Lock size={32} className="text-slate-900" />
          </div>

          <h2 className="text-2xl font-black text-center text-slate-900 mb-2">Set New Password</h2>
          <p className="text-center text-slate-500 text-sm mb-8">
            Create a strong password to secure your account.
          </p>

          {status === 'success' ? (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center animate-in fade-in zoom-in duration-300">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={24} />
              </div>
              <h3 className="font-bold text-emerald-900">Password Reset!</h3>
              <p className="text-xs text-emerald-700 mt-1 mb-4">
                Your password has been updated successfully.
              </p>
              <Link to="/login" className="inline-block px-6 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition">
                Login Now
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {serverError && (
                <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} /> {serverError}
                </div>
              )}

              {/* New Password */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <input 
                    {...register('password')}
                    type={showPassword ? "text" : "password"}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-medium text-slate-900"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-rose-500 font-bold">{errors.password.message}</p>}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirm Password</label>
                <input 
                  {...register('confirmPassword')}
                  type="password"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-medium text-slate-900"
                  placeholder="••••••••"
                />
                {errors.confirmPassword && <p className="text-xs text-rose-500 font-bold">{errors.confirmPassword.message}</p>}
              </div>

              <button 
                type="submit" 
                disabled={status === 'loading'}
                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === 'loading' ? 'Updating...' : 'Reset Password'}
                {status !== 'loading' && <ArrowRight size={18} />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;