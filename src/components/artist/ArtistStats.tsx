"use client";
import React from "react";
import Card from "@/components/ui/card";

export interface ArtistStatsProps {
  totalShows: number;
  totalVotes: number;
  averageScore: number;
}

const ArtistStats: React.FC<ArtistStatsProps> = ({ totalShows, totalVotes, averageScore }) => {
  return (
    <Card className="mb-4">
      <h2 className="text-xl font-bold mb-2">Artist Statistics</h2>
      <ul className="list-disc list-inside">
        <li>Total Shows: {totalShows}</li>
        <li>Total Votes: {totalVotes}</li>
        <li>Average Score: {averageScore.toFixed(2)}</li>
      </ul>
    </Card>
  );
};

export default ArtistStats;