import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      navigate('/browse');
    } else {
      setError(result.error || 'Login failed');
    }
    
    setLoading(false);
  };

  return (
    <section className="relative min-h-screen flex items-start justify-end px-4 py-10 sm:px-6 md:py-16 md:items-center text-slate-900 overflow-y-auto">
      <div
        className="fixed inset-0 bg-center bg-cover"
        style={{
          backgroundImage: 'url("/loginpage.png")',
          filter: 'none'
        }}
        aria-hidden="true"
      />
      <div className="fixed inset-0 bg-slate-950/55" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-6xl flex justify-end hero-fade-in">
        <div className="bg-gradient-to-br from-[#F9F6F0] via-[#EEE6DA] to-[#E3EDF7] rounded-3xl shadow-2xl border border-white/70 p-6 md:p-8 w-full max-w-sm my-auto">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Log in</h1>
          <p className="text-sm text-slate-600 mb-6">Welcome back to Autousata</p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full rounded-lg bg-indigo-500 py-3 text-sm font-semibold text-white hover:bg-indigo-400 shadow-md shadow-indigo-500/30 transition-all"
          >
            Open login
          </button>
          <p className="mt-4 text-center text-sm text-slate-600">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-slate-900 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-20 flex items-start justify-center px-4 pt-16 sm:pt-20">
          <div
            className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl bg-gradient-to-br from-[#F9F6F0] via-[#EEE6DA] to-[#E3EDF7] shadow-2xl border border-white/70 p-8 md:p-10 hero-fade-in"
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-700"
              aria-label="Close"
            >
              ✕
            </button>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Log in</h2>
            <p className="text-sm text-slate-600 mb-6">Welcome back to Autousata</p>

            {error && (
              <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">Email address</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                  <input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="inline-flex items-center gap-2 text-slate-600 cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                  <span>Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-slate-900 font-medium hover:underline">Forgot password?</Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-indigo-500 py-3 text-sm font-semibold text-white hover:bg-indigo-400 shadow-md shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging in...' : 'Continue'}
              </button>

              <p className="text-center text-sm text-slate-600">
                Don't have an account?{' '}
                <Link to="/signup" className="font-semibold text-slate-900 hover:underline">
                  Sign up
                </Link>
              </p>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default LoginPage;
