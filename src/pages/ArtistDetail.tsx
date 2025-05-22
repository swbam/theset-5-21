"use client";
import React, { useState, useEffect } from "react";

interface Artist {
  id: string;
  name: string;
  bio: string;
}

const ArtistDetail: React.FC = () => {
  const [artist, setArtist] = useState<Artist | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtist = async () => {
      try {
        // TODO: Replace with real API call.
        const fetchedArtist: Artist = {
          id: "1",
          name: "Sample Artist",
          bio: "This is a sample artist biography."
        };
        setArtist(fetchedArtist);
      } catch (err) {
        setError("Failed to load artist details.");
      }
    };

    fetchArtist();
  }, []);

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  if (!artist) {
    return <div className="p-4">Loading artist details...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-2">{artist.name}</h1>
      <p>{artist.bio}</p>
    </div>
  );
};

export default ArtistDetail;
