import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import IDCamera from "../components/IDCamera";
import { 
  CheckCircle, ShieldCheck, AlertCircle, Loader2, UploadCloud, 
  Camera, ArrowRight, RefreshCw 
} from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext'; // ✅ Import Auth Context

const KYCProcessPage = () => {
  const navigate = useNavigate();
  const { updateUser } = useAuth(); // ✅ Get updater function
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  
  // Images
  const [idImage, setIdImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  
  // Loading States
  const [isLoading, setIsLoading] = useState(false); // Final Submit
  const [isValidatingID, setIsValidatingID] = useState(false); // Step 1 AI Check
  const [isUploading, setIsUploading] = useState(false); // File Upload state
  
  // Error Handling
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ============================================
  // Step 1: ID Captured (Camera)
  // ============================================
  const handleIDCapture = async (imageSrc: string) => {
    await validateIDImage(imageSrc);
  };

  // ============================================
  // Step 1: ID Uploaded (File) - NEW FEATURE
  // ============================================
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      await validateIDImage(base64);
      setIsUploading(false);
    };
  };

  // ✅ Shared Validation Logic (Used by both Camera & Upload)
  const validateIDImage = async (imageSrc: string) => {
    setIsValidatingID(true);
    setErrorMsg(null);

    try {
      const response = await apiService.validateID(imageSrc);

      if (response.data && response.data.success) {
         setIdImage(imageSrc);
         setStep(2); // Move to Selfie
      } else {
         setErrorMsg(response.error || "Invalid ID. Please ensure it's a real Egyptian ID.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Validation check failed. Try a clearer photo.");
    } finally {
      setIsValidatingID(false);
    }
  };

  // ============================================
  // Step 2: Selfie Captured
  // ============================================
  const handleSelfieCapture = (imageSrc: string) => {
    setSelfieImage(imageSrc);
    setStep(3); // Move to Review
  };

  // ============================================
  // Step 3: Final Submit (Face Match)
  // ============================================
  const handleSubmit = async () => {
    if (!idImage || !selfieImage) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await apiService.verifyIdentity(idImage, selfieImage);

      if (response.data && response.data.success) {
        // ✅ CRITICAL: Update Global User State
        updateUser({ 
          kycStatus: 'verified',
          kycDocumentUrl: response.data.kycDocumentUrl, // Backend sends this now
          // If you updated profile pic in backend, you can update it here too
          // profileImage: response.data.userUpdates?.profileImage 
        });

        // Redirect to Profile
        navigate('/profile'); 
      } else {
        const msg = response.error || "Faces do not match. Please try again.";
        setErrorMsg(msg);
        
        // Reset to start if failed (Security measure)
        setTimeout(() => {
          setStep(1); 
          setIdImage(null);
          setSelfieImage(null);
          setErrorMsg(null);
        }, 3000);
      }
    } catch (err) {
      setErrorMsg("System error. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* Progress Bar */}
        <div className="flex items-center justify-center mb-8 gap-4">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${step >= 1 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-200'}`}>1</div>
            <span className="hidden sm:inline font-bold text-sm">Scan ID</span>
          </div>
          <div className={`w-12 h-1 rounded-full transition-all ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${step >= 2 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-200'}`}>2</div>
            <span className="hidden sm:inline font-bold text-sm">Selfie</span>
          </div>
          <div className={`w-12 h-1 rounded-full transition-all ${step >= 3 ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
             <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${step >= 3 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-200'}`}>3</div>
             <span className="hidden sm:inline font-bold text-sm">Verify</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 min-h-[500px] flex flex-col relative overflow-hidden">
          
          {/* Global Error Message */}
          {errorMsg && (
            <div className="mb-6 bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={24} className="flex-shrink-0" />
              <p className="font-bold text-sm">{errorMsg}</p>
            </div>
          )}

          {/* Validation Overlay (Spinner) */}
          {(isValidatingID || isUploading) && (
            <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in">
               <Loader2 size={48} className="text-indigo-600 animate-spin mb-4" />
               <p className="text-xl font-black text-slate-900">Analyzing Document...</p>
               <p className="text-sm text-slate-500 font-medium mt-1">Checking for Egyptian ID security features.</p>
            </div>
          )}

          {/* ========================== STEP 1: ID SCAN ========================== */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-black text-slate-900 mb-2">Scan Your ID</h1>
                <p className="text-slate-500 font-medium">Place your Egyptian National ID inside the box.</p>
              </div>
              
              <div className="flex-1 flex flex-col items-center">
                <IDCamera 
                  label="Front of ID" 
                  facingMode="environment" 
                  onCapture={handleIDCapture} 
                />

                {/* Separator */}
                <div className="relative flex py-5 items-center w-full max-w-sm">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase tracking-widest">OR</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {/* Upload Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full max-w-sm py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-3 transition-all border-2 border-dashed border-slate-200 hover:border-indigo-400 group"
                >
                   <UploadCloud size={20} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                   <span>Upload Photo from Gallery</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================== STEP 2: SELFIE ========================== */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col h-full">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-black text-slate-900 mb-2">Take a Selfie</h1>
                <p className="text-slate-500 font-medium">We need to match your face to the ID photo.</p>
              </div>
              
              <div className="flex-1 flex flex-col items-center">
                <IDCamera 
                  label="Your Face" 
                  facingMode="user" 
                  onCapture={handleSelfieCapture} 
                />
                
                <button 
                  onClick={() => { setStep(1); setIdImage(null); }}
                  className="mt-6 text-slate-400 text-sm font-bold hover:text-slate-600 flex items-center gap-1"
                >
                  <RefreshCw size={14} /> Rescan ID
                </button>
              </div>
            </div>
          )}

          {/* ========================== STEP 3: REVIEW ========================== */}
          {step === 3 && (
            <div className="text-center py-6 animate-in zoom-in duration-300 flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-sm border border-indigo-100">
                <ShieldCheck size={40} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-2">Ready to Verify</h2>
              <p className="text-slate-500 font-medium max-w-xs mx-auto">
                We will securely analyze these images to confirm your identity.
              </p>
              
              <div className="flex flex-wrap gap-6 justify-center mt-8 mb-8">
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl opacity-30 group-hover:opacity-50 blur transition duration-200"></div>
                  <div className="relative bg-white p-2 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 mb-2 font-bold uppercase tracking-widest text-center">Document</p>
                    <img src={idImage!} alt="ID" className="w-40 h-28 object-cover rounded-lg bg-slate-100" />
                    <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow-md">
                       <CheckCircle size={12} />
                    </div>
                  </div>
                </div>

                <div className="relative group">
                   <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full opacity-30 group-hover:opacity-50 blur transition duration-200"></div>
                   <div className="relative bg-white p-2 rounded-full border border-slate-100">
                     <img src={selfieImage!} alt="Selfie" className="w-28 h-28 object-cover rounded-full bg-slate-100" />
                   </div>
                </div>
              </div>

              <div className="max-w-sm w-full mx-auto space-y-4">
                 <button 
                   onClick={handleSubmit}
                   disabled={isLoading}
                   className={`w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1
                     ${isLoading 
                       ? 'bg-slate-100 text-slate-400 cursor-wait shadow-none' 
                       : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'
                     }`}
                 >
                   {isLoading ? (
                     <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Verifying...
                     </>
                   ) : (
                     <>
                       Verify Identity Now <ArrowRight size={20} />
                     </>
                   )}
                 </button>
                 
                 {!isLoading && (
                   <button 
                     onClick={() => { setStep(1); setIdImage(null); setSelfieImage(null); }}
                     className="text-slate-400 text-sm font-bold hover:text-slate-600 hover:underline"
                   >
                     Cancel & Retake
                   </button>
                 )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default KYCProcessPage;