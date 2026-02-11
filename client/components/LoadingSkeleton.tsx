import React from 'react';

interface SkeletonProps {
  className?: string;
}

/**
 * Basic skeleton loader component
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

/**
 * Card skeleton for vehicle/auction listings
 */
export const CardSkeleton: React.FC = () => (
  <div className="bg-white/95 border border-slate-200 rounded-2xl overflow-hidden">
    <Skeleton className="h-48 w-full" />
    <div className="p-5 space-y-3">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex justify-between items-center mt-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  </div>
);

/**
 * Table row skeleton
 */
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 4 }) => (
  <tr>
    {Array.from({ length: columns }).map((_, idx) => (
      <td key={idx} className="px-8 py-6">
        <Skeleton className="h-4 w-full" />
      </td>
    ))}
  </tr>
);

/**
 * Stats card skeleton
 */
export const StatsCardSkeleton: React.FC = () => (
  <div className="bg-white/95 rounded-3xl p-6 shadow-sm border border-slate-200">
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-10 w-10 rounded-xl" />
    </div>
    <Skeleton className="h-3 w-24 mb-2" />
    <Skeleton className="h-8 w-32" />
  </div>
);

/**
 * Grid of card skeletons
 */
export const CardGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: count }).map((_, idx) => (
      <CardSkeleton key={idx} />
    ))}
  </div>
);

/**
 * Profile skeleton
 */
export const ProfileSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-4">
      <Skeleton className="h-20 w-20 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
    </div>
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  </div>
);

export default Skeleton;
