import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/home/Hero';
import TrendingShows from '@/components/home/TrendingShows';
import FeaturedArtists from '@/components/home/FeaturedArtists';
import UpcomingShows from '@/components/home/UpcomingShows';
import HowItWorks from '@/components/home/HowItWorks';
import PersonalizedRecommendations from '@/components/home/PersonalizedRecommendations';
import { useDocumentTitle } from '@/hooks/use-document-title';

const Index = () => {
  // Set document title for homepage
  useDocumentTitle('', 'Join TheSet to vote on setlists for upcoming concerts and influence what your favorite artists will play live.');
  
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar showSearch={false} />
      
      <main className="flex-grow">
        <Hero />
        <PersonalizedRecommendations />
        <TrendingShows />
        <FeaturedArtists />
        <UpcomingShows />
        <HowItWorks />
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
