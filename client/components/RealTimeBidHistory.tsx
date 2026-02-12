import React from 'react';
import { Clock, User } from 'lucide-react';

export interface RealTimeBid {
  id: string;
  bidderId: string;
  amount: number;
  timestamp: string;
  isYou?: boolean;
}

interface RealTimeBidHistoryProps {
  bids: RealTimeBid[];
  currentUserId?: string;
}

const RealTimeBidHistory: React.FC<RealTimeBidHistoryProps> = ({ bids, currentUserId }) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const sortedBids = [...bids].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Clock size={20} className="text-slate-600" />
          Live Bid History
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          {sortedBids.length} {sortedBids.length === 1 ? 'bid' : 'bids'} placed
        </p>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {sortedBids.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock size={28} className="text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No bids yet</p>
            <p className="text-sm text-slate-400 mt-1">Be the first to place a bid!</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sortedBids.map((bid, index) => {
              const isYou = bid.isYou || false;
              const isLatest = index === 0;

              return (
                <li
                  key={bid.id}
                  className={`px-6 py-4 transition-all duration-300 ${
                    isLatest ? 'bg-emerald-50 animate-pulse' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isYou ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <User size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${
                            isYou ? 'text-blue-600' : 'text-slate-900'
                          }`}>
                            {bid.bidderId}
                            {isYou && <span className="ml-1 text-xs text-blue-400">(you)</span>}
                          </span>
                          {isLatest && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                              Leading
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock size={12} />
                          {formatTime(bid.timestamp)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        isLatest ? 'text-emerald-600' : 'text-slate-900'
                      }`}>
                        EGP {bid.amount.toLocaleString()}
                      </p>
                      {index < sortedBids.length - 1 && (
                        <p className="text-xs text-slate-500">
                          +EGP {(bid.amount - sortedBids[index + 1].amount).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {sortedBids.length > 0 && (
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200">
          <p className="text-xs text-slate-500 text-center">
            Updates in real-time • Bidder names are anonymized for privacy
          </p>
        </div>
      )}
    </div>
  );
};

export default RealTimeBidHistory;
