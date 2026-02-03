import React, { useEffect } from 'react';

type ImageLightboxProps = {
  src: string;
  alt?: string;
  onClose: () => void;
};

const ImageLightbox: React.FC<ImageLightboxProps> = ({ src, alt, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 max-w-6xl w-full flex items-center justify-center">
        <img
          src={src}
          alt={alt || 'Preview'}
          className="max-h-[85vh] w-auto max-w-full rounded-2xl shadow-2xl border border-white/10"
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-4 -right-2 px-3 py-1 rounded-full text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ImageLightbox;
