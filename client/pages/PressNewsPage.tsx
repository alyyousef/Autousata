import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const PressNewsPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <section className="bg-slate-50 min-h-screen py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">
            {t('Press & News', 'الصحافة والاخبار')}
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-3">
            {t('AUTOUSATA in the spotlight', 'AUTOUSATA في الواجهة')}
          </h1>
          <p className="text-sm text-slate-600 mt-4 max-w-2xl mx-auto">
            {t(
              'Latest updates, partnerships, and marketplace milestones.',
              'احدث الاخبار والشراكات وتطورات السوق'
            )}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              title: t('New curated auctions now live', 'مزادات مختارة جديدة متاحة'),
              body: t(
                'Weekly drops feature verified luxury listings with transparent bidding.',
                'اسبوعيا قوائم فاخرة موثقة ومزايدات واضحة'
              )
            },
            {
              title: t('Concierge handover program expanded', 'توسيع برنامج التسليم الكونسييرج'),
              body: t(
                'More cities covered for secure delivery and paperwork support.',
                'تغطية مدن اكثر للتسليم الامن ودعم الاوراق'
              )
            },
            {
              title: t('Seller verification upgrades', 'تحديثات توثيق البائعين'),
              body: t(
                'Stronger checks to keep listings authentic and trusted.',
                'فحص اقوى للحفاظ على قوائم موثوقة'
              )
            },
            {
              title: t('Market signals report', 'تقرير مؤشرات السوق'),
              body: t(
                'Monthly insights on pricing, sell through rates, and demand.',
                'تحليلات شهرية للسعر وسرعة البيع والطلب'
              )
            }
          ].map((item, index) => (
            <div key={index} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="text-sm text-slate-600 mt-3">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/browse"
            className="market-cta-secondary inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-colors"
          >
            {t('Browse listings', 'تصفح القوائم')}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PressNewsPage;
