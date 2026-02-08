import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { Camera, Car, MapPin, DollarSign, Wand2, ArrowRight, ArrowLeft, Loader2, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { geminiService } from '../geminiService'; // Keeping AI service
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility for Tailwind ---
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// --- Zod Schema ---
const listingSchema = z.object({
  // Step 1: Vehicle Basics
  year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1, "Invalid year"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  mileage: z.coerce.number().min(0, "Mileage cannot be negative"),
  vin: z.preprocess((val) => (val === '' ? undefined : val), z.string().length(17, "VIN must be exactly 17 characters").optional()),
  plateNumber: z.preprocess((val) => (val === '' ? undefined : val), z.string().min(1, "Plate number is required").optional()),
  color: z.string().min(1, "Color is required"),
  bodyType: z.enum(['sedan', 'suv', 'truck', 'coupe', 'hatchback', 'van', 'convertible']),
  transmission: z.enum(['manual', 'automatic']),
  fuelType: z.enum(['petrol', 'diesel', 'electric', 'hybrid']),
  seats: z.coerce.number().min(1, "Seats is required"),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']),
  
  // Step 2: Details & Media
  description: z.string().min(20, "Description should be at least 20 characters"),
  features: z.array(z.string()).default([]),
  images: z.array(z.string()).min(1, "At least one image is required"), // Storing URLs/Base64 for now
  
  // Step 3: Pricing & Location (Auction Config)
  location: z.string().min(1, "Location is required"),
  reservePrice: z.coerce.number().min(1, "Reserve price is required"),
  startingBid: z.coerce.number().min(1, "Starting bid is required"),
  startTime: z.string().optional(), // For scheduling
  durationDays: z.enum(["1", "3", "7"]).default("3"),
  
  // AI Notes (Optional, not sent to DB directly but used for generation)
  aiNotes: z.string().optional(),
});

type ListingFormInput = z.input<typeof listingSchema>;
type ListingFormData = z.output<typeof listingSchema>;

const CreateListingPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [featureInput, setFeatureInput] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    getValues,
    formState: { errors, isValid }
  } = useForm<ListingFormInput, unknown, ListingFormData>({
    resolver: zodResolver(listingSchema),
    mode: 'onChange',
    defaultValues: {
      condition: 'excellent',
      bodyType: 'sedan',
      transmission: 'automatic',
      fuelType: 'petrol',
      seats: 5,
      features: [],
      images: [],
      durationDays: '3',
      mileage: 0,
      year: new Date().getFullYear(),
    }
  });

  const formData = watch();

  // --- Handlers ---

  const handleAIHelp = async () => {
    setIsGeneratingAI(true);
    try {
      const notes = getValues('aiNotes');
      const basicInfo = {
        make: getValues('make'),
        model: getValues('model'),
        year: Number(getValues('year')) || new Date().getFullYear(),
        condition: getValues('condition'),
        notes: notes || ''
      };
      
      const generatedDescription = await geminiService.enhanceDescription(basicInfo);
      setValue('description', generatedDescription || '', { shouldValidate: true });
    } catch (error) {
      console.error("AI Generation failed", error);
    } finally {
      setIsGeneratingAI(false);
    }
  };
  const handleImagesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    // In a real app, upload to S3/Cloudinary here.
    // For prototype, we convert to Base64.
    const readFile = (file: File) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Image load failed'));
      reader.readAsDataURL(file);
    });

    try {
      const newImages = await Promise.all(Array.from(files).map(readFile));
      setValue('images', [...(formData.images || []), ...newImages], { shouldValidate: true });
    } catch (err) {
      console.error(err);
    }
  };

  const addFeature = () => {
    if (!featureInput.trim()) return;
    const current = getValues('features') || [];
    setValue('features', [...current, featureInput.trim()]);
    setFeatureInput('');
  };

  const removeFeature = (index: number) => {
    const current = getValues('features');
    setValue('features', current.filter((_, i) => i !== index));
  };

  const removeImage = (index: number) => {
    const current = getValues('images');
    setValue('images', current.filter((_, i) => i !== index));
  };

  const validateStep = async (targetStep: number) => {
    let fieldsToValidate: (keyof ListingFormData)[] = [];
    
    if (targetStep === 1) {
      fieldsToValidate = ['year', 'make', 'model', 'mileage', 'color', 'bodyType', 'transmission', 'fuelType', 'seats', 'condition'];
    } else if (targetStep === 2) {
      fieldsToValidate = ['description', 'images'];
    } else if (targetStep === 3) {
      fieldsToValidate = ['location', 'startingBid', 'reservePrice'];
    }

    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) {
      setStep(prev => prev + 1);
    }
  };

  const onSubmit = async (data: ListingFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setSubmitError('Please log in before creating a listing.');
        return;
      }
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      const normalizedMileage = Number(data.mileage) || 0;
      const normalizedReservePrice = Number(data.reservePrice) || 0;
      const normalizedStartingBid = Number(data.startingBid) || 0;
      const startDate = data.startTime ? new Date(data.startTime) : new Date();
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + parseInt(data.durationDays));

      // 1. Create Vehicle
      const vehiclePayload = {
        make: data.make,
        model: data.model,
        year: data.year,
        mileage: normalizedMileage,
        mileageKm: normalizedMileage,
        vin: data.vin,
        plateNumber: data.plateNumber,
        color: data.color,
        bodyType: data.bodyType,
        transmission: data.transmission,
        fuelType: data.fuelType,
        seats: data.seats,
        condition: data.condition,
        price: normalizedReservePrice, // Using reserve as list price reference
        reservePrice: normalizedReservePrice,
        description: data.description,
        location: data.location,
        features: data.features,
        images: data.images // Warning: Large payloads if Base64!
      };

      const vehicleRes = await axios.post(`${baseUrl}/vehicles`, vehiclePayload, config);
      const vehicleId = vehicleRes.data._id;

      // 2. Create Auction (Draft/Scheduled)
      const auctionPayload = {
        vehicleId: vehicleId,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        startPrice: normalizedStartingBid,
        reservePrice: normalizedReservePrice
      };

      await axios.post(`${baseUrl}/auctions`, auctionPayload, config);

      // Success
      navigate('/dashboard'); // Redirect to seller dashboard

    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.msg || 'Failed to create listing. Please try again.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- UI Components ---
  
  const steps = [
    { title: 'Vehicle Info', icon: Car },
    { title: 'Details & Photos', icon: Camera },
    { title: 'Pricing & Auction', icon: DollarSign },
    { title: 'Review', icon: CheckCircle2 }
  ];

  return (
    <div className="bg-slate-50 min-h-screen py-12 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Progress Stepper */}
        <div className="mb-12">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 z-0"></div>
            {steps.map((s, idx) => (
              <div key={idx} className="relative z-10 flex flex-col items-center">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all border-2",
                  step > idx + 1 ? "bg-emerald-500 border-emerald-500 text-white" : 
                  step === idx + 1 ? "bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-100" : 
                  "bg-white border-slate-200 text-slate-400"
                )}>
                  {step > idx + 1 ? <CheckCircle2 size={20} /> : <s.icon size={20} />}
                </div>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider mt-2",
                  step === idx + 1 ? "text-indigo-600" : "text-slate-400"
                )}>
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white/95 rounded-3xl shadow-xl border border-slate-200 overflow-hidden backdrop-blur-sm">
          <div className="p-8 md:p-12">
            
            {submitError && (
              <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 flex items-center gap-3">
                <AlertCircle size={20} />
                <span className="text-sm font-medium">{submitError}</span>
              </div>
            )}

            {/* STEP 1: VEHICLE INFO */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8">
                  <h2 className="text-2xl font-black text-slate-900">Tell us about your vehicle</h2>
                  <p className="text-slate-500">Provide the basic details to get started.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Year</label>
                    <input type="number" {...register('year')} className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.year ? "border-rose-300" : "border-slate-200")} />
                    {errors.year && <p className="text-xs text-rose-600">{errors.year.message}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Make</label>
                    <input type="text" {...register('make')} className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.make ? "border-rose-300" : "border-slate-200")} />
                    {errors.make && <p className="text-xs text-rose-600">{errors.make.message}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Model</label>
                    <input type="text" {...register('model')} className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.model ? "border-rose-300" : "border-slate-200")} />
                    {errors.model && <p className="text-xs text-rose-600">{errors.model.message}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Mileage</label>
                    <input type="number" {...register('mileage')} className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.mileage ? "border-rose-300" : "border-slate-200")} />
                    {errors.mileage && <p className="text-xs text-rose-600">{errors.mileage.message}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">VIN</label>
                    <input type="text" {...register('vin')} placeholder="17 alphanumeric characters" className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none uppercase", errors.vin ? "border-rose-300" : "border-slate-200")} />
                    {errors.vin && <p className="text-xs text-rose-600">{errors.vin.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Plate Number</label>
                    <input type="text" {...register('plateNumber')} className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none uppercase", errors.plateNumber ? "border-rose-300" : "border-slate-200")} />
                    {errors.plateNumber && <p className="text-xs text-rose-600">{errors.plateNumber.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Color</label>
                    <input type="text" {...register('color')} className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.color ? "border-rose-300" : "border-slate-200")} />
                    {errors.color && <p className="text-xs text-rose-600">{errors.color.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Body Type</label>
                    <select {...register('bodyType')} className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.bodyType ? "border-rose-300" : "border-slate-200")}>
                      <option value="sedan">Sedan</option>
                      <option value="suv">SUV</option>
                      <option value="truck">Truck</option>
                      <option value="coupe">Coupe</option>
                      <option value="hatchback">Hatchback</option>
                      <option value="van">Van</option>
                      <option value="convertible">Convertible</option>
                    </select>
                    {errors.bodyType && <p className="text-xs text-rose-600">{errors.bodyType.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Transmission</label>
                    <select {...register('transmission')} className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.transmission ? "border-rose-300" : "border-slate-200")}>
                      <option value="automatic">Automatic</option>
                      <option value="manual">Manual</option>
                    </select>
                    {errors.transmission && <p className="text-xs text-rose-600">{errors.transmission.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Fuel Type</label>
                    <select {...register('fuelType')} className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.fuelType ? "border-rose-300" : "border-slate-200")}>
                      <option value="petrol">Petrol</option>
                      <option value="diesel">Diesel</option>
                      <option value="electric">Electric</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                    {errors.fuelType && <p className="text-xs text-rose-600">{errors.fuelType.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Seats</label>
                    <input type="number" {...register('seats')} className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.seats ? "border-rose-300" : "border-slate-200")} />
                    {errors.seats && <p className="text-xs text-rose-600">{errors.seats.message}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Condition</label>
                    <select {...register('condition')} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none">
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: DETAILS & PHOTOS */}
            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Photos & Details</h2>
                  <p className="text-slate-500">Make your listing stand out.</p>
                </div>

                {/* Photos */}
                <div className={cn("bg-slate-50 border border-dashed rounded-2xl p-6 transition-colors", errors.images ? "border-rose-300 bg-rose-50/10" : "border-slate-300")}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-slate-900">Vehicle Photos</h4>
                      <p className="text-xs text-slate-500">Upload at least one clear image.</p>
                      {errors.images && <p className="text-xs text-rose-600 font-bold mt-1">{errors.images.message}</p>}
                    </div>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-800 transition">
                      <Camera size={16} />
                      Add photos
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImagesSelected(e.target.files)} />
                    </label>
                  </div>
                  
                  {formData.images?.length === 0 ? (
                    <div className="text-sm text-slate-500 text-center py-10 italic">No photos uploaded yet.</div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {formData.images?.map((img, idx) => (
                        <div key={idx} className="relative group aspect-square">
                          <img src={img} alt="Vehicle" className="w-full h-full object-cover rounded-lg border border-slate-200" />
                          <button type="button" aria-label="Remove photo" title="Remove photo" onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-white text-rose-500 border border-slate-200 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                  <h4 className="font-bold text-slate-900 mb-4">Key Features</h4>
                  <div className="flex gap-2 mb-4">
                    <input 
                      type="text" 
                      placeholder="e.g., Sunroof, Navigation, Leather Seats" 
                      value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                      className="flex-grow px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                    <button type="button" onClick={addFeature} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.features?.map((f, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                        {f} <button type="button" aria-label="Remove feature" title="Remove feature" onClick={() => removeFeature(idx)}><X size={12} className="text-slate-400 hover:text-slate-600" /></button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* AI Description */}
                <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl">
                  <div className="flex items-start gap-4">
                    <div className="bg-indigo-600 p-2 rounded-lg text-white"><Wand2 size={24} /></div>
                    <div className="flex-grow">
                      <h4 className="font-bold text-indigo-900">AutoWriter AI</h4>
                      <p className="text-xs text-indigo-700 mb-4">Draft some notes and we'll write the full description.</p>
                      <textarea 
                        {...register('aiNotes')}
                        className="w-full p-4 bg-white border border-indigo-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-600 outline-none min-h-[80px]"
                        placeholder="e.g., M-Sport package, ceramic coating, new tires..."
                      />
                      <button 
                        type="button"
                        onClick={handleAIHelp}
                        disabled={isGeneratingAI}
                        className="mt-3 flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                      >
                        {isGeneratingAI ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />}
                        Generate Description
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Full Description</label>
                  <textarea 
                    {...register('description')}
                    className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none min-h-[200px] text-sm", errors.description ? "border-rose-300" : "border-slate-200")}
                  />
                  {errors.description && <p className="text-xs text-rose-600">{errors.description.message}</p>}
                </div>
              </div>
            )}

            {/* STEP 3: AUCTION CONFIG */}
            {step === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Auction Settings</h2>
                  <p className="text-slate-500">Set your price and duration.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Starting Bid</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">EGP</span>
                      <input 
                        type="number"
                        {...register('startingBid')}
                        className={cn("w-full pl-12 pr-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.startingBid ? "border-rose-300" : "border-slate-200")}
                      />
                    </div>
                    {errors.startingBid && <p className="text-xs text-rose-600">{errors.startingBid.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Reserve Price</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">EGP</span>
                      <input 
                        type="number"
                        {...register('reservePrice')}
                        className={cn("w-full pl-12 pr-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.reservePrice ? "border-rose-300" : "border-slate-200")}
                      />
                    </div>
                    {errors.reservePrice && <p className="text-xs text-rose-600">{errors.reservePrice.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Location (City)</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      {...register('location')}
                      className={cn("w-full pl-12 pr-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.location ? "border-rose-300" : "border-slate-200")}
                      placeholder="e.g. Cairo, Nasr City"
                    />
                  </div>
                  {errors.location && <p className="text-xs text-rose-600">{errors.location.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Auction Duration</label>
                  <div className="grid grid-cols-3 gap-4">
                    {['1', '3', '7'].map((days) => (
                      <label key={days} className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all",
                        formData.durationDays === days ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 hover:border-slate-300"
                      )}>
                        <input type="radio" value={days} {...register('durationDays')} className="hidden" />
                        <span className="text-lg font-bold">{days} Days</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: REVIEW */}
            {step === 4 && (
              <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={40} />
                </div>
                <h2 className="text-3xl font-black text-slate-900">Ready to Submit?</h2>
                <p className="text-slate-500 max-w-md mx-auto">
                  Your vehicle will be submitted for admin approval. Once approved, the auction will be scheduled.
                </p>
                <div className="bg-slate-50 rounded-2xl p-6 text-left max-w-sm mx-auto space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Vehicle:</span> <span className="font-bold">{formData.year} {formData.make} {formData.model}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Reserve:</span> <span className="font-bold">EGP {Number(formData.reservePrice).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Duration:</span> <span className="font-bold">{formData.durationDays} Days</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Status:</span> <span className="font-bold text-amber-600">Pending Inspection</span></div>
                </div>
              </div>
            )}

            {/* NAVIGATION BUTTONS */}
            <div className="mt-12 flex flex-wrap items-center justify-between gap-4">
              {step > 1 ? (
                <button 
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-8 py-3 text-slate-600 font-bold flex items-center gap-2 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <ArrowLeft size={18} /> Back
                </button>
              ) : <div></div>}

              <button 
                type="button"
                onClick={() => step < 4 ? validateStep(step) : handleSubmit(onSubmit)()}
                disabled={isSubmitting}
                className="px-10 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 rounded-xl transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (
                  <>
                    {step === 4 ? 'Submit Listing' : 'Continue'}
                    {step < 4 && <ArrowRight size={18} />}
                  </>
                )}
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateListingPage;