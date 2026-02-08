import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronLeft,
  Clock,
  MapPin,
  ShieldCheck,
  Tag,
  Gavel,
  TrendingUp,
  Eye,
  Award,
  Zap,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { UserRole } from '../types';
import ImageLightbox from '../components/ImageLightbox';
import { apiService } from '../services/api';
import porsche911Image from '../../assests/carsPictures/porsche911.png';
import teslaModelSPlaidImage from '../../assests/carsPictures/teslaModelSPlaid.jpg';
import fordBroncoImage from '../../assests/carsPictures/fordBroncoF.jpg';

const DELISTED_STORAGE_KEY = 'AUTOUSATA:delistedListings';
const BID_STATE_KEY = 'AUTOUSATA:bidState';
const PAYMENT_NOTICE_KEY = 'AUTOUSATA:paymentNotice';
const PAYMENT_STATUS_KEY = 'AUTOUSATA:paymentStatus';

const ARABIC_LISTING_COPY: Record<
  string,
  { description: string; longDescription: string; location: string }
> = {
  'auc-1': {
    description: 'بورشه 911 لون طباشيري بداخلية نبيتي باقة سبورت كرونو',
    longDescription:
      'سيارة محافظ عليها بعناية بحالة ممتازة اداء قوي وتجهيزات فاخرة وتجربة قيادة مريحة مناسبة للمشترين الجادين',
    location: 'القاهرة مصر'
  },
  'auc-2': {
    description: 'تسلا موديل اس بلايد دفع رباعي شامل القيادة الذاتية حالة شبه جديدة',
    longDescription:
      'موديل بلايد ببطاريات قوية وتسارع عالي مقصورة نظيفة وتجهيزات حديثة مع حالة شبه جديدة',
    location: 'الجيزة مصر'
  },
  'auc-3': {
    description: 'فورد برونكو اصدار خاص باقة سكواتش اربعة ابواب لون ازرق كهربائي',
    longDescription:
      'اصدار محدود مع تجهيزات للطرق الوعرة وتجربة قيادة قوية مع عناية ممتازة بالمقصورة والهيكل',
    location: 'الاسكندرية مصر'
  }
};

const readDelistedIds = () => {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const raw = localStorage.getItem(DELISTED_STORAGE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set<string>();
  }
};

const updateDelistedIds = (ids: Set<string>) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DELISTED_STORAGE_KEY, JSON.stringify(Array.from(ids)));
};

const readBidState = (auctionId: string) => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BID_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, { currentBid: number; bidCount: number }>;
    return parsed?.[auctionId] ?? null;
  } catch {
    return null;
  }
};

const writeBidState = (auctionId: string, currentBid: number, bidCount: number) => {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(BID_STATE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, { currentBid: number; bidCount: number }>) : {};
    parsed[auctionId] = { currentBid, bidCount };
    localStorage.setItem(BID_STATE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore storage issues
  }
};

const readPaymentNotice = (auctionId: string) => {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(PAYMENT_NOTICE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return Boolean(parsed?.[auctionId]);
  } catch {
    return false;
  }
};

const writePaymentNotice = (auctionId: string) => {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(PAYMENT_NOTICE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    parsed[auctionId] = true;
    localStorage.setItem(PAYMENT_NOTICE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore storage issues
  }
};

const readPaymentStatus = (auctionId: string) => {
  if (typeof window === 'undefined') return 'unpaid' as const;
  try {
    const raw = localStorage.getItem(PAYMENT_STATUS_KEY);
    if (!raw) return 'unpaid' as const;
    const parsed = JSON.parse(raw) as Record<string, string>;
    return (parsed?.[auctionId] as 'paid' | 'unpaid') ?? 'unpaid';
  } catch {
    return 'unpaid' as const;
  }
};

const generateTimeStyles = (endTime: string, now: number) => {
  const end = new Date(endTime).getTime();
  const diff = end - now;
  const hours = diff / (1000 * 60 * 60);

  if (hours < 1) {
    return {
      iconText: 'text-rose-600',
      badgeBg: 'bg-rose-50 border-rose-200 text-rose-700',
    };
  }
  if (hours < 6) {
    return {
      iconText: 'text-amber-600',
      badgeBg: 'bg-amber-50 border-amber-200 text-amber-700',
    };
  }
  if (hours < 24) {
    return {
      iconText: 'text-emerald-600',
      badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    };
  }
  return {
    iconText: 'text-blue-600',
    badgeBg: 'bg-blue-50 border-blue-200 text-blue-700',
  };
};

const ListingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { t, isArabic, formatNumber, formatCurrencyEGP } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auction, setAuction] = useState<any | null>(null);
  const [delistedIds, setDelistedIds] = useState<Set<string>>(() => readDelistedIds());
  const [now, setNow] = useState(() => Date.now());
  const [isBidOpen, setIsBidOpen] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidError, setBidError] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [bidSuccess, setBidSuccess] = useState<number | null>(null);
  const [imageHover, setImageHover] = useState<number | null>(null);
  const [selectedSuggested, setSelectedSuggested] = useState<number | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingBidAmount, setPendingBidAmount] = useState<number | null>(null);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [currentBid, setCurrentBid] = useState<number | null>(null);
  const [currentBidCount, setCurrentBidCount] = useState<number | null>(null);
  const confettiPieces = useMemo(() => {
    if (bidSuccess === null) return [];
    const colors = ['#22c55e', '#38bdf8', '#f59e0b', '#ef4444', '#a78bfa', '#f97316', '#eab308'];
    return Array.from({ length: 360 }).map((_, idx) => {
      const width = 6 + Math.random() * 8;
      const height = 10 + Math.random() * 12;
      const drift = (Math.random() > 0.5 ? 1 : -1) * (90 + Math.random() * 260);
      const drop = 320 + Math.random() * 420;
      return {
        id: idx,
        left: `${Math.random() * 100}%`,
        top: `${-15 + Math.random() * 40}%`,
        delay: `${Math.random() * 950}ms`,
        duration: `${1400 + Math.random() * 1400}ms`,
        drift: `${drift}px`,
        drop: `${drop}px`,
        width: `${width}px`,
        height: `${height}px`,
        color: colors[Math.floor(Math.random() * colors.length)],
        radius: Math.random() > 0.5 ? '999px' : '2px',
      };
    });
  }, [bidSuccess]);

  const fallbackImages = useMemo(() => [porsche911Image, teslaModelSPlaidImage, fordBroncoImage], []);
  const arabicCopy = auction ? ARABIC_LISTING_COPY[auction.id] : undefined;

  const conditionLabel = (condition: string) => {
    const key = condition.toLowerCase();
    if (key === 'mint') return t('Mint', 'ممتازة جدا');
    if (key === 'excellent') return t('Excellent', 'ممتازة');
    if (key === 'good') return t('Good', 'جيدة');
    if (key === 'fair') return t('Fair', 'مقبولة');
    if (key === 'poor') return t('Poor', 'ضعيفة');
    return condition;
  };

  const formatTimeRemaining = (endTime: string) => {
    const end = new Date(endTime).getTime();
    const diff = end - now;
    if (diff <= 0) return t('Ended', 'انتهى');
    const totalSeconds = Math.max(0, Math.floor(diff / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return isArabic
        ? `${formatNumber(days)} يوم ${formatNumber(hours)} ساعة ${formatNumber(minutes)} دقيقة`
        : `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return isArabic
        ? `${formatNumber(hours)} ساعة ${formatNumber(minutes)} دقيقة ${formatNumber(seconds)} ثانية`
        : `${hours}h ${minutes}m ${seconds}s`;
    }
    return isArabic
      ? `${formatNumber(minutes)} دقيقة ${formatNumber(seconds)} ثانية`
      : `${minutes}m ${seconds}s`;
  };

  const canManageListings =
    user?.role === UserRole.SELLER || user?.role === UserRole.ADMIN || user?.role === UserRole.DEALER;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchAuction = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const auctionResponse = await apiService.getAuctionById(id);

        if (auctionResponse.error) {
          setError(auctionResponse.error);
          return;
        }

        if (!auctionResponse.data) {
          setError('Auction not found.');
          return;
        }

        const raw = auctionResponse.data;
        const vehicle = raw.vehicleId || {};
        const images = Array.isArray(vehicle.images) && vehicle.images.length > 0 ? vehicle.images : fallbackImages;

        const mapped = {
          id: raw._id,
          vehicle: {
            ...vehicle,
            images,
            description: vehicle.description || '',
            longDescription: vehicle.description || ''
          },
          sellerId: raw.sellerId,
          currentBid: raw.currentBid || 0,
          startingBid: raw.startPrice || 0,
          reservePrice: raw.reservePrice || 0,
          bidCount: raw.bidCount || 0,
          endTime: raw.endTime,
          status: raw.status,
          minBidIncrement: raw.minBidIncrement || 50
        };

        if (isMounted) {
          setAuction(mapped);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load auction.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAuction();

    return () => {
      isMounted = false;
    };
  }, [fallbackImages, id, t]);

  useEffect(() => {
    if (!auction) return;
    const stored = readBidState(auction.id);
    setCurrentBid(stored?.currentBid ?? auction.currentBid);
    setCurrentBidCount(stored?.bidCount ?? auction.bidCount);
  }, [auction]);

  useEffect(() => {
    if (!auction) return;
    const endTime = new Date(auction.endTime).getTime();
    if (now < endTime) return;
    if (readPaymentStatus(auction.id) === 'paid') return;
    if (readPaymentNotice(auction.id)) return;
    addNotification(
      t(
        `Auction ended. Please complete payment for ${auction.vehicle.year} ${auction.vehicle.make} ${auction.vehicle.model}.`,
        `انتهى المزاد يرجى اكمال الدفع لسيارة ${auction.vehicle.year} ${auction.vehicle.make} ${auction.vehicle.model}`
      ),
      'warn'
    );
    writePaymentNotice(auction.id);
  }, [addNotification, auction, now]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
        <div className="text-slate-600 text-sm">Loading auction...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/90 backdrop-blur-sm rounded-3xl p-10 text-center shadow-2xl shadow-slate-200/50 border border-white/40">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <Zap className="w-10 h-10 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Auction Unavailable</h1>
          <p className="text-slate-600 mb-8 leading-relaxed">{error}</p>
          <Link
            to="/auctions"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40"
          >
            <ChevronLeft size={18} />
            Back to Auctions
          </Link>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/90 backdrop-blur-sm rounded-3xl p-10 text-center shadow-2xl shadow-slate-200/50 border border-white/40">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <Zap className="w-10 h-10 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">{t('Listing Not Found', 'الاعلان غير موجود')}</h1>
          <p className="text-slate-600 mb-8 leading-relaxed">
            {t('This vehicle may have been sold or is no longer available.', 'قد تكون السيارة بيعت او لم تعد متاحة')}
          </p>
          <Link
            to="/auctions"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40"
          >
            <ChevronLeft size={18} />
            {t('Discover More Listings', 'اكتشف اعلانات اخرى')}
          </Link>
        </div>
      </div>
    );
  }

  const isDelisted = delistedIds.has(auction.id);
  const timeStyles = generateTimeStyles(auction.endTime, now);
  const effectiveBid = currentBid ?? auction.currentBid;
  const effectiveBidCount = currentBidCount ?? auction.bidCount;
  const isEnded = new Date(auction.endTime).getTime() <= now;
  const paymentStatus = readPaymentStatus(auction.id);
  const descriptionText = t(
    auction.vehicle.description,
    arabicCopy?.description ?? auction.vehicle.description
  );
  const longDescriptionText = t(
    auction.vehicle.longDescription ||
      'This vehicle has been carefully maintained and is presented in excellent condition. It offers a strong performance package, a clean interior, and a smooth driving experience, making it a standout choice for serious buyers.',
    arabicCopy?.longDescription ||
      'سيارة محافظ عليها بعناية بحالة ممتازة اداء قوي وتجهيزات فاخرة وتجربة قيادة مريحة مناسبة للمشترين الجادين'
  );
  const locationText = t(auction.vehicle.location, arabicCopy?.location ?? auction.vehicle.location);

  const handleDelist = () => {
    const confirmed = window.confirm(
      t('Delist this vehicle from active listings?', 'هل تريد ازالة هذه السيارة من الاعلانات النشطة')
    );
    if (!confirmed) return;
    setDelistedIds((prev) => {
      const next = new Set<string>(prev);
      next.add(auction.id);
      updateDelistedIds(next);
      return next;
    });
  };

  const handleRestore = () => {
    setDelistedIds((prev) => {
      const next = new Set<string>(prev);
      next.delete(auction.id);
      updateDelistedIds(next);
      return next;
    });
  };

  const handleBidSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(bidAmount);
    if (new Date(auction.endTime).getTime() <= Date.now()) {
      setBidError(t('Bidding has ended for this auction.', 'انتهت المزايدة لهذا المزاد'));
      return;
    }
    const maxAllowed = effectiveBid * 3;
    if (!amount || Number.isNaN(amount)) {
      setBidError(t('Enter a valid bid amount.', 'ادخل قيمة مزايدة صحيحة'));
      return;
    }
    const minAllowed = effectiveBid + (auction.minBidIncrement || 50);
    if (amount < minAllowed) {
      setBidError(t(`Minimum bid is EGP ${formatNumber(minAllowed)}.`, `الحد الادنى ${formatCurrencyEGP(minAllowed)}`));
      return;
    }
    if (amount > maxAllowed) {
      setBidError(
        t(
          `Max bid is EGP ${formatNumber(maxAllowed)} (3x current bid).`,
          `الحد الاقصى ${formatCurrencyEGP(maxAllowed)} ثلاثة اضعاف السعر الحالي`
        )
      );
      return;
    }
    setBidError('');
    setPendingBidAmount(amount);
    setIsConfirmOpen(true);
  };

  const handleConfirmBid = async () => {
    if (pendingBidAmount === null) return;
    try {
      const response = await apiService.placeBid(auction.id, pendingBidAmount);
      if (response.error) {
        setBidError(response.error);
        return;
      }
      setIsConfirmOpen(false);
      setIsBidOpen(false);
      setBidAmount('');
      setCurrentBid(pendingBidAmount);
      setCurrentBidCount((prev) => {
        const next = (prev ?? auction.bidCount) + 1;
        writeBidState(auction.id, pendingBidAmount, next);
        return next;
      });
      setBidSuccess(pendingBidAmount);
      setPendingBidAmount(null);
      setAuction((prev: any) => prev ? {
        ...prev,
        currentBid: pendingBidAmount,
        bidCount: prev.bidCount + 1
      } : prev);
      addNotification(
        t(
          `Your bidding on the ${auction.vehicle.year} ${auction.vehicle.make} ${auction.vehicle.model} is completed at EGP ${formatNumber(pendingBidAmount)}.`,
          `تم تسجيل مزايدتك على ${auction.vehicle.year} ${auction.vehicle.make} ${auction.vehicle.model} بقيمة ${formatCurrencyEGP(pendingBidAmount)}`
        ),
        'success'
      );
      window.setTimeout(() => setBidSuccess(null), 4200);
    } catch (err) {
      setBidError(t('Failed to place bid. Please try again.', 'فشل تقديم المزايدة، حاول مرة اخرى'));
    }
  };

  const handleCancelConfirm = () => {
    setIsConfirmOpen(false);
    setPendingBidAmount(null);
  };

  const suggestedBids = [effectiveBid * 1.1, effectiveBid * 1.25, effectiveBid * 1.5].map((amt) =>
    Math.ceil(amt / 100) * 100
  );

  return (
    <>
      {/* Background Gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 -z-10 listing-detail-bg" />

      <div className="min-h-screen pb-24 listing-detail-page">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 listing-detail-topbar">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link to="/auctions" className="group flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
                <div className="p-1.5 rounded-xl bg-white border border-slate-200 group-hover:border-slate-300 group-hover:shadow-sm transition-all">
                  <ChevronLeft size={16} />
                </div>
                <span className="font-medium">{t('Back to Browse', 'العودة للتصفح')}</span>
              </Link>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100 text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                  <Eye size={12} />
                  {formatNumber(Math.floor(Math.random() * 100) + 50)} {t('watching', 'مشاهد')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Images */}
            <div className="lg:col-span-2 space-y-6">
              {/* Main Image */}
              <div className="relative rounded-3xl overflow-hidden border border-white/40 bg-gradient-to-br from-white to-slate-50 shadow-2xl shadow-slate-200/50 group">
                {auction.vehicle.images?.length ? (
                  <img
                    src={auction.vehicle.images[0]}
                    alt={`${auction.vehicle.year} ${auction.vehicle.make} ${auction.vehicle.model}`}
                    className="w-full h-[500px] object-cover cursor-zoom-in transition-transform duration-700 group-hover:scale-105"
                    onClick={() => setLightboxIndex(0)}
                  />
                ) : (
                  <div className="w-full h-[500px] bg-slate-100 flex items-center justify-center text-slate-400">
                    No Image
                  </div>
                )}
                <div className="absolute top-5 left-5 flex flex-col gap-2">
                  <span
                    className={`px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider shadow-lg ${
                      isDelisted
                        ? 'bg-rose-600 text-white border border-rose-500/60'
                        : 'bg-emerald-600 text-white border border-emerald-500/60'
                    }`}
                  >
                    {isDelisted ? t('Delisted', 'تم ازالة الاعلان') : t('Live Auction', 'مزاد مباشر')}
                  </span>
                  <span className="px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider shadow-lg bg-blue-600 text-white border border-blue-500/60">
                    {conditionLabel(auction.vehicle.condition)}
                  </span>
                </div>
                <div className="absolute bottom-5 right-5">
                  <button
                    onClick={() => setLightboxIndex(0)}
                    disabled={!auction.vehicle.images?.length}
                    className="px-4 py-2.5 rounded-xl backdrop-blur-md bg-white/95 border border-white/70 text-slate-800 text-sm font-semibold hover:bg-white transition-all duration-300 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-slate-300/50"
                  >
                    {t('View All Photos', 'عرض كل الصور')}
                  </button>
                </div>
              </div>

              {/* Thumbnail Grid */}
              <div className="grid grid-cols-4 gap-4">
                {auction.vehicle.images.slice(0, 4).map((image: string, index: number) => (
                  <div
                    key={index}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-300 cursor-pointer ${
                      imageHover === index ? 'border-blue-500 shadow-lg shadow-blue-500/20 transform scale-105' : 'border-white hover:border-slate-200'
                    }`}
                    onMouseEnter={() => setImageHover(index)}
                    onMouseLeave={() => setImageHover(null)}
                    onClick={() => setLightboxIndex(index)}
                  >
                    <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200">
                      <img src={image} alt="" className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" />
                    </div>
                    {imageHover === index && <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Details & Bidding */}
            <div className="space-y-6">
              {/* Vehicle Title & Badges */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-sm font-semibold text-blue-700">
                    {auction.vehicle.year}
                  </span>
                  <div className="flex items-center gap-2 text-slate-600 text-sm">
                    <MapPin size={14} />
                    {locationText}
                  </div>
                </div>

                <h1 className="text-3xl font-bold text-slate-900 leading-tight">
                  {auction.vehicle.year} {auction.vehicle.make} {auction.vehicle.model}
                </h1>
                <p className="text-slate-600 leading-relaxed">{descriptionText}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl p-5 border border-slate-200/60 shadow-sm listing-detail-stat-card">
                  <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                    <TrendingUp size={14} />
                    <span>{t('Current Bid', 'السعر الحالي')}</span>
                  </div>
                  <div className="text-2xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text">
                    {formatCurrencyEGP(effectiveBid)}
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    {formatNumber(effectiveBidCount)} {t('bids placed', 'مزايدات')}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl p-5 border border-slate-200/60 shadow-sm listing-detail-stat-card">
                  <div className="text-slate-500 text-sm mb-1">{t('Mileage', 'المسافة')}</div>
                  <div className="text-2xl font-bold text-slate-900">
                    {formatNumber(auction.vehicle.mileage)}
                    <span className="text-sm font-normal text-slate-500 ml-1">{t('mi', 'ميل')}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">{t('Low mileage', 'مسافة قليلة')}</div>
                </div>
              </div>

              {/* Unified Time + Verification + Bid (with subtle glow, no blur spam) */}
              <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden listing-detail-bid-card">
                {/* Time */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Clock size={16} className={timeStyles.iconText} />
                    <span className="text-sm font-medium">{t('Time Remaining', 'الوقت المتبقي')}</span>
                  </div>
                  <span
                    className={[
                      'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold border',
                      timeStyles.badgeBg,
                    ].join(' ')}
                  >
                    {formatTimeRemaining(auction.endTime)}
                  </span>
                </div>

                <div className="h-px bg-slate-200/70" />

                {/* Verification */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    <span className="text-sm font-medium text-slate-700">{t('Verified Listing', 'اعلان موثق')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award size={14} className="text-amber-600" />
                    <span className="text-xs text-slate-600">{t('Premium Seller', 'بائع مميز')}</span>
                  </div>
                </div>

                {/* CTA */}
                <div className="px-5 pb-5">
                  <button
                    onClick={() => setIsBidOpen(true)}
                    className={[
                      'w-full rounded-2xl px-6 py-4',
                      'bg-emerald-600 text-white',
                      'text-base font-semibold tracking-wide',
                      'shadow-lg shadow-emerald-600/20',
                      'ring-1 ring-emerald-600/25',
                      'hover:bg-emerald-700 hover:shadow-emerald-600/30 hover:ring-emerald-600/35',
                      'active:scale-[0.99]',
                      'transition-all duration-200',
                      'flex items-center justify-center gap-3',
                      'focus:outline-none focus:ring-4 focus:ring-emerald-500/20',
                    ].join(' ')}
                  >
                    <Gavel size={18} />
                    Place your bid
                    <span className="text-white/85 text-sm font-medium">(EGP {auction.currentBid.toLocaleString()}+)</span>
                  </button>

                  <p className="text-center text-slate-700 text-sm font-semibold mt-3">
                    Join {auction.bidCount} other bidders in this auction
                  </p>
                  {isEnded ? (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                        {t('Auction ended. Please complete payment to secure the vehicle.', 'انتهى المزاد يرجى اكمال الدفع لتاكيد السيارة')}
                      </div>
                      {paymentStatus === 'paid' ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                          {t('Payment confirmed. Our concierge will contact you for pickup.', 'تم تاكيد الدفع وسيتم التواصل معك لاستلام السيارة')}
                        </div>
                      ) : (
                        <Link
                          to={`/payment/${auction.id}`}
                          className="w-full rounded-2xl px-6 py-4 bg-indigo-600 text-white text-base font-semibold tracking-wide shadow-lg shadow-indigo-600/20 ring-1 ring-indigo-600/25 hover:bg-indigo-700 hover:shadow-indigo-600/30 hover:ring-indigo-600/35 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-3"
                        >
                          {t('Complete payment', 'اكمل الدفع')}
                          <span className="text-white/85 text-sm font-medium">
                            {isArabic ? formatCurrencyEGP(effectiveBid) : `(EGP ${formatNumber(effectiveBid)})`}
                          </span>
                        </Link>
                      )}
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsBidOpen(true)}
                        className={[
                          'w-full rounded-2xl px-6 py-4',
                          'bg-emerald-600 text-white',
                          'text-base font-semibold tracking-wide',
                          'shadow-lg shadow-emerald-600/20',
                          'ring-1 ring-emerald-600/25',
                          'hover:bg-emerald-700 hover:shadow-emerald-600/30 hover:ring-emerald-600/35',
                          'active:scale-[0.99]',
                          'transition-all duration-200',
                          'flex items-center justify-center gap-3',
                          'focus:outline-none focus:ring-4 focus:ring-emerald-500/20',
                        ].join(' ')}
                      >
                        <Gavel size={18} />
                        {t('Place your bid', 'قدم مزايدتك')}
                        <span className="text-white/85 text-sm font-medium">
                          {isArabic ? `${formatCurrencyEGP(effectiveBid)}` : `(EGP ${formatNumber(effectiveBid)}+)`}
                        </span>
                      </button>

                      <p className="text-center text-slate-700 text-sm font-semibold mt-3">
                        {t('Join', 'انضم')} {formatNumber(effectiveBidCount)} {t('other bidders in this auction', 'مزايد اخر في هذا المزاد')}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Additional Action Buttons */}
              {canManageListings && (
                <div className="flex gap-3">
                  <button
                    onClick={isDelisted ? handleRestore : handleDelist}
                    className={`flex-1 py-3.5 px-4 rounded-2xl text-sm font-semibold transition-all ${
                      isDelisted
                        ? 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 text-emerald-700 hover:from-emerald-100 hover:to-green-100 hover:shadow-md'
                        : 'bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 text-rose-700 hover:from-rose-100 hover:to-pink-100 hover:shadow-md'
                    }`}
                  >
                    {isDelisted ? t('Restore Listing', 'استرجاع الاعلان') : t('Delist Listing', 'ازالة الاعلان')}
                  </button>
                  <button className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 text-slate-700 text-sm font-semibold hover:from-slate-100 hover:to-slate-200 hover:shadow-md transition-all">
                    {t('Save', 'حفظ')}
                  </button>
                </div>
              )}

              {/* Detailed Description */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/70 shadow-sm listing-detail-desc-card">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Tag size={16} className="text-emerald-500" />
                    {t('Detailed Description', 'الوصف التفصيلي')}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDescriptionOpen(true)}
                    className="px-4 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    {t('View', 'عرض')}
                  </button>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                  {longDescriptionText}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bid Modal */}
        {isBidOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in">
            <div
              className="absolute inset-0 bg-gradient-to-br from-slate-900/60 to-slate-950/80 backdrop-blur-lg"
              onClick={() => setIsBidOpen(false)}
            />

            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl shadow-slate-950/30 border border-white/20 overflow-hidden animate-slide-up">
              {/* Modal Header */}
              <div className="relative p-8 pb-0">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500" />
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{t('Place Your Bid', 'قدم مزايدتك')}</h2>
                    <p className="text-slate-600 mt-2">{t('Enter your offer for this premium vehicle', 'اكتب قيمة المزايدة للسيارة المميزة')}</p>
                  </div>
                  <button
                    onClick={() => setIsBidOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                    aria-label={t('Close', 'اغلاق')}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Current Bid Display */}
                <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-2xl p-6 mb-6 border border-slate-200">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-sm text-slate-500 mb-1">{t('Current Bid', 'السعر الحالي')}</div>
                      <div className="text-2xl font-bold text-blue-600">{formatCurrencyEGP(effectiveBid)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500 mb-1">{t('Maximum Bid', 'الحد الاقصى')}</div>
                      <div className="text-lg font-bold text-slate-900">{formatCurrencyEGP(effectiveBid * 3)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bid Form */}
              <div className="p-8 pt-0">
                {bidError && (
                  <div className="mb-6 rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 p-4 text-sm text-rose-700">
                    {bidError}
                  </div>
                )}

                <form onSubmit={handleBidSubmit}>
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      {t('Your Bid Amount', 'قيمة المزايدة')} {isArabic ? '' : '(EGP)'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500">{isArabic ? 'ج م' : 'EGP'}</span>
                      <input
                        type="number"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        min={effectiveBid + (auction.minBidIncrement || 50)}
                        max={effectiveBid * 3}
                        className="w-full pl-12 pr-4 py-4 text-lg font-semibold rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none"
                        placeholder={`${formatNumber(effectiveBid)}`}
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2 mt-4">
                      {suggestedBids.map((suggested, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setBidAmount(suggested.toString());
                            setSelectedSuggested(suggested);
                          }}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                            selectedSuggested === suggested
                              ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300'
                              : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                        >
                          {formatCurrencyEGP(suggested)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsBidOpen(false)}
                      className="flex-1 py-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors shadow-md shadow-rose-500/30"
                    >
                      {t('Cancel', 'الغاء')}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-4 rounded-full bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30"
                    >
                      {t('Submit Bid', 'ارسال المزايدة')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Bid Modal */}
        {isConfirmOpen && pendingBidAmount !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md" onClick={handleCancelConfirm} />
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-slate-950/30 border border-white/20 overflow-hidden animate-slide-up">
              <div className="relative p-8">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500" />
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{t('Confirm Your Bid', 'تاكيد المزايدة')}</h2>
                    <p className="text-slate-600 mt-2">
                      {t('Are you sure you want to bid', 'هل تريد تاكيد المزايدة')}{' '}
                      <span className="font-semibold text-slate-900">{formatCurrencyEGP(pendingBidAmount)}</span>{' '}
                      {t('This action cannot be undone', 'لا يمكن التراجع عن هذه الخطوة')}
                    </p>
                  </div>
                  <button
                    onClick={handleCancelConfirm}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                    aria-label={t('Close', 'اغلاق')}
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCancelConfirm}
                    className="flex-1 py-3.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
                  >
                    {t('Cancel', 'الغاء')}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmBid}
                    className="flex-1 py-3.5 rounded-full bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30"
                  >
                    {t('Confirm Bid', 'تاكيد المزايدة')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Description Modal */}
        {isDescriptionOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md" onClick={() => setIsDescriptionOpen(false)} />
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl shadow-slate-950/30 border border-white/20 overflow-hidden animate-slide-up">
              <div className="relative p-8">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500" />
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Tag size={16} className="text-emerald-500" />
                    {t('Full Description', 'الوصف الكامل')}
                  </div>
                  <button
                    onClick={() => setIsDescriptionOpen(false)}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                    aria-label={t('Close description', 'اغلاق الوصف')}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="max-h-[60vh] overflow-auto pr-2 text-sm text-slate-600 leading-relaxed space-y-4">
                  <p>
                    {longDescriptionText}
                  </p>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsDescriptionOpen(false)}
                    className="px-6 py-2.5 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Notification */}
        {bidSuccess !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md" />
            <div className="confetti-layer fixed inset-0 pointer-events-none overflow-hidden">
              {confettiPieces.map((piece) => (
                <span
                  key={`confetti-${piece.id}`}
                  className="confetti-piece confetti-spray"
                  style={{
                    left: piece.left,
                    top: piece.top,
                    width: piece.width,
                    height: piece.height,
                    borderRadius: piece.radius,
                    background: piece.color,
                    animationDelay: piece.delay,
                    animationDuration: piece.duration,
                    ['--confetti-drift' as string]: piece.drift,
                    ['--confetti-drop' as string]: piece.drop,
                  }}
                />
              ))}
            </div>
            <div className="relative bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-2xl p-6 shadow-2xl shadow-emerald-500/30 border border-emerald-400/30 min-w-[280px] max-w-md w-full animate-slide-up">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <CheckCircle2 size={28} className="text-white" />
                </div>
                <div>
                  <div className="text-lg font-bold">{t('Bid Placed Successfully', 'تمت المزايدة بنجاح')}</div>
                  <div className="text-sm opacity-90">
                    {t('Your bid is now live', 'تم تفعيل المزايدة')} {formatCurrencyEGP(bidSuccess)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Sticky Bid Bar */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/85 backdrop-blur-xl lg:hidden listing-detail-mobilebar">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <button
              onClick={() => setIsBidOpen(true)}
              className={[
                'w-full rounded-2xl px-5 py-3.5',
                'bg-emerald-600 text-white',
                'text-sm font-semibold',
                'shadow-lg shadow-emerald-600/20',
                'ring-1 ring-emerald-600/25',
                'hover:bg-emerald-700 hover:ring-emerald-600/35',
                'active:scale-[0.99]',
                'transition-all duration-200',
                'flex items-center justify-center gap-2',
                'focus:outline-none focus:ring-4 focus:ring-emerald-500/20',
              ].join(' ')}
            >
              <Gavel size={16} />
              {t('Place bid', 'قدم مزايدة')}
              <span className="text-white/85">{isArabic ? formatCurrencyEGP(effectiveBid) : `(EGP ${formatNumber(effectiveBid)}+)`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add custom animations to global CSS */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={auction.vehicle.images}
          startIndex={lightboxIndex}
          alt={`${auction.vehicle.year} ${auction.vehicle.make} ${auction.vehicle.model}`}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
};

export default ListingDetailPage;
