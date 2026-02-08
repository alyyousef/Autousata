import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="bg-slate-50 min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg bg-white/95 border border-slate-200 rounded-3xl shadow-xl p-8 md:p-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Mail size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{t('Forgot your password?', 'نسيت كلمة السر؟')}</h1>
            <p className="text-sm text-slate-500">{t("We'll send a reset link if the email exists.", 'هنبعت لينك إعادة تعيين لو الإيميل موجود.')}</p>
          </div>
        </div>

        {submitted ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {t('If an account exists for', 'لو الحساب موجود للإيميل')}{' '}
            <span className="font-semibold">{email}</span>, {t("we'll email a reset link shortly.", 'هنبعت لينك إعادة التعيين قريب.')}
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
                {t('Email address', 'البريد الإلكتروني')}
              </label>
              <input
                id="resetEmail"
                type="email"
                required
                placeholder={t('you@email.com', 'you@email.com')}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-all"
            >
              {t('Send reset link', 'ابعت لينك إعادة التعيين')}
            </button>
          </form>
        )}

        <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
          <Link to="/login" className="font-semibold text-slate-700 hover:text-slate-900">
            {t('Back to login', 'ارجع لتسجيل الدخول')}
          </Link>
          <Link to="/signup" className="font-semibold text-slate-700 hover:text-slate-900">
            {t('Create account', 'اعمل حساب')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
