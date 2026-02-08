import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CreditCard, Lock, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { apiService } from '../services/api';
import { useStripe as useStripeContext } from '../contexts/StripeContext';
import { MOCK_AUCTIONS } from '../constants';

// Inner payment form component that uses Stripe hooks
const PaymentForm: React.FC<{
  auction: any;
  clientSecret: string;
  paymentId: string;
  breakdown: any;
}> = ({ auction, clientSecret, paymentId, breakdown }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Confirm the payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + `/#/payment/${auction.id}/confirmation`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Payment failed');
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm payment in backend
        const confirmResponse = await apiService.confirmPayment(paymentId);
        
        if (confirmResponse.error) {
          setErrorMessage(confirmResponse.error);
          setIsProcessing(false);
          return;
        }

        // Navigate to confirmation page
        navigate(`/payment/${auction.id}/confirmation`);
      } else {
        setErrorMessage('Payment processing incomplete');
        setIsProcessing(false);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Element - Stripe's universal payment UI*/}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <PaymentElement
          options={{
            layout: 'tabs',
            business: { name: 'Autousata' },
          }}
        />
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-800">
            <p className="font-semibold">Payment Failed</p>
            <p className="mt-1">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Payment Breakdown */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Payment Breakdown</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Winning Bid</span>
            <span className="font-medium text-slate-900">
              EGP {breakdown.bidAmount.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Platform Commission (5%)</span>
            <span className="font-medium text-slate-900">
              EGP {breakdown.platformCommission.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Payment Processing Fee</span>
            <span className="font-medium text-slate-900">
              EGP {breakdown.stripeFee.toLocaleString()}
            </span>
          </div>
          <div className="border-t border-slate-200 my-2 pt-2 flex justify-between">
            <span className="font-semibold text-slate-900">Total Amount</span>
            <span className="font-bold text-lg text-indigo-600">
              EGP {breakdown.totalAmount.toLocaleString()}
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4">
          Funds will be held in escrow until you confirm vehicle receipt
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full rounded-2xl bg-indigo-600 text-white py-3.5 text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <Lock size={18} />
            Pay EGP {breakdown.totalAmount.toLocaleString()}
          </>
        )}
      </button>

      <div className="text-center">
        <Link
          to={`/listing/${auction.id}`}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          Back to listing
        </Link>
      </div>
    </form>
  );
};

const PaymentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { stripe: stripeInstance, isLoading: stripeLoading } = useStripeContext();
  
  const auction = useMemo(() => MOCK_AUCTIONS.find(item => item.id === id), [id]);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializePayment = async () => {
      if (!auction) {
        setError('Auction not found');
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiService.createPaymentIntent(auction.id);

        if (response.error) {
          setError(response.error);
          setIsLoading(false);
          return;
        }

        if (response.data) {
          setClientSecret(response.data.clientSecret);
          setPaymentId(response.data.paymentId);
          setBreakdown(response.data.breakdown);
        }

        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize payment');
        setIsLoading(false);
      }
    };

    initializePayment();
  }, [auction]);

  // Loading state
  if (isLoading || stripeLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
          <Loader2 size={32} className="animate-spin mx-auto text-indigo-600 mb-4" />
          <p className="text-sm text-slate-600">Initializing secure payment...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !auction) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center max-w-md">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Payment Error</h1>
          <p className="text-sm text-slate-600 mb-4">
            {error || 'We could not find this auction.'}
          </p>
          <Link
            to="/browse"
            className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700"
          >
            Return to Browse
          </Link>
        </div>
      </div>
    );
  }

  // No client secret yet
  if (!clientSecret || !paymentId || !breakdown) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
          <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
          <p className="text-sm text-slate-600">Unable to create payment session</p>
        </div>
      </div>
    );
  }

  // Main payment page
  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Secure payment</p>
              <h1 className="text-2xl font-semibold text-slate-900">Complete your purchase</h1>
              <p className="text-sm text-slate-500 mt-1">
                {auction.vehicle.year} {auction.vehicle.make} {auction.vehicle.model}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Amount due</p>
              <p className="text-2xl font-bold text-slate-900">
                EGP {breakdown.totalAmount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 flex items-center gap-3 text-sm text-emerald-800 mb-6">
            <ShieldCheck size={18} className="text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-semibold">Secure Payment with Stripe</p>
              <p className="text-xs text-emerald-700 mt-1">
                Your payment information is encrypted and never stored on our servers
              </p>
            </div>
          </div>

          {/* Stripe Elements Form */}
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
                auction={auction}
                clientSecret={clientSecret}
                paymentId={paymentId}
                breakdown={breakdown}
              />
            </Elements>
          )}

          {/* Trust Badges */}
          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Lock size={14} />
              <span>256-bit SSL Encryption</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CreditCard size={14} />
              <span>PCI DSS Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
