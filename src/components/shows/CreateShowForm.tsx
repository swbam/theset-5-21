
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchArtists } from '@/lib/spotify';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, Search, X } from 'lucide-react';
import { Artist } from '@/lib/types'; // Import Artist type

const CreateShowForm = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [artistSearch, setArtistSearch] = useState('');
  // Use Artist type, allowing null
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    venue: '',
    city: '',
    state: '',
    country: 'USA',
    description: '',
  });

  // Search for artists
  const { data: artistResults, isLoading: artistsLoading } = useQuery({
    queryKey: ['artistSearch', artistSearch],
    queryFn: () => searchArtists(artistSearch),
    enabled: artistSearch.length > 2,
  });

  // Assuming searchArtists returns items compatible with Artist type
  const artists: Artist[] = artistResults?.artists?.items || [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Use Artist type for parameter
  const handleSelectArtist = (artist: Artist) => {
    setSelectedArtist(artist);
    setArtistSearch('');
    setFormData(prev => ({
      ...prev, 
      name: `${artist.name} Concert`
    }));
  };

  const handleRemoveArtist = () => {
    setSelectedArtist(null);
  };

  // Add async keyword
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedArtist) {
      toast.error('Please select an artist');
      return;
    }
    
    if (!date) {
      toast.error('Please select a date');
      return;
    }
    
    if (!formData.venue || !formData.city || !formData.state) {
      toast.error('Please fill in all required fields');
     return;
   }

   // Prepare data for API submission
   const showPayload = {
     ...formData,
     artist: { // Ensure artist object matches expected structure
       id: selectedArtist.id,
       name: selectedArtist.name,
       image: selectedArtist.images?.[0]?.url, // Use optional chaining
       spotify_id: selectedArtist.id, // Assuming Spotify ID is the same as TM ID for now
       // Add other relevant artist fields if available from search
     },
     date: date?.toISOString(),
   };

   console.log('Submitting show data to API:', showPayload);

   // Submit to the backend API route
   try {
     const response = await fetch('/api/shows/create', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify(showPayload),
     });

     if (!response.ok) {
       const errorData = await response.json();
       throw new Error(errorData.error || `API Error: ${response.status}`);
     }

     const result = await response.json();
     toast.success('Show created successfully!');
     console.log('API Response:', result);

     // Redirect to the newly created show page or shows list
     // Using result.show.id assumes the API returns the created show object with its ID
     const redirectPath = result.show?.id ? `/show/${result.show.id}` : '/shows';
     setTimeout(() => {
       navigate(redirectPath);
     }, 1500);

   } catch (error) {
     console.error('Error creating show:', error);
     toast.error(`Failed to create show: ${error instanceof Error ? error.message : 'Unknown error'}`);
   }
 };

 return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="artist">Artist</Label>
          {selectedArtist ? (
            <div className="flex items-center mt-2 p-2 border border-border rounded-md bg-secondary/30">
              {selectedArtist.images?.[0]?.url && (
                <img 
                  src={selectedArtist.images[0].url} 
                  alt={selectedArtist.name}
                  className="w-10 h-10 rounded-full object-cover mr-3"
                />
              )}
              <div className="flex-1">
                <p className="font-medium">{selectedArtist.name}</p>
                {selectedArtist.genres?.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {selectedArtist.genres.slice(0, 2).join(', ')}
                  </p>
                )}
              </div>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={handleRemoveArtist}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="artist"
                placeholder="Search for an artist..."
                className="pl-10"
                value={artistSearch}
                onChange={(e) => setArtistSearch(e.target.value)}
              />
              
              {artistSearch.length > 2 && (
                <div className="absolute z-10 mt-1 w-full bg-popover rounded-md shadow-md border border-border">
                  {artistsLoading ? (
                    <div className="p-4 text-center text-muted-foreground">Loading...</div>
                  ) : artists.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">No artists found</div>
                  ) : (
                    <ul className="max-h-60 overflow-y-auto">
                      {/* Use Artist type for map parameter */}
                      {artists.map((artist: Artist) => (
                        <li
                          key={artist.id}
                          className="flex items-center p-2 hover:bg-accent cursor-pointer"
                          onClick={() => handleSelectArtist(artist)}
                        >
                          {artist.images?.[0]?.url ? (
                            <img 
                              src={artist.images[0].url} 
                              alt={artist.name}
                              className="w-8 h-8 rounded-full object-cover mr-3"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-3">
                              <span className="text-xs">{artist.name.charAt(0)}</span>
                            </div>
                          )}
                          <span>{artist.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div>
          <Label htmlFor="name">Show Name</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter show name"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="date">Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div>
          <Label htmlFor="venue">Venue</Label>
          <Input
            id="venue"
            name="venue"
            value={formData.venue}
            onChange={handleInputChange}
            placeholder="Enter venue name"
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              placeholder="Enter city"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              name="state"
              value={formData.state}
              onChange={handleInputChange}
              placeholder="Enter state"
              required
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Enter show description"
            className="resize-none"
            rows={4}
          />
        </div>
      </div>
      
      <Button type="submit" className="w-full">Create Show</Button>
    </form>
  );
};

export default CreateShowForm;
