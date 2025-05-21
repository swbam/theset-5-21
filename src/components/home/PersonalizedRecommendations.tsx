
import React from 'react';
import { Button } from '@/components/ui/button';
import { Music } from 'lucide-react';
import { useAuth } from '@/contexts/auth/AuthContext';

const PersonalizedRecommendations = () => {
  const { user, loginWithSpotify } = useAuth();

  const handleConnect = () => {
    if (!user) {
      loginWithSpotify();
    }
  };

  return (
    <section className="py-12 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="border border-white/10 rounded-xl bg-black/30 p-8 text-center flex flex-col items-center">
          <Music className="h-10 w-10 text-primary mb-4" />
          <h2 className="text-2xl font-bold mb-2">Personalized Recommendations</h2>
          <p className="text-white/70 mb-6 max-w-lg">
            Connect your Spotify account to get personalized artist recommendations and upcoming shows.
          </p>
          <Button 
            onClick={handleConnect} 
            className="bg-white text-black hover:bg-white/90 flex items-center gap-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" fill="#1DB954"/>
              <path d="M16.7917 17.3333C16.625 17.3333 16.4583 17.2917 16.3333 17.1667C15.125 16.375 13.625 15.9167 12.0417 15.9167C10.5417 15.9167 9.125 16.3333 8.08333 16.9583C7.75 17.1667 7.33333 17.0833 7.125 16.7917C6.91667 16.4583 7 16.0417 7.29167 15.8333C8.58333 15.0833 10.25 14.5833 12.0417 14.5833C13.9167 14.5833 15.6667 15.125 17.125 16.0833C17.4583 16.2917 17.5417 16.7083 17.3333 17.0417C17.2083 17.25 17 17.3333 16.7917 17.3333ZM18.0417 14.5C17.875 14.5 17.7083 14.4583 17.5833 14.3333C16.125 13.375 14.1667 12.8333 12.0833 12.8333C10.0833 12.8333 8.20833 13.3333 6.83333 14.1667C6.5 14.375 6.08333 14.2917 5.875 13.9583C5.66667 13.625 5.75 13.2083 6.08333 13C7.66667 12.0417 9.83333 11.5 12.0833 11.5C14.4583 11.5 16.7083 12.125 18.4167 13.25C18.75 13.4583 18.8333 13.875 18.625 14.2083C18.5 14.4167 18.2917 14.5 18.0417 14.5ZM19.375 11.25C19.2083 11.25 19.0417 11.2083 18.9167 11.0833C17.2083 9.95833 14.75 9.33333 12.125 9.33333C9.58333 9.33333 7.16667 9.91667 5.25 11C4.91667 11.2083 4.5 11.125 4.29167 10.7917C4.08333 10.4583 4.16667 10.0417 4.5 9.83333C6.66667 8.625 9.33333 8 12.125 8C15.0417 8 17.7917 8.70833 19.7917 10C20.125 10.2083 20.2083 10.625 20 10.9583C19.875 11.1667 19.625 11.25 19.375 11.25Z" fill="white"/>
            </svg>
            Connect Spotify
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PersonalizedRecommendations;
