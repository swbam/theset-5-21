"use client";
import React, { useState } from "react";
import Button from "@/components/ui/button";
import Alert from "@/components/ui/alert";
import Card from "@/components/ui/card";

const AdminArtistImport: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage("");
    }
  };

  const handleImport = async () => {
    if (!file) {
      setMessage("No file selected.");
      return;
    }
    // Simulate file processing for artist import
    setTimeout(() => {
      setMessage("Artist data imported successfully.");
    }, 1000);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Import Artists</h1>
      {message && <Alert variant={message.includes("successfully") ? "success" : "error"}>{message}</Alert>}
      <Card className="p-4">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="mb-4 block"
        />
        <Button onClick={handleImport}>Import Artists</Button>
      </Card>
    </div>
  );
};

export default AdminArtistImport;