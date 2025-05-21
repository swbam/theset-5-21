
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Skeleton } from '@/components/ui/skeleton';

const ArtistDetailSkeleton = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        {/* Header section skeleton */}
        <section className="relative bg-secondary/70 py-12 md:py-20">
          <div className="px-6 md:px-8 lg:px-12 relative z-10">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                <Skeleton className="w-36 h-36 md:w-48 md:h-48 rounded-xl" />
                <div className="space-y-4 flex-1 w-full">
                  <Skeleton className="h-10 w-3/4 max-w-md" />
                  <Skeleton className="h-5 w-1/3 max-w-xs" />
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Upcoming shows skeleton */}
        <section className="px-6 md:px-8 lg:px-12 py-12">
          <div className="max-w-7xl mx-auto">
            <Skeleton className="h-8 w-64 mb-6" />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="border border-border rounded-xl overflow-hidden">
                  <Skeleton className="w-full h-48" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-9 w-full rounded-md mt-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Past setlists skeleton */}
        <section className="px-6 md:px-8 lg:px-12 py-12 bg-secondary/20">
          <div className="max-w-7xl mx-auto">
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="space-y-4">
              {Array(2).fill(0).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-64" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <Skeleton className="h-9 w-24 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ArtistDetailSkeleton;
