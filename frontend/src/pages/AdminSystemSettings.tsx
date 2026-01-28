import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminSystemSettings: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'super')) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-gray-600">You must be an admin to access system settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Admin: System Settings</h1>
      <p className="text-gray-600 mb-6">Manage global configuration for fees, currency, and endpoint status.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/admin/fees" className="block rounded-lg border border-gray-200 p-5 hover:border-black transition-colors">
          <div className="text-lg font-semibold mb-1">Fees</div>
          <div className="text-gray-600 text-sm">Configure commission and VAT defaults.</div>
        </Link>
        <Link to="/admin/currency" className="block rounded-lg border border-gray-200 p-5 hover:border-black transition-colors">
          <div className="text-lg font-semibold mb-1">Currency</div>
          <div className="text-gray-600 text-sm">Set the site default currency.</div>
        </Link>
        <Link to="/admin/endpoints" className="block rounded-lg border border-gray-200 p-5 hover:border-black transition-colors">
          <div className="text-lg font-semibold mb-1">Endpoints</div>
          <div className="text-gray-600 text-sm">View API endpoint availability and status.</div>
        </Link>
      </div>
    </div>
  );
};

export default AdminSystemSettings;