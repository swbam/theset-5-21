"use client";

import React from "react";
import SyncOperations from "@/components/admin/SyncOperations";

const AdminSyncPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Sync Operations</h1>
      <SyncOperations />
    </div>
  );
};

export default AdminSyncPage;