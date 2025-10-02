import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import AdminAuctionForm from '../components/AdminAuctionForm';
import { ArrowLeft, Gavel, Loader } from 'lucide-react';
import { apiEndpoints } from '../services/api';

const EditAuction: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const { showNotification } = useNotification();
  const [auction, setAuction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Fetch auction data
  useEffect(() => {
    const fetchAuction = async () => {
      if (!id || !isAuthenticated) return;

      try {
        setLoading(true);
        setError(null);
        
        const { data: res } = await apiEndpoints.auctions.getById(id);
        const auctionData = (res && res.data && res.data.auction) ? res.data.auction : res;

        // Check if user owns this auction
        if (auctionData.seller._id !== user?._id && user?.role !== 'admin') {
          setError('You do not have permission to edit this auction.');
          return;
        }

        setAuction(auctionData);
      } catch (err: any) {
        console.error('Error fetching auction:', err);
        setError(err.response?.data?.message || 'Failed to load auction data');
      } finally {
        setLoading(false);
      }
    };

    fetchAuction();
  }, [id, isAuthenticated, user]);

  const handleFormSubmit = async (formData: any) => {
    if (!id) return;

    try {
      setLoading(true);
      
      const { data: res } = await apiEndpoints.auctions.update(id, formData);
      
      if (res?.success) {
        showNotification('Auction updated successfully!', 'success');
        navigate('/dashboard');
      } else {
        showNotification(res?.message || 'Failed to update auction', 'error');
      }
    } catch (err: any) {
      console.error('Error updating auction:', err);
      showNotification(
        err.response?.data?.message || 'Failed to update auction',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">Please log in to edit auctions.</p>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading auction data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Auction Not Found</h1>
          <p className="text-gray-600 mb-6">The auction you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
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
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleCancel}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <Gavel className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Edit Auction</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Auction</h1>
          <p className="text-gray-600 mt-2">Update your auction details below.</p>
        </div>
        
        <AdminAuctionForm
          initialData={auction}
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};

export default EditAuction;