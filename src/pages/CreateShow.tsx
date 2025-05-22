"use client";
import React, { useState } from "react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Alert from "@/components/ui/alert";

const CreateShow: React.FC = () => {
  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title || !venue || !date || !description) {
      setErrorMessage("All fields are required.");
      return;
    }
    setErrorMessage("");
    try {
      // Simulate API call for creating a show
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccessMessage("Show created successfully!");
      // Clear the form fields after submission
      setTitle("");
      setVenue("");
      setDate("");
      setDescription("");
    } catch (error) {
      setErrorMessage("Failed to create show.");
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">Create New Show</h1>
      {successMessage && <Alert variant="success">{successMessage}</Alert>}
      {errorMessage && <Alert variant="error">{errorMessage}</Alert>}
      <Card className="p-6 mt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border p-2 rounded"
              placeholder="Enter show title"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Venue</label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full border p-2 rounded"
              placeholder="Enter venue"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border p-2 rounded"
              placeholder="Enter show description"
            ></textarea>
          </div>
          <Button type="submit">Create Show</Button>
        </form>
      </Card>
    </div>
  );
};

export default CreateShow;
