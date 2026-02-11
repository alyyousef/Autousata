import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import IDCamera from "../components/IDCamera";
import { CheckCircle, ShieldCheck, User, AlertCircle, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';

const KYCProcessPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  
  // Images
  const [idImage, setIdImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  
  // Loading States
  const [isLoading, setIsLoading] = useState(false); // For Final Submit
  const [isValidatingID, setIsValidatingID] = useState(false); // For Step 1 check
  
  // Error Handling
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ============================================
  // Step 1: ID Captured (With Instant Validation)
  // ============================================
  const handleIDCapture = async (imageSrc: string) => {
    setIsValidatingID(true);
    setErrorMsg(null);

    try {
      // 1. Send to Backend to check if it's a real ID
      const response = await apiService.validateID(imageSrc);

      if (response.data && response.data.success) {
         // ✅ Valid ID -> Move to Step 2
         setIdImage(imageSrc);
         setStep(2); 
      } else {
         // ❌ Invalid (Selfie or Gym Card)
         setErrorMsg(response.error || "Invalid ID. Please use a real government document.");
      }
    } catch (err) {
      setErrorMsg("Validation check failed. Please try again.");
    } finally {
      setIsValidatingID(false);
    }
  };

  // ============================================
  // Step 2: Selfie Captured
  // ============================================
  const handleSelfieCapture = (imageSrc: string) => {
    setSelfieImage(imageSrc);
    setStep(3); // Move to Review Step
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
        alert(`✅ Verified! Similarity Match: ${Math.round(response.data.similarity)}%`);
        navigate('/dashboard'); 
      } else {
        const msg = response.error || "Faces do not match. Please try again.";
        setErrorMsg(msg);
        alert("❌ " + msg);
        setStep(1); 
        setIdImage(null);
        setSelfieImage(null);
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
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200'}`}>1</div>
            <span className="hidden sm:inline">ID Scan</span>
          </div>
          <div className={`w-8 h-1 ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200'}`}>2</div>
            <span className="hidden sm:inline">Selfie</span>
          </div>
          <div className={`w-8 h-1 ${step >= 3 ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
             <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200'}`}>3</div>
             <span className="hidden sm:inline">Verify</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 min-h-[500px] flex flex-col justify-center relative">
          
          {/* Global Error Message */}
          {errorMsg && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={20} />
              <p className="font-medium">{errorMsg}</p>
            </div>
          )}

          {/* Validation Overlay (Step 1) */}
          {isValidatingID && (
            <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center rounded-3xl backdrop-blur-sm">
               <Loader2 size={48} className="text-indigo-600 animate-spin mb-4" />
               <p className="text-lg font-bold text-slate-800">Checking ID Validity...</p>
               <p className="text-sm text-slate-500">Scanning for official text...</p>
            </div>
          )}

          {/* STEP 1: ID SCAN */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-2xl font-black text-slate-900 mb-2 text-center">Scan ID</h1>
              <p className="text-slate-500 text-center mb-8">Place your National ID or Passport inside the box.</p>
              
              <IDCamera 
                label="Front of ID" 
                facingMode="environment" 
                onCapture={handleIDCapture} 
              />
            </div>
          )}

          {/* STEP 2: SELFIE */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h1 className="text-2xl font-black text-slate-900 mb-2 text-center">Take a Selfie</h1>
              <p className="text-slate-500 text-center mb-8">We need to make sure it's really you.</p>
              
              <IDCamera 
                label="Your Face" 
                facingMode="user" 
                onCapture={handleSelfieCapture} 
              />
            </div>
          )}

          {/* STEP 3: REVIEW & SUBMIT */}
          {step === 3 && (
            <div className="text-center py-4 animate-in zoom-in duration-300">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Ready to Verify</h2>
              <p className="text-slate-500 mt-2">We will analyze these images securely with AI.</p>
              
              <div className="flex flex-wrap gap-4 justify-center mt-8 mb-8">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">ID Document</p>
                  <img src={idImage!} alt="ID" className="w-40 h-28 object-cover rounded-lg" />
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">Selfie</p>
                  <img src={selfieImage!} alt="Selfie" className="w-28 h-28 object-cover rounded-full border-2 border-white shadow-sm" />
                </div>
              </div>

              <div className="max-w-sm mx-auto">
                 <button 
                   onClick={handleSubmit}
                   disabled={isLoading}
                   className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg
                     ${isLoading 
                       ? 'bg-slate-300 text-slate-500 cursor-wait' 
                       : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                     }`}
                 >
                   {isLoading ? (
                     <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Verifying...
                     </>
                   ) : (
                     <>
                       <ShieldCheck size={20} /> Verify Identity Now
                     </>
                   )}
                 </button>
                 
                 {!isLoading && (
                   <button 
                     onClick={() => setStep(1)}
                     className="mt-4 text-slate-400 text-sm hover:text-slate-700 underline"
                   >
                     Retake Photos
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