
import React, { useState } from 'react';
import { Camera, Car, MapPin, DollarSign, Wand2, ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { geminiService } from '../geminiService';

const CreateListingPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    year: '2022',
    make: 'Audi',
    model: 'RS6 Avant',
    mileage: '',
    vin: '',
    condition: 'Excellent',
    location: '',
    reservePrice: '',
    startingBid: '',
    description: '',
    notes: 'Premium Plus package, one owner, garage kept.'
  });

  const handleAIHelp = async () => {
    setIsGenerating(true);
    const result = await geminiService.enhanceDescription({
      make: formData.make,
      model: formData.model,
      year: parseInt(formData.year),
      condition: formData.condition,
      notes: formData.notes
    });
    setFormData(prev => ({ ...prev, description: result || '' }));
    setIsGenerating(false);
  };

  const steps = [
    { title: 'Vehicle Info', icon: Car },
    { title: 'Details & Photos', icon: Camera },
    { title: 'Pricing', icon: DollarSign },
    { title: 'Review', icon: CheckCircle2 }
  ];

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Progress Stepper */}
        <div className="mb-12">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 z-0"></div>
            {steps.map((s, idx) => (
              <div key={idx} className="relative z-10 flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${step > idx + 1 ? 'bg-emerald-500 text-white' : step === idx + 1 ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-white text-slate-400 border-2 border-slate-200'}`}>
                  {step > idx + 1 ? <CheckCircle2 size={20} /> : <s.icon size={20} />}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider mt-2 ${step === idx + 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-8 md:p-12">
            
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8">
                  <h2 className="text-2xl font-black text-slate-900">Tell us about your vehicle</h2>
                  <p className="text-slate-500">Provide the basic details to get started with your listing.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Year</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      value={formData.year}
                      onChange={(e) => setFormData({...formData, year: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Make</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      value={formData.make}
                      onChange={(e) => setFormData({...formData, make: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Model</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      value={formData.model}
                      onChange={(e) => setFormData({...formData, model: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">VIN</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      placeholder="Vehicle Identification Number"
                      value={formData.vin}
                      onChange={(e) => setFormData({...formData, vin: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Vehicle Description</h2>
                  <p className="text-slate-500">Use our AI assistant to craft a professional listing.</p>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl">
                  <div className="flex items-start gap-4">
                    <div className="bg-indigo-600 p-2 rounded-lg text-white">
                      <Wand2 size={24} />
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-bold text-indigo-900">AutoWriter AI</h4>
                      <p className="text-xs text-indigo-700 mb-4">Tell us some highlights and we'll write the full description for you.</p>
                      <textarea 
                        className="w-full p-4 bg-white border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 min-h-[100px]"
                        placeholder="e.g., M-Sport package, ceramic coating, new tires, service records available..."
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      />
                      <button 
                        onClick={handleAIHelp}
                        disabled={isGenerating}
                        className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                      >
                        {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
                        Generate Description
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Full Listing Description</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 min-h-[250px] text-sm"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Pricing & Location</h2>
                  <p className="text-slate-500">Set your starting bid and reserve price.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Starting Bid ($)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                      <input 
                        type="number" 
                        className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Reserve Price ($)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                      <input 
                        type="number" 
                        className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Vehicle Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      placeholder="City, State"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={40} />
                </div>
                <h2 className="text-3xl font-black text-slate-900">Review & Submit</h2>
                <p className="text-slate-500 max-w-md mx-auto">
                  Your listing for the {formData.year} {formData.make} {formData.model} is almost ready. Once submitted, our team will review it within 24 hours.
                </p>
                <div className="bg-slate-50 rounded-2xl p-6 text-left max-w-sm mx-auto space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Listing Fee:</span> <span className="font-bold">$99.00</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Inspection Schedule:</span> <span className="font-bold">Pending</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Est. Start:</span> <span className="font-bold">May 15, 2026</span></div>
                </div>
              </div>
            )}

            <div className="mt-12 flex items-center justify-between">
              {step > 1 ? (
                <button 
                  onClick={() => setStep(step - 1)}
                  className="px-8 py-3 text-slate-600 font-bold flex items-center gap-2 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <ArrowLeft size={18} /> Back
                </button>
              ) : (
                <div></div>
              )}
              
              <button 
                onClick={() => step < 4 ? setStep(step + 1) : alert('Listing Submitted!')}
                className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 rounded-xl transition-all shadow-lg shadow-indigo-500/30"
              >
                {step === 4 ? 'Confirm & Submit' : 'Continue'}
                {step < 4 && <ArrowRight size={18} />}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateListingPage;
