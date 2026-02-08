import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Camera, Car, MapPin, DollarSign, Wand2, ArrowRight, ArrowLeft, Loader2, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { geminiService } from '../geminiService'; 
import { apiService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility for Tailwind ---
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// --- Zod Schema ---
const createListingSchema = (t: (en: string, ar: string) => string) =>
  z.object({
    // Step 1: Vehicle Basics
    year: z.coerce
      .number()
      .min(1900, t('Year must be 1900 or newer', 'سنة الصنع يجب ان تكون 1900 او احدث'))
      .max(new Date().getFullYear() + 1, t('Year cannot be in the far future', 'سنة الصنع لا يمكن ان تكون بعيدة')),
    make: z.string().min(1, t('Make is required', 'الماركة مطلوبة')),
    model: z.string().min(1, t('Model is required', 'الموديل مطلوب')),
    mileage: z.coerce.number().min(0, t('Mileage must be 0 or more', 'المسافة يجب ان تكون صفر او اكثر')),
    vin: z.preprocess(
      (val) => (val === '' ? undefined : val),
      z.string().length(17, t('VIN must be 17 characters', 'رقم الشاسيه يجب ان يكون 17 حرف')).optional()
    ),
    plateNumber: z.preprocess(
      (val) => (val === '' ? undefined : val),
      z.string().min(1, t('Plate number is required', 'رقم اللوحة مطلوب')).optional()
    ),
    color: z.string().min(1, t('Color is required', 'اللون مطلوب')),
    bodyType: z.enum(['sedan', 'suv', 'truck', 'coupe', 'hatchback', 'van', 'convertible']),
    transmission: z.enum(['manual', 'automatic']),
    fuelType: z.enum(['petrol', 'diesel', 'electric', 'hybrid']),
    seats: z.coerce.number().min(1, t('Seats must be at least 1', 'عدد المقاعد يجب ان يكون واحد او اكثر')),
    condition: z.enum(['excellent', 'good', 'fair', 'poor']),

    // Step 2: Details & Media
    description: z.string().min(20, t('Description must be at least 20 characters', 'الوصف يجب ان يكون 20 حرف على الاقل')),
    features: z.array(z.string()).default([]),
    images: z.array(z.string()).min(1, t('Add at least one photo', 'اضف صورة واحدة على الاقل')),

    // Step 3: Pricing & Location (Auction Config)
    location: z.string().min(1, t('Location is required', 'الموقع مطلوب')),
    reservePrice: z.coerce.number().min(1, t('Reserve price is required', 'سعر الحجز مطلوب')),
    startingBid: z.coerce.number().min(1, t('Starting bid is required', 'سعر البداية مطلوب')),
    startTime: z.string().optional(),
    durationDays: z.enum(['1', '3', '7']).default('3'),

    // AI Notes
    aiNotes: z.string().optional(),
  });

type ListingFormInput = z.input<ReturnType<typeof createListingSchema>>;
type ListingFormData = z.infer<ReturnType<typeof createListingSchema>>;

const CreateListingPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [featureInput, setFeatureInput] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const { t, isArabic, formatNumber, formatCurrencyEGP } = useLanguage();
  const listingSchema = useMemo(() => createListingSchema(t), [t]);
  
  // ✅ FIX 1: Ensure this state is actually updated
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    getValues,
    formState: { errors }
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
    
    // ✅ FIX 1: Add new files to the state so they can be uploaded
    const newFiles = Array.from(files);
    setImageFiles(prev => [...prev, ...newFiles]);

    // Generate previews
    const readFile = (file: File) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Image load failed'));
      reader.readAsDataURL(file);
    });

    try {
      const newImages = await Promise.all(newFiles.map(readFile));
      // Update form data with previews for display
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
    // ✅ FIX 2: Remove from BOTH preview array and file array
    const current = getValues('images');
    setValue('images', current.filter((_, i) => i !== index));
    setImageFiles(prev => prev.filter((_, i) => i !== index));
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
        price: normalizedReservePrice,
        reservePrice: normalizedReservePrice,
        description: data.description,
        location: data.location,
        features: data.features,
      };

      // ✅ FIX 3: Use apiService (which handles Auth & Port 5002)
      // Send vehiclePayload + imageFiles
      const vehicleRes = await apiService.createVehicle(vehiclePayload, imageFiles);

      if (vehicleRes.error || !vehicleRes.data?._id) {
        throw new Error(vehicleRes.error || t('Failed to create vehicle', 'فشل انشاء السيارة'));
      }
      
      const vehicleId = vehicleRes.data._id;

      // 2. Create Auction
      const auctionPayload = {
        vehicleId: vehicleId,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        startPrice: normalizedStartingBid,
        reservePrice: normalizedReservePrice
      };

      // ✅ FIX 4: Use apiService for auction (Handles Token correctly)
      const auctionRes = await apiService.createAuction(auctionPayload);

      if (auctionRes.error) {
         throw new Error(auctionRes.error || t('Failed to create auction', 'فشل انشاء المزاد'));
      }

      // Success
      navigate('/dashboard');

    } catch (err: any) {
      console.error(err);
      const msg = err.message || t('Failed to create listing. Please try again.', 'تعذر انشاء الاعلان حاول مرة اخرى');
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { title: t('Vehicle Info', 'بيانات السيارة'), icon: Car },
    { title: t('Details & Photos', 'التفاصيل والصور'), icon: Camera },
    { title: t('Pricing & Auction', 'السعر والمزاد'), icon: DollarSign },
    { title: t('Review', 'المراجعة'), icon: CheckCircle2 }
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
                  <h2 className="text-2xl font-black text-slate-900">{t('Tell us about your vehicle', 'احكي لنا عن سيارتك')}</h2>
                  <p className="text-slate-500">{t('Provide the basic details to get started', 'اكتب البيانات الاساسية للبدء')}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Year', 'سنة الصنع')}</label>
                    <input type="number" {...register('year')} className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.year ? "border-rose-300" : "border-slate-200")} />
                    {errors.year && <p className="text-xs text-rose-600">{errors.year.message}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Make', 'الماركة')}</label>
                    <input type="text" {...register('make')} className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.make ? "border-rose-300" : "border-slate-200")} />
                    {errors.make && <p className="text-xs text-rose-600">{errors.make.message}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Model', 'الموديل')}</label>
                    <input type="text" {...register('model')} className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.model ? "border-rose-300" : "border-slate-200")} />
                    {errors.model && <p className="text-xs text-rose-600">{errors.model.message}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Mileage', 'المسافة')}</label>
                    <input type="number" {...register('mileage')} className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.mileage ? "border-rose-300" : "border-slate-200")} />
                    {errors.mileage && <p className="text-xs text-rose-600">{errors.mileage.message}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('VIN', 'رقم الشاسيه')}</label>
                    <input type="text" {...register('vin')} placeholder={t('17 alphanumeric characters', 'سبعة عشر حرف او رقم')} className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none uppercase", errors.vin ? "border-rose-300" : "border-slate-200")} />
                    {errors.vin && <p className="text-xs text-rose-600">{errors.vin.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Plate Number', 'رقم اللوحة')}</label>
                    <input type="text" {...register('plateNumber')} className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none uppercase", errors.plateNumber ? "border-rose-300" : "border-slate-200")} />
                    {errors.plateNumber && <p className="text-xs text-rose-600">{errors.plateNumber.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Color', 'اللون')}</label>
                    <input type="text" {...register('color')} className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.color ? "border-rose-300" : "border-slate-200")} />
                    {errors.color && <p className="text-xs text-rose-600">{errors.color.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Body Type', 'نوع الهيكل')}</label>
                    <select {...register('bodyType')} className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.bodyType ? "border-rose-300" : "border-slate-200")}>
                      <option value="sedan">{t('Sedan', 'سيدان')}</option>
                      <option value="suv">{t('SUV', 'دفع رباعي')}</option>
                      <option value="truck">{t('Truck', 'بيك اب')}</option>
                      <option value="coupe">{t('Coupe', 'كوبيه')}</option>
                      <option value="hatchback">{t('Hatchback', 'هاتشباك')}</option>
                      <option value="van">{t('Van', 'فان')}</option>
                      <option value="convertible">{t('Convertible', 'مكشوفة')}</option>
                    </select>
                    {errors.bodyType && <p className="text-xs text-rose-600">{errors.bodyType.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Transmission', 'ناقل الحركة')}</label>
                    <select {...register('transmission')} className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.transmission ? "border-rose-300" : "border-slate-200")}>
                      <option value="automatic">{t('Automatic', 'اوتوماتيك')}</option>
                      <option value="manual">{t('Manual', 'يدوي')}</option>
                    </select>
                    {errors.transmission && <p className="text-xs text-rose-600">{errors.transmission.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Fuel Type', 'نوع الوقود')}</label>
                    <select {...register('fuelType')} className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.fuelType ? "border-rose-300" : "border-slate-200")}>
                      <option value="petrol">{t('Petrol', 'بنزين')}</option>
                      <option value="diesel">{t('Diesel', 'ديزل')}</option>
                      <option value="electric">{t('Electric', 'كهرباء')}</option>
                      <option value="hybrid">{t('Hybrid', 'هايبرد')}</option>
                    </select>
                    {errors.fuelType && <p className="text-xs text-rose-600">{errors.fuelType.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Seats', 'عدد المقاعد')}</label>
                    <input type="number" {...register('seats')} className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.seats ? "border-rose-300" : "border-slate-200")} />
                    {errors.seats && <p className="text-xs text-rose-600">{errors.seats.message}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Condition', 'الحالة')}</label>
                    <select {...register('condition')} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none">
                      <option value="excellent">{t('Excellent', 'ممتازة')}</option>
                      <option value="good">{t('Good', 'جيدة')}</option>
                      <option value="fair">{t('Fair', 'مقبولة')}</option>
                      <option value="poor">{t('Poor', 'ضعيفة')}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: DETAILS & PHOTOS */}
            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{t('Photos & Details', 'الصور والتفاصيل')}</h2>
                  <p className="text-slate-500">{t('Make your listing stand out', 'خلي اعلانك يبان')}</p>
                </div>

                {/* Photos */}
                <div className={cn("bg-slate-50 border border-dashed rounded-2xl p-6 transition-colors", errors.images ? "border-rose-300 bg-rose-50/10" : "border-slate-300")}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-slate-900">{t('Vehicle Photos', 'صور السيارة')}</h4>
                      <p className="text-xs text-slate-500">{t('Upload at least one clear image', 'ارفع صورة واضحة على الاقل')}</p>
                      {errors.images && <p className="text-xs text-rose-600 font-bold mt-1">{errors.images.message}</p>}
                    </div>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-800 transition">
                      <Camera size={16} />
                      {t('Add photos', 'اضف صور')}
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImagesSelected(e.target.files)} />
                    </label>
                  </div>
                  
                  {formData.images?.length === 0 ? (
                    <div className="text-sm text-slate-500 text-center py-10 italic">{t('No photos uploaded yet', 'لا توجد صور بعد')}</div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {formData.images?.map((img, idx) => (
                        <div key={idx} className="relative group aspect-square">
                          <img src={img} alt={t('Vehicle', 'السيارة')} className="w-full h-full object-cover rounded-lg border border-slate-200" />
                          <button type="button" aria-label={t('Remove photo', 'حذف الصورة')} title={t('Remove photo', 'حذف الصورة')} onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-white text-rose-500 border border-slate-200 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                  <h4 className="font-bold text-slate-900 mb-4">{t('Key Features', 'المميزات الاساسية')}</h4>
                  <div className="flex gap-2 mb-4">
                    <input 
                      type="text" 
                      placeholder={t('e.g., Sunroof, Navigation, Leather Seats', 'مثال فتحة سقف ملاحة مقاعد جلد')} 
                      value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                      className="flex-grow px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                    <button type="button" onClick={addFeature} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition">{t('Add', 'اضف')}</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.features?.map((f, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                        {f} <button type="button" aria-label={t('Remove feature', 'حذف الميزة')} title={t('Remove feature', 'حذف الميزة')} onClick={() => removeFeature(idx)}><X size={12} className="text-slate-400 hover:text-slate-600" /></button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* AI Description */}
                <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl">
                  <div className="flex items-start gap-4">
                    <div className="bg-indigo-600 p-2 rounded-lg text-white"><Wand2 size={24} /></div>
                    <div className="flex-grow">
                      <h4 className="font-bold text-indigo-900">{t('AutoWriter AI', 'كاتب تلقائي')}</h4>
                      <p className="text-xs text-indigo-700 mb-4">{t('Draft some notes and we will write the full description', 'اكتب ملاحظات بسيطة وسنكتب الوصف الكامل')}</p>
                      <textarea 
                        {...register('aiNotes')}
                        className="w-full p-4 bg-white border border-indigo-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-600 outline-none min-h-[80px]"
                        placeholder={t('e.g., M-Sport package, ceramic coating, new tires', 'مثال باقة ام سبورت طلاء سيراميك كاوتش جديد')}
                      />
                      <button 
                        type="button"
                        onClick={handleAIHelp}
                        disabled={isGeneratingAI}
                        className="mt-3 flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                      >
                        {isGeneratingAI ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />}
                        {t('Generate Description', 'انشئ وصف')}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Full Description', 'الوصف الكامل')}</label>
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
                  <h2 className="text-2xl font-black text-slate-900">{t('Auction Settings', 'اعدادات المزاد')}</h2>
                  <p className="text-slate-500">{t('Set your price and duration', 'حدد السعر والمدة')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Starting Bid', 'سعر البداية')}</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{isArabic ? 'ج م' : 'EGP'}</span>
                      <input 
                        type="number"
                        {...register('startingBid')}
                        className={cn("w-full pl-12 pr-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.startingBid ? "border-rose-300" : "border-slate-200")}
                      />
                    </div>
                    {errors.startingBid && <p className="text-xs text-rose-600">{errors.startingBid.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Reserve Price', 'سعر الحجز')}</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{isArabic ? 'ج م' : 'EGP'}</span>
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
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Location (City)', 'الموقع المدينة')}</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      {...register('location')}
                      className={cn("w-full pl-12 pr-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.location ? "border-rose-300" : "border-slate-200")}
                      placeholder={t('e.g. Cairo, Nasr City', 'مثال القاهرة مدينة نصر')}
                    />
                  </div>
                  {errors.location && <p className="text-xs text-rose-600">{errors.location.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Auction Duration', 'مدة المزاد')}</label>
                  <div className="grid grid-cols-3 gap-4">
                    {['1', '3', '7'].map((days) => (
                      <label key={days} className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all",
                        formData.durationDays === days ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 hover:border-slate-300"
                      )}>
                        <input type="radio" value={days} {...register('durationDays')} className="hidden" />
                        <span className="text-lg font-bold">{formatNumber(Number(days))} {t('Days', 'ايام')}</span>
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
                <h2 className="text-3xl font-black text-slate-900">{t('Ready to Submit?', 'جاهز للارسال')}</h2>
                <p className="text-slate-500 max-w-md mx-auto">
                  {t(
                    'Your vehicle will be submitted for admin approval. Once approved, the auction will be scheduled.',
                    'سيتم ارسال سيارتك للمراجعة وبعد الموافقة سيتم جدولة المزاد'
                  )}
                </p>
                <div className="bg-slate-50 rounded-2xl p-6 text-left max-w-sm mx-auto space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">{t('Vehicle', 'السيارة')}</span> <span className="font-bold">{formatNumber(formData.year)} {formData.make} {formData.model}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">{t('Reserve', 'الحجز')}</span> <span className="font-bold">{formatCurrencyEGP(Number(formData.reservePrice))}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">{t('Duration', 'المدة')}</span> <span className="font-bold">{formatNumber(Number(formData.durationDays))} {t('Days', 'ايام')}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">{t('Status', 'الحالة')}</span> <span className="font-bold text-amber-600">{t('Pending Inspection', 'قيد الفحص')}</span></div>
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
                  <ArrowLeft size={18} /> {t('Back', 'رجوع')}
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
                    {step === 4 ? t('Submit Listing', 'ارسال الاعلان') : t('Continue', 'اكمل')}
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