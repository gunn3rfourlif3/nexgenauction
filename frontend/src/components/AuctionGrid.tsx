import React from 'react';
import AuctionCard from './AuctionCard';
import { Package } from 'lucide-react';

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

interface AuctionGridProps {
  auctions: Auction[];
  loading?: boolean;
  onWatchlistToggle?: (auctionId: string, isWatched: boolean) => void;
  watchedAuctions?: string[];
  currentUserId?: string;
  emptyMessage?: string;
}

const AuctionGrid: React.FC<AuctionGridProps> = ({
  auctions,
  loading = false,
  onWatchlistToggle,
  watchedAuctions = [],
  currentUserId,
  emptyMessage = "No auctions found"
}) => {
  // Loading skeleton
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
            <div className="h-48 bg-gray-300"></div>
            <div className="p-4">
              <div className="h-4 bg-gray-300 rounded mb-2"></div>
              <div className="h-3 bg-gray-300 rounded mb-3 w-3/4"></div>
              <div className="h-3 bg-gray-300 rounded mb-3 w-1/2"></div>
              <div className="flex justify-between">
                <div className="h-6 bg-gray-300 rounded w-1/3"></div>
                <div className="h-4 bg-gray-300 rounded w-1/4"></div>
              </div>
              <div className="flex justify-between mt-3">
                <div className="h-3 bg-gray-300 rounded w-1/4"></div>
                <div className="h-3 bg-gray-300 rounded w-1/4"></div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (!auctions || auctions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Auctions Found</h3>
        <p className="text-gray-600 max-w-md">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {auctions.map((auction) => (
        <AuctionCard
          key={auction._id}
          auction={auction}
          onWatchlistToggle={onWatchlistToggle}
          isWatched={watchedAuctions.includes(auction._id)}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
};

export default AuctionGrid;