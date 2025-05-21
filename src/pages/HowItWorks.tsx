
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Music, Calendar, Check } from 'lucide-react';

const HowItWorks = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow px-6 md:px-8 lg:px-12 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">How TheSet Works</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              TheSet lets fans shape concert setlists through collaborative voting
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-20">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <Music className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Find Artists</h2>
              <p className="text-muted-foreground">
                Search for your favorite artists and discover their upcoming concerts and shows
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Vote on Setlists</h2>
              <p className="text-muted-foreground">
                Browse through upcoming shows and vote on songs you want to hear played
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Enjoy the Show</h2>
              <p className="text-muted-foreground">
                Experience concerts with setlists influenced by fan votes and preferences
              </p>
            </div>
          </div>
          
          <div className="space-y-16">
            <div className="bg-card border border-border rounded-xl p-8">
              <h3 className="text-2xl font-semibold mb-4">For Fans</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="mr-4 mt-1 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Influence your favorite artists</p>
                    <p className="text-muted-foreground">Your votes help shape the concert experience for everyone</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="mr-4 mt-1 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Discover new music</p>
                    <p className="text-muted-foreground">See what songs are trending among other fans</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="mr-4 mt-1 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Connect with the community</p>
                    <p className="text-muted-foreground">Join other fans in creating the perfect concert experience</p>
                  </div>
                </li>
              </ul>
            </div>
            
            <div className="bg-card border border-border rounded-xl p-8">
              <h3 className="text-2xl font-semibold mb-4">For Artists</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="mr-4 mt-1 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Understand fan preferences</p>
                    <p className="text-muted-foreground">Get real data on which songs your fans want to hear most</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="mr-4 mt-1 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Create better shows</p>
                    <p className="text-muted-foreground">Curate setlists that maximize fan enjoyment</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="mr-4 mt-1 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Engage with your audience</p>
                    <p className="text-muted-foreground">Build stronger connections with fans by involving them in the process</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default HowItWorks;
