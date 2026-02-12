import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Camera, Car, MapPin, DollarSign, Tag, Wand2, ArrowRight, ArrowLeft, Loader2, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { geminiService } from '../geminiService'; // Keeping AI service
import { apiService } from '../services/api';
import { handleApiError, handleFileUploadError } from '../utils/errorHandler';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import CustomSelect, { CustomSelectOption } from '../components/CustomSelect';
import Autocomplete from '../components/Autocomplete';
import { getMakeOptions, getModelOptions, isValidMake } from '../data/carMakeModels';
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
      .number({ error: t('Year must be a valid number', 'سنة الصنع يجب ان تكون رقم صحيح') })
      .min(1900, t('Year must be 1900 or newer', 'سنة الصنع يجب ان تكون 1900 او احدث'))
      .max(new Date().getFullYear() + 1, t('Year cannot be in the future', 'سنة الصنع لا يمكن ان تكون في المستقبل')),
    make: z.string().min(1, t('Make is required - please select or type', 'الماركة مطلوبة - اختر او اكتب')),
    customMake: z.string().optional(),
    model: z.string().min(1, t('Model is required - please select or type', 'الموديل مطلوب - اختر او اكتب')),
    mileage: z.coerce.number({ error: t('Please select mileage range', 'اختر نطاق المسافة') }).min(0, t('Mileage cannot be negative', 'المسافة لا يمكن ان تكون سالبة')),
    vin: z.preprocess(
      (val) => (val === '' ? undefined : val),
      z.string().length(17, t('VIN must be exactly 17 characters (letters and numbers)', 'رقم الشاسيه يجب ان يكون 17 حرف بالضبط')).regex(/^[A-HJ-NPR-Z0-9]{17}$/i, t('VIN contains invalid characters', 'رقم الشاسيه يحتوي على احرف غير صحيحة')).optional()
    ),
    plateNumber: z.preprocess(
      (val) => (val === '' ? undefined : val),
      z
        .string()
        .regex(/^[A-Za-z]{1,3}[1-9][0-9]{0,3}$/, t('Plate format: 1-3 letters + 1-4 digits (first digit cannot be 0)', 'صيغة اللوحة: 1-3 حروف + 1-4 أرقام (اول رقم لا يكون صفر)'))
        .optional()
    ),
    color: z.string().min(1, t('Color is required', 'اللون مطلوب')),
    bodyType: z.enum(['sedan', 'suv', 'truck', 'coupe', 'hatchback', 'van', 'convertible'], { error: t('Body type is required', 'نوع الهيكل مطلوب') }),
    transmission: z.enum(['manual', 'automatic', 'other'], { error: t('Transmission type is required', 'نوع ناقل الحركة مطلوب') }),
    fuelType: z.enum(['petrol', 'diesel', 'electric', 'hybrid'], { error: t('Fuel type is required', 'نوع الوقود مطلوب') }),
    seats: z.coerce.number({ error: t('Please select number of seats', 'اختر عدد المقاعد') }).min(1, t('Must have at least 1 seat', 'يجب ان يكون مقعد واحد على الاقل')).max(10, t('Maximum 10 seats', 'حد اقصى 10 مقاعد')),
    condition: z.enum(['excellent', 'good', 'fair', 'poor'], { error: t('Condition is required', 'الحالة مطلوبة') }),

    // Step 2: Details & Media
    description: z.string().min(20, t('Description must be at least 20 characters - tell buyers about your vehicle', 'الوصف يجب ان يكون 20 حرف على الاقل - احكي للمشترين عن سيارتك')).max(2000, t('Description is too long (max 2000 characters)', 'الوصف طويل جدا (حد اقصى 2000 حرف)')),
    features: z.array(z.string()).default([]),
    images: z.array(z.string()).min(1, t('At least one clear photo is required', 'صورة واضحة واحدة على الاقل مطلوبة')).max(10, t('Maximum 10 photos allowed', 'حد اقصى 10 صور')),

    // Step 3: Pricing & Sale Type
    location: z.string().min(2, t('Location is required (city name)', 'الموقع مطلوب (اسم المدينة)')).max(100, t('Location name is too long', 'اسم الموقع طويل جدا')),
    saleType: z.enum(['fixed_price', 'auction']).default('fixed_price'),
    price: z.coerce.number({ error: t('Price must be a valid number', 'السعر يجب ان يكون رقم صحيح') }).min(1000, t('Price must be at least 1,000 EGP', 'السعر يجب ان يكون 1000 جنيه على الاقل')).max(50000000, t('Price seems unrealistic', 'السعر غير واقعي')),
    // Auction-only fields (required when saleType === 'auction')
    reservePrice: z.coerce.number({ error: t('Reserve price must be a number', 'سعر الحجز يجب ان يكون رقم') }).optional(),
    startingBid: z.coerce.number({ error: t('Starting bid must be a number', 'سعر البداية يجب ان يكون رقم') }).optional(),
    durationDays: z.enum(['1', '3', '7']).default('3'),

    // AI Notes
    aiNotes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.make !== 'other') return;
    const value = (data.customMake ?? '').trim();
    if (!value) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customMake'],
        message: t('Please enter a make', 'اكتب الماركة')
      });
      return;
    }
    if (value.length > 7) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customMake'],
        message: t('Make must be 7 characters or fewer', 'الماركة لازم تكون ٧ أحرف أو أقل')
      });
    }
    if (!/^[\\p{L}]+$/u.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customMake'],
        message: t('Letters only (no numbers or symbols)', 'حروف فقط بدون أرقام أو رموز')
      });
    }
  })
  .refine(
    (data) => {
      if (data.saleType === 'auction') {
        const starting = data.startingBid ?? 0;
        const reserve = data.reservePrice ?? 0;
        return starting >= 1000 && reserve >= 1000 && reserve >= starting;
      }
      return true;
    },
    {
      message: t('For auctions: starting bid and reserve price must be at least 1,000 EGP, and reserve must be >= starting bid', 'للمزاد: سعر البداية وسعر الحجز يجب ان يكونا 1000 جنيه على الاقل، وسعر الحجز >= سعر البداية'),
      path: ['startingBid'],
    }
  );

