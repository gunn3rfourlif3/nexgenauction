import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiEndpoints } from '../services/api';

const Auctions: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('ending-soon');
  const [auctions, setAuctions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle bid placement
  const handleBidNow = (auctionId: number) => {
    if (!user) {
      showNotification('Please log in to place a bid', 'error');
      navigate('/login');
      return;
    }

    // Navigate to auction detail page for bidding
    navigate(`/auctions/${auctionId}`);
  };

  const defaultCategories = [
    { value: 'all', label: 'All Categories' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'art', label: 'Art & Collectibles' },
    { value: 'jewelry', label: 'Jewelry & Watches' },
    { value: 'vehicles', label: 'Vehicles' },
    { value: 'home', label: 'Home & Garden' },
    { value: 'fashion', label: 'Fashion' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Try to fetch auctions and categories from API
        const [auctionsResponse, categoriesResponse] = await Promise.allSettled([
          apiEndpoints.auctions.getAll(),
          apiEndpoints.categories.getAll()
        ]);

        // Handle auctions response
        if (auctionsResponse.status === 'fulfilled' && auctionsResponse.value.data.success) {
          setAuctions(auctionsResponse.value.data.data || []);
        } else {
          // Use sample data if API fails
          setAuctions(sampleAuctions);
        }

        // Handle categories response
        if (categoriesResponse.status === 'fulfilled' && categoriesResponse.value.data.success) {
          const apiCategories = categoriesResponse.value.data.data.categories || [];
          setCategories([{ value: 'all', label: 'All Categories' }, ...apiCategories]);
        } else {
          // Use default categories if API fails
          setCategories(defaultCategories);
        }

        setError(null);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError('Failed to load data from server. Showing sample data.');
        setAuctions(sampleAuctions);
        setCategories(defaultCategories);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const sortOptions = [
    { value: 'ending-soon', label: 'Ending Soon' },
    { value: 'newest', label: 'Newest First' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'most-bids', label: 'Most Bids' },
  ];

  // Sample auction data - will be replaced with API data
  const sampleAuctions = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    title: `Auction Item ${i + 1}`,
    description: `This is a detailed description of auction item ${i + 1}. It includes all the important details about the item.`,
    currentBid: Math.floor(Math.random() * 5000) + 100,
    bidCount: Math.floor(Math.random() * 50) + 1,
    timeLeft: `${Math.floor(Math.random() * 5) + 1}d ${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m`,
    category: defaultCategories[Math.floor(Math.random() * (defaultCategories.length - 1)) + 1].value,
    image: `https://via.placeholder.com/300x200?text=Item+${i + 1}`,
  }));

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Live Auctions
          </h1>
          <p className="text-xl text-gray-600">
            Discover amazing items and place your bids
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
            <strong>Notice:</strong> {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-2 text-gray-600">Loading auctions...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Auctions
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search for items..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <svg
                  className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {auctions.length} auctions
          </p>
        </div>

        {/* Auction Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {auctions.map((auction) => (
            <div
              key={auction.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
            >
              <div className="h-48 bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">Auction Image</span>
              </div>
              
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                  {auction.title}
                </h3>
                
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {auction.description}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Current Bid</span>
                    <span className="text-lg font-bold text-primary-600">
                      ${auction.currentBid.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Bids</span>
                    <span className="text-sm font-medium text-gray-700">
                      {auction.bidCount}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Time Left</span>
                    <span className="text-sm font-medium text-secondary-600">
                      {auction.timeLeft}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleBidNow(auction.id)}
                    className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors duration-200"
                  >
                    Bid Now
                  </button>
                  <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-12">
          <button className="bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors duration-200">
            Load More Auctions
          </button>
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default Auctions;