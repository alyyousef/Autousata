import React, { useRef, useState, useCallback, useEffect } from 'react';
import { RefreshCw, FlipHorizontal, Check, AlertCircle } from 'lucide-react';

interface IDCameraProps {
  label: string;
  onCapture: (imageSrc: string) => void;
  facingMode?: 'user' | 'environment';
}

const IDCamera: React.FC<IDCameraProps> = ({ label, onCapture, facingMode = 'environment' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [isMirrored, setIsMirrored] = useState(facingMode === 'user');
  const [aspectRatio, setAspectRatio] = useState(1.58); // Standard ID Card Ratio

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  const startCamera = async () => {
    try {
      // ✅ UPDATED CONSTRAINTS:
      // 1. Prefer 1080p (Full HD) for best OCR.
      // 2. Accept 720p (HD) if 1080p is not available.
      const constraints = {
        video: {
          facingMode,
          width: { min: 1280, ideal: 1920 },
          height: { min: 720, ideal: 1080 },
        }
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError('');
    } catch (err) {
      console.error(err);
      setError('Could not access camera. Please allow permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = useCallback(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      
      // Capture at full video resolution
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Apply Mirror if needed
        if (isMirrored) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }

        ctx.drawImage(video, 0, 0);
        
        // 2. High Quality JPEG (0.95) to preserve text details
        const imageSrc = canvas.toDataURL('image/jpeg', 0.95);
        onCapture(imageSrc);
      }
    }
  }, [onCapture, isMirrored]);

  return (
    <div className="flex flex-col items-center w-full">
      {/* CAMERA CONTAINER */}
      <div className="relative w-full max-w-lg aspect-[3/4] sm:aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-900">
        
        {/* A. Video Feed */}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          style={{ transform: isMirrored ? 'scaleX(-1)' : 'none' }}
          className="w-full h-full object-cover"
        />

        {/* B. "The Dark Overlay" (The Mask) */}
        {/* This creates a dark background with a clear hole in the middle */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div 
            className="relative w-[85%] sm:w-[60%] aspect-[1.58/1] rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.75)]"
          >
            {/* Corner Markers (Visual Guides) */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg shadow-sm"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg shadow-sm"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg shadow-sm"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg shadow-sm"></div>
            
            {/* Center Helper Text */}
            <div className="absolute inset-0 flex items-center justify-center opacity-70">
              <p className="text-white font-bold text-sm bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">
                Fit {label} Here
              </p>
            </div>
          </div>
        </div>

        {/* C. Warnings / Instructions */}
        <div className="absolute top-6 left-0 right-0 flex justify-center z-10 px-4">
           <div className="bg-black/60 text-white text-xs px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2 border border-white/10">
             <AlertCircle size={14} className="text-amber-400" />
             <span>Avoid glare. Ensure text is readable.</span>
           </div>
        </div>

        {/* D. Controls Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent flex justify-between items-center z-20">
          
          {/* Flip / Mirror Toggle */}
          <button 
            onClick={() => setIsMirrored(prev => !prev)}
            className={`p-3 rounded-full text-white transition backdrop-blur-md border border-white/10 ${isMirrored ? 'bg-indigo-600/80' : 'bg-white/10 hover:bg-white/20'}`}
            title="Flip / Mirror Camera"
          >
            <FlipHorizontal size={20} />
          </button>

          {/* Capture Trigger */}
          <button 
            onClick={capturePhoto}
            className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg shadow-black/50"
          >
             <div className="w-16 h-16 bg-white rounded-full border-[3px] border-slate-900"></div>
          </button>

          {/* Retake / Refresh */}
          <button 
            onClick={() => { stopCamera(); startCamera(); }}
            className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition border border-white/10"
            title="Restart Camera"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mt-3 font-bold bg-red-50 px-3 py-1 rounded-lg">{error}</p>}
      
      <p className="text-slate-500 text-xs mt-4 text-center max-w-xs">
        Position your card exactly inside the green corners. <br/>
        Use the <strong className="text-indigo-600">Flip button</strong> if text appears backwards.
      </p>
    </div>
  );
};

export default IDCamera;