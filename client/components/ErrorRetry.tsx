import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ErrorRetryProps {
  error: string;
  onRetry: () => void;
  loading?: boolean;
  className?: string;
  showIcon?: boolean;
}

/**
 * Reusable Error Retry Component
 * Displays an error message with a retry button
 */
const ErrorRetry: React.FC<ErrorRetryProps> = ({ 
  error, 
  onRetry, 
  loading = false,
  className = '',
  showIcon = true
}) => {
  const { t } = useLanguage();

  return (
    <div className={`text-center py-8 px-4 ${className}`}>
      {showIcon && (
        <AlertCircle 
          className="mx-auto text-red-500 mb-4" 
          size={48} 
          strokeWidth={2}
        />
      )}
      
      <p className="text-red-600 text-sm md:text-base mb-4 max-w-md mx-auto">
        {error}
      </p>
      
      <button
        onClick={onRetry}
        disabled={loading}
        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl 
                   font-semibold text-sm hover:bg-slate-800 transition-all 
                   disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20"
      >
        {loading ? (
          <>
            <RefreshCw size={18} className="animate-spin" />
            {t('Retrying...', 'جاري إعادة المحاولة...')}
          </>
        ) : (
          <>
            <RefreshCw size={18} />
            {t('Try Again', 'حاول مرة أخرى')}
          </>
        )}
      </button>
    </div>
  );
};

export default ErrorRetry;
