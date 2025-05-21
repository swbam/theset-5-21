
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const ArtistNotFound = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow px-6 md:px-8 lg:px-12 py-12">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Artist not found or no upcoming shows</h1>
          <p className="text-muted-foreground mb-6">
            We couldn't find any upcoming shows for this artist.
          </p>
          <Link to="/search" className="text-primary hover:underline flex items-center justify-center">
            <ArrowLeft size={16} className="mr-2" />
            Back to search
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ArtistNotFound;
