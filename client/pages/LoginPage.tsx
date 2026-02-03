import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

      <div
        className="relative z-10 w-full max-w-6xl flex justify-end hero-fade-in"
        style={{ transform: 'scale(0.67)', transformOrigin: 'top right' }}
      >
        <div className="bg-gradient-to-br from-[#F9F6F0] via-[#EEE6DA] to-[#E3EDF7] rounded-3xl shadow-2xl border border-white/70 p-8 md:p-10 w-full max-w-lg my-auto">
          <h1 className="text-3xl font-semibold text-slate-900 mt-4 mb-2">Welcome back</h1>
          <p className="text-sm text-slate-600 mb-6">Log in to track bids, saved searches, and your garage.</p>

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
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
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
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
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
              className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 shadow-lg shadow-slate-900/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
    </section>
  );
};

export default LoginPage;
