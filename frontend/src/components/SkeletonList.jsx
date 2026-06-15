import React from 'react';
import Skeleton from './ui/Skeleton';

export default function SkeletonList() {
  return (
    <div className="flex flex-col gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-[#111726] border border-slate-100 dark:border-slate-800/80 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col gap-2 w-full max-w-md">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
