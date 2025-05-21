/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore: Cannot find module 'next/server' type declarations
import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/db';
import { fetchAndStoreArtistTracks } from '../../../../lib/api/database';
// import { fetchShowDetails } from '../../../../lib/ticketmaster'; // Unused import

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1) Fetch the show by its internal ID from Supabase
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select(`
        id,
        name,
        artist_id,
        venue_id,
        date,
        image_url,
        ticket_url,
        updated_at,
        venue:venue_id (
          id,
          name,
          city,
          state,
          country
        ),
        artist:artist_id (
          id,
          name,
          spotify_id,
          image_url
        ),
        setlists (
          id,
          created_at,
          updated_at,
          setlist_songs (
            id,
            song_id,
            name,
            position,
            vote_count,
            updated_at,
            song:song_id (
              id,
              name,
              spotify_id,
              duration_ms,
              preview_url,
              popularity
            )
          )
        )
      `)
      .eq('id', params.id)
      .single();

    if (showError) {
      return NextResponse.json(
        { error: showError.message },
        { status: 500 }
      );
    }
    if (!show) {
      return NextResponse.json(
        { error: "Show not found" },
        { status: 404 }
      );
    }

    // 2) If the show does not have a setlist, create one using Spotify data
    if (!show.setlists || show.setlists.length === 0) {
      console.log('No setlist found for this show, creating one...');
      
      if (!show.artist || !show.artist.id) {
        return NextResponse.json(
          { error: "Artist information is missing for this show" },
          { status: 404 }
        );
      }

      // Create a new setlist for the show
      const { data: newSetlist, error: setlistError } = await supabase
        .from('setlists')
        .insert({ 
          show_id: show.id,
          artist_id: show.artist.id,
          date: show.date,
          venue: show.venue?.name,
          venue_city: show.venue?.city,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (setlistError || !newSetlist) {
        return NextResponse.json(
          { error: "Error creating setlist", details: setlistError?.message },
          { status: 500 }
        );
      }
      
      // Get songs for this artist
      let songs = [];
      const { data: existingSongs, error: songsError } = await supabase
        .from('songs')
        .select('id, name, spotify_id, duration_ms, preview_url, popularity')
        .eq('artist_id', show.artist.id)
        .order('popularity', { ascending: false })
        .limit(50);
        
      if (!songsError && existingSongs && existingSongs.length > 0) {
        songs = existingSongs;
      } else if (show.artist.spotify_id) {
        // Fetch songs from Spotify if we don't have them
        try {
          await fetchAndStoreArtistTracks(
            show.artist.id, 
            show.artist.spotify_id, 
            show.artist.name
          );
          
          // Try again to get songs
          const { data: refreshedSongs } = await supabase
            .from('songs')
            .select('id, name, spotify_id, duration_ms, preview_url, popularity')
            .eq('artist_id', show.artist.id)
            .order('popularity', { ascending: false })
            .limit(50);
            
          if (refreshedSongs && refreshedSongs.length > 0) {
            songs = refreshedSongs;
          }
        } catch (error) {
          console.error('Error fetching artist tracks:', error);
        }
      }
      
      // Create setlist songs
      if (songs.length > 0) {
        // Select 5 random songs
        const selectedSongs = songs
          .sort(() => 0.5 - Math.random())
          .slice(0, 5);
        
        // Prepare setlist songs data
        // Assuming 'Song' type includes 'id' and 'name' properties
        // Import 'Song' type if not already imported at the top of the file
        const setlistSongs = selectedSongs.map((song: { id: string; name: string }, index) => ({
          setlist_id: newSetlist.id,
          song_id: song.id,
          name: song.name,
          position: index + 1,
          artist_id: show.artist.id,
          vote_count: 0
        }));
        
        // Batch insert all setlist songs
        if (setlistSongs.length > 0) {
          const { error: batchError } = await supabase
            .from('setlist_songs')
            .insert(setlistSongs);
            
          if (batchError) {
            console.error('Error batch inserting setlist songs:', batchError);
          }
        }
      }

      // Refresh the show data with the newly created setlist
      const { data: updatedShow, error: refreshError } = await supabase
        .from('shows')
        .select(`
          id,
          name,
          artist_id,
          venue_id,
          date,
          image_url,
          ticket_url,
          updated_at,
          venue:venue_id (
            id,
            name,
            city,
            state,
            country
          ),
          artist:artist_id (
            id,
            name,
            spotify_id,
            image_url
          ),
          setlists (
            id,
            created_at,
            updated_at,
            setlist_songs (
              id,
              song_id,
              name,
              position,
              vote_count,
              updated_at,
              song:song_id (
                id,
                name,
                spotify_id,
                duration_ms,
                preview_url,
                popularity
              )
            )
          )
        `)
        .eq('id', show.id)
        .single();

      if (refreshError) {
        return NextResponse.json(
          { error: refreshError.message },
          { status: 500 }
        );
      }
      
      return NextResponse.json(updatedShow);
    }

    // 3) Return the show data with the existing setlist
    return NextResponse.json(show);
    
  } catch (err: unknown) {
    let errorMessage = "Unknown error";
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    console.error("Error in GET /api/shows/[id]:", err);
    return NextResponse.json(
      { error: "Server error", details: errorMessage },
      { status: 500 }
    );
  }
}
