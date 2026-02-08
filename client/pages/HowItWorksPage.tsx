import React from 'react';
import {
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Gavel,
  ShieldCheck,
  Truck,
  UploadCloud,
  Wallet
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const buyerFlow = [
  {
    title: 'Find the right car',
    titleAr: 'اختار العربية المناسبة',
    detail: 'Search by make, model, year, location, and condition. Open each listing to review photos, history, and current bid activity.',
    detailAr: 'دور بالمصنع والموديل والسنة والمكان والحالة. افتح كل قائمة وشوف الصور والتاريخ والمزايدات.',
    icon: FileText
  },
  {
    title: 'Place your bid',
    titleAr: 'قدم مزايدتك',
    detail: 'Submit a bid above the current amount. You will immediately see confirmation and the latest live bid value.',
    detailAr: 'قدم مزايدة أعلى من الحالي. هتشوف التأكيد وآخر مزايدة مباشرة.',
    icon: Gavel
  },
  {
    title: 'Win and pay securely',
    titleAr: 'اكسب وادفع بأمان',
    detail: 'When the auction ends, complete payment through the secure payment flow. Status is tracked in your account.',
    detailAr: 'لما المزاد يخلص، كمل الدفع بشكل آمن. الحالة بتظهر في حسابك.',
    icon: Wallet
  },
  {
    title: 'Receive your vehicle',
    titleAr: 'استلم عربيتك',
    detail: 'Coordinate delivery or pickup with support guidance and final handoff details.',
    detailAr: 'نسق الاستلام أو التوصيل مع الدعم وكل تفاصيل التسليم.',
    icon: Truck
  }
];

const sellerFlow = [
  {
    title: 'Create your listing',
    titleAr: 'اعمل قائمتك',
    detail: 'Add specs, mileage, condition, photos, and a strong description so buyers can evaluate confidently.',
    detailAr: 'ضيف المواصفات والعداد والحالة والصور ووصف قوي عشان المشتري يقيم بثقة.',
    icon: UploadCloud
  },
  {
    title: 'Go live to buyers',
    titleAr: 'انزل لايف قدام المشتريين',
    detail: 'Your listing appears in browse and auction views, where buyers can watch, bid, and interact.',
    detailAr: 'قائمتك بتظهر في التصفح والمزادات، والناس تقدر تتابع وتزايد.',
    icon: CheckCircle2
  },
  {
    title: 'Manage bids and status',
    titleAr: 'تابع المزايدات والحالة',
    detail: 'Track active bids and listing status in real time. Delist/restore controls are available when needed.',
    detailAr: 'تابع المزايدات والحالة لحظة بلحظة، ومعاك إيقاف/استرجاع وقت ما تحتاج.',
    icon: Clock3
  },
  {
    title: 'Close with confidence',
    titleAr: 'اقفل بثقة',
    detail: 'Once sold, payment confirmation and final transfer steps are clearly guided.',
    detailAr: 'بعد البيع، تأكيد الدفع وخطوات النقل النهائية واضحة.',
    icon: ShieldCheck
  }
];

const brochures = [
  {
    title: 'Ferrari Testarossa 1984',
    description: 'Classic Ferrari brochure with model details and specifications.',
    linkUrl: 'https://drive.google.com/drive/folders/1KkfSKkolzNjvKZhqqnCOr2XWYo1teVkk?usp=sharing',
  },
  {
    title: 'Bentley Continental',
    description: 'Official Bentley Continental brochure for customer reference.',
    linkUrl: 'https://drive.google.com/drive/folders/1KkfSKkolzNjvKZhqqnCOr2XWYo1teVkk?usp=sharing',
  },
  {
    title: 'Porsche 911 GTS Grey',
    description: 'Porsche 911 GTS brochure focused on the grey configuration.',
    linkUrl: 'https://drive.google.com/drive/folders/1KkfSKkolzNjvKZhqqnCOr2XWYo1teVkk?usp=sharing',
  }
];

const HowItWorksPage: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.22),_transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center hero-fade-in">
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight mt-3">{t('How It Works', 'إزاي الشغل ماشي')}</h1>
          <p className="text-sm md:text-base text-slate-200/90 mt-4 max-w-3xl mx-auto leading-relaxed">
            {t(
              'A complete flow for buyers and sellers, from first click to delivery. Everything below is designed so customers understand exactly what happens next at each stage.',
              'رحلة كاملة للمشتريين والبائعين من أول ضغطة لحد التسليم. كل اللي تحت معمول عشان يكون واضح هتعمل إيه في كل خطوة.'
            )}
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 pb-8">
        <div className="bg-white/95 border border-slate-200 rounded-3xl shadow-xl p-6 md:p-10 backdrop-blur-sm hero-panel">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{t('Buyer flow', 'خطوات المشتري')}</p>
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mt-3">{t('From discovery to keys in hand', 'من البحث لحد المفتاح في إيدك')}</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {buyerFlow.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-11 w-11 rounded-full bg-slate-900 text-white flex items-center justify-center">
                      <Icon size={18} />
                    </div>
                  <span className="text-xs font-bold text-slate-400">{t(`Step ${idx + 1}`, `خطوة ${idx + 1}`)}</span>
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{t(step.title, step.titleAr)}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{t(step.detail, step.detailAr)}</p>
              </div>
            );
          })}
        </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/95 border border-slate-200 rounded-3xl shadow-lg p-6 md:p-10 backdrop-blur-sm">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{t('Seller flow', 'خطوات البائع')}</p>
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mt-3">{t('List, manage, and close faster', 'اعرض وتابع واقفل أسرع')}</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {sellerFlow.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-11 w-11 rounded-full bg-slate-900 text-white flex items-center justify-center">
                      <Icon size={18} />
                    </div>
                    <span className="text-xs font-bold text-slate-400">{t(`Step ${idx + 1}`, `خطوة ${idx + 1}`)}</span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">{t(step.title, step.titleAr)}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{t(step.detail, step.detailAr)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 md:p-10 text-slate-100">
          <div className="text-center mb-7">
            <h2 className="text-2xl md:text-3xl font-semibold">{t('Customer brochures', 'بروشورات للعملاء')}</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {brochures.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-700 bg-slate-900/50 p-5">
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="text-sm text-slate-300 mt-2 min-h-[44px]">{t(item.description, 'بروشور رسمي بالمواصفات والتفاصيل.')}</p>
                <a
                  href={item.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="brochure-download-btn mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
                >
                  <Download size={16} />
                  {t('Open link', 'افتح الرابط')}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorksPage;
