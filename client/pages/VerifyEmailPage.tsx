import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const { t } = useLanguage();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage(t('Invalid verification link.', 'لينك التفعيل غير صالح.'));
      return;
    }

    // Call the Backend API
    const verify = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(data.message);
        } else {
          setStatus('error');
          setMessage(data.error || t('Verification failed.', 'فشل التفعيل.'));
        }
      } catch (error) {
        setStatus('error');
        setMessage(t('Network error. Please try again.', 'حصل خطأ في الشبكة. جرّب تاني.'));
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-slate-100">
        
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader className="w-16 h-16 text-indigo-600 animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-slate-900">{t('Verifying...', 'جاري التفعيل...')}</h2>
            <p className="text-slate-500 mt-2">{t('Please wait while we activate your account.', 'استنى شوية وإحنا بنفعّل حسابك.')}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{t('Email Verified!', 'تم تفعيل الإيميل!')}</h2>
            <p className="text-slate-600 mt-2 mb-6">{message}</p>
            <Link 
              to="/login" 
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all block"
            >
              {t('Go to Login', 'روح لتسجيل الدخول')}
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{t('Verification Failed', 'فشل التفعيل')}</h2>
            <p className="text-slate-600 mt-2 mb-6">{message}</p>
            <Link 
              to="/login" 
              className="text-indigo-600 font-semibold hover:underline"
            >
              {t('Back to Login', 'ارجع لتسجيل الدخول')}
            </Link>
          </div>
        )}

      </div>
    </div>
  );
};

export default VerifyEmailPage;
