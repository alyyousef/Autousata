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
import ferrariBrochure from '../../assests/brouch/Ferrari-Testarossa-1984-INT.pdf';
import bentleyBrochure from '../../assests/brouch/Bentley Continental Brochure.pdf';
import porscheBrochure from '../../assests/brouch/911 GTS Grey.pdf';

const buyerFlow = [
  {
    title: 'Find the right car',
    detail: 'Search by make, model, year, location, and condition. Open each listing to review photos, history, and current bid activity.',
    icon: FileText
  },
  {
    title: 'Place your bid',
    detail: 'Submit a bid above the current amount. You will immediately see confirmation and the latest live bid value.',
    icon: Gavel
  },
  {
    title: 'Win and pay securely',
    detail: 'When the auction ends, complete payment through the secure payment flow. Status is tracked in your account.',
    icon: Wallet
  },
  {
    title: 'Receive your vehicle',
    detail: 'Coordinate delivery or pickup with support guidance and final handoff details.',
    icon: Truck
  }
];

const sellerFlow = [
  {
    title: 'Create your listing',
    detail: 'Add specs, mileage, condition, photos, and a strong description so buyers can evaluate confidently.',
    icon: UploadCloud
  },
  {
    title: 'Go live to buyers',
    detail: 'Your listing appears in browse and auction views, where buyers can watch, bid, and interact.',
    icon: CheckCircle2
  },
  {
    title: 'Manage bids and status',
    detail: 'Track active bids and listing status in real time. Delist/restore controls are available when needed.',
    icon: Clock3
  },
  {
    title: 'Close with confidence',
    detail: 'Once sold, payment confirmation and final transfer steps are clearly guided.',
    icon: ShieldCheck
  }
];

const brochures = [
  {
    title: 'Ferrari Testarossa 1984',
    description: 'Classic Ferrari brochure with model details and specifications.',
    fileName: 'Ferrari-Testarossa-1984-INT.pdf',
    fileUrl: ferrariBrochure,
    available: true
  },
  {
    title: 'Bentley Continental',
    description: 'Official Bentley Continental brochure for customer reference.',
    fileName: 'Bentley Continental Brochure.pdf',
    fileUrl: bentleyBrochure,
    available: true
  },
  {
    title: 'Porsche 911 GTS Grey',
    description: 'Porsche 911 GTS brochure focused on the grey configuration.',
    fileName: '911 GTS Grey.pdf',
    fileUrl: porscheBrochure,
    available: true
  }
];

const HowItWorksPage: React.FC = () => {
  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.22),_transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center hero-fade-in">
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight mt-3">How It Works</h1>
          <p className="text-sm md:text-base text-slate-200/90 mt-4 max-w-3xl mx-auto leading-relaxed">
            A complete flow for buyers and sellers, from first click to delivery. Everything below is designed so customers
            understand exactly what happens next at each stage.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 pb-8">
        <div className="bg-white/95 border border-slate-200 rounded-3xl shadow-xl p-6 md:p-10 backdrop-blur-sm hero-panel">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Buyer flow</p>
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mt-3">From discovery to keys in hand</h2>
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
                    <span className="text-xs font-bold text-slate-400">Step {idx + 1}</span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{step.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/95 border border-slate-200 rounded-3xl shadow-lg p-6 md:p-10 backdrop-blur-sm">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Seller flow</p>
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mt-3">List, manage, and close faster</h2>
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
                    <span className="text-xs font-bold text-slate-400">Step {idx + 1}</span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{step.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 md:p-10 text-slate-100">
          <div className="text-center mb-7">
            <h2 className="text-2xl md:text-3xl font-semibold">Customer brochures</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {brochures.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-700 bg-slate-900/50 p-5">
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="text-sm text-slate-300 mt-2 min-h-[44px]">{item.description}</p>
                {item.available ? (
                  <a
                    href={item.fileUrl}
                    download
                    className="brochure-download-btn mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
                  >
                    <Download size={16} />
                    Download PDF
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-700 text-slate-300 px-4 py-2 text-sm font-semibold cursor-not-allowed"
                  >
                    <Download size={16} />
                    Coming soon
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorksPage;
