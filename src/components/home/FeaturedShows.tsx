
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchFeaturedShows } from '@/lib/ticketmaster';
import { Skeleton } from '@/components/ui/skeleton';

const FeaturedShows = () => {
  const { data: shows = [], isLoading, error } = useQuery({
    queryKey: ['featuredShows'],
    queryFn: () => fetchFeaturedShows(2),
  });

  // Format date function
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Date TBA";
      }
      return {
        day: date.getDate(),
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        year: date.getFullYear()
      };
    } catch (error) {
      console.error("Date formatting error:", error);
      return { day: "TBA", month: "", year: "" };
    }
  };

  if (isLoading) {
    return (
      <section className="py-20 px-6 md:px-8 lg:px-12 bg-secondary/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
            <div>
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-4 w-96 mt-2" />
            </div>
            <Skeleton className="h-8 w-32 mt-4 md:mt-0" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[...Array(2)].map((_, index) => (
              <div key={index} className="rounded-xl border border-border overflow-hidden">
                <Skeleton className="aspect-[21/9] w-full" />
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="ml-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32 mt-1" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || shows.length === 0) {
    return (
      <section className="py-20 px-6 md:px-8 lg:px-12 bg-secondary/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
            <div>
              <span className="block text-sm font-medium text-muted-foreground mb-2">Upcoming</span>
              <h2 className="text-3xl md:text-4xl font-bold">Featured Shows</h2>
              <p className="text-muted-foreground mt-2 max-w-xl">Vote on setlists for these upcoming concerts and help shape the perfect show.</p>
            </div>
          </div>
          
          <div className="text-center py-10">
            <p className="text-muted-foreground">{error ? "Unable to load featured shows" : "No upcoming shows found"}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-6 md:px-8 lg:px-12 bg-secondary/50">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
          <div>
            <span className="block text-sm font-medium text-muted-foreground mb-2">Upcoming</span>
            <h2 className="text-3xl md:text-4xl font-bold">Featured Shows</h2>
            <p className="text-muted-foreground mt-2 max-w-xl">Vote on setlists for these upcoming concerts and help shape the perfect show.</p>
          </div>
          
          <Link 
            to="/shows" 
            className="mt-4 md:mt-0 group inline-flex items-center text-foreground hover:text-primary transition-colors"
          >
            View all shows
            <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {shows.map((show, index) => {
            const formattedDate = formatDate(show.date);
            
            return (
              <div 
                key={show.id} 
                className="animate-fade-in" 
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <Link 
                  to={`/shows/${show.id}`} 
                  className="block rounded-xl overflow-hidden border border-border bg-card hover-scale transition-all"
                >
                  <div className="relative aspect-[21/9] overflow-hidden">
                    {show.image_url ? (
                      <img 
                        src={show.image_url} 
                        alt={show.name} 
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="bg-secondary/80 w-full h-full flex items-center justify-center">
                        <span className="text-muted-foreground">No image available</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-6">
                      <h3 className="text-white text-2xl font-bold">{show.name}</h3>
                      <p className="text-white/90 mt-2">{show.artist.name}</p>
                    </div>
                  </div>
                  
                  <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center text-primary">
                        <span className="font-mono font-medium">
                          {typeof formattedDate === 'object' ? formattedDate.day : formattedDate}
                        </span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium">
                          {typeof formattedDate === 'object' ? `${formattedDate.month} ${formattedDate.year}` : ''}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {show.venue ? `${show.venue.city || ''}, ${show.venue.state || ''}` : 'Location TBA'}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <span className="inline-block text-sm font-medium px-3 py-1 bg-primary/10 rounded-full text-primary">
                        Vote Now
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturedShows;
