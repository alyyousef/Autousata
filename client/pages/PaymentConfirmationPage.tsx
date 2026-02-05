import React, { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, MapPin } from 'lucide-react';
import { MOCK_AUCTIONS } from '../constants';
import { useNotifications } from '../contexts/NotificationContext';

const PaymentConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { addNotification } = useNotifications();
  const auction = useMemo(() => MOCK_AUCTIONS.find(item => item.id === id), [id]);

  useEffect(() => {
    if (!auction) return;
    addNotification(
      `Payment confirmed. You can pick up your ${auction.vehicle.year} ${auction.vehicle.make} ${auction.vehicle.model} from ${auction.vehicle.location}.`,
      'success'
    );
  }, [addNotification, auction]);

  if (!auction) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Confirmation Not Found</h1>
          <p className="text-sm text-slate-600 mb-4">We could not find this payment confirmation.</p>
          <Link to="/browse" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            Return to Browse
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Payment confirmed</h1>
          <p className="text-sm text-slate-600 mt-2">
            You have successfully secured the {auction.vehicle.year} {auction.vehicle.make} {auction.vehicle.model}.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <MapPin size={16} className="text-indigo-500" />
              Pickup location
            </div>
            <p className="text-sm text-slate-600 mt-2">
              {auction.vehicle.location}. Our concierge team will reach out to schedule a pickup time.
            </p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              to={`/listing/${auction.id}`}
              className="px-5 py-2.5 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200"
            >
              View listing
            </Link>
            <Link
              to="/browse"
              className="px-5 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            >
              Browse more cars
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmationPage;
