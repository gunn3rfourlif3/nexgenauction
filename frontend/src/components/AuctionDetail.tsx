import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageGallery from './ImageGallery';
import { 
  Heart, 
  Clock, 
  Eye, 
  Tag, 
  User, 
  Shield, 
  AlertCircle,
  TrendingUp,
  Calendar,
  DollarSign,
  Zap
} from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';

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

interface AuctionDetailProps {
  auction: Auction;
  onWatchlistToggle?: (auctionId: string, isWatched: boolean) => void;
  onPlaceBid?: (auctionId: string, amount: number) => void;
  isWatched?: boolean;
  currentUserId?: string;
  loading?: boolean;
}

const AuctionDetail: React.FC<AuctionDetailProps> = ({
  auction,
  onWatchlistToggle,
  onPlaceBid,
  isWatched = false,
  currentUserId,
  loading = false
}) => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  
  // Initialize hooks first (before any early returns)
  const [bidAmount, setBidAmount] = useState(
    auction && auction.currentBid && auction.bidIncrement 
      ? auction.currentBid + auction.bidIncrement 
      : 0
  );
  const [activeTab, setActiveTab] = useState<'description' | 'condition' | 'bids' | 'shipping'>('description');

  // Early return for loading state (after hooks)
  if (loading || !auction || !auction._id) {
    return (
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
    );
  }

  const formatTimeRemaining = (timeRemaining: number) => {
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
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

  const handleWatchlistClick = () => {
    if (onWatchlistToggle) {
      onWatchlistToggle(auction._id, !isWatched);
    }
  };

  const handlePlaceBid = () => {
    if (onPlaceBid && bidAmount > auction.currentBid) {
      onPlaceBid(auction._id, bidAmount);
    }
  };

  const canBid = auction.status === 'active' && currentUserId && currentUserId !== auction.seller?._id;
  const isOwner = currentUserId === auction.seller?._id;

  if (loading) {
    return (
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
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div>
          <ImageGallery images={auction.images} title={auction.title} />
        </div>

        {/* Auction Information */}
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{auction.title}</h1>
              {currentUserId && !isOwner && (
                <button
                  onClick={handleWatchlistClick}
                  className={`p-2 rounded-full transition-colors duration-200 ${
                    isWatched 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Heart className={`w-6 h-6 ${isWatched ? 'fill-current' : ''}`} />
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <span className="capitalize">{auction.category}</span>
              {auction.subcategory && (
                <>
                  <span>•</span>
                  <span className="capitalize">{auction.subcategory}</span>
                </>
              )}
              <span>•</span>
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{auction.views} views</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(auction.status)}`}>
                {auction.status.charAt(0).toUpperCase() + auction.status.slice(1)}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConditionColor(auction.condition)}`}>
                {auction.condition.charAt(0).toUpperCase() + auction.condition.slice(1)}
              </span>
              {auction.featured && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-500 text-white">
                  Featured
                </span>
              )}
            </div>
          </div>

          {/* Price and Bidding */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Current Bid</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(auction.currentBid)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Starting Price</p>
                <p className="text-lg font-medium text-gray-700">
                  {formatCurrency(auction.startingPrice)}
                </p>
              </div>
            </div>

            {auction.reservePrice && (
              <div className="mb-4">
                <p className="text-sm text-gray-600">Reserve Price</p>
                <p className="text-lg font-medium text-gray-700">
                  {auction.reservePrice !== undefined ? formatCurrency(auction.reservePrice) : ''}
                  {auction.currentBid >= auction.reservePrice && (
                    <span className="ml-2 text-green-600 text-sm">✓ Met</span>
                  )}
                </p>
              </div>
            )}

            {/* Time Remaining */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-gray-600" />
                <span className="text-sm text-gray-600">
                  {auction.status === 'active' && auction.timeRemaining 
                    ? `Time Remaining: ${formatTimeRemaining(auction.timeRemaining)}`
                    : auction.status === 'ended' 
                    ? 'Auction Ended' 
                    : `Starts: ${new Date(auction.startTime).toLocaleDateString()}`
                  }
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Ends: {new Date(auction.endTime).toLocaleDateString()} at {new Date(auction.endTime).toLocaleTimeString()}
              </p>
            </div>

            {/* Bidding Section */}
            {canBid && (
              <div className="border-t pt-4">
                {/* Live Bidding Button */}
                <div className="mb-4">
                  <button
                    onClick={() => navigate(`/auctions/${auction._id}/bid`)}
                    className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-md hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center justify-center gap-2 font-semibold"
                  >
                    <Zap className="w-5 h-5" />
                    Live Bidding Interface
                  </button>
                </div>
                
                {/* Quick Bid Section */}
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-2">Quick Bid:</p>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(Number(e.target.value))}
                      min={auction.currentBid + auction.bidIncrement}
                      step={auction.bidIncrement}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handlePlaceBid}
                      disabled={bidAmount <= auction.currentBid}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      Place Bid
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">
                    Minimum bid: {formatCurrency(auction.currentBid + auction.bidIncrement)}
                  </p>
                </div>
              </div>
            )}

            {/* Bid Count */}
            <div className="flex items-center gap-2 mt-4">
              <TrendingUp className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">
                {auction.bidCount} bid{auction.bidCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Seller Information */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <User className="w-5 h-5" />
              Seller Information
            </h3>
            <div className="space-y-2">
              <p><span className="font-medium">Username:</span> {auction.seller?.username}</p>
              <p><span className="font-medium">Name:</span> {auction.seller?.firstName} {auction.seller?.lastName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Information Tabs */}
      <div className="mt-12">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['description', 'condition', 'bids', 'shipping'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === 'description' && (
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{auction.description}</p>
              {auction.tags && Array.isArray(auction.tags) && auction.tags.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {auction.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'condition' && (
            <div className="space-y-6">
              {auction.conditionReport?.overall && (
                <div>
                  <h4 className="text-lg font-medium mb-2">Overall Condition</h4>
                  <p className="text-gray-700">{auction.conditionReport.overall}</p>
                </div>
              )}

              {auction.conditionReport?.defects && Array.isArray(auction.conditionReport.defects) && auction.conditionReport.defects.length > 0 && (
                <div>
                  <h4 className="text-lg font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                    Known Defects
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    {auction.conditionReport.defects.map((defect, index) => (
                      <li key={index} className="text-gray-700">{defect}</li>
                    ))}
                  </ul>
                </div>
              )}

              {auction.conditionReport?.authenticity && (
                <div>
                  <h4 className="text-lg font-medium mb-2 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-500" />
                    Authenticity
                  </h4>
                  <div className="space-y-2">
                    <p className={`flex items-center gap-2 ${
                      auction.conditionReport.authenticity.verified ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        auction.conditionReport.authenticity.verified ? 'bg-green-500' : 'bg-gray-400'
                      }`}></span>
                      {auction.conditionReport.authenticity.verified ? 'Verified Authentic' : 'Not Verified'}
                    </p>
                    {auction.conditionReport.authenticity.certificate && (
                      <p className="text-gray-700">
                        Certificate: {auction.conditionReport.authenticity.certificate}
                      </p>
                    )}
                    {auction.conditionReport.authenticity.verifiedBy && (
                      <p className="text-gray-700">
                        Verified by: {auction.conditionReport.authenticity.verifiedBy}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {auction.conditionReport?.provenance && (
                <div>
                  <h4 className="text-lg font-medium mb-2">Provenance</h4>
                  <p className="text-gray-700">{auction.conditionReport.provenance}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'bids' && (
            <div>
              <h4 className="text-lg font-medium mb-4">Bidding History</h4>
              {auction.bids && Array.isArray(auction.bids) && auction.bids.length > 0 ? (
                <div className="space-y-3">
                  {auction.bids
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((bid, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{bid.bidder.username}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(bid.timestamp).toLocaleDateString()} at {new Date(bid.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(bid.amount)}
                        </p>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-600">No bids yet. Be the first to bid!</p>
              )}
            </div>
          )}

          {activeTab === 'shipping' && (
            <div>
              <h4 className="text-lg font-medium mb-4">Shipping Information</h4>
              {auction.shippingInfo ? (
                <div className="space-y-4">
                  <div>
                    <p className="font-medium">Shipping Cost</p>
                    <p className="text-gray-700">{formatCurrency(auction.shippingInfo.cost)}</p>
                  </div>
                  <div>
                    <p className="font-medium">Available Methods</p>
                    <ul className="list-disc list-inside text-gray-700">
                      {auction.shippingInfo.methods && Array.isArray(auction.shippingInfo.methods) && 
                       auction.shippingInfo.methods.map((method, index) => (
                        <li key={index}>{method}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">International Shipping</p>
                    <p className="text-gray-700">
                      {auction.shippingInfo.international ? 'Available' : 'Not Available'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">Shipping information not provided.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuctionDetail;
