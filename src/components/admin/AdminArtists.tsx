"use client";
import React from "react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";

interface Artist {
  id: string;
  name: string;
  genre: string;
}

interface AdminArtistsProps {
  artists: Artist[];
}

const AdminArtists: React.FC<AdminArtistsProps> = ({ artists }) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Artists</h2>
      {artists.length === 0 ? (
        <p>No artists found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {artists.map((artist) => (
            <Card key={artist.id}>
              <div className="flex justify-between items-center">
                <span>{artist.name}</span>
                <span className="text-sm text-gray-600">{artist.genre}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
      <div className="mt-4">
        <Button onClick={() => alert("Navigate to artist creation")}>
          Add New Artist
        </Button>
      </div>
    </div>
  );
};

export default AdminArtists;
