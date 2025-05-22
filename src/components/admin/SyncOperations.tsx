"use client";

import React, { useState, useEffect } from "react";

interface SyncOperation {
  id: string;
  task: string;
  entity_type: string;
  entity_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  error?: string | null;
}

const SyncOperations: React.FC = () => {
  const [operations, setOperations] = useState<SyncOperation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOperations() {
      try {
        const response = await fetch("/api/sync/orchestrator?limit=10");
        if (!response.ok) {
          throw new Error("Failed to fetch sync operations");
        }
        const data = await response.json();
        setOperations(data.tasks || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchOperations();
  }, []);

  if (loading) {
    return (
      <div className="p-4">
        Loading sync operations...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error: {error}
      </div>
    );
  }

  if (operations.length === 0) {
    return (
      <div className="p-4">
        No sync operations available.
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-xl font-semibold mb-2">Recent Sync Operations</h3>
      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th className="py-2 px-4 border">ID</th>
            <th className="py-2 px-4 border">Task</th>
            <th className="py-2 px-4 border">Entity Type</th>
            <th className="py-2 px-4 border">Status</th>
            <th className="py-2 px-4 border">Started At</th>
            <th className="py-2 px-4 border">Completed At</th>
            <th className="py-2 px-4 border">Error</th>
          </tr>
        </thead>
        <tbody>
          {operations.map((op) => (
            <tr key={op.id}>
              <td className="py-2 px-4 border">{op.id}</td>
              <td className="py-2 px-4 border">{op.task}</td>
              <td className="py-2 px-4 border">{op.entity_type}</td>
              <td className="py-2 px-4 border">{op.status}</td>
              <td className="py-2 px-4 border">{op.started_at}</td>
              <td className="py-2 px-4 border">{op.completed_at || "-"}</td>
              <td className="py-2 px-4 border">{op.error || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SyncOperations;