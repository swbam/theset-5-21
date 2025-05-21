'use client';

import React from 'react';
import AdminDashboard from '@/components/admin/AdminDashboard';

/**
 * Admin page using App Router
 * 
 * For development purposes, this page bypasses authentication checks
 * to allow direct access to the admin dashboard.
 */
export default function AdminPage() {
  return <AdminDashboard />;
}
