import React, { useEffect, useMemo, useState } from 'react';

type ImageLightboxProps = {
  src?: string;
  images?: string[];
  startIndex?: number;
  alt?: string;
  onClose: () => void;
};

const ImageLightbox: React.FC<ImageLightboxProps> = ({ src, images, startIndex = 0, alt, onClose }) => {
  const resolvedImages = useMemo(() => {
    if (images && images.length > 0) return images;
    return src ? [src] : [];
  }, [images, src]);

  const [activeIndex, setActiveIndex] = useState(() => {
    if (resolvedImages.length === 0) return 0;
    return Math.min(Math.max(startIndex, 0), resolvedImages.length - 1);
  });

  useEffect(() => {
    if (resolvedImages.length === 0) return;
    setActiveIndex(Math.min(Math.max(startIndex, 0), resolvedImages.length - 1));
  }, [startIndex, resolvedImages.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (resolvedImages.length > 1 && event.key === 'ArrowRight') {
        setActiveIndex((prev) => (prev + 1) % resolvedImages.length);
      }
      if (resolvedImages.length > 1 && event.key === 'ArrowLeft') {
        setActiveIndex((prev) => (prev - 1 + resolvedImages.length) % resolvedImages.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, resolvedImages.length]);

  const activeSrc = resolvedImages[activeIndex];
  if (!activeSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 max-w-6xl w-full flex items-center justify-center">
        <img
          src={activeSrc}
          alt={alt || 'Preview'}
          className="max-h-[85vh] w-auto max-w-full rounded-2xl shadow-2xl border border-white/10"
        />
        {resolvedImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setActiveIndex((prev) => (prev - 1 + resolvedImages.length) % resolvedImages.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 text-slate-700 shadow-lg border border-white/60 hover:bg-white transition-colors"
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setActiveIndex((prev) => (prev + 1) % resolvedImages.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 text-slate-700 shadow-lg border border-white/60 hover:bg-white transition-colors"
              aria-label="Next photo"
            >
              ›
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-slate-700 border border-white/60">
              {activeIndex + 1} / {resolvedImages.length}
            </div>
          </>
        )}
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
