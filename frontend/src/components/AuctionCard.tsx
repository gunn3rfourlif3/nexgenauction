import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Clock, Eye, Tag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

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
}

interface AuctionCardProps {
  auction: Auction;
  onWatchlistToggle?: (auctionId: string, isWatched: boolean) => void;
  isWatched?: boolean;
  currentUserId?: string;
}

const AuctionCard: React.FC<AuctionCardProps> = ({ 
  auction, 
  onWatchlistToggle, 
  isWatched = false, 
  currentUserId 
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const primaryImage = auction.images?.find(img => img.isPrimary) || auction.images?.[0];
  const timeLeft = auction.timeRemaining ? new Date(auction.timeRemaining) : null;

  const formatTimeRemaining = (timeRemaining: number) => {
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'scheduled': return 'text-blue-600 bg-blue-100';
      case 'ended': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'new': return 'text-green-600 bg-green-100';
      case 'like-new': return 'text-blue-600 bg-blue-100';
      case 'good': return 'text-yellow-600 bg-yellow-100';
      case 'fair': return 'text-orange-600 bg-orange-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onWatchlistToggle) {
      onWatchlistToggle(auction._id, !isWatched);
    }
  };

  // Handle bid placement
  const handlePlaceBid = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent Link navigation
    e.stopPropagation();

    if (!user) {
      showNotification('Please log in to place a bid', 'error');
      navigate('/login');
      return;
    }

    if (auction.status !== 'active') {
      showNotification('This auction is not currently active', 'warning');
      return;
    }

    // Navigate to auction detail page for bidding
    navigate(`/auctions/${auction._id}`);
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
      <Link to={`/auctions/${auction._id}`} className="block">
        {/* Image Section */}
        <div className="relative h-48 overflow-hidden">
          {primaryImage ? (
            <img
              src={primaryImage.url}
              alt={primaryImage.alt || auction.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <Tag className="w-12 h-12 text-gray-400" />
            </div>
          )}
          
          {/* Status Badge */}
          <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(auction.status)}`}>
            {auction.status.charAt(0).toUpperCase() + auction.status.slice(1)}
          </div>

          {/* Featured Badge */}
          {auction.featured && (
            <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              Featured
            </div>
          )}

          {/* Watchlist Button */}
          {currentUserId && currentUserId !== auction.seller?._id && (
            <button
              onClick={handleWatchlistClick}
              className={`absolute bottom-2 right-2 p-2 rounded-full transition-colors duration-200 ${
                isWatched 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Heart className={`w-4 h-4 ${isWatched ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4">
          {/* Title and Category */}
          <div className="mb-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
              {auction.title}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="capitalize">{auction.category}</span>
              {auction.subcategory && (
                <>
                  <span>•</span>
                  <span className="capitalize">{auction.subcategory}</span>
                </>
              )}
            </div>
          </div>

          {/* Condition */}
          <div className="mb-3">
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getConditionColor(auction.condition)}`}>
              {auction.condition.charAt(0).toUpperCase() + auction.condition.slice(1)}
            </span>
          </div>

          {/* Price Information */}
          <div className="mb-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Current Bid</p>
                <p className="text-xl font-bold text-gray-900">
                  ${auction.currentBid.toLocaleString()}
                </p>
              </div>
              {auction.reservePrice && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">Reserve</p>
                  <p className="text-sm font-medium text-gray-700">
                    ${auction.reservePrice.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Time and Stats */}
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>
                  {auction.status === 'active' && auction.timeRemaining 
                    ? formatTimeRemaining(auction.timeRemaining)
                    : auction.status === 'ended' 
                    ? 'Ended' 
                    : 'Scheduled'
                  }
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{auction.views}</span>
              </div>
            </div>
            <div className="text-right">
              <p>{auction.bidCount} bid{auction.bidCount !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Seller Info */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Seller: <span className="font-medium">{auction.seller?.username}</span>
              </p>
              {auction.status === 'active' && (
                 <button
                   onClick={handlePlaceBid}
                   className="px-3 py-1 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors duration-200"
                 >
                   View
                 </button>
               )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default AuctionCard;