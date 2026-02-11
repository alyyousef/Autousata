import React, { useState, useRef } from 'react';
import IDCamera from '../IDCamera';
import { UploadCloud, Loader2, AlertTriangle, FileText } from 'lucide-react';
import { apiService } from '../../services/api'; // Ensure you have this

interface IDScanStepProps {
  onCapture: (image: string) => void;
  onNext: () => void;
}

const IDScanStep: React.FC<IDScanStepProps> = ({ onCapture, onNext }) => {
  const [cameraImage, setCameraImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Handle Camera Capture (Existing Logic)
  const handleCameraCapture = (imageSrc: string) => {
    setCameraImage(imageSrc);
    onCapture(imageSrc);
    // Note: Usually we verify camera images at the VERY end (Step 3), 
    // but you can verify here too if you want. 
    // For now, camera capture just proceeds.
    onNext(); 
  };

  // 2. Handle File Upload (New Logic)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset states
    setError('');
    setUploading(true);

    try {
      // A. Convert File to Base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onloadend = async () => {
        const base64Image = reader.result as string;

        // B. Verify LIVE with Backend
        try {
          // This calls the new route we created in Step 1
          await apiService.validateDocumentOnly(base64Image); 
          
          // C. If Success:
          setCameraImage(base64Image);
          onCapture(base64Image);
          setUploading(false);
          onNext(); // Auto-advance to Selfie Step

        } catch (apiErr: any) {
          console.error(apiErr);
          setError(apiErr.response?.data?.error || "This ID was rejected by our system. Please try a clearer photo.");
          setUploading(false);
        }
      };

    } catch (err) {
      setError("Failed to process file.");
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-slate-900">Scan Your ID</h2>
        <p className="text-slate-500">
          Place your Egyptian National ID inside the frame.
        </p>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 animate-pulse">
          <AlertTriangle size={24} />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {/* CAMERA COMPONENT */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
        <IDCamera 
          label="Front of ID" 
          onCapture={handleCameraCapture} 
        />
      </div>

      {/* SEPARATOR */}
      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-slate-200"></div>
        <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-bold uppercase tracking-wider">
          OR
        </span>
        <div className="flex-grow border-t border-slate-200"></div>
      </div>

      {/* UPLOAD BUTTON */}
      <div>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all border-2 border-dashed border-slate-300 hover:border-indigo-400 group"
        >
          {uploading ? (
            <>
              <Loader2 size={20} className="animate-spin text-indigo-600" />
              <span className="text-indigo-600">Verifying with AI...</span>
            </>
          ) : (
            <>
              <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                <UploadCloud size={20} className="text-indigo-600" />
              </div>
              <span>Upload Photo from Gallery</span>
            </>
          )}
        </button>
        <p className="text-center text-xs text-slate-400 mt-2">
          Use this if your camera is blurry or not working.
        </p>
      </div>
    </div>
  );
};

export default IDScanStep;