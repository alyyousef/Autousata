import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, MapPin, Loader2, AlertCircle, Clock, ShieldCheck } from 'lucide-react';
import { apiService } from '../services/api';
import { useNotifications } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';

const PaymentConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { addNotification } = useNotifications();
  const { t } = useLanguage();
  
  const [payment, setPayment] = useState<any>(null);
  const [vehicle, setVehicle] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      if (!id) {
        setError(t('No listing ID provided', 'مفيش رقم قائمة'));
        setIsLoading(false);
        return;
      }

      try {
        // Read stored payment data from sessionStorage (set by PaymentPage)
        const storedRaw = sessionStorage.getItem(`payment_${id}`);
        let storedPaymentId: string | null = null;
        let storedGatewayOrderId: string | null = null;
        let storedType: string | null = null;

        if (storedRaw) {
          try {
            const parsed = JSON.parse(storedRaw);
            storedPaymentId = parsed.paymentId || null;
            storedGatewayOrderId = parsed.gatewayOrderId || null;
            storedType = parsed.type || null;
          } catch {
            // Legacy format — storedRaw might be just the paymentId string
            storedPaymentId = storedRaw;
          }
        }

        // Determine purchase type from URL params or stored data
        const purchaseType = searchParams.get('type') || storedType || 'auction';

        // If Stripe redirected back with payment_intent, confirm first
        const stripePaymentIntent = searchParams.get('payment_intent');
        if (stripePaymentIntent && storedPaymentId) {
          try {
            await apiService.confirmPayment(storedPaymentId, storedGatewayOrderId || stripePaymentIntent);
          } catch (confirmErr) {
            console.warn('Post-redirect confirm failed (webhook may handle):', confirmErr);
          }
        }

        // Try fetching payment by stored paymentId first
        let response;
        if (storedPaymentId) {
          response = await apiService.getPaymentById(storedPaymentId);
        }

        // Fallback based on purchase type
        if (!response?.data?.payment) {
          if (purchaseType === 'direct') {
            // For direct purchases, look up by vehicle ID
            response = await apiService.getPaymentByVehicle(id);
          } else {
            // For auction purchases, look up by auction ID
            response = await apiService.getPaymentByAuction(id);
          }
        }

        if (response?.error) {
          setError(response.error);
          setIsLoading(false);
          return;
        }

        if (response?.data) {
          setPayment(response.data.payment);

          // Fetch vehicle details from the payment's vehicleId or auctionId
          const paymentData = response.data.payment;
          if (paymentData.vehicleId) {
            try {
              const vehicleRes = await apiService.getPublicVehicle(paymentData.vehicleId);
              if (vehicleRes.data) setVehicle(vehicleRes.data);
            } catch {
              // Vehicle details not available
            }
          }
          
          if (paymentData.status === 'completed') {
            addNotification(
              t('Payment confirmed successfully!', 'تم تأكيد الدفع بنجاح!'),
              'success'
            );
          }
        }

        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('Failed to load payment details', 'فشل تحميل تفاصيل الدفع'));
        setIsLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [id, searchParams, addNotification, t]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
          <Loader2 size={32} className="animate-spin mx-auto text-indigo-600 mb-4" />
          <p className="text-sm text-slate-600">{t('Loading payment details...', 'جاري تحميل تفاصيل الدفع...')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !payment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center max-w-md">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            {t('Confirmation Not Found', 'تأكيد الدفع مش موجود')}
          </h1>
          <p className="text-sm text-slate-600 mb-4">
            {error || t('We could not find this payment confirmation.', 'مش قادرين نلاقي تأكيد الدفع ده.')}
          </p>
          <Link
            to="/browse"
            className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700"
          >
            {t('Return to Browse', 'ارجع للتصفح')}
          </Link>
        </div>
      </div>
    );
  }

  const escrow = payment?.escrow;

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10">
          {/* Success Icon */}
          <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={36} strokeWidth={2.5} />
          </div>

          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900">
              {t('Payment Confirmed!', 'تم تأكيد الدفع!')}
            </h1>
            <p className="text-sm text-slate-600 mt-3 max-w-md mx-auto">
              {t(
                `You have successfully secured the ${vehicle?.year} ${vehicle?.make} ${vehicle?.model}.`,
                `تم تأكيد شراء ${vehicle?.year} ${vehicle?.make} ${vehicle?.model} بنجاح.`
              )}
            </p>
          </div>

          {/* Payment Details */}
          <div className="mt-8 space-y-4">
            {/* Amount Paid */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    {t('Amount Paid', 'المبلغ المدفوع')}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    EGP {payment.amountEGP.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{t('Payment ID', 'رقم الدفع')}</p>
                  <p className="text-xs font-mono text-slate-700 mt-1">
                    {payment.id.slice(0, 8)}...
                  </p>
                </div>
              </div>
            </div>

            {/* Escrow Status */}
            {escrow && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={20} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-indigo-900">
                      {t('Funds Held in Escrow', 'الأموال محفوظة في الضمان')}
                    </h3>
                    <p className="text-xs text-indigo-700 mt-1">
                      {t(
                        `Your payment of EGP ${escrow.commissionEGP ? 
                          (payment.amountEGP - escrow.commissionEGP).toLocaleString() : 
                          payment.amountEGP.toLocaleString()
                        } is securely held. The seller will receive EGP ${escrow.sellerPayoutEGP?.toLocaleString()} once you confirm vehicle receipt.`,
                        `دفعتك بمبلغ ${escrow.commissionEGP ? 
                          (payment.amountEGP - escrow.commissionEGP).toLocaleString() : 
                          payment.amountEGP.toLocaleString()
                        } جنيه محفوظة بأمان. البائع هيستلم ${escrow.sellerPayoutEGP?.toLocaleString()} جنيه بعد ما تأكد استلام العربية.`
                      )}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <div className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium">
                        {escrow.status.toUpperCase()}
                      </div>
                      <span className="text-indigo-600">
                        {t('Commission', 'العمولة')}: EGP {escrow.commissionEGP?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pickup Location */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-start gap-3">
                <MapPin size={20} className="text-slate-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {t('Pickup Location', 'مكان الاستلام')}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {vehicle?.location}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    {t(
                      'Our concierge team will contact you within 24 hours to schedule inspection and pickup.',
                      'فريق الكونسييرج هيتواصل معاك خلال 24 ساعة لتحديد موعد الفحص والاستلام.'
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6">
              <div className="flex items-start gap-3">
                <Clock size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-900">
                    {t('Next Steps', 'الخطوات التالية')}
                  </h3>
                  <ul className="text-xs text-amber-800 mt-2 space-y-1.5 list-disc list-inside">
                    <li>{t('Complete vehicle inspection with the seller', 'أكمل فحص العربية مع البائع')}</li>
                    <li>{t('Confirm vehicle receipt in your dashboard', 'أكد استلام العربية في لوحة التحكم')}</li>
                    <li>{t('Funds will be released to seller after confirmation', 'الأموال هتتحول للبائع بعد التأكيد')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              to="/profile"
              className="px-6 py-3 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors text-center"
            >
              {t('View My Dashboard', 'شوف لوحة التحكم')}
            </Link>
            <Link
              to={`/listing/${id}`}
              className="px-6 py-3 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors text-center"
            >
              {t('View Listing', 'شوف القائمة')}
            </Link>
          </div>

          {/* Support Link */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              {t('Questions?', 'عندك أسئلة؟')}{' '}
              <Link to="/help" className="text-indigo-600 hover:text-indigo-700 font-medium">
                {t('Contact Support', 'تواصل مع الدعم')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmationPage;