type ListingFormInput = z.input<ReturnType<typeof createListingSchema>>;
type ListingFormData = z.infer<ReturnType<typeof createListingSchema>>;

const MILEAGE_OPTIONS = [
  { value: 0, labelEn: '0 km', labelAr: '٠ كم' },
  { value: 5000, labelEn: '0 - 5k', labelAr: '٠ - ٥ آلاف' },
  { value: 10000, labelEn: '5 - 10k', labelAr: '٥ - ١٠ آلاف' },
  { value: 30000, labelEn: '10 - 30k', labelAr: '١٠ - ٣٠ ألف' },
  { value: 60000, labelEn: '30 - 60k', labelAr: '٣٠ - ٦٠ ألف' },
  { value: 100000, labelEn: '60 - 100k', labelAr: '٦٠ - ١٠٠ ألف' },
  { value: 150000, labelEn: '100 - 150k', labelAr: '١٠٠ - ١٥٠ ألف' },
  { value: 200000, labelEn: '150 - 200k', labelAr: '١٥٠ - ٢٠٠ ألف' },
  { value: 250000, labelEn: '200 - 250k', labelAr: '٢٠٠ - ٢٥٠ ألف' },
  { value: 300000, labelEn: '250k+', labelAr: '٢٥٠ ألف+' }
];

const CreateListingPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [featureInput, setFeatureInput] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);
  
  const { t, isArabic, formatNumber, formatCurrencyEGP } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const resolvedKycStatus = user
    ? (user.kycStatus
        ? String(user.kycStatus).toLowerCase()
        : user.isKycVerified
          ? 'approved'
          : 'not_uploaded')
    : null;

  const getKycGateCopy = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          badge: t('KYC Review', 'مراجعة الهوية'),
          title: t('Your verification is under review', 'جاري مراجعة هويتك'),
          description: t(
            'Please wait until our compliance team finishes reviewing your documents. We will notify you the moment it is approved.',
            'من فضلك انتظر لغاية ما فريق المراجعة يخلص فحص المستندات، وهنبعتلك إشعار أول ما يتم الموافقة.',
          ),
          actionLabel: t('View KYC status', 'شوف حالة التحقق'),
        };
      case 'rejected':
        return {
          badge: t('KYC Required', 'مطلوب تحقق الهوية'),
          title: t('Your previous submission was rejected', 'تم رفض مستنداتك السابقة'),
          description: t(
            'Please upload updated documents so we can verify your identity before you create listings.',
            'من فضلك ارفع مستندات جديدة علشان نقدر نتحقق من هويتك قبل ما تنشئ إعلانات.',
          ),
          actionLabel: t('Resubmit documents', 'ارفع المستندات مرة تانية'),
        };
      default:
        return {
          badge: t('Verification Needed', 'مطلوب التحقق'),
          title: t('Complete KYC to sell cars', 'كمّل التحقق علشان تعرض سيارتك'),
          description: t(
            'We need a quick identity verification before we publish any listings from your account.',
            'لازم نعمل تحقق سريع من هويتك قبل ما ننشر أي إعلان من حسابك.',
          ),
          actionLabel: t('Start verification', 'ابدأ التحقق'),
        };
    }
  };

  const renderKycGate = (status: string) => {
    const copy = getKycGateCopy(status);
    const statusLabel = status.replace('_', ' ');

    return (
      <section className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
        <div className="max-w-lg w-full bg-white border border-slate-200 shadow-xl rounded-3xl p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <AlertCircle size={28} />
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">{copy.badge}</p>
          <h1 className="mt-2 text-2xl font-black text-slate-900">{copy.title}</h1>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">{copy.description}</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {t('Current status:', 'الحالة الحالية:')} <span className="text-slate-900">{statusLabel}</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            {copy.actionLabel}
          </button>
        </div>
      </section>
    );
  };
  const listingSchema = useMemo(() => createListingSchema(t), [t]);
  
  // ✅ FIX 1: Ensure this state is actually updated
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const currentYear = new Date().getFullYear();
  const blockInvalidNumberInput = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-', '.'].includes(event.key)) {
      event.preventDefault();
    }
  };

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
      saleType: 'fixed_price',
      durationDays: '3',
      mileage: 0,
      year: new Date().getFullYear(),
      make: '',
      customMake: '',
    }
  });

  const formData = watch();
  const selectedMake = watch('make');
  const customMakeValue = watch('customMake') ?? '';
  const resolvedMake = selectedMake === 'other' ? customMakeValue.trim() : selectedMake;
  const sanitizeMake = (value: string) => value.replace(/[^\p{L}]/gu, '').slice(0, 7);

  const handleAIHelp = async () => {
    setIsGeneratingAI(true);
    setSubmitError(null);
    try {
      const notes = getValues('aiNotes');
      const basicInfo = {
        make: resolvedMake,
        model: getValues('model'),
        year: Number(getValues('year')) || new Date().getFullYear(),
        condition: getValues('condition'),
        notes: notes || ''
      };
      
      const generatedDescription = await geminiService.enhanceDescription(basicInfo);
      setValue('description', generatedDescription || '', { shouldValidate: true });
    } catch (error) {
      setSubmitError(
        t(
          'AI description generation failed. Please write your own description.',
          'فشل توليد الوصف بالذكاء الاصطناعي. اكتب الوصف بنفسك.'
        )
      );
      console.error("AI Generation failed", error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleImagesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setImageUploadError(null);
    setIsUploadingImages(true);
    
    const newFiles = Array.from(files);
    
    // Validate file size and type
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    for (const file of newFiles) {
      if (file.size > MAX_SIZE) {
        setImageUploadError(
          handleFileUploadError(
            new Error('file size'),
            t
          )
        );
        setIsUploadingImages(false);
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        setImageUploadError(
          handleFileUploadError(
            new Error('file type'),
            t
          )
        );
        setIsUploadingImages(false);
        return;
      }
    }
    
    // Add new files to the state so they can be uploaded
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
      setIsUploadingImages(false);
    } catch (err) {
      console.error(err);
      setImageUploadError(
        handleFileUploadError(
          err instanceof Error ? err : new Error('upload failed'),
          t
        )
      );
      setIsUploadingImages(false);
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
    setImageUploadError(null); // Clear error when removing images
  };

  const validateStep = async (targetStep: number) => {
    setValidationAttempted(true);
    let fieldsToValidate: (keyof ListingFormData)[] = [];
    
    if (targetStep === 1) {
      fieldsToValidate = ['year', 'make', 'model', 'mileage', 'color', 'bodyType', 'transmission', 'fuelType', 'seats', 'condition'];
      if (getValues('make') === 'other') {
        fieldsToValidate.push('customMake');
      }
    } else if (targetStep === 2) {
      fieldsToValidate = ['description', 'images'];
    } else if (targetStep === 3) {
      const currentSaleType = getValues('saleType');
      if (currentSaleType === 'auction') {
        fieldsToValidate = ['location', 'price', 'startingBid', 'reservePrice'];
      } else {
        fieldsToValidate = ['location', 'price'];
      }
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
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setSubmitError(t('Please log in before creating a listing', 'يرجى تسجيل الدخول قبل انشاء اعلان'));
        return;
      }

      const normalizedMileage = Number(data.mileage) || 0;
      const normalizedPrice = Number(data.price) || 0;
      const isAuction = data.saleType === 'auction';

      // 1. Create Vehicle (always)
      const vehiclePayload = {
        make: data.make === 'other' ? (data.customMake ?? '').trim() : data.make,
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
        price: isAuction ? Number(data.reservePrice) || normalizedPrice : normalizedPrice,
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

      // 2. Create Auction ONLY if sale type is 'auction'
      if (isAuction) {
        const auctionPayload = {
          vehicleId: vehicleId,
          durationDays: parseInt(data.durationDays),
          startPrice: Number(data.startingBid) || 0,
          reservePrice: Number(data.reservePrice) || normalizedPrice
        };

        const auctionRes = await apiService.createAuction(auctionPayload);
        if (auctionRes.error) {
          throw new Error(auctionRes.error || t('Failed to create auction', 'فشل انشاء المزاد'));
        }
      }

      // Success
      navigate('/dashboard');

    } catch (err: any) {
      console.error(err);
      const msg = handleApiError(err, t);
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

  const mileageOptions: CustomSelectOption[] = MILEAGE_OPTIONS.map(option => ({
    value: option.value,
    label: t(option.labelEn, option.labelAr)
  }));

  const colorOptions: CustomSelectOption[] = [
    { value: '', label: t('Select color', 'اختار اللون') },
    { value: 'blue', label: t('Blue', 'أزرق') },
    { value: 'red', label: t('Red', 'أحمر') },
    { value: 'black', label: t('Black', 'أسود') },
    { value: 'white', label: t('White', 'أبيض') },
    { value: 'gray', label: t('Gray', 'رمادي') },
    { value: 'silver', label: t('Silver', 'فضي') },
    { value: 'green', label: t('Green', 'أخضر') },
    { value: 'yellow', label: t('Yellow', 'أصفر') },
    { value: 'orange', label: t('Orange', 'برتقالي') },
    { value: 'brown', label: t('Brown', 'بني') },
    { value: 'beige', label: t('Beige', 'بيج') },
    { value: 'gold', label: t('Gold', 'ذهبي') },
    { value: 'other', label: t('Other', 'أخرى') }
  ];

  const bodyTypeOptions: CustomSelectOption[] = [
    { value: 'sedan', label: t('Sedan', 'سيدان') },
    { value: 'suv', label: t('SUV', 'دفع رباعي') },
    { value: 'truck', label: t('Truck', 'شاحنة') },
    { value: 'coupe', label: t('Coupe', 'كوبيه') },
    { value: 'hatchback', label: t('Hatchback', 'هاتشباك') },
    { value: 'van', label: t('Van', 'فان') },
    { value: 'convertible', label: t('Convertible', 'مكشوفة') }
  ];

  const transmissionOptions: CustomSelectOption[] = [
    { value: 'automatic', label: t('Automatic', 'اوتوماتيك') },
    { value: 'manual', label: t('Manual', 'يدوي') },
    { value: 'other', label: t('Other', 'أخرى') }
  ];

  const fuelTypeOptions: CustomSelectOption[] = [
    { value: 'petrol', label: t('Petrol', 'بنزين') },
    { value: 'diesel', label: t('Diesel', 'ديزل') },
    { value: 'electric', label: t('Electric', 'كهرباء') },
    { value: 'hybrid', label: t('Hybrid', 'هايبرد') }
  ];

  const seatsOptions: CustomSelectOption[] = [1, 2, 3, 4, 5, 6, 7].map(value => ({
    value,
    label: formatNumber(value)
  }));

  const conditionOptions: CustomSelectOption[] = [
    { value: 'excellent', label: t('Excellent', 'ممتازة') },
    { value: 'good', label: t('Good', 'جيدة') },
    { value: 'fair', label: t('Fair', 'مقبولة') },
    { value: 'poor', label: t('Poor', 'ضعيفة') }
  ];

  if (authLoading) {
    return (
      <section className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-10 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <p className="mt-4 text-sm font-medium text-slate-600">
          {t('Loading your profile...', 'جاري تحميل بياناتك...')}
        </p>
      </section>
    );
  }

  if (!authLoading && !user) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
        <div className="max-w-lg w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <h1 className="text-2xl font-black text-slate-900">{t('Log in to create a listing', 'سجل دخولك علشان تنشئ إعلان')}</h1>
          <p className="mt-3 text-sm text-slate-600">
            {t('Please sign in first so we can link the listing to your verified profile.', 'لازم تسجل دخول الأول علشان نربط الإعلان بملفك المتحقق.')}
          </p>
          <button
            type="button"
            onClick={() => navigate('/login', { state: { from: '/create-listing' } })}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            {t('Go to login', 'اذهب لتسجيل الدخول')}
          </button>
        </div>
      </section>
    );
  }

  if (resolvedKycStatus && resolvedKycStatus !== 'approved') {
    return renderKycGate(resolvedKycStatus);
  }

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
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                  step > idx + 1 ? "bg-green-100 text-green-600 border-2 border-green-500" :
                  step === idx + 1 ? "bg-indigo-600 text-white shadow-lg shadow-indigo-300/50 scale-110" :
                  "bg-white border-2 border-slate-300 text-slate-400"
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

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white/95 rounded-3xl shadow-xl border border-slate-200 overflow-visible backdrop-blur-sm">
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
                    <input
                      type="number"
                      min={1900}
                      max={currentYear + 1}
                      step={1}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      onKeyDown={blockInvalidNumberInput}
                      placeholder={t('2022', '2022')}
                      {...register('year')}
                      className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.year ? "border-rose-300" : "border-slate-200")}
                    />
                    {errors.year && <p className="text-xs text-rose-600">{errors.year.message}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Make', 'الماركة')}</label>
                    <input type="hidden" {...register('make')} />
                    <Autocomplete
                      value={formData.make}
                      options={getMakeOptions(true).map(m => ({ value: m.value, label: m.label }))}
                      placeholder={t('Search or select make...', 'ابحث او اختر الماركة...')}
                      error={!!errors.make && validationAttempted}
                      allowCustom={true}
                      customPlaceholder={t('Type to search makes or enter custom...', 'ابحث عن الماركات او اكتب ماركة أخرى...')}
                      onChange={(value) => {
                        setValue('make', String(value), { shouldValidate: true, shouldDirty: true });
                        // Reset model when make changes
                        setValue('model', '', { shouldValidate: false });
                        // Clear custom make if selecting from list
                        if (value !== 'other') {
                          setValue('customMake', '', { shouldValidate: true });
                        }
                      }}
                      onCustomInput={(input) => {
                        const sanitized = input.replace(/[^\p{L}]/gu, '').slice(0, 7);
                        setValue('make', sanitized, { shouldValidate: true, shouldDirty: true });
                        setValue('model', '', { shouldValidate: false });
                      }}
                    />
                    {errors.make && validationAttempted && <p className="text-xs text-rose-600 font-medium">{errors.make.message}</p>}
                    {formData.make && !isValidMake(formData.make) && formData.make !== 'other' && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {t('Custom make - will be reviewed', 'ماركة مخصصة - سيتم مراجعتها')}
                      </p>
                    )}
                  </div>

                  {selectedMake === 'other' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Custom Make', 'ماركة أخرى')}</label>
                      <input
                        type="text"
                        maxLength={7}
                        inputMode="text"
                        pattern="[A-Za-z\u0600-\u06FF]{1,7}"
                        placeholder={t('Up to 7 letters only', 'حد أقصى ٧ حروف فقط')}
                        value={customMakeValue}
                        onChange={(e) => {
                          const sanitized = sanitizeMake(e.target.value);
                          setValue('customMake', sanitized, { shouldValidate: true, shouldDirty: true });
                        }}
                        className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.customMake ? "border-rose-300" : "border-slate-200")}
                      />
                      {errors.customMake && <p className="text-xs text-rose-600 font-medium">{errors.customMake.message}</p>}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Model', 'الموديل')}</label>
                    <input type="hidden" {...register('model')} />
                    <Autocomplete
                      value={formData.model}
                      options={getModelOptions(resolvedMake)}
                      error={!!errors.model && validationAttempted}
                      disabled={!formData.make}
                      allowCustom={true}
                      customPlaceholder={t('Type to search or enter custom model...', 'ابحث او اكتب موديل أخر...')}
                      onChange={(value) => {
                        setValue('model', String(value), { shouldValidate: true, shouldDirty: true });
                      }}
                      onCustomInput={(input) => {
                        setValue('model', input.trim(), { shouldValidate: true, shouldDirty: true });
                      }}
                    />
                    {errors.model && validationAttempted && <p className="text-xs text-rose-600 font-medium">{errors.model.message}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {t('VIN', 'رقم الشاسيه')} 
                      <span className="text-[10px] font-normal text-slate-400 ml-1">({t('Optional', 'اختياري')})</span>
                    </label>
                    <input 
                      type="text" 
                      maxLength={17}
                      {...register('vin')} 
                      placeholder={t('e.g., 1HGBH41JXMN109186', 'مثلا: 1HGBH41JXMN109186')} 
                      className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none uppercase font-mono text-sm", errors.vin ? "border-rose-300 bg-rose-50/20" : "border-slate-200")} 
                    />
                    {errors.vin && <p className="text-xs text-rose-600 font-medium flex items-center gap-1"><AlertCircle size={12} />{errors.vin.message}</p>}
                    {!errors.vin && formData.vin && typeof formData.vin === 'string' && formData.vin.length > 0 && formData.vin.length < 17 && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {t('VIN must be exactly 17 characters', 'رقم الشاسيه يجب ان يكون 17 حرف بالضبط')}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {t('Plate Number', 'رقم اللوحة')} 
                      <span className="text-[10px] font-normal text-slate-400 ml-1">({t('Optional', 'اختياري')})</span>
                    </label>
                    <input
                      type="text"
                      maxLength={7}
                      pattern="[A-Za-z]{1,3}[1-9][0-9]{0,3}"
                      placeholder={t('e.g., ABC1234', 'مثلا: ABC1234')}
                      {...register('plateNumber')}
                      className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none uppercase font-mono", errors.plateNumber ? "border-rose-300 bg-rose-50/20" : "border-slate-200")}
                    />
                    {errors.plateNumber && <p className="text-xs text-rose-600 font-medium flex items-center gap-1"><AlertCircle size={12} />{errors.plateNumber.message}</p>}
                    {!errors.plateNumber && !formData.plateNumber && (
                      <p className="text-xs text-slate-400">{t('Format: 1-3 letters + 1-4 digits', 'الصيغة: 1-3 حروف + 1-4 أرقام')}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Mileage', 'المسافة')}</label>
                    <input type="hidden" {...register('mileage')} />
                    <CustomSelect
                      value={Number(formData.mileage)}
                      options={mileageOptions}
                      placeholder={t('Select mileage range', 'اختر نطاق المسافة')}
                      className={errors.mileage && validationAttempted ? 'dropdown-error' : undefined}
                      onChange={(value) => setValue('mileage', Number(value), { shouldValidate: true, shouldDirty: true })}
                    />
                    {errors.mileage && validationAttempted && <p className="text-xs text-rose-600 font-medium flex items-center gap-1"><AlertCircle size={12} />{errors.mileage.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Color', 'اللون')}</label>
                    <input type="hidden" {...register('color')} />
                    <CustomSelect
                      value={formData.color}
                      options={colorOptions}
                      placeholder={t('Select vehicle color', 'اختر لون السيارة')}
                      className={errors.color && validationAttempted ? 'dropdown-error' : undefined}
                      onChange={(value) => setValue('color', String(value), { shouldValidate: true, shouldDirty: true })}
                    />
                    {errors.color && validationAttempted && <p className="text-xs text-rose-600 font-medium flex items-center gap-1"><AlertCircle size={12} />{errors.color.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Body Type', 'نوع الهيكل')}</label>
                    <input type="hidden" {...register('bodyType')} />
                    <CustomSelect
                      value={formData.bodyType}
                      options={bodyTypeOptions}
                      className={errors.bodyType && validationAttempted ? 'dropdown-error' : undefined}
                      onChange={(value) => setValue('bodyType', value as typeof formData.bodyType, { shouldValidate: true, shouldDirty: true })}
                    />
                    {errors.bodyType && validationAttempted && <p className="text-xs text-rose-600 font-medium flex items-center gap-1"><AlertCircle size={12} />{errors.bodyType.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Transmission', 'ناقل الحركة')}</label>
                    <input type="hidden" {...register('transmission')} />
                    <CustomSelect
                      value={formData.transmission}
                      options={transmissionOptions}
                      className={errors.transmission && validationAttempted ? 'dropdown-error' : undefined}
                      onChange={(value) => setValue('transmission', value as typeof formData.transmission, { shouldValidate: true, shouldDirty: true })}
                    />
                    {errors.transmission && validationAttempted && <p className="text-xs text-rose-600 font-medium flex items-center gap-1"><AlertCircle size={12} />{errors.transmission.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Fuel Type', 'نوع الوقود')}</label>
                    <input type="hidden" {...register('fuelType')} />
                    <CustomSelect
                      value={formData.fuelType}
                      options={fuelTypeOptions}
                      className={errors.fuelType && validationAttempted ? 'dropdown-error' : undefined}
                      onChange={(value) => setValue('fuelType', value as typeof formData.fuelType, { shouldValidate: true, shouldDirty: true })}
                    />
                    {errors.fuelType && validationAttempted && <p className="text-xs text-rose-600 font-medium flex items-center gap-1"><AlertCircle size={12} />{errors.fuelType.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Seats', 'عدد المقاعد')}</label>
                    <input type="hidden" {...register('seats')} />
                    <CustomSelect
                      value={Number(formData.seats)}
                      options={seatsOptions}
                      className={errors.seats && validationAttempted ? 'dropdown-error' : undefined}
                      onChange={(value) => setValue('seats', Number(value), { shouldValidate: true, shouldDirty: true })}
                    />
                    {errors.seats && validationAttempted && <p className="text-xs text-rose-600 font-medium flex items-center gap-1"><AlertCircle size={12} />{errors.seats.message}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Condition', 'الحالة')}</label>
                    <input type="hidden" {...register('condition')} />
                    <CustomSelect
                      value={formData.condition}
                      options={conditionOptions}
                      className={errors.condition && validationAttempted ? 'dropdown-error' : undefined}
                      onChange={(value) => setValue('condition', value as typeof formData.condition, { shouldValidate: true, shouldDirty: true })}
                    />
                    {errors.condition && validationAttempted && <p className="text-xs text-rose-600 font-medium flex items-center gap-1"><AlertCircle size={12} />{errors.condition.message}</p>}
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
                <div className={cn("bg-slate-50 border border-dashed rounded-2xl p-6 transition-colors", errors.images || imageUploadError ? "border-rose-300 bg-rose-50/10" : "border-slate-300")}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-slate-900">{t('Vehicle Photos', 'صور السيارة')}</h4>
                      <p className="text-xs text-slate-500">{t('Upload at least one clear image', 'ارفع صورة واضحة على الاقل')}</p>
                      {errors.images && <p className="text-xs text-rose-600 font-bold mt-1">{errors.images.message}</p>}
                      {imageUploadError && (
                        <p className="text-xs text-rose-600 font-bold mt-1 flex items-center gap-1">
                          <AlertCircle size={12} /> {imageUploadError}
                        </p>
                      )}
                    </div>
                    <label className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-800 transition",
                      isUploadingImages && "opacity-50 cursor-not-allowed"
                    )}>
                      {isUploadingImages ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          {t('Uploading...', 'جاري الرفع...')}
                        </>
                      ) : (
                        <>
                          <Camera size={16} />
                          {t('Add photos', 'اضف صور')}
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        className="hidden" 
                        onChange={(e) => handleImagesSelected(e.target.files)}
                        disabled={isUploadingImages}
                      />
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
                    placeholder={t('Describe your vehicle: condition, service history, modifications, reason for selling...', 'صف سيارتك: الحالة، تاريخ الصيانة، التعديلات، سبب البيع...')}
                    className={cn("w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none min-h-[200px] text-sm", errors.description && validationAttempted ? "border-rose-300 bg-rose-50/20" : "border-slate-200")}
                  />
                  {errors.description && validationAttempted && <p className="text-xs text-rose-600 font-medium flex items-center gap-1"><AlertCircle size={12} />{errors.description.message}</p>}
                  <p className="text-xs text-slate-400">{formData.description?.length || 0} / 2000 {t('characters', 'حرف')}</p>
                </div>
              </div>
            )}

            {/* STEP 3: PRICING & SALE TYPE */}
            {step === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{t('Pricing & Sale Type', 'السعر ونوع البيع')}</h2>
                  <p className="text-slate-500">{t('Choose how you want to sell your vehicle', 'اختر طريقة بيع سيارتك')}</p>
                </div>

                {/* Sale Type Toggle */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Sale Type', 'نوع البيع')}</label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className={cn(
                      "flex flex-col items-center justify-center p-5 rounded-xl border-2 cursor-pointer transition-all",
                      formData.saleType === 'fixed_price' ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-slate-200 hover:border-slate-300"
                    )}>
                      <input type="radio" value="fixed_price" {...register('saleType')} className="hidden" />
                      <Tag size={24} className="mb-2" />
                      <span className="text-sm font-bold">{t('Fixed Price', 'سعر ثابت')}</span>
                      <span className="text-xs text-slate-500 mt-1 text-center">{t('Sell at a set price', 'بيع بسعر محدد')}</span>
                    </label>
                    <label className={cn(
                      "flex flex-col items-center justify-center p-5 rounded-xl border-2 cursor-pointer transition-all",
                      formData.saleType === 'auction' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 hover:border-slate-300"
                    )}>
                      <input type="radio" value="auction" {...register('saleType')} className="hidden" />
                      <DollarSign size={24} className="mb-2" />
                      <span className="text-sm font-bold">{t('Auction', 'مزاد')}</span>
                      <span className="text-xs text-slate-500 mt-1 text-center">{t('Let buyers bid competitively', 'دع المشترين يتنافسون')}</span>
                    </label>
                  </div>
                </div>

                {/* Price (always shown) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {formData.saleType === 'auction' ? t('Reserve Price', 'سعر الحجز') : t('Asking Price', 'السعر المطلوب')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{isArabic ? 'ج م' : 'EGP'}</span>
                    <input 
                      type="number"
                      {...register('price')}
                      className={cn("w-full pl-12 pr-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none", errors.price ? "border-rose-300" : "border-slate-200")}
                    />
                  </div>
                  {errors.price && <p className="text-xs text-rose-600">{errors.price.message}</p>}
                  {formData.saleType === 'fixed_price' && (
                    <p className="text-xs text-slate-400">{t('Buyers will purchase at this exact price', 'المشترون سيشترون بهذا السعر بالضبط')}</p>
                  )}
                </div>

                {/* Auction-only fields */}
                {formData.saleType === 'auction' && (
                  <>
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
                      <p className="text-xs text-slate-400">{t('Duration starts when admin approves your listing', 'المدة تبدأ عند موافقة المسؤول على اعلانك')}</p>
                    </div>
                  </>
                )}

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
                  {formData.saleType === 'auction'
                    ? t('Your vehicle will be submitted for admin approval. Once approved, the auction will go live.', 'سيتم ارسال سيارتك للمراجعة وبعد الموافقة سيبدأ المزاد')
                    : t('Your vehicle will be submitted for admin approval. Once approved, it will be listed for sale.', 'سيتم ارسال سيارتك للمراجعة وبعد الموافقة سيتم عرضها للبيع')
                  }
                </p>
                <div className="bg-slate-50 rounded-2xl p-6 text-left max-w-sm mx-auto space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">{t('Vehicle', 'السيارة')}</span> <span className="font-bold">{formatNumber(Number(formData.year))} {resolvedMake || formData.make} {formData.model}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">{t('Sale Type', 'نوع البيع')}</span> <span className="font-bold">{formData.saleType === 'auction' ? t('Auction', 'مزاد') : t('Fixed Price', 'سعر ثابت')}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">{t('Price', 'السعر')}</span> <span className="font-bold">{formatCurrencyEGP(Number(formData.price))}</span></div>
                  {formData.saleType === 'auction' && (
                    <>
                      <div className="flex justify-between"><span className="text-slate-400">{t('Starting Bid', 'سعر البداية')}</span> <span className="font-bold">{formatCurrencyEGP(Number(formData.startingBid))}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">{t('Reserve', 'الحجز')}</span> <span className="font-bold">{formatCurrencyEGP(Number(formData.reservePrice))}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">{t('Duration', 'المدة')}</span> <span className="font-bold">{formatNumber(Number(formData.durationDays))} {t('Days', 'ايام')}</span></div>
                    </>
                  )}
                  <div className="flex justify-between"><span className="text-slate-400">{t('Status', 'الحالة')}</span> <span className="font-bold text-amber-600">{t('Pending Approval', 'في انتظار الموافقة')}</span></div>
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
