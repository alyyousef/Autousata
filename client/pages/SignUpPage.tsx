import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Camera } from 'lucide-react'; // <--- Added Camera Icon
import { useLanguage } from '../contexts/LanguageContext';

const SignUpPage: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // New State for Image Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Handle Image Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Create a fake URL just to show a preview instantly
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreedToTerms) {
      setError(t('Please agree to the Terms & Privacy Policy', 'من فضلك وافق على الشروط وسياسة الخصوصية'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('Passwords do not match', 'كلمات السر مش متطابقة'));
      return;
    }

    if (password.length < 8) {
      setError(t('Password must be at least 8 characters', 'كلمة السر لازم تكون 8 حروف على الأقل'));
      return;
    }

    setLoading(true);

    // Pass the selectedFile (or undefined) to the register function
    // NOTE: Ensure your AuthContext 'register' function accepts this 6th argument!
    const result = await register(firstName, lastName, email, phone, password, selectedFile || undefined);

    if (result.success) {
      navigate('/browse');
    } else {
      setError(result.error || t('Registration failed', 'فشل إنشاء الحساب'));
    }

    setLoading(false);
  };

  return (
    <section className="relative min-h-[calc(100vh-80px)] flex items-center justify-end px-4 py-6 sm:px-6 md:py-8 text-slate-900 overflow-hidden">
      <div className="fixed inset-0 bg-cover auth-bg-signup" aria-hidden="true" />
      <div className="fixed inset-0 bg-slate-950/55" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-6xl flex justify-end hero-fade-in">
        <div className="auth-card bg-gradient-to-br from-[#F4F7FF] via-[#EAF0FF] to-[#E1EAFF] rounded-3xl shadow-2xl border border-white/70 p-5 md:p-7 w-full max-w-lg my-auto max-h-[calc(100vh-140px)] overflow-y-auto">
          <h1 className="text-3xl font-semibold text-slate-900 mt-4 mb-2">{t('Become a AUTOUSATA Member!', 'انضم لـ AUTOUSATA دلوقتي!')}</h1>
          <p className="text-sm text-slate-600 mb-4">
            {t('Get access to verified listings, transparent bids, and concierge support!', 'احصل على قوائم موثّقة، مزايدات واضحة، ودعم مخصص.')}
          </p>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* === Profile Picture Upload Section === */}
            <div className="flex flex-col items-center mb-1">
                <div className="relative group">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-white border-2 border-slate-200 flex items-center justify-center shadow-sm">
                        {previewUrl ? (
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <Camera className="text-slate-400 w-7 h-7" />
                        )}
                    </div>
                    <label className="absolute bottom-0 right-0 bg-slate-900 text-white p-2 rounded-full cursor-pointer hover:bg-slate-700 transition-colors shadow-md">
                        <Camera size={14} />
                        <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleFileChange} 
                        />
                    </label>
                </div>
                <p className="text-xs text-slate-500 mt-2">{t('Upload profile photo', 'ارفع صورة البروفايل')}</p>
            </div>
            {/* ====================================== */}

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-2">{t('First name', 'الاسم الأول')}</label>
                  <input
                    id="firstName"
                    type="text"
                    placeholder={t('Enter your first name', 'اكتب اسمك الأول')}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-2">{t('Last name', 'اسم العيلة')}</label>
                  <input
                    id="lastName"
                    type="text"
                    placeholder={t('Enter your last name', 'اكتب اسم العيلة')}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">{t('Email address', 'البريد الإلكتروني')}</label>
                <input
                  id="email"
                  type="email"
                  placeholder={t('you@email.com', 'you@email.com')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                  {t('Phone number', 'رقم الموبايل')} <span className="text-slate-400 font-normal">{t('(optional)', '(اختياري)')}</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder={t('Enter your phone number', 'اكتب رقم الموبايل')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">{t('Password', 'كلمة السر')}</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('Min. 8 characters', 'أقل حاجة ٨ حروف')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors no-hover-rise"
                    aria-label={showPassword ? t('Hide password', 'اخفي كلمة السر') : t('Show password', 'اظهر كلمة السر')}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">{t('Confirm password', 'تأكيد كلمة السر')}</label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder={t('Confirm your password', 'أكد كلمة السر')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors no-hover-rise"
                    aria-label={showConfirmPassword ? t('Hide confirm password', 'اخفي تأكيد كلمة السر') : t('Show confirm password', 'اظهر تأكيد كلمة السر')}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <label htmlFor="terms" className="text-slate-600 cursor-pointer">
                {t('I agree to the', 'أنا موافق على')} <Link to="/terms" className="text-slate-900 font-medium hover:underline">{t('Terms & Privacy Policy', 'الشروط وسياسة الخصوصية')}</Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 shadow-lg shadow-slate-900/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('Creating account...', 'جاري إنشاء الحساب...') : t('Create account', 'اعمل حساب')}
            </button>

            <p className="text-center text-sm text-slate-600">
              {t('Already have an account?', 'عندك حساب بالفعل؟')}{' '}
              <Link to="/login" className="font-semibold text-slate-900 hover:underline">
                {t('Log in', 'سجّل دخول')}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default SignUpPage;
