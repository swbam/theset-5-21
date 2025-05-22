"use client";
import React, { useEffect, useState } from "react";
import Card from "@/components/ui/card";

interface Show {
  id: string;
  title: string;
  venue: string;
  date: string;
  description: string;
}

const ShowDetail: React.FC = () => {
  const [show, setShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShow = async () => {
      try {
        // Simulate an API call to fetch show details
        const fetchedShow: Show = {
          id: "123",
          title: "Summer Concert",
          venue: "Big Arena",
          date: "2025-07-15",
          description: "An amazing summer concert featuring top artists."
        };
        setShow(fetchedShow);
        setLoading(false);
      } catch (err) {
        setError("Failed to load show details.");
        setLoading(false);
      }
    };

    fetchShow();
  }, []);

  if (loading) return <div className="p-4">Loading show details...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!show) return <div className="p-4">No show details available.</div>;

  return (
    <div className="p-4">
      <Card>
        <h1 className="text-3xl font-bold mb-2">{show.title}</h1>
        <p className="mb-2"><strong>Venue:</strong> {show.venue}</p>
        <p className="mb-2"><strong>Date:</strong> {show.date}</p>
        <p>{show.description}</p>
      </Card>
    </div>
  );
};

export default ShowDetail;
