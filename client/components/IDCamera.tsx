import React, { useRef, useState, useCallback, useEffect } from 'react';
import { RefreshCw, FlipHorizontal, Camera, AlertCircle } from 'lucide-react';

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

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  const startCamera = async () => {
    try {
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
        
        // High Quality JPEG (0.95) to preserve text details
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

        {/* ============================================================ */}
        {/* B. EGYPTIAN ID OVERLAY (The "Frame")                         */}
        {/* ============================================================ */}
        {/* Only show this detailed overlay for the ID card step (environment mode) */}
        {facingMode === 'environment' ? (
          <div 
            className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none" 
            dir="rtl" // Force Arabic RTL Layout
          >
            
            {/* THE RED CARD FRAME */}
            {/* The box-shadow here creates the dark overlay OUTSIDE this specific div */}
            <div 
              className="relative w-[90%] max-w-[400px] border-[3px] border-red-500 rounded-xl shadow-sm"
              style={{ 
                aspectRatio: '85.6/54', // Standard ID Card Ratio
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)' 
              }}
            >
              
              {/* 1. Left Side: Photo & Factory No */}
              <div className="absolute top-[8%] left-[4%] w-[28%] h-[60%] border-2 border-dashed border-yellow-400 rounded-lg flex items-center justify-center bg-white/5">
                <span className="text-[10px] sm:text-xs font-bold text-yellow-100 drop-shadow-md text-center">الصورة</span>
              </div>

              <div className="absolute bottom-[6%] left-[4%] w-[28%] h-[15%] border-2 border-dashed border-yellow-400 rounded-lg flex items-center justify-center bg-white/5">
                <span className="text-[8px] sm:text-[10px] font-bold text-yellow-100 drop-shadow-md text-center">رقم المصنع</span>
              </div>

              {/* 2. Right Side: Info & National ID */}
              <div className="absolute top-[8%] right-[4%] w-[60%] bottom-[6%] flex flex-col gap-[5%]">
                
                {/* Name/Address Zone */}
                <div className="flex-grow border-2 border-dashed border-purple-400 rounded-lg flex items-center justify-center bg-white/5 relative">
                   <span className="text-[10px] sm:text-xs font-bold text-purple-100 drop-shadow-md text-center">الاسم والعنوان</span>
                </div>

                {/* 14-Digit ID Zone */}
                <div className="h-[20%] border-2 border-dashed border-cyan-400 rounded-lg flex items-center justify-center bg-white/5">
                   <span className="text-[10px] sm:text-xs font-bold text-cyan-100 drop-shadow-md text-center">الرقم القومي (١٤ رقم)</span>
                </div>

              </div>

            </div>

            {/* Hint Text Below Frame */}
            <p className="mt-6 text-white text-sm font-bold drop-shadow-md bg-black/50 px-4 py-1 rounded-full border border-white/20">
              يرجى وضع البطاقة داخل الإطار الأحمر
            </p>

          </div>
        ) : (
          // Simple Overlay for Selfie Mode
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
             <div className="relative w-[60%] aspect-square rounded-full border-4 border-dashed border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.75)]"></div>
             <p className="absolute mt-48 text-white font-bold text-sm bg-black/50 px-3 py-1 rounded-full">Fit Face Here</p>
          </div>
        )}

        {/* C. Warnings / Instructions */}
        <div className="absolute top-6 left-0 right-0 flex justify-center z-20 px-4 pointer-events-none">
           <div className="bg-black/60 text-white text-xs px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2 border border-white/10">
             <AlertCircle size={14} className="text-amber-400" />
             <span>Ensure text is readable & no glare.</span>
           </div>
        </div>

        {/* D. Controls Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent flex justify-between items-center z-30">
          
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
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg shadow-black/50 bg-red-600"
          >
             <Camera size={32} className="text-white" />
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
      
    </div>
  );
};

export default IDCamera;