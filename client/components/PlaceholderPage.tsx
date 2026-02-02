import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import placeholderImage from '../../assests/frontendPictures/carPlaceHolder.jpg';

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
  primaryAction?: {
    label: string;
    to: string;
  };
  secondaryAction?: {
    label: string;
    to: string;
  };
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  subtitle,
  primaryAction,
  secondaryAction
}) => {
  return (
    <section className="py-16 px-4 bg-slate-50 min-h-screen flex items-center">
      <div className="max-w-4xl mx-auto bg-white/95 border border-slate-200 rounded-3xl p-10 md:p-14 shadow-lg premium-card-hover backdrop-blur-sm hero-fade-in">
        <img
          src={placeholderImage}
          alt="Placeholder"
          className="w-full h-56 md:h-64 object-cover rounded-2xl mb-8 border border-slate-200"
        />
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-indigo-500 mb-3">Coming Soon</p>
        <h1 className="text-3xl md:text-5xl font-semibold text-slate-900 tracking-tight mb-4">{title}</h1>
        <p className="text-slate-600 text-base md:text-lg leading-relaxed mb-8">{subtitle}</p>
        <div className="flex flex-col sm:flex-row gap-3">
          {primaryAction && (
            <Link
              to={primaryAction.to}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-indigo-500 text-white font-semibold hover:bg-indigo-400 shadow-md shadow-indigo-500/30 transition-all"
            >
              {primaryAction.label}
              <ArrowRight size={18} />
            </Link>
          )}
          {secondaryAction && (
            <Link
              to={secondaryAction.to}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-slate-200 text-slate-700 font-semibold hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
              {secondaryAction.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
};

export default PlaceholderPage;
