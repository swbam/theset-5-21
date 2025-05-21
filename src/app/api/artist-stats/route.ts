import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// import { getCachedData } from '@/lib/api-helpers'; // Function not found
import { getArtistById } from '@/lib/spotify/artist-search';
import type { SpotifyArtist } from '@/lib/spotify/types'; // Import type from correct file
// import { getArtistAllTracks } from '@/lib/spotify/all-tracks'; // Unused import

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Fetch artist statistics from Spotify, Ticketmaster, and our database
 * Returns popularity, followers, upcoming shows count, and other stats
 */
export async function GET(
  request: NextRequest,
  // Remove unused params
) {
  const { searchParams } = new URL(request.url);
  const artistId = searchParams.get('id');
  
  if (!artistId) {
    return NextResponse.json({ error: 'Artist ID is required' }, { status: 400 });
  }
  
  try {
    // Use caching for better performance
    // Execute the logic directly since getCachedData is missing
    // Get artist from database first
    const { data: artist, error: artistDbError } = await supabase
      .from('artists')
      .select(`
        id,
        name,
        spotify_id,
        spotify_url,
        image_url,
        followers,
        popularity,
        genres,
        stored_tracks,
        last_updated
      `)
      .eq('id', artistId)
      .single();

    if (artistDbError || !artist) {
      console.error(`Artist not found in DB for ID ${artistId}:`, artistDbError);
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    // Get upcoming shows count
    const { count: upcomingShowsCount, error: showsError } = await supabase
      .from('shows')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', artistId)
      .gte('date', new Date().toISOString());

     if (showsError) {
        console.error(`Error fetching show count for artist ${artistId}:`, showsError);
        // Continue, but count will be 0
     }

    // Get total votes for this artist's songs
    // Ensure the RPC function exists and handles potential errors
    let totalVotes = 0;
    try {
        const { data: votesData, error: rpcError } = await supabase
          .rpc('get_artist_total_votes', { artist_id_param: artistId });
        if (rpcError) throw rpcError;
        totalVotes = votesData || 0;
    } catch(rpcError) {
        console.error(`Error calling RPC get_artist_total_votes for artist ${artistId}:`, rpcError);
        // Continue, votes will be 0
    }


    // If we have Spotify ID, try to get fresh data from Spotify API
    let spotifyData: SpotifyArtist | null = null; // Explicitly type spotifyData
    if (artist.spotify_id) {
      try {
        spotifyData = await getArtistById(artist.spotify_id); // Assign fetched data

        // Update artist in database with fresh Spotify data (only if spotifyData is not null)
        if (spotifyData) {
            await supabase
              .from('artists')
              .update({
                // Use nullish coalescing for safer updates
                followers: spotifyData.followers?.total ?? artist.followers,
                popularity: spotifyData.popularity ?? artist.popularity,
                genres: spotifyData.genres ?? artist.genres,
                spotify_url: spotifyData.external_urls?.spotify ?? artist.spotify_url, // Update spotify_url too
                last_updated: new Date().toISOString()
              })
              .eq('id', artistId);
        }
      } catch (spotifyError) {
        console.error(`Error fetching or updating Spotify data for artist ${artistId}:`, spotifyError);
        // Continue with potentially stale database data
      }
    }

    // Combine all stats, using updated artist data if Spotify fetch failed
    const finalArtistData = spotifyData ? {
        followers: spotifyData.followers?.total ?? artist.followers ?? 0,
        popularity: spotifyData.popularity ?? artist.popularity ?? 0,
        genres: spotifyData.genres ?? artist.genres ?? [],
        spotify_url: spotifyData.external_urls?.spotify ?? artist.spotify_url ?? null
    } : {
        followers: artist.followers ?? 0,
        popularity: artist.popularity ?? 0,
        genres: artist.genres ?? [],
        spotify_url: artist.spotify_url ?? null
    };

    const stats = {
      id: artist.id,
      name: artist.name,
      spotify_id: artist.spotify_id,
      image_url: artist.image_url,
      followers: finalArtistData.followers,
      popularity: finalArtistData.popularity,
      genres: finalArtistData.genres,
      // Ensure stored_tracks is handled correctly if it's expected to be an array
      track_count: Array.isArray(artist.stored_tracks) ? artist.stored_tracks.length : 0,
      upcoming_shows_count: upcomingShowsCount || 0,
      total_votes: totalVotes,
      last_updated: artist.last_updated, // Use DB last_updated unless Spotify update succeeded
      spotify_url: finalArtistData.spotify_url
    };
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching artist stats:', error);
    
    // Log the error
    await supabase
      .from('error_logs')
      .insert({
        endpoint: 'artist-stats',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    
    return NextResponse.json(
      { error: 'Failed to fetch artist stats' }, 
      { status: 500 }
    );
  }
} 