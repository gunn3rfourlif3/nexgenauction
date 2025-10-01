import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { 
  User, 
  Gavel, 
  Heart, 
  TrendingUp, 
  Settings,
  Calendar,
  DollarSign,
  Eye,
  Clock,
  Award,
  Shield,
  Plus
} from 'lucide-react';
import { apiEndpoints } from '../services/api';

interface DashboardStats {
  totalAuctions: number;
  activeAuctions: number;
  totalBids: number;
  watchlistCount: number;
  wonAuctions: number;
  totalEarnings: number;
}

interface Auction {
  _id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  images: Array<{
    url: string;
    alt?: string;
    isPrimary: boolean;
  }>;
  startingPrice: number;
  currentBid: number;
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
  bidCount: number;
  timeRemaining?: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<DashboardStats>({
    totalAuctions: 0,
    activeAuctions: 0,
    totalBids: 0,
    watchlistCount: 0,
    wonAuctions: 0,
    totalEarnings: 0
  });
  const [myAuctions, setMyAuctions] = useState<Auction[]>([]);
  const [myBids, setMyBids] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchDashboardData();
    }
  }, [isAuthenticated, user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch user's auctions
      const auctionsResponse = await apiEndpoints.auctions.getUserAuctions();
      const userAuctions = auctionsResponse.data.data.auctions;
      setMyAuctions(userAuctions);

      // Fetch user's bids
      const bidsResponse = await apiEndpoints.auctions.getUserBids();
      const userBids = bidsResponse.data.data.auctions;
      setMyBids(userBids);

      // Fetch watchlist (assuming we have this endpoint)
      try {
        const watchlistResponse = await apiEndpoints.auctions.getAll({ watchedBy: user?._id });
        setWatchlist(watchlistResponse.data.data.auctions || []);
      } catch (error) {
        console.log('Watchlist fetch failed, using empty array');
        setWatchlist([]);
      }

      // Calculate stats
      const activeAuctions = userAuctions.filter((auction: Auction) => auction.status === 'active').length;
      const wonAuctions = userBids.filter((bid: any) => bid.winner?._id === user?._id).length;
      const totalEarnings = userAuctions
        .filter((auction: Auction) => auction.status === 'ended')
        .reduce((sum: number, auction: Auction) => sum + auction.currentBid, 0);

      setStats({
        totalAuctions: userAuctions.length,
        activeAuctions,
        totalBids: userBids.length,
        watchlistCount: watchlist.length,
        wonAuctions,
        totalEarnings
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showNotification('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatTimeRemaining = (endTime: string) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const handleCreateAuction = () => {
    if (!isAuthenticated) {
      showNotification('Please log in to create an auction', 'error');
      navigate('/login');
      return;
    }

    // Navigate to the general create auction page for all users
    navigate('/create-auction');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">Please log in to access your dashboard.</p>
          <a
            href="/login"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'my-auctions', label: 'My Auctions', icon: Gavel },
    { id: 'my-bids', label: 'My Bids', icon: DollarSign },
    { id: 'watchlist', label: 'Watchlist', icon: Heart },
    { id: 'profile', label: 'Profile', icon: User },
    ...(user?.role === 'admin' ? [{ id: 'admin', label: 'Admin Panel', icon: Shield }] : []),
  ];

  const StatCard = ({ title, value, icon: Icon, color = 'blue' }: any) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 rounded-lg bg-${color}-100`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.firstName || user?.username}!
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your auctions, bids, and account settings from your dashboard.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard
                title="Total Auctions"
                value={stats.totalAuctions}
                icon={Gavel}
                color="blue"
              />
              <StatCard
                title="Active Auctions"
                value={stats.activeAuctions}
                icon={Clock}
                color="green"
              />
              <StatCard
                title="Total Bids"
                value={stats.totalBids}
                icon={DollarSign}
                color="purple"
              />
              <StatCard
                title="Watchlist Items"
                value={stats.watchlistCount}
                icon={Heart}
                color="red"
              />
              <StatCard
                title="Won Auctions"
                value={stats.wonAuctions}
                icon={Award}
                color="yellow"
              />
              <StatCard
                title="Total Earnings"
                value={formatCurrency(stats.totalEarnings)}
                icon={TrendingUp}
                color="green"
              />
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myAuctions.slice(0, 3).map((auction) => (
                      <div key={auction._id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center space-x-3">
                          <img
                            src={auction.images?.find(img => img.isPrimary)?.url || '/placeholder-image.jpg'}
                            alt={auction.title}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{auction.title}</p>
                            <p className="text-sm text-gray-500">
                              Current bid: {formatCurrency(auction.currentBid)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatTimeRemaining(auction.endTime)}
                          </p>
                          <p className="text-xs text-gray-500">{auction.bidCount} bids</p>
                        </div>
                      </div>
                    ))}
                    {myAuctions.length === 0 && (
                      <p className="text-center text-gray-500 py-8">
                        No recent activity. Start by creating your first auction!
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* My Auctions Tab */}
        {activeTab === 'my-auctions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-medium text-gray-900">My Auctions</h3>
              <button 
                onClick={handleCreateAuction}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Create New Auction
              </button>
            </div>
            
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : myAuctions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Auction
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Bid
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bids
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time Remaining
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {myAuctions.map((auction) => (
                        <tr key={auction._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <img
                                src={auction.images?.find(img => img.isPrimary)?.url || '/placeholder-image.jpg'}
                                alt={auction.title}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{auction.title}</div>
                                <div className="text-sm text-gray-500">{auction.category}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              auction.status === 'active' 
                                ? 'bg-green-100 text-green-800'
                                : auction.status === 'ended'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {auction.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(auction.currentBid)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {auction.bidCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTimeRemaining(auction.endTime)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-blue-600 hover:text-blue-900 mr-3">
                              View
                            </button>
                            <button className="text-gray-600 hover:text-gray-900">
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Gavel className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No auctions yet</h3>
                  <p className="text-gray-500 mb-6">Start selling by creating your first auction.</p>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                    Create Your First Auction
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* My Bids Tab */}
        {activeTab === 'my-bids' && (
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-gray-900">My Bids</h3>
            
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : myBids.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Auction
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          My Highest Bid
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Bid
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time Remaining
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {myBids.map((bid) => (
                        <tr key={bid._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <img
                                src={bid.images?.find((img: any) => img.isPrimary)?.url || '/placeholder-image.jpg'}
                                alt={bid.title}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{bid.title}</div>
                                <div className="text-sm text-gray-500">{bid.category}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(bid.highestUserBid || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(bid.currentBid)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              bid.winner?._id === user?._id
                                ? 'bg-green-100 text-green-800'
                                : bid.status === 'active'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {bid.winner?._id === user?._id ? 'Won' : bid.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTimeRemaining(bid.endTime)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-blue-600 hover:text-blue-900">
                              View Auction
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No bids yet</h3>
                  <p className="text-gray-500 mb-6">Start bidding on auctions that interest you.</p>
                  <a
                    href="/auctions"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors inline-block"
                  >
                    Browse Auctions
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Watchlist Tab */}
        {activeTab === 'watchlist' && (
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-gray-900">My Watchlist</h3>
            
            <div className="bg-white rounded-lg shadow">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : watchlist.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                  {watchlist.map((auction) => (
                    <div key={auction._id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      <img
                        src={auction.images?.find(img => img.isPrimary)?.url || '/placeholder-image.jpg'}
                        alt={auction.title}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-4">
                        <h4 className="font-medium text-gray-900 mb-2">{auction.title}</h4>
                        <p className="text-sm text-gray-500 mb-2">{auction.category}</p>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-lg font-bold text-green-600">
                            {formatCurrency(auction.currentBid)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {auction.bidCount} bids
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            {formatTimeRemaining(auction.endTime)}
                          </span>
                          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No items in watchlist</h3>
                  <p className="text-gray-500 mb-6">Add auctions to your watchlist to keep track of them.</p>
                  <a
                    href="/auctions"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors inline-block"
                  >
                    Browse Auctions
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-gray-900">Profile Settings</h3>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center space-x-6 mb-6">
                <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-600" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </h4>
                  <p className="text-gray-500">@{user?.username}</p>
                  <p className="text-gray-500">{user?.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={user?.firstName || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={user?.lastName || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={user?.username || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly
                  />
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-4">
                  To edit your profile information, please visit the full profile page.
                </p>
                <a
                  href="/profile"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors inline-block"
                >
                  Edit Full Profile
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Admin Panel Tab */}
        {activeTab === 'admin' && user?.role === 'admin' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-medium text-gray-900">Admin Panel</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Create Auction Card */}
                <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Plus className="w-5 h-5 text-green-600" />
                    </div>
                    <h4 className="font-medium text-gray-900">Create Auction</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Create new auction listings with full administrative privileges.
                  </p>
                  <a
                    href="/admin/create-auction"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Auction
                  </a>
                </div>

                {/* Manage Auctions Card */}
                <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Gavel className="w-5 h-5 text-blue-600" />
                    </div>
                    <h4 className="font-medium text-gray-900">Manage Auctions</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    View, edit, and manage all auction listings in the system.
                  </p>
                  <a
                    href="/auctions"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Gavel className="w-4 h-4" />
                    View All Auctions
                  </a>
                </div>

                {/* User Management Card */}
                <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <h4 className="font-medium text-gray-900">User Management</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Manage user accounts, roles, and permissions.
                  </p>
                  <button
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                    disabled
                  >
                    <User className="w-4 h-4" />
                    Coming Soon
                  </button>
                </div>

                {/* System Stats Card */}
                <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-orange-600" />
                    </div>
                    <h4 className="font-medium text-gray-900">System Statistics</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    View platform analytics and performance metrics.
                  </p>
                  <button
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm"
                    disabled
                  >
                    <TrendingUp className="w-4 h-4" />
                    Coming Soon
                  </button>
                </div>

                {/* Settings Card */}
                <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Settings className="w-5 h-5 text-gray-600" />
                    </div>
                    <h4 className="font-medium text-gray-900">System Settings</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Configure platform settings and preferences.
                  </p>
                  <button
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                    disabled
                  >
                    <Settings className="w-4 h-4" />
                    Coming Soon
                  </button>
                </div>

                {/* Reports Card */}
                <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Award className="w-5 h-5 text-red-600" />
                    </div>
                    <h4 className="font-medium text-gray-900">Reports</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Generate and view detailed system reports.
                  </p>
                  <button
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                    disabled
                  >
                    <Award className="w-4 h-4" />
                    Coming Soon
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder content for other tabs */}
        {activeTab !== 'overview' && activeTab !== 'profile' && activeTab !== 'admin' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h3 className="text-xl font-medium text-gray-900 mb-4">
              {tabs.find(tab => tab.id === activeTab)?.label}
            </h3>
            <p className="text-gray-600">
              This section is under development. Content for {activeTab} will be implemented here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;