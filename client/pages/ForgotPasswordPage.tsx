import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="bg-slate-50 min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg bg-white/95 border border-slate-200 rounded-3xl shadow-xl p-8 md:p-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Mail size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Forgot your password?</h1>
            <p className="text-sm text-slate-500">We’ll send a reset link if the email exists.</p>
          </div>
        </div>

        {submitted ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            If an account exists for <span className="font-semibold">{email}</span>, we’ll email a reset link shortly.
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSubmitted(true);
            }}
            className="space-y-5"
          >
            <div>
              <label htmlFor="resetEmail" className="block text-sm font-medium text-slate-700 mb-2">
                Email address
              </label>
              <input
                id="resetEmail"
                type="email"
                required
                placeholder="you@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-all"
            >
              Send reset link
            </button>
          </form>
        )}

        <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
          <Link to="/login" className="font-semibold text-slate-700 hover:text-slate-900">
            Back to login
          </Link>
          <Link to="/signup" className="font-semibold text-slate-700 hover:text-slate-900">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
