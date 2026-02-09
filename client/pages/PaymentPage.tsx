import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CreditCard, Lock, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { apiService } from '../services/api';
import { useStripe as useStripeContext } from '../contexts/StripeContext';
import { useLanguage } from '../contexts/LanguageContext';

// Inner payment form component that uses Stripe hooks
const PaymentForm: React.FC<{
  listingLabel: string;
  listingId: string;
  clientSecret: string;
  paymentId: string;
  breakdown: any;
  isDirect: boolean;
}> = ({ listingLabel, listingId, clientSecret, paymentId, breakdown, isDirect }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const priceLabel = isDirect ? (breakdown.vehiclePrice ?? breakdown.bidAmount) : breakdown.bidAmount;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // return_url must point to the server (not client) because hash routing
      // doesn't survive Stripe redirects. Server redirects back to client hash URL.
      const serverOrigin = 'http://localhost:5000';
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${serverOrigin}/payment-redirect?listingId=${listingId}&paymentId=${paymentId}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || t('Payment failed', 'فشل الدفع'));
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
        // Small delay to let Stripe propagate the status
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
          const confirmResponse = await apiService.confirmPayment(paymentId);
          if (confirmResponse.error) {
            console.warn('Confirm response error (webhook may handle):', confirmResponse.error);
          }
        } catch (confirmErr) {
          // Non-fatal — webhook will finalize the payment
          console.warn('confirmPayment call failed, webhook will handle:', confirmErr);
        }

        // Store paymentId so confirmation page can retrieve it
        sessionStorage.setItem(`payment_${listingId}`, paymentId);
        navigate(`/payment/${listingId}/confirmation`);
      } else if (paymentIntent && paymentIntent.status === 'requires_action') {
        // 3D Secure or other authentication — Stripe will redirect
        // After redirect, PaymentConfirmationPage handles confirmation
        setErrorMessage(t('Additional authentication required. You will be redirected.', 'مطلوب مصادقة إضافية. ستتم إعادة توجيهك.'));
        setIsProcessing(false);
      } else {
        setErrorMessage(t('Payment processing incomplete. Please try again.', 'معالجة الدفع غير مكتملة. حاول مرة أخرى.'));
        setIsProcessing(false);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t('An unexpected error occurred', 'حدث خطأ غير متوقع'));
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <PaymentElement
          options={{
            layout: 'tabs',
            business: { name: 'Autousata' },
          }}
        />
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-800">
            <p className="font-semibold">{t('Payment Failed', 'فشل الدفع')}</p>
            <p className="mt-1">{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">{t('Payment Breakdown', 'تفاصيل الدفع')}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">{isDirect ? t('Vehicle Price', 'سعر السيارة') : t('Winning Bid', 'المزايدة الفائزة')}</span>
            <span className="font-medium text-slate-900">
              EGP {priceLabel.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">{t('Platform Commission (5%)', 'عمولة المنصة (5%)')}</span>
            <span className="font-medium text-slate-900">
              EGP {breakdown.platformCommission.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">{t('Payment Processing Fee', 'رسوم معالجة الدفع')}</span>
            <span className="font-medium text-slate-900">
              EGP {breakdown.stripeFee.toLocaleString()}
            </span>
          </div>
          <div className="border-t border-slate-200 my-2 pt-2 flex justify-between">
            <span className="font-semibold text-slate-900">{t('Total Amount', 'المبلغ الإجمالي')}</span>
            <span className="font-bold text-lg text-indigo-600">
              EGP {breakdown.totalAmount.toLocaleString()}
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4">
          {isDirect
            ? t('Funds will be held in escrow until you confirm vehicle receipt', 'الأموال ستُحفظ في الضمان حتى تأكد استلام العربية')
            : t('Funds will be held in escrow until you confirm vehicle receipt', 'الأموال ستُحفظ في الضمان حتى تأكد استلام العربية')
          }
        </p>
      </div>

      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full rounded-2xl bg-indigo-600 text-white py-3.5 text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            {t('Processing Payment...', 'جاري معالجة الدفع...')}
          </>
        ) : (
          <>
            <Lock size={18} />
            {t('Pay', 'ادفع')} EGP {breakdown.totalAmount.toLocaleString()}
          </>
        )}
      </button>

      <div className="text-center">
        <Link
          to={`/listing/${listingId}`}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          {t('Back to listing', 'ارجع للقائمة')}
        </Link>
      </div>
    </form>
  );
};

const PaymentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { stripe: stripeInstance, isLoading: stripeLoading } = useStripeContext();
  const { t } = useLanguage();

  const isDirect = searchParams.get('type') === 'direct';

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [listingLabel, setListingLabel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializePayment = async () => {
      if (!id) {
        setError(t('Listing not found', 'الاعلان مش موجود'));
        setIsLoading(false);
        return;
      }

      try {
        let response;

        if (isDirect) {
          // Direct (fixed-price) purchase
          response = await apiService.createDirectPaymentIntent(id);
          if (response.data) {
            setListingLabel(response.data.vehicle?.title || '');
          }
        } else {
          // Auction-based purchase
          response = await apiService.createPaymentIntent(id);
          if (response.data) {
            setListingLabel(response.data.auction?.vehicle || '');
          }
        }

        if (response.error) {
          setError(response.error);
          setIsLoading(false);
          return;
        }

        if (response.data) {
          setClientSecret(response.data.clientSecret);
          setPaymentId(response.data.paymentId);
          setBreakdown(response.data.breakdown);
          // Store paymentId so confirmation page can retrieve it (survives Stripe redirects)
          sessionStorage.setItem(`payment_${id}`, response.data.paymentId);
        }

        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('Failed to initialize payment', 'فشل تهيئة الدفع'));
        setIsLoading(false);
      }
    };

    initializePayment();
  }, [id, isDirect]);

  if (isLoading || stripeLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
          <Loader2 size={32} className="animate-spin mx-auto text-indigo-600 mb-4" />
          <p className="text-sm text-slate-600">{t('Initializing secure payment...', 'جاري تهيئة الدفع الآمن...')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center max-w-md">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">{t('Payment Error', 'خطأ في الدفع')}</h1>
          <p className="text-sm text-slate-600 mb-4">{error}</p>
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

  if (!clientSecret || !paymentId || !breakdown) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
          <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
          <p className="text-sm text-slate-600">{t('Unable to create payment session', 'مش قادرين نعمل جلسة دفع')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{t('Secure payment', 'دفع آمن')}</p>
              <h1 className="text-2xl font-semibold text-slate-900">{t('Complete your purchase', 'كمل عملية الشراء')}</h1>
              {listingLabel && <p className="text-sm text-slate-500 mt-1">{listingLabel}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">{t('Amount due', 'المبلغ المستحق')}</p>
              <p className="text-2xl font-bold text-slate-900">
                EGP {breakdown.totalAmount.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 flex items-center gap-3 text-sm text-emerald-800 mb-6">
            <ShieldCheck size={18} className="text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-semibold">{t('Secure Payment with Stripe', 'دفع آمن مع Stripe')}</p>
              <p className="text-xs text-emerald-700 mt-1">
                {t('Your payment information is encrypted and never stored on our servers', 'معلومات الدفع مشفرة ومش بنخزنها على السيرفرات بتاعتنا')}
              </p>
            </div>
          </div>

          {stripeInstance && clientSecret && (
            <Elements
              stripe={stripeInstance}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#4f46e5',
                    colorBackground: '#ffffff',
                    colorText: '#1e293b',
                    colorDanger: '#ef4444',
                    fontFamily: 'system-ui, sans-serif',
                    borderRadius: '16px',
                  },
                },
              }}
            >
              <PaymentForm
                listingLabel={listingLabel}
                listingId={id!}
                clientSecret={clientSecret}
                paymentId={paymentId}
                breakdown={breakdown}
                isDirect={isDirect}
              />
            </Elements>
          )}

          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Lock size={14} />
              <span>{t('256-bit SSL Encryption', 'تشفير SSL 256-bit')}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CreditCard size={14} />
              <span>{t('PCI DSS Compliant', 'متوافق مع PCI DSS')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
