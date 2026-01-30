import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

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
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-3xl p-10 md:p-14 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-4">Coming Soon</p>
        <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">{title}</h1>
        <p className="text-slate-600 text-lg leading-relaxed mb-8">{subtitle}</p>
        <div className="flex flex-col sm:flex-row gap-3">
          {primaryAction && (
            <Link
              to={primaryAction.to}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
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
