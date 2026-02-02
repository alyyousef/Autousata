
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, Car, MapPin, DollarSign, Wand2, ArrowRight, ArrowLeft, Loader2, CheckCircle2, X } from 'lucide-react';
import { geminiService } from '../geminiService';
import { listingService } from '../listingService';
import { ListingStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';

const CreateListingPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = Boolean(id);
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [featureInput, setFeatureInput] = useState('');
  const [listingStatus, setListingStatus] = useState<ListingStatus>('DRAFT');
  const [formData, setFormData] = useState({
    year: '',
    make: '',
    model: '',
    mileage: '',
    vin: '',
    condition: 'Excellent',
    location: '',
    reservePrice: '',
    startingBid: '',
    description: '',
    notes: '',
    features: [] as string[],
    images: [] as string[],
    inspectionDate: ''
  });

  useEffect(() => {
    if (!id) {
      return;
    }
    const existing = listingService.getById(id);
    if (!existing) {
      return;
    }
    setListingStatus(existing.status);
    setFormData({
      year: String(existing.year ?? ''),
      make: existing.make ?? '',
      model: existing.model ?? '',
      mileage: String(existing.mileage ?? ''),
      vin: existing.vin ?? '',
      condition: existing.condition ?? 'Excellent',
      location: existing.location ?? '',
      reservePrice: existing.reservePrice ? String(existing.reservePrice) : '',
      startingBid: existing.startingBid ? String(existing.startingBid) : '',
      description: existing.description ?? '',
      notes: existing.notes ?? '',
      features: existing.features ?? [],
      images: existing.images ?? [],
      inspectionDate: existing.inspectionDate ?? ''
    });
  }, [id]);

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

  const handleImagesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }
    const readFile = (file: File) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Image load failed'));
      reader.readAsDataURL(file);
    });

    const uploaded = await Promise.all(Array.from(files).map(readFile));
    setFormData(prev => ({ ...prev, images: [...prev.images, ...uploaded] }));
  };

  const handleSave = (status: ListingStatus) => {
    const payload = {
      sellerId: user?.id || 'user-1',
      status,
      title: `${formData.year} ${formData.make} ${formData.model}`.trim(),
      make: formData.make.trim(),
      model: formData.model.trim(),
      year: Number(formData.year) || new Date().getFullYear(),
      mileage: Number(formData.mileage) || 0,
      vin: formData.vin.trim(),
      condition: formData.condition,
      location: formData.location.trim(),
      features: formData.features,
      description: formData.description.trim(),
      notes: formData.notes.trim(),
      images: formData.images,
      startingBid: formData.startingBid ? Number(formData.startingBid) : undefined,
      reservePrice: formData.reservePrice ? Number(formData.reservePrice) : undefined,
      inspectionDate: formData.inspectionDate || undefined
    };

    const saved = isEditing && id
      ? listingService.update(id, payload)
      : listingService.create(payload);

    if (saved) {
      setListingStatus(saved.status);
      if (status === 'PUBLISHED') {
        navigate(`/listing/${saved.id}`);
      }
    }
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
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Mileage</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      placeholder="e.g., 12000"
                      value={formData.mileage}
                      onChange={(e) => setFormData({...formData, mileage: e.target.value})}
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
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Condition</label>
                    <select
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      value={formData.condition}
                      onChange={(e) => setFormData({...formData, condition: e.target.value})}
                    >
                      <option>Mint</option>
                      <option>Excellent</option>
                      <option>Good</option>
                      <option>Fair</option>
                    </select>
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

                <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
                  <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-slate-900">Vehicle Photos</h4>
                        <p className="text-xs text-slate-500">Upload clear images from multiple angles.</p>
                      </div>
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer">
                        <Camera size={16} />
                        Add photos
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => handleImagesSelected(e.target.files)}
                        />
                      </label>
                    </div>
                    {formData.images.length === 0 ? (
                      <div className="text-sm text-slate-500 text-center py-10">
                        No photos yet. Upload at least 3 for best results.
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {formData.images.map((img, idx) => (
                          <div key={`photo-${idx}`} className="relative group">
                            <img src={img} alt="Vehicle upload" className="h-24 w-full object-cover rounded-lg border border-slate-200" />
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                              className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-full p-1 shadow-sm text-slate-500 opacity-0 group-hover:opacity-100 transition"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-slate-900">Key Features</h4>
                        <p className="text-xs text-slate-500">Add highlights buyers care about.</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g., Sunroof, AWD, Heated seats"
                        className="flex-grow px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        value={featureInput}
                        onChange={(e) => setFeatureInput(e.target.value)}
                      />
                      <button
                        type="button"
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg"
                        onClick={() => {
                          const trimmed = featureInput.trim();
                          if (!trimmed) return;
                          setFormData(prev => ({ ...prev, features: [...prev.features, trimmed] }));
                          setFeatureInput('');
                        }}
                      >
                        Add
                      </button>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {formData.features.length === 0 ? (
                        <span className="text-xs text-slate-400">No features added yet.</span>
                      ) : (
                        formData.features.map((feature, idx) => (
                          <button
                            key={`feature-${idx}`}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== idx) }))}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-700"
                          >
                            {feature} <X size={12} className="text-slate-400" />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
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
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Starting Bid (EGP)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">EGP</span>
                      <input 
                        type="number" 
                        className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        placeholder="0.00"
                        value={formData.startingBid}
                        onChange={(e) => setFormData({...formData, startingBid: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Reserve Price (EGP)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">EGP</span>
                      <input 
                        type="number" 
                        className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        placeholder="0.00"
                        value={formData.reservePrice}
                        onChange={(e) => setFormData({...formData, reservePrice: e.target.value})}
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
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Schedule Inspection</label>
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    value={formData.inspectionDate}
                    onChange={(e) => setFormData({...formData, inspectionDate: e.target.value})}
                  />
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
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Listing Status:</span> <span className="font-bold">{listingStatus}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Starting Bid:</span> <span className="font-bold">{formData.startingBid ? `EGP ${Number(formData.startingBid).toLocaleString()}` : 'Not set'}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Reserve Price:</span> <span className="font-bold">{formData.reservePrice ? `EGP ${Number(formData.reservePrice).toLocaleString()}` : 'Not set'}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Inspection Schedule:</span> <span className="font-bold">{formData.inspectionDate || 'Pending'}</span></div>
                </div>
              </div>
            )}

            <div className="mt-12 flex flex-wrap items-center justify-between gap-4">
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

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSave('DRAFT')}
                  className="px-6 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Save Draft
                </button>
                <button 
                  onClick={() => step < 4 ? setStep(step + 1) : handleSave('PUBLISHED')}
                  className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 rounded-xl transition-all shadow-lg shadow-indigo-500/30"
                >
                  {step === 4 ? (isEditing ? 'Update & Publish' : 'Publish Listing') : 'Continue'}
                  {step < 4 && <ArrowRight size={18} />}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateListingPage;
