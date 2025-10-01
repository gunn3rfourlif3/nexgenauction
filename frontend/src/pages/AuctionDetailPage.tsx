import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AuctionDetail from '../components/AuctionDetail';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface Bid {
  bidder: {
    _id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
  amount: number;
  timestamp: string;
}

interface Auction {
  _id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  condition: string;
  conditionReport?: {
    overall?: string;
    defects?: string[];
    authenticity?: {
      verified: boolean;
      certificate?: string;
      verifiedBy?: string;
    };
    provenance?: string;
  };
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
  bids: Bid[];
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'active' | 'ended';
  seller: {
    _id: string;
    username: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  winner?: {
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
  shippingInfo?: {
    cost: number;
    methods: string[];
    international: boolean;
  };
}

const AuctionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWatched, setIsWatched] = useState(false);

  // Fetch auction details
  useEffect(() => {
    const fetchAuction = async () => {
      if (!id) {
        setError('Invalid auction ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/auctions/${id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Auction not found');
          }
          throw new Error('Failed to fetch auction details');
        }

        const data = await response.json();
        setAuction(data);

        // Check if user has this auction in watchlist
        if (user && data.watchedBy) {
          setIsWatched(data.watchedBy.includes(user._id));
        }
      } catch (error) {
        console.error('Error fetching auction:', error);
        setError(error instanceof Error ? error.message : 'Failed to load auction');
      } finally {
        setLoading(false);
      }
    };

    fetchAuction();
  }, [id, user]);

  // Handle watchlist toggle
  const handleWatchlistToggle = async (auctionId: string, shouldWatch: boolean) => {
    if (!user) {
      showNotification('Please log in to use the watchlist', 'error');
      navigate('/login');
      return;
    }

    try {
      const endpoint = `/api/auctions/${auctionId}/watchlist`;
      const method = shouldWatch ? 'POST' : 'DELETE';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setIsWatched(shouldWatch);
        
        // Update the auction's watchedBy array
        if (auction) {
          const updatedWatchedBy = shouldWatch 
            ? [...auction.watchedBy, user._id]
            : auction.watchedBy.filter(id => id !== user._id);
          
          setAuction(prev => prev ? { ...prev, watchedBy: updatedWatchedBy } : null);
        }

        showNotification(
          shouldWatch ? 'Added to watchlist' : 'Removed from watchlist',
          'success'
        );
      } else {
        throw new Error('Failed to update watchlist');
      }
    } catch (error) {
      console.error('Error updating watchlist:', error);
      showNotification('Failed to update watchlist', 'error');
    }
  };

  // Handle place bid
  const handlePlaceBid = async (auctionId: string, amount: number) => {
    if (!user) {
      showNotification('Please log in to place a bid', 'error');
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`/api/auctions/${auctionId}/bid`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
      });

      if (response.ok) {
        const updatedAuction = await response.json();
        setAuction(updatedAuction);
        showNotification('Bid placed successfully!', 'success');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to place bid');
      }
    } catch (error) {
      console.error('Error placing bid:', error);
      showNotification(
        error instanceof Error ? error.message : 'Failed to place bid',
        'error'
      );
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="animate-pulse">
              <div className="h-96 bg-gray-300 rounded-lg mb-4"></div>
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-20 h-20 bg-gray-300 rounded-lg"></div>
                ))}
              </div>
            </div>
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-20 bg-gray-300 rounded"></div>
              <div className="h-32 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !auction) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="w-24 h-24 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error === 'Auction not found' ? 'Auction Not Found' : 'Error Loading Auction'}
          </h2>
          <p className="text-gray-600 mb-6">
            {error === 'Auction not found' 
              ? 'The auction you\'re looking for doesn\'t exist or has been removed.'
              : 'We encountered an error while loading the auction details.'
            }
          </p>
          <div className="space-x-4">
            <button
              onClick={() => navigate('/auctions')}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
            >
              Browse Auctions
            </button>
            {error !== 'Auction not found' && (
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-200"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <button
              onClick={() => navigate('/auctions')}
              className="hover:text-blue-600 transition-colors duration-200"
            >
              Auctions
            </button>
            <span>›</span>
            <span className="capitalize">{auction.category}</span>
            {auction.subcategory && (
              <>
                <span>›</span>
                <span className="capitalize">{auction.subcategory}</span>
              </>
            )}
            <span>›</span>
            <span className="text-gray-900 font-medium truncate max-w-xs">
              {auction.title}
            </span>
          </nav>
        </div>
      </div>

      {/* Auction Detail */}
      <AuctionDetail
        auction={auction}
        onWatchlistToggle={handleWatchlistToggle}
        onPlaceBid={handlePlaceBid}
        isWatched={isWatched}
        currentUserId={user?._id}
        loading={false}
      />

      {/* Related Auctions */}
      <div className="max-w-7xl mx-auto px-4 py-8 border-t border-gray-200 mt-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          More from {auction.category}
        </h3>
        <div className="text-center py-8 text-gray-600">
          <p>Related auctions will be displayed here</p>
          <button
            onClick={() => navigate(`/auctions?category=${auction.category}`)}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
          >
            Browse {auction.category} Auctions
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuctionDetailPage;