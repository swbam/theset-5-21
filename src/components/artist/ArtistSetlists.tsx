"use client";
import React from "react";
import Card from "@/components/ui/card";

export interface Setlist {
  id: string;
  date: string;
  venue: string;
  songs: string[];
}

export interface ArtistSetlistsProps {
  setlists: Setlist[];
}

const ArtistSetlists: React.FC<ArtistSetlistsProps> = ({ setlists }) => {
  return (
    <div className="space-y-4">
      {setlists.length === 0 ? (
        <p>No setlists available.</p>
      ) : (
        setlists.map((setlist) => (
          <Card key={setlist.id}>
            <h3 className="font-bold mb-2">
              {setlist.date} - {setlist.venue}
            </h3>
            <ul className="list-disc list-inside">
              {setlist.songs.map((song, index) => (
                <li key={index}>{song}</li>
              ))}
            </ul>
          </Card>
        ))
      )}
    </div>
  );
};

export default ArtistSetlists;