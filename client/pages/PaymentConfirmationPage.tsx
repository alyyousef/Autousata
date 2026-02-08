import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, MapPin, Loader2, AlertCircle, Clock, ShieldCheck } from 'lucide-react';
import { apiService } from '../services/api';
import { useNotifications } from '../contexts/NotificationContext';
import { MOCK_AUCTIONS } from '../constants';

const PaymentConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { addNotification } = useNotifications();
  
  const [payment, setPayment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fallback to mock auction for vehicle details
  const mockAuction = MOCK_AUCTIONS.find(item => item.id === id);

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      if (!id) {
        setError('No auction ID provided');
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiService.getPaymentByAuction(id);

        if (response.error) {
          setError(response.error);
          setIsLoading(false);
          return;
        }

        if (response.data) {
          setPayment(response.data.payment);
          
          // Show success notification once
          if (response.data.payment.status === 'completed' && mockAuction) {
            addNotification(
              `Payment confirmed for ${mockAuction.vehicle.year} ${mockAuction.vehicle.make} ${mockAuction.vehicle.model}`,
              'success'
            );
          }
        }

        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payment details');
        setIsLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [id, addNotification, mockAuction]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
          <Loader2 size={32} className="animate-spin mx-auto text-indigo-600 mb-4" />
          <p className="text-sm text-slate-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !payment || !mockAuction) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center max-w-md">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Payment Not Found</h1>
          <p className="text-sm text-slate-600 mb-4">
            {error || 'We could not find this payment confirmation.'}
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

  const escrow = payment.escrow;
  const vehicle = mockAuction.vehicle;

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
            <h1 className="text-3xl font-bold text-slate-900">Payment Confirmed!</h1>
            <p className="text-sm text-slate-600 mt-3 max-w-md mx-auto">
              You have successfully secured the {vehicle.year} {vehicle.make} {vehicle.model}
            </p>
          </div>

          {/* Payment Details */}
          <div className="mt-8 space-y-4">
            {/* Amount Paid */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Amount Paid</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    EGP {payment.amountEGP.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Payment ID</p>
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
                    <h3 className="text-sm font-semibold text-indigo-900">Funds Held in Escrow</h3>
                    <p className="text-xs text-indigo-700 mt-1">
                      Your payment of <span className="font-semibold">EGP {escrow.commissionEGP ? 
                        (payment.amountEGP - escrow.commissionEGP).toLocaleString() : 
                        payment.amountEGP.toLocaleString()
                      }</span> is securely held. 
                      The seller will receive <span className="font-semibold">EGP {escrow.sellerPayoutEGP?.toLocaleString()}</span> once 
                      you confirm vehicle receipt.
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <div className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium">
                        {escrow.status.toUpperCase()}
                      </div>
                      <span className="text-indigo-600">
                        Commission: EGP {escrow.commissionEGP?.toLocaleString()}
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
                  <h3 className="text-sm font-semibold text-slate-900">Pickup Location</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {vehicle.location}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Our concierge team will contact you within 24 hours to schedule inspection and pickup.
                  </p>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6">
              <div className="flex items-start gap-3">
                <Clock size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-900">Next Steps</h3>
                  <ul className="text-xs text-amber-800 mt-2 space-y-1.5 list-disc list-inside">
                    <li>Complete vehicle inspection with the seller</li>
                    <li>Confirm vehicle receipt in your dashboard</li>
                    <li>Funds will be released to seller after confirmation</li>
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
              View My Dashboard
            </Link>
            <Link
              to={`/listing/${id}`}
              className="px-6 py-3 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors text-center"
            >
              View Listing
            </Link>
          </div>

          {/* Support Link */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              Questions? <Link to="/help" className="text-indigo-600 hover:text-indigo-700 font-medium">Contact Support</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmationPage;
