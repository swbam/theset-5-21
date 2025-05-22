"use client";
import React from "react";
import Card from "@/components/ui/card";

export interface ShowCardProps {
  id: string;
  title: string;
  venue: string;
  date: string;
}

const ShowCard: React.FC<ShowCardProps> = ({ id, title, venue, date }) => {
  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <p className="text-sm text-gray-600">Venue: {venue}</p>
      <p className="text-sm text-gray-600">Date: {date}</p>
    </Card>
  );
};

export default ShowCard;
