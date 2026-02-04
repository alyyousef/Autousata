import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, Car, MapPin, DollarSign, ArrowRight, ArrowLeft, CheckCircle2, X } from 'lucide-react';
import { listingService } from '../listingService';
import { ListingStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';

const CreateListingPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = Boolean(id);
  const [step, setStep] = useState(1);
  const [featureInput, setFeatureInput] = useState('');
  const [listingStatus, setListingStatus] = useState<ListingStatus>('DRAFT');
  const [missingFields, setMissingFields] = useState<string[]>([]);
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
      features: existing.features ?? [],
      images: existing.images ?? [],
      inspectionDate: existing.inspectionDate ?? ''
    });
  }, [id]);

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

  const handleDelist = () => {
    if (!id) return;
    const confirmed = window.confirm('Delist this vehicle from active listings?');
    if (!confirmed) return;
    const updated = listingService.setStatus(id, 'DELISTED');
    if (updated) {
      setListingStatus(updated.status);
    }
  };

  const steps = [
    { title: 'Vehicle Info', icon: Car },
    { title: 'Details & Photos', icon: Camera },
    { title: 'Pricing', icon: DollarSign },
    { title: 'Review', icon: CheckCircle2 }
  ];

  const requiredFieldsByStep: Record<number, { key: string; label: string; check?: () => boolean }[]> = {
    1: [
      { key: 'year', label: 'Year' },
      { key: 'make', label: 'Make' },
      { key: 'model', label: 'Model' },
      { key: 'mileage', label: 'Mileage' },
      { key: 'vin', label: 'VIN' },
      { key: 'condition', label: 'Condition' }
    ],
    2: [
      { key: 'images', label: 'Vehicle photos', check: () => formData.images.length > 0 },
      { key: 'description', label: 'Full listing description' }
    ],
    3: [
      { key: 'startingBid', label: 'Starting bid' },
      { key: 'reservePrice', label: 'Reserve price' },
      { key: 'location', label: 'Vehicle location' },
      { key: 'inspectionDate', label: 'Inspection schedule' }
    ]
  };

  const fieldLabelMap = Object.values(requiredFieldsByStep)
    .flat()
    .reduce<Record<string, string>>((acc, field) => {
      acc[field.key] = field.label;
      return acc;
    }, {});

  const validateStep = (targetStep: number) => {
    const required = requiredFieldsByStep[targetStep] || [];
    const missingKeys = required
      .filter(field => {
        if (field.check) return !field.check();
        const value = (formData as Record<string, string>)[field.key];
        return !value || value.trim() === '';
      })
      .map(field => field.key);

    setMissingFields(missingKeys);
    return missingKeys.length === 0;
  };

  const handleNext = () => {
    const ok = validateStep(step);
    if (!ok) return;
    setMissingFields([]);
    setStep(prev => prev + 1);
  };

  const handlePublish = () => {
    const okSteps = [1, 2, 3].every(s => validateStep(s));
    if (!okSteps) return;
    setMissingFields([]);
    handleSave('PUBLISHED');
  };

  const isMissing = (key: string) => missingFields.includes(key);

  return (
    <div className="bg-slate-50 min-h-screen py-12 sell-static-cards">
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

        <div className="bg-white/95 rounded-3xl shadow-xl border border-slate-200 overflow-hidden premium-card-hover backdrop-blur-sm">
          <div className="p-8 md:p-12">
            {missingFields.length > 0 && (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <p className="font-semibold mb-1">Please complete the following before continuing:</p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  {missingFields.map(field => (
                    <li key={field}>{fieldLabelMap[field] ?? field}</li>
                  ))}
                </ul>
              </div>
            )}
            
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
                      min={1950}
                      max={2025}
                      step={1}
                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 ${isMissing('year') ? 'border-rose-300' : 'border-slate-200'}`}
                      value={formData.year}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
                        setFormData({...formData, year: raw});
                      }}
                      onBlur={() => {
                        if (!formData.year) return;
                        const numeric = Number(formData.year);
                        const clamped = Math.min(2025, Math.max(1950, numeric));
                        if (String(clamped) !== formData.year) {
                          setFormData(prev => ({ ...prev, year: String(clamped) }));
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Make</label>
                    <input 
                      type="text" 
                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 ${isMissing('make') ? 'border-rose-300' : 'border-slate-200'}`}
                      value={formData.make}
                      onChange={(e) => setFormData({...formData, make: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Model</label>
                    <input 
                      type="text" 
                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 ${isMissing('model') ? 'border-rose-300' : 'border-slate-200'}`}
                      value={formData.model}
                      onChange={(e) => setFormData({...formData, model: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Mileage</label>
                    <input 
                      type="number"
                      min={0}
                      max={1000000}
                      step={1}
                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 ${isMissing('mileage') ? 'border-rose-300' : 'border-slate-200'}`}
                      placeholder="e.g., 12000"
                      value={formData.mileage}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
                        setFormData({...formData, mileage: raw});
                      }}
                      onBlur={() => {
                        if (!formData.mileage) return;
                        const numeric = Number(formData.mileage);
                        const clamped = Math.min(1000000, Math.max(0, numeric));
                        if (String(clamped) !== formData.mileage) {
                          setFormData(prev => ({ ...prev, mileage: String(clamped) }));
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">VIN</label>
                    <input 
                      type="text" 
                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 ${isMissing('vin') ? 'border-rose-300' : 'border-slate-200'}`}
                      placeholder="Vehicle Identification Number"
                      value={formData.vin}
                      onChange={(e) => setFormData({...formData, vin: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Condition</label>
                    <select
                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 ${isMissing('condition') ? 'border-rose-300' : 'border-slate-200'}`}
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
                  <p className="text-slate-500">Write a clear, detailed description that helps buyers trust the listing.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                  {/* Vehicle Photos Card - Symmetrical Design */}
                  <div className={`bg-white border rounded-2xl p-6 shadow-sm flex flex-col h-[280px] ${isMissing('images') ? 'border-rose-300' : 'border-slate-200'}`}>
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                          <Camera size={16} className="text-indigo-600" />
                        </div>
                        <h4 className="font-bold text-slate-900 text-lg">Vehicle Photos</h4>
                      </div>
                      <p className="text-xs text-slate-500 ml-10">Upload clear images from multiple angles.</p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto mb-4">
                      {formData.images.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                              <Camera size={20} className="text-slate-400" />
                            </div>
                            <p className="text-sm text-slate-500">No photos uploaded yet</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 pr-2">
                          {formData.images.map((img, idx) => (
                            <div key={`photo-${idx}`} className="relative group">
                              <img 
                                src={img} 
                                alt="Vehicle upload" 
                                className="h-24 w-full object-cover rounded-lg border border-slate-200" 
                              />
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                                className="absolute -top-1.5 -right-1.5 bg-white border border-slate-200 rounded-full p-1 shadow-sm text-slate-500 opacity-0 group-hover:opacity-100 transition z-10"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold cursor-pointer transition hover:bg-slate-800 w-full">
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

                  {/* Key Features Card - Symmetrical Design */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col h-[280px]">
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <CheckCircle2 size={16} className="text-emerald-600" />
                        </div>
                        <h4 className="font-bold text-slate-900 text-lg">Key Features</h4>
                      </div>
                      <p className="text-xs text-slate-500 ml-10">Add highlights buyers care about.</p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto mb-4">
                      <div className="mb-4">
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
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg whitespace-nowrap transition"
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
                      </div>
                      
                      {formData.features.length === 0 ? (
                        <div className="flex items-center justify-center h-24">
                          <p className="text-sm text-slate-500">No features added yet</p>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 pr-2">
                          {formData.features.map((feature, idx) => (
                            <button
                              key={`feature-${idx}`}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== idx) }))}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-xs font-semibold text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition"
                            >
                              {feature} 
                              <X size={12} className="text-emerald-500" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-slate-400">
                      {formData.features.length} feature{formData.features.length !== 1 ? 's' : ''} added
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Full Listing Description</label>
                  <textarea 
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 min-h-[250px] text-sm ${isMissing('description') ? 'border-rose-300' : 'border-slate-200'}`}
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
                        className={`w-full pl-14 pr-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 ${isMissing('startingBid') ? 'border-rose-300' : 'border-slate-200'}`}
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
                        className={`w-full pl-14 pr-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 ${isMissing('reservePrice') ? 'border-rose-300' : 'border-slate-200'}`}
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
                      className={`w-full pl-12 pr-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 ${isMissing('location') ? 'border-rose-300' : 'border-slate-200'}`}
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
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 ${isMissing('inspectionDate') ? 'border-rose-300' : 'border-slate-200'}`}
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
                  className="px-8 py-3 bg-rose-600 text-white font-bold flex items-center gap-2 hover:bg-rose-700 rounded-full transition-all shadow-md shadow-rose-500/25"
                >
                  <ArrowLeft size={18} /> Back
                </button>
              ) : (
                <div></div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                {isEditing && listingStatus === 'PUBLISHED' && (
                  <button
                    type="button"
                    onClick={handleDelist}
                    className="px-6 py-3 border border-rose-200 text-rose-600 font-bold rounded-full hover:bg-rose-50 transition-all"
                  >
                    Delist Listing
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSave('DRAFT')}
                  className="px-6 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-all shadow-md shadow-blue-500/25"
                >
                  Save Draft
                </button>
                <button 
                  onClick={() => (step < 4 ? handleNext() : handlePublish())}
                  className="px-10 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 rounded-full transition-all shadow-lg shadow-emerald-500/30"
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