import React, { useCallback, useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Calendar, Car, Gauge, Loader2, Wrench } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { apiService } from "../services/api";

interface GarageVehicle {
  id: string;
  make?: string;
  model?: string;
  year?: number;
  mileage?: number;
  price?: number;
  status?: string;
  saleType?: string;
  escrowStatus?: string;
  totalAmount?: number;
  sellerPayout?: number;
  images?: string[];
}

const parseImages = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw.filter(
      (url): url is string => typeof url === "string" && url.length > 0,
    );
  }
  if (typeof raw === "string" && raw.trim()) {
    const trimmed = raw.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (url): url is string => typeof url === "string" && url.length > 0,
          );
        }
      } catch {
        return [];
      }
    }
    return trimmed
      .split(",")
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
  }
  return [];
};

const MyGaragePage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { t, formatCurrencyEGP, formatNumber } = useLanguage();
  const [vehicles, setVehicles] = useState<GarageVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGarage = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getMyGarage();
      if (response.error) {
        setError(response.error);
        setVehicles([]);
        return;
      }
      const data = response.data?.data || [];
      const normalized = data.map((item: any, index: number) => ({
        id: String(item._id || item.id || index),
        make: item.make,
        model: item.model,
        year: Number(item.year) || undefined,
        mileage:
          Number(item.milage || item.mileage || item.mileage_km) || undefined,
        price: Number(item.price || item.price_egp) || undefined,
        status: item.status,
        saleType: item.sale_type,
        escrowStatus: item.escrow_status,
        totalAmount: Number(item.total_amount_egp) || undefined,
        sellerPayout: Number(item.seller_payout_egp) || undefined,
        images: parseImages(item.images),
      }));
      setVehicles(normalized);
    } catch {
      setError("Failed to load garage");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGarage();
  }, [fetchGarage]);

  if (authLoading) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center text-slate-500 text-sm">
        {t("Loading your garage...", "جار تحميل الجراج الخاص بك...")}
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500 font-semibold mb-2">
            {t("My Garage", "جراج العربيات")}
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
            {t("Keep every vehicle organized", "نظم كل عربية في مكان واحد")}
          </h1>
          <p className="text-slate-500 mt-2 max-w-2xl">
            {t(
              "Track mileage, service reminders, and quickly launch auctions from your private garage.",
              "تابع العداد، مواعيد الصيانة، واطلق مزاد جديد بسرعة من الجراج الخاص بيك.",
            )}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {t("Saved vehicles", "العربيات المحفوظة")}
              </h2>
              <p className="text-sm text-slate-500">
                {t(
                  "Track purchases and pending deliveries.",
                  "تابع العربيات اللي اشتريتها او في الطريق ليك.",
                )}
              </p>
            </div>
            {/* <Link
to="/sell"
className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-5 py-3 text-sm font-semibold"
>
<Car size={18} />
{t('Create auction', 'ابدأ مزاد')}
</Link> */}
          </div>

          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="animate-spin text-slate-400" size={28} />
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <p className="text-sm text-rose-500 font-semibold">{error}</p>
              <button
                type="button"
                onClick={fetchGarage}
                className="mt-4 text-sm font-semibold text-slate-900"
              >
                {t("Try again", "حاول تاني")}
              </button>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="py-16 text-center">
              <Car size={40} className="mx-auto text-slate-400" />
              <p className="mt-4 text-lg font-semibold text-slate-900">
                {t("No saved vehicles yet", "مافيش عربيات محفوظة لسه")}
              </p>
              <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
                {t(
                  "Win an auction or buy directly to start building your personal garage.",
                  "اكسب مزاد او اشتري مباشرة عشان تضيف عربيتك للجراج.",
                )}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="border border-slate-100 rounded-2xl p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-400 font-semibold mb-1">
                      {vehicle.id.slice(-6).toUpperCase()}
                    </p>
                    <h3 className="text-xl font-semibold text-slate-900">
                      {[vehicle.year, vehicle.make, vehicle.model]
                        .filter(Boolean)
                        .join(" ") || t("Vehicle", "عربية")}
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                      {typeof vehicle.mileage === "number" &&
                        !Number.isNaN(vehicle.mileage) && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                            <Gauge size={14} />
                            {formatNumber(vehicle.mileage)} km
                          </span>
                        )}
                      {vehicle.status && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700">
                          <Calendar size={14} />
                          {vehicle.status}
                        </span>
                      )}
                      {vehicle.escrowStatus && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700">
                          <Wrench size={14} />
                          {vehicle.escrowStatus}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 text-sm min-w-[220px]">
                    {typeof vehicle.price === "number" &&
                      !Number.isNaN(vehicle.price) && (
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                            {t("Purchase Price", "سعر الشراء")}
                          </p>
                          <p className="text-lg font-semibold text-slate-900">
                            {formatCurrencyEGP(vehicle.price)}
                          </p>
                        </div>
                      )}
                    {typeof vehicle.sellerPayout === "number" &&
                      !Number.isNaN(vehicle.sellerPayout) && (
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                            {t("Seller Payout", "صافي البائع")}
                          </p>
                          <p className="text-lg font-semibold text-slate-900">
                            {formatCurrencyEGP(vehicle.sellerPayout)}
                          </p>
                        </div>
                      )}
                    <Link
                      to={`/my-garage/${vehicle.id}`}
                      className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                    >
                      {t("View details", "عرض التفاصيل")}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyGaragePage;
