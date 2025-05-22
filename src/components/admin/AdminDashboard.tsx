import React, { useEffect } from "react";
import Link from "next/link";
import AdminArtists from "./AdminArtists";

const AdminDashboard: React.FC = () => {
  useEffect(() => {
    document.title = "Admin Dashboard | TheSet";
  }, []);

  return (
    <div className="p-6">
      <header className="mb-4 border-b pb-2">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </header>
      <nav className="mb-6">
        <ul className="flex space-x-4">
          <li>
            <Link href="/admin/artists">
              <a className="text-blue-600 hover:underline">Artists</a>
            </Link>
          </li>
          <li>
            <Link href="/admin/sync">
              <a className="text-blue-600 hover:underline">Sync Operations</a>
            </Link>
          </li>
          <li>
            <Link href="/admin/settings">
              <a className="text-blue-600 hover:underline">Settings</a>
            </Link>
          </li>
        </ul>
      </nav>
      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">Artists Management</h2>
        <AdminArtists />
      </section>
      <section>
        <h2 className="text-2xl font-semibold mb-3">Recent Sync Operations</h2>
        {/* Placeholder: Implement sync operations list */}
        <p className="text-gray-500">No sync operations data available.</p>
      </section>
    </div>
  );
};

export default AdminDashboard;
