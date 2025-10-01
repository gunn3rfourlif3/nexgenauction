import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AdminAuctionForm from '../components/AdminAuctionForm';
import { ArrowLeft, Shield } from 'lucide-react';

const AdminCreateAuction: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if not admin
  React.useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleFormSubmit = (formData: any) => {
    // Navigate to admin dashboard or auction list after successful creation
    navigate('/admin/auctions');
  };

  const handleCancel = () => {
    navigate('/admin/dashboard');
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You need administrator privileges to access this page.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Admin Dashboard
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Admin Panel</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminAuctionForm
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};

export default AdminCreateAuction;