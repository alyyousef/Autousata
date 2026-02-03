import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldCheck, Timer, Truck } from 'lucide-react';

const steps = [
  {
    title: 'Browse verified listings',
    description: 'Filter by condition, location, and bid activity to find the right vehicle quickly.',
    icon: ShieldCheck
  },
  {
    title: 'Bid with confidence',
    description: 'Transparent pricing history and real-time bidding keep you fully informed.',
    icon: Timer
  },
  {
    title: 'Close with secure delivery',
    description: 'Escrow-backed payments and logistics support ensure a smooth handoff.',
    icon: Truck
  }
];

const HowItWorksPage: React.FC = () => (
  <div className="bg-slate-50 min-h-screen">
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.22),_transparent_60%)]" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center hero-fade-in">
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">How It Works</h1>
        <p className="text-sm md:text-base text-slate-200/90 mt-4 max-w-2xl mx-auto leading-relaxed">
          From browsing to bidding and final delivery, we make every step transparent and secure. Full walkthroughs are
          coming soon.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/browse"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-slate-900 font-semibold shadow-lg shadow-slate-900/30 hover:bg-slate-100 transition-all"
          >
            Start browsing
            <ArrowRight size={18} />
          </Link>
          <Link
            to="/sell"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/10 text-slate-50 font-semibold border border-white/25 hover:bg-white/15 hover:border-white/40 transition-all"
          >
            Sell a car
          </Link>
        </div>
      </div>
    </section>

    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 pb-16">
      <div className="bg-white/95 border border-slate-200 rounded-3xl shadow-xl p-6 md:p-10 backdrop-blur-sm hero-panel">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">What to expect</p>
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mt-3">A clearer, safer auction flow</h2>
          <p className="text-sm text-slate-600 mt-3 max-w-2xl mx-auto">
            We are building step-by-step guidance with live examples so buyers and sellers know exactly what happens next.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map(step => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <div className="h-12 w-12 rounded-full bg-slate-900 text-white flex items-center justify-center mb-4">
                  <Icon size={20} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500">
          {['Verified sellers only', 'Reserve prices disclosed', 'Live closing timers'].map(item => (
            <span key={item} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2">
              <CheckCircle2 size={14} className="text-emerald-500" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  </div>
);

export default HowItWorksPage;
