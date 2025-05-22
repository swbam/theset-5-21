-- Migration: Add Indexes for Production Optimization

-- Create an index on the primary key of the artists table (if not already present)
CREATE INDEX IF NOT EXISTS idx_artists_id ON artists(id);

-- Create an index on the foreign key (artist_id) in the shows table
CREATE INDEX IF NOT EXISTS idx_shows_artist_id ON shows(artist_id);

-- Create an index on the foreign key (artist_id) in the setlists table
CREATE INDEX IF NOT EXISTS idx_setlists_artist_id ON setlists(artist_id);

-- Create an index on the foreign key (show_id) in the votes table
CREATE INDEX IF NOT EXISTS idx_votes_show_id ON votes(show_id);