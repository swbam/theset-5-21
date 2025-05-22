"use client";
import React, { useEffect, useState } from "react";
import Card from "@/components/ui/card";

interface Artist {
  id: string;
  name: string;
  genre: string;
}

const Artists: React.FC = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        // Simulate fetching artist data; replace with a real API call as needed.
        const data: Artist[] = [
          { id: "1", name: "Artist One", genre: "Rock" },
          { id: "2", name: "Artist Two", genre: "Jazz" }
        ];
        setArtists(data);
      } catch (err) {
        setError("Failed to fetch artists.");
      } finally {
        setLoading(false);
      }
    };
    fetchArtists();
  }, []);

  if (loading) return <div className="p-4">Loading artists...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">Artists</h1>
      <div className="grid grid-cols-1 gap-4">
        {artists.map((artist) => (
          <Card key={artist.id} className="p-4">
            <h2 className="font-bold">{artist.name}</h2>
            <p className="text-sm text-gray-600">{artist.genre}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Artists;
