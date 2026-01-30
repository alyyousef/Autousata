import React from 'react';
import { Link } from 'react-router-dom';

const LoginPage: React.FC = () => (
  <section className="relative min-h-screen flex items-center justify-center px-4 py-2 text-slate-900">
    <div
      className="absolute inset-0 bg-center bg-cover"
      style={{
        backgroundImage: 'url("/loginpage.png")',
        filter: 'none'
      }}
      aria-hidden="true"
    />
    <div className="absolute inset-0 bg-slate-900/40" aria-hidden="true" />

    <div className="relative z-10 w-full max-w-5xl">
      <div className="flex justify-end -translate-y-8">
        <div className="bg-gradient-to-br from-[#F9F6F0] via-[#EEE6DA] to-[#E3EDF7] rounded-[28px] shadow-[0_20px_60px_rgba(15,23,42,0.25)] border border-white/70 p-10 md:p-12 w-full max-w-[560px]">
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mb-8">Log in to your account</h1>

          <form className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-800">Email address</label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="w-full rounded-xl border border-white/60 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-800">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-white/60 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
              <label className="inline-flex items-center gap-2 text-slate-700">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-slate-700 font-medium hover:text-slate-900">Forgot password?</Link>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 hover:bg-slate-800 transition-colors"
              >
                Continue
              </button>
              <p className="text-center text-sm text-slate-700">
                Don't have an account?{' '}
                <Link to="/signup" className="underline underline-offset-4 font-semibold text-slate-900">
                  Sign up
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

    </div>
  </section>
);

export default LoginPage;
