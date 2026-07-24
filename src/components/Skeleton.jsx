import React from "react";

/**
 * A single pulsing placeholder block. Compose these to build skeleton
 * layouts that roughly match the shape of the real content underneath,
 * so the page doesn't visually "jump" once data arrives.
 */
export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-teal-light/70 ${className}`} />;
}

/** Skeleton matching ResultsDashboard's layout. */
export function ResultsSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-6 pt-14 pb-24">
      <Skeleton className="h-3 w-24 mb-3" />
      <Skeleton className="h-9 w-64 mb-3" />
      <Skeleton className="h-4 w-full max-w-2xl mb-1.5" />
      <Skeleton className="h-4 w-2/3 max-w-2xl mb-8" />

      <div className="card p-6 mb-8 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-7 w-24" />
        </div>
      </div>

      <Skeleton className="h-6 w-40 mb-4" />
      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card p-5 space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton matching Profile's session list rows only (Profile.jsx renders its own header above this). */
export function ProfileSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card px-5 py-4 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}