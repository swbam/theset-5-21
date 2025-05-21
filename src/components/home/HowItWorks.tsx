import React from 'react';
// Removed unused icons: import { Music, Vote, Headphones } from 'lucide-react';

const HowItWorks = () => {
  return (
    <section className="py-24 px-4 bg-gradient-to-b from-black to-[#0A0A12]">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-white">How TheSet Works</h2>
          <p className="text-lg text-white/70 max-w-3xl mx-auto">
            Shape the perfect concert experience by voting on setlists for your favorite artists' upcoming shows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Step 1 */}
          <div className="text-center p-6 rounded-lg border border-white/10 bg-black/20">
             <div className="h-12 w-12 rounded-full bg-white/10 border border-white/15 text-white flex items-center justify-center mx-auto mb-6">
               <span className="font-bold text-xl">1</span>
             </div>
             <h3 className="text-2xl font-semibold mb-4 text-white">Find Your Artist</h3>
             <p className="text-white/70 text-base leading-relaxed">
               Search for your favorite artists and discover their upcoming concerts near you.
             </p>
          </div>

          {/* Step 2 */}
           <div className="text-center p-6 rounded-lg border border-white/10 bg-black/20">
             <div className="h-12 w-12 rounded-full bg-white/10 border border-white/15 text-white flex items-center justify-center mx-auto mb-6">
               <span className="font-bold text-xl">2</span>
             </div>
             <h3 className="text-2xl font-semibold mb-4 text-white">Vote on Songs</h3>
             <p className="text-white/70 text-base leading-relaxed">
               Cast your votes on songs you want to hear at the show and see what others are voting for.
             </p>
          </div>

          {/* Step 3 */}
           <div className="text-center p-6 rounded-lg border border-white/10 bg-black/20">
             <div className="h-12 w-12 rounded-full bg-white/10 border border-white/15 text-white flex items-center justify-center mx-auto mb-6">
               <span className="font-bold text-xl">3</span>
             </div>
             <h3 className="text-2xl font-semibold mb-4 text-white">Experience the Magic</h3>
             <p className="text-white/70 text-base leading-relaxed">
               Attend concerts with setlists shaped by fan preferences and enjoy the music you love.
             </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
