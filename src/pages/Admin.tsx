import React, { useEffect } from 'react';
import AdminDashboard from '@/components/admin/AdminDashboard';

/**
 * Admin page component
 * For development purposes, auth check is bypassed
 */
const Admin = () => {
  useEffect(() => {
    document.title = 'Admin Dashboard | TheSet';
  }, []);

  // Directly render the dashboard in development
  return <AdminDashboard />;
};

export default Admin;
