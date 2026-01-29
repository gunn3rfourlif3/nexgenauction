import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiEndpoints } from '../services/api';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Handle place bid for sample auctions
  const handlePlaceBid = (auctionId: number) => {
    if (!user) {
      showNotification('Please log in to place a bid', 'error');
      navigate('/login');
      return;
    }

    // For sample auctions, redirect to auctions page
    showNotification('This is a sample auction. Browse real auctions below!', 'info');
    navigate('/auctions');
  };

  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await apiEndpoints.status();
        setApiStatus(response.data);
        setApiError(null);
      } catch (error: any) {
        console.error('API Status Error:', error);
        setApiError(error.message || 'Failed to connect to API');
      }
    };

    checkApiStatus();
  }, []);
  return (
    <div className="min-h-screen">
      {/* API Status Banner */}
      {apiStatus && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 text-center">
          <strong>API Connected:</strong> {apiStatus.data?.service} v{apiStatus.data?.version} - Environment: {apiStatus.data?.environment}
        </div>
      )}
      {apiError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 text-center">
          <strong>API Connection Error:</strong> {apiError}
        </div>
      )}

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Welcome to NexGenAuction
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
              Discover unique items, bid with confidence, and experience the future of online auctions
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/auctions"
                className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200"
              >
                Browse Auctions
              </Link>
              <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary-600 transition-colors duration-200">
                Start Selling
              </button>
            </div>
          </div>
        </div>
      </section>

      

      {/* Featured Auctions */}
      <section className="pt-16 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Featured Auctions
            </h2>
            <p className="text-xl text-gray-600">
              Don't miss out on these exciting auction opportunities
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((item) => (
              <div key={item} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-200">
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Auction Image {item}</span>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Sample Auction Item {item}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    This is a sample auction item description. Real auction data will be loaded from the backend.
                  </p>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-gray-500">Current Bid</span>
                    <span className="text-lg font-bold text-primary-600">$1,{item}50</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-gray-500">Time Left</span>
                    <span className="text-sm font-medium text-secondary-600">2d 14h 30m</span>
                  </div>
                  <button 
                    onClick={() => handlePlaceBid(item)}
                    className="w-full bg-primary-600 text-white py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors duration-200"
                  >
                    Place Bid
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/auctions"
              className="bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors duration-200"
            >
              View All Auctions
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Get Started in 4 Steps
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Register, verify, deposit, and participate — it’s simple and fast
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-200">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-black text-white flex items-center justify-center text-lg font-bold">1</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Register</h3>
              <p className="text-gray-600">Create your Nexus account with your email and a secure password.</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-200">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-black text-white flex items-center justify-center text-lg font-bold">2</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Verify</h3>
              <p className="text-gray-600">Verify your email to unlock protected actions and profile features.</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-200">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-black text-white flex items-center justify-center text-lg font-bold">3</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Deposit</h3>
              <p className="text-gray-600">View bank details, use your reference, and upload your receipt for verification.</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-200">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-black text-white flex items-center justify-center text-lg font-bold">4</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Participate</h3>
              <p className="text-gray-600">Register for each auction and start bidding with confidence.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose NexGenAuction?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience the next generation of online auctions with our cutting-edge platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure Transactions</h3>
              <p className="text-gray-600">
                Advanced security measures ensure your transactions are safe and protected
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-time Bidding</h3>
              <p className="text-gray-600">
                Experience lightning-fast bidding with real-time updates and notifications
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Verified Items</h3>
              <p className="text-gray-600">
                All items are thoroughly verified to ensure authenticity and quality
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Bidding?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied users who trust NexGenAuction for their buying and selling needs
          </p>
          <button className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200">
            Get Started Today
          </button>
        </div>
      </section>
    </div>
  );
};

export default Home;
