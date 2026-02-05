import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CreditCard, Lock, ShieldCheck } from 'lucide-react';
import { MOCK_AUCTIONS } from '../constants';

const BID_STATE_KEY = 'AUTOUSATA:bidState';
const PAYMENT_STATUS_KEY = 'AUTOUSATA:paymentStatus';

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

const writePaymentStatus = (auctionId: string, status: 'paid' | 'unpaid') => {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(PAYMENT_STATUS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    parsed[auctionId] = status;
    localStorage.setItem(PAYMENT_STATUS_KEY, JSON.stringify(parsed));
  } catch {
    // ignore storage issues
  }
};

const PaymentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auction = useMemo(() => MOCK_AUCTIONS.find(item => item.id === id), [id]);
  const bidState = auction ? readBidState(auction.id) : null;
  const amount = bidState?.currentBid ?? auction?.currentBid ?? 0;

  const [nameOnCard, setNameOnCard] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  if (!auction) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Payment Not Found</h1>
          <p className="text-sm text-slate-600 mb-4">We could not find this auction.</p>
          <Link to="/browse" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            Return to Browse
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    writePaymentStatus(auction.id, 'paid');
    navigate(`/payment/${auction.id}/confirmation`);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
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
              <p className="text-2xl font-bold text-slate-900">EGP {amount.toLocaleString()}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-center gap-3 text-sm text-slate-600 mb-6">
            <ShieldCheck size={18} className="text-emerald-500" />
            Stripe checkout is a placeholder here. Replace with Stripe Elements for production.
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700">Name on card</label>
              <input
                value={nameOnCard}
                onChange={(event) => setNameOnCard(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ali Youssef"
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Card number</label>
              <div className="mt-2 relative">
                <input
                  value={cardNumber}
                  onChange={(event) => setCardNumber(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="4242 4242 4242 4242"
                  required
                />
                <CreditCard size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">Expiry</label>
                <input
                  value={expiry}
                  onChange={(event) => setExpiry(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="MM/YY"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">CVC</label>
                <div className="mt-2 relative">
                  <input
                    value={cvc}
                    onChange={(event) => setCvc(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="123"
                    required
                  />
                  <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-2xl bg-indigo-600 text-white py-3.5 text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Pay EGP {amount.toLocaleString()}
            </button>
            <div className="text-center">
              <Link to={`/listing/${auction.id}`} className="text-xs text-slate-500 hover:text-slate-700">
                Back to listing
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
