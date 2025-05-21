
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const ShowNotFound = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow px-6 md:px-8 lg:px-12 py-12">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Show not found</h1>
          <p className="text-muted-foreground mb-6">
            We couldn't find the show you're looking for.
          </p>
          <Link to="/shows" className="text-primary hover:underline flex items-center justify-center">
            <ArrowLeft size={16} className="mr-2" />
            Back to shows
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ShowNotFound;
