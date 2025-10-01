import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuctionGrid from '../components/AuctionGrid';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Heart, Trash2 } from 'lucide-react';

interface Auction {
  _id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  condition: string;
  images: Array<{
    url: string;
    alt?: string;
    isPrimary: boolean;
    caption?: string;
    order: number;
  }>;
  startingPrice: number;
  currentBid: number;
  reservePrice?: number;
  bidIncrement: number;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'active' | 'ended';
  seller: {
    _id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
  views: number;
  watchedBy: string[];
  featured: boolean;
  timeRemaining?: number;
  bidCount: number;
  tags?: string[];
}

const Watchlist: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  // Fetch watchlist
  const fetchWatchlist = async (page = 1) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/auctions/my/watchlist?page=${page}&limit=${pagination.itemsPerPage}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch watchlist');
      }

      const data = await response.json();
      setAuctions(data.auctions || []);
      setPagination(prev => ({
        ...prev,
        currentPage: data.currentPage || 1,
        totalPages: data.totalPages || 1,
        totalItems: data.totalItems || 0
      }));
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      setError('Failed to load your watchlist. Please try again.');
      showNotification('Failed to load watchlist', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle watchlist toggle (remove from watchlist)
  const handleWatchlistToggle = async (auctionId: string, isWatched: boolean) => {
    if (!user || isWatched) return; // Only handle removal

    try {
      const response = await fetch(`/api/auctions/${auctionId}/watchlist`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Remove the auction from the local state
        setAuctions(prev => prev.filter(auction => auction._id !== auctionId));
        setPagination(prev => ({ ...prev, totalItems: prev.totalItems - 1 }));
        showNotification('Removed from watchlist', 'success');
      } else {
        throw new Error('Failed to remove from watchlist');
      }
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      showNotification('Failed to remove from watchlist', 'error');
    }
  };

  // Clear entire watchlist
  const handleClearWatchlist = async () => {
    if (!user || auctions.length === 0) return;

    const confirmed = window.confirm('Are you sure you want to remove all items from your watchlist?');
    if (!confirmed) return;

    try {
      // Remove all items one by one (could be optimized with a bulk endpoint)
      const promises = auctions.map(auction => 
        fetch(`/api/auctions/${auction._id}/watchlist`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })
      );

      await Promise.all(promises);
      setAuctions([]);
      setPagination(prev => ({ ...prev, totalItems: 0, totalPages: 1, currentPage: 1 }));
      showNotification('Watchlist cleared', 'success');
    } catch (error) {
      console.error('Error clearing watchlist:', error);
      showNotification('Failed to clear watchlist', 'error');
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
    fetchWatchlist(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchWatchlist();
    }
  }, [user]);

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Heart className="w-8 h-8 text-red-500 fill-current" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Watchlist</h1>
              <p className="text-gray-600 mt-1">
                {loading ? 'Loading...' : `${pagination.totalItems} item${pagination.totalItems !== 1 ? 's' : ''} in your watchlist`}
              </p>
            </div>
          </div>

          {auctions.length > 0 && (
            <button
              onClick={handleClearWatchlist}
              className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors duration-200"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => fetchWatchlist(pagination.currentPage)}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Watchlist Content */}
        {!loading && auctions.length === 0 && !error ? (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <Heart className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Your watchlist is empty</h3>
              <p className="text-gray-600 mb-6">
                Start adding auctions to your watchlist to keep track of items you're interested in.
              </p>
              <button
                onClick={() => navigate('/auctions')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Browse Auctions
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Auction Grid */}
            <AuctionGrid
              auctions={auctions}
              loading={loading}
              onWatchlistToggle={handleWatchlistToggle}
              currentUserId={user._id}
            />

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <nav className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {/* Page Numbers */}
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          pageNum === pagination.currentPage
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </>
        )}

        {/* Tips */}
        {auctions.length > 0 && (
          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-2">Watchlist Tips</h3>
            <ul className="text-blue-800 space-y-1 text-sm">
              <li>• Get notified when auctions you're watching are ending soon</li>
              <li>• Track price changes and bidding activity</li>
              <li>• Quickly access your favorite items from any page</li>
              <li>• Remove items by clicking the heart icon on each auction card</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Watchlist;