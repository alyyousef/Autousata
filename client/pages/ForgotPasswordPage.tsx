import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, ArrowRight, X, AlertCircle, CheckCircle, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormData = z.infer<typeof schema>;

const ForgotPasswordPage: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'not_found'>('idle');
  const [serverMessage, setServerMessage] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setStatus('loading');
    setServerMessage('');
    
    try {
      const res = await apiService.forgotPassword(data.email);
      
      // ✅ Handle "User Not Found" explicitly as requested
      if (res.error === 'Email not found' || (res as any).code === 'USER_NOT_FOUND') {
        setStatus('not_found');
      } else if (res.error) {
        setServerMessage(res.error);
        setStatus('idle'); // Allow retry
      } else {
        setStatus('success');
      }
    } catch (err) {
      setServerMessage('Something went wrong. Please try again.');
      setStatus('idle');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      
      {/* Main Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
        
        {/* Header Image/Pattern */}
        <div className="h-32 bg-slate-900 relative overflow-hidden">
           <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
           <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500 rounded-full blur-3xl opacity-20"></div>
        </div>

        <div className="p-8 -mt-10 relative z-10">
          <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-6 mx-auto">
            <Mail size={32} className="text-slate-900" />
          </div>

          <h2 className="text-2xl font-black text-center text-slate-900 mb-2">Forgot Password?</h2>
          <p className="text-center text-slate-500 text-sm mb-8">
            Enter your email and we'll get you back on track.
          </p>

          {/* Success State (Premium Popup Vibe) */}
          {status === 'success' && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center animate-in fade-in zoom-in duration-300">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={24} />
              </div>
              <h3 className="font-bold text-emerald-900">Email Sent!</h3>
              <p className="text-xs text-emerald-700 mt-1 mb-4">
                Check your inbox for the secure reset link.
              </p>
              <Link to="/login" className="text-xs font-bold text-emerald-700 hover:underline">
                Back to Login
              </Link>
            </div>
          )}

          {/* Not Found State (The Feature You Requested) */}
          {status === 'not_found' && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center animate-in fade-in zoom-in duration-300">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle size={24} />
              </div>
              <h3 className="font-bold text-amber-900">Account Not Found</h3>
              <p className="text-xs text-amber-700 mt-1 mb-4">
                This email is not registered with Autousata.
              </p>
              <Link 
                to="/signup" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
              >
                <UserPlus size={16} /> Create Account
              </Link>
              <div className="mt-4">
                <button onClick={() => setStatus('idle')} className="text-xs text-slate-400 hover:text-slate-600">
                  Try a different email
                </button>
              </div>
            </div>
          )}

          {/* Default Form State */}
          {status === 'idle' || status === 'loading' ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {serverMessage && (
                <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} /> {serverMessage}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                <input 
                  {...register('email')}
                  type="email" 
                  disabled={status === 'loading'}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-medium text-slate-900 disabled:opacity-50"
                  placeholder="name@example.com"
                />
                {errors.email && <p className="text-xs text-rose-500 font-bold">{errors.email.message}</p>}
              </div>

              <button 
                type="submit" 
                disabled={status === 'loading'}
                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
                {!status && <ArrowRight size={18} />}
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
                  Remember your password? Login
                </Link>
              </div>
            </form>
          ) : null}

        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;