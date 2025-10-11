import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { 
  User, 
  Gavel, 
  Heart, 
  TrendingUp, 
  Settings,
  DollarSign,
  Clock,
  Award,
  Shield,
  Plus,
  Wallet
} from 'lucide-react';
import api, { apiEndpoints } from '../services/api';
import ConfirmationModal from '../components/ConfirmationModal';
import DuplicateAuctionModal from '../components/DuplicateAuctionModal';
import AccountSection from '../components/Account/AccountSection';

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
  status: 'scheduled' | 'active' | 'ended' | 'paused' | 'cancelled';
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
  const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({});
  
  // Modal states
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    auction: Auction | null;
  }>({ isOpen: false, auction: null });
  
  const [duplicateModal, setDuplicateModal] = useState<{
    isOpen: boolean;
    auction: Auction | null;
  }>({ isOpen: false, auction: null });

  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean;
    auction: Auction | null;
  }>({ isOpen: false, auction: null });
  const [cancelReasonInput, setCancelReasonInput] = useState<string>('');

  const fetchDashboardData = useCallback(async () => {
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

      // Fetch watchlist via dedicated endpoint
      let userWatchlist: Auction[] = [];
      let watchlistTotalItems = 0;
      try {
        const watchlistResponse = await apiEndpoints.auctions.getUserWatchlist({ page: 1, limit: 12 });
        const data = watchlistResponse.data?.data || watchlistResponse.data || {};
        userWatchlist = data.auctions || [];
        const pagination = data.pagination || {};
        watchlistTotalItems = Number(pagination.totalItems || userWatchlist.length || 0);
        setWatchlist(userWatchlist);
      } catch (error) {
        console.log('Watchlist fetch failed, using empty array');
        userWatchlist = [];
        watchlistTotalItems = 0;
        setWatchlist([]);
      }

      // Calculate stats
      const activeAuctions = userAuctions.filter((auction: Auction) => auction.status === 'active').length;
      const wonAuctions = userBids.filter((auction: any) => auction.winner?._id === user?._id).length;
      // Sum of all bids the user placed across auctions
      const totalUserBids = Array.isArray(userBids)
        ? userBids.reduce((sum: number, auction: any) => {
            const count = Array.isArray(auction?.userBids) ? auction.userBids.length : 0;
            return sum + count;
          }, 0)
        : 0;
      const totalEarnings = userAuctions
        .filter((auction: Auction) => auction.status === 'ended')
        .reduce((sum: number, auction: Auction) => sum + auction.currentBid, 0);

      setStats({
        totalAuctions: userAuctions.length,
        activeAuctions,
        totalBids: totalUserBids,
        watchlistCount: watchlistTotalItems,
        wonAuctions,
        totalEarnings
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showNotification('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showNotification]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchDashboardData();
    }
  }, [isAuthenticated, user, fetchDashboardData]);

  // Re-fetch when returning to Overview tab
  useEffect(() => {
    if (activeTab === 'overview' && isAuthenticated && user) {
      fetchDashboardData();
    }
  }, [activeTab, isAuthenticated, user, fetchDashboardData]);

  // Lightweight polling to keep overview fresh
  useEffect(() => {
    if (activeTab !== 'overview' || !isAuthenticated || !user) return;
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [activeTab, isAuthenticated, user, fetchDashboardData]);

  // Refresh data when switching to My Bids tab
  useEffect(() => {
    if (activeTab === 'my-bids' && isAuthenticated && user) {
      fetchDashboardData();
    }
  }, [activeTab, isAuthenticated, user, fetchDashboardData]);

  // Lightweight polling to keep My Bids fresh while viewing that tab
  useEffect(() => {
    if (activeTab !== 'my-bids' || !isAuthenticated || !user) return;
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 15000); // refresh every 15s on My Bids
    return () => clearInterval(interval);
  }, [activeTab, isAuthenticated, user, fetchDashboardData]);

  // Listen for cross-page bid-placed events to refresh My Bids immediately
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const handler = (e: Event) => {
      try {
        // Only refresh if we're on My Bids or Overview, to keep UX snappy
        if (activeTab === 'my-bids' || activeTab === 'overview') {
          fetchDashboardData();
        }
      } catch {}
    };
    window.addEventListener('nexgen:bid-placed', handler as EventListener);
    return () => {
      window.removeEventListener('nexgen:bid-placed', handler as EventListener);
    };
  }, [activeTab, isAuthenticated, user, fetchDashboardData]);

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

  // Handle view auction
  const handleViewAuction = (auctionId: string) => {
    if (!auctionId) {
      showNotification('Invalid auction ID', 'error');
      return;
    }
    navigate(`/auctions/${auctionId}`);
  };

  // Handle edit auction
  const handleEditAuction = (auctionId: string) => {
    if (!auctionId) {
      showNotification('Invalid auction ID', 'error');
      return;
    }
    if (!isAuthenticated) {
      showNotification('Please log in to edit auctions', 'error');
      navigate('/login');
      return;
    }
    navigate(`/auctions/${auctionId}/edit`);
  };

  // Handle delete auction
  const handleDeleteAuction = (auction: Auction) => {
    setDeleteModal({ isOpen: true, auction });
  };

  const confirmDeleteAuction = async () => {
    const auction = deleteModal.auction;
    if (!auction) return;
    
    setActionLoading(prev => ({ ...prev, [`delete-${auction._id}`]: true }));
    
    try {
      await api.delete(`/auctions/${auction._id}`);
      showNotification('Auction deleted successfully', 'success');
      
      // Refresh auctions list
      setMyAuctions(prev => prev.filter(a => a._id !== auction._id));
      setDeleteModal({ isOpen: false, auction: null });
      
      // Refresh dashboard data to update stats
      fetchDashboardData();
    } catch (err: any) {
      console.error('Error deleting auction:', err);
      
      let errorMessage = 'Failed to delete auction';
      if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to delete this auction';
      } else if (err.response?.status === 404) {
        errorMessage = 'Auction not found';
      } else if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || 'Cannot delete auction with active bids';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [`delete-${auction._id}`]: false }));
    }
  };

  // Handle duplicate auction
  const handleDuplicateAuction = (auction: Auction) => {
    setDuplicateModal({ isOpen: true, auction });
  };

  const confirmDuplicateAuction = async (duplicateData: any) => {
    const auction = duplicateModal.auction;
    if (!auction) return;
    
    // Validate required fields
    if (!duplicateData.title?.trim()) {
      showNotification('Title is required', 'error');
      return;
    }
    
    if (!duplicateData.startTime || !duplicateData.endTime) {
      showNotification('Start and end times are required', 'error');
      return;
    }
    
    if (new Date(duplicateData.startTime) >= new Date(duplicateData.endTime)) {
      showNotification('End time must be after start time', 'error');
      return;
    }
    
    if (duplicateData.startingPrice <= 0) {
      showNotification('Starting price must be greater than 0', 'error');
      return;
    }
    
    setActionLoading(prev => ({ ...prev, [`duplicate-${auction._id}`]: true }));
    
    try {
      const response = await apiEndpoints.auctions.create(duplicateData);
      
      if (response.data) {
        // Add the new auction to the list
        setMyAuctions(prev => [response.data, ...prev]);
        showNotification(`Auction "${duplicateData.title}" created successfully!`, 'success');
        setDuplicateModal({ isOpen: false, auction: null });
        
        // Refresh dashboard data to update stats
        fetchDashboardData();
      }
    } catch (err: any) {
      console.error('Error duplicating auction:', err);
      
      let errorMessage = 'Failed to duplicate auction';
      if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || 'Invalid auction data';
      } else if (err.response?.status === 401) {
        errorMessage = 'Please log in to create auctions';
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to create auctions';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [`duplicate-${auction._id}`]: false }));
    }
  };

  // Handle pause/resume auction
  const handleToggleAuctionStatus = async (auctionId: string, currentStatus: string) => {
    if (!auctionId) {
      showNotification('Invalid auction ID', 'error');
      return;
    }
    
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    const action = newStatus === 'active' ? 'resume' : 'pause';
    
    setActionLoading(prev => ({ ...prev, [`toggle-${auctionId}`]: true }));
    
    try {
      await api.patch(`/auctions/${auctionId}/status`, { status: newStatus });
      showNotification(`Auction ${action}d successfully`, 'success');
      
      // Update auction status in the list
      setMyAuctions(prev => 
        prev.map(auction => 
          auction._id === auctionId 
            ? { ...auction, status: newStatus as 'scheduled' | 'active' | 'ended' | 'paused' }
            : auction
        )
      );
      
      // Refresh dashboard data to update stats
      fetchDashboardData();
    } catch (err: any) {
      console.error(`Error ${action}ing auction:`, err);
      
      let errorMessage = `Failed to ${action} auction`;
      if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to modify this auction';
      } else if (err.response?.status === 404) {
        errorMessage = 'Auction not found';
      } else if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || `Cannot ${action} auction`;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [`toggle-${auctionId}`]: false }));
    }
  };

  // Check if auction can be edited
  const canEditAuction = (auction: any) => {
    return auction.status !== 'ended' && auction.bidCount === 0;
  };

  // Check if auction can be deleted
  const canDeleteAuction = (auction: any) => {
    return auction.status !== 'ended' && auction.bidCount === 0;
  };

  // Check if auction can be paused/resumed
  const canToggleStatus = (auction: any) => {
    return auction.status === 'active' || auction.status === 'paused';
  };

  // Check if auction can be extended
  const canExtendAuction = (auction: any) => {
    return auction.status === 'active' || auction.status === 'paused';
  };

  // Check if auction can be cancelled
  const canCancelAuction = (auction: any) => {
    const hasBids = auction.bidCount && auction.bidCount > 0;
    const isSellerActionable = auction.status === 'active' || auction.status === 'paused';
    const isAdmin = user?.role === 'admin';
    return isSellerActionable && (!hasBids || isAdmin);
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

  // Inline extend controls state
  const [extendVisible, setExtendVisible] = useState<Record<string, boolean>>({});
  const [extendMinutes, setExtendMinutes] = useState<Record<string, string>>({});

  // Extend auction end time
  const handleExtendAuction = async (auction: Auction) => {
    if (!auction) return;

    const raw = extendMinutes[auction._id];
    const minutes = parseInt((raw ?? '').trim(), 10);
    if (!raw || isNaN(minutes) || minutes <= 0) {
      showNotification('Enter a valid positive number of minutes', 'error');
      return;
    }

    setActionLoading(prev => ({ ...prev, [`extend-${auction._id}`]: true }));

    try {
      await apiEndpoints.auctions.extend(auction._id, { extensionMinutes: minutes });
      // Hide and clear inline input on success
      setExtendVisible(prev => ({ ...prev, [auction._id]: false }));
      setExtendMinutes(prev => {
        const next = { ...prev };
        delete next[auction._id];
        return next;
      });
      setMyAuctions(prev => prev.map(a => {
        if (a._id !== auction._id) return a;
        const currentEnd = new Date(a.endTime).getTime();
        const updatedEnd = new Date(currentEnd + minutes * 60000).toISOString();
        return { ...a, endTime: updatedEnd };
      }));
      showNotification(`Auction extended by ${minutes} minute(s)`, 'success');
      fetchDashboardData();
    } catch (err: any) {
      console.error('Error extending auction:', err);
      let errorMessage = 'Failed to extend auction';
      if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to extend this auction';
      } else if (err.response?.status === 404) {
        errorMessage = 'Auction not found';
      } else if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || 'Cannot extend auction';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      showNotification(errorMessage, 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [`extend-${auction._id}`]: false }));
    }
  };

  // Cancel auction
  const handleCancelAuction = (auction: Auction) => {
    setCancelModal({ isOpen: true, auction });
    setCancelReasonInput('');
  };

  const confirmCancelAuction = async () => {
    const auction = cancelModal.auction;
    if (!auction) return;
    const reason = (cancelReasonInput || '').trim();
    if (reason && reason.length < 3) {
      showNotification('Reason must be at least 3 characters or leave empty', 'error');
      return;
    }

    setActionLoading(prev => ({ ...prev, [`cancel-${auction._id}`]: true }));

    try {
      const payload = reason ? { reason } : {};
      await apiEndpoints.auctions.cancel(auction._id, payload);
      showNotification('Auction cancelled successfully', 'success');
      setMyAuctions(prev => prev.map(a => a._id === auction._id ? { ...a, status: 'cancelled' } : a));
      setCancelModal({ isOpen: false, auction: null });
      setCancelReasonInput('');
      fetchDashboardData();
    } catch (err: any) {
      console.error('Error cancelling auction:', err);
      let errorMessage = 'Failed to cancel auction';
      if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to cancel this auction';
      } else if (err.response?.status === 404) {
        errorMessage = 'Auction not found';
      } else if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || 'Cannot cancel auction';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      showNotification(errorMessage, 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [`cancel-${auction._id}`]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black"></div>
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
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-900"
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
    { id: 'history', label: 'Auction History', icon: Clock },
    { id: 'disputes', label: 'Disputes', icon: Shield },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'account', label: 'Account Management', icon: Wallet },
    ...(user?.role === 'admin' ? [{ id: 'admin', label: 'Admin Panel', icon: Shield }] : []),
  ];

  const StatCard = ({ title, value, icon: Icon }: any) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0 p-3 rounded-lg bg-gray-100">
          <Icon className="w-6 h-6 text-black" />
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
                      ? 'border-black text-black'
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
            {/* Manual Refresh */}
            <div className="flex justify-end">
              <button
                onClick={fetchDashboardData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
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
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-black`}>
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
                            <div className="flex items-center space-x-2">
                              {/* View Button */}
                              <button 
                                onClick={() => handleViewAuction(auction._id)}
                                className="text-black hover:text-gray-900 transition-colors"
                                title="View auction details"
                              >
                                View
                              </button>
                              
                              {/* Edit Button - Conditional */}
                              {canEditAuction(auction) ? (
                                <button 
                                  onClick={() => handleEditAuction(auction._id)}
                                  className="text-black hover:text-gray-900 transition-colors"
                                  title="Edit auction"
                                >
                                  Edit
                                </button>
                              ) : (
                                <span 
                                  className="text-gray-400 cursor-not-allowed"
                                  title={auction.status === 'ended' ? 'Cannot edit ended auctions' : 'Cannot edit auctions with bids'}
                                >
                                  Edit
                                </span>
                              )}
                              
                              {/* Pause/Resume Button */}
                              {canToggleStatus(auction) && (
                                <button 
                                  onClick={() => handleToggleAuctionStatus(auction._id, auction.status)}
                                  disabled={actionLoading[`toggle-${auction._id}`]}
                                  className={`transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                    auction.status === 'active' 
                                      ? 'text-yellow-600 hover:text-yellow-900' 
                                      : 'text-green-600 hover:text-green-900'
                                  }`}
                                  title={auction.status === 'active' ? 'Pause auction' : 'Resume auction'}
                                >
                                  {actionLoading[`toggle-${auction._id}`] 
                                    ? (auction.status === 'active' ? 'Pausing...' : 'Resuming...')
                                    : (auction.status === 'active' ? 'Pause' : 'Resume')
                                  }
                                </button>
                              )}

                              {/* Extend Button */}
                              {canExtendAuction(auction) ? (
                                <button
                                  onClick={() => setExtendVisible(prev => ({ ...prev, [auction._id]: !prev[auction._id] }))}
                                  disabled={actionLoading[`extend-${auction._id}`]}
                                  className="text-blue-600 hover:text-blue-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Extend auction end time"
                                >
                                  {actionLoading[`extend-${auction._id}`] ? 'Extending...' : 'Extend'}
                                </button>
                              ) : (
                                <span
                                  className="text-gray-400 cursor-not-allowed"
                                  title={auction.status === 'ended' ? 'Cannot extend ended auctions' : 'Cannot extend cancelled auctions'}
                                >
                                  Extend
                                </span>
                              )}

                              {/* Inline Extend Controls */}
                              {extendVisible[auction._id] && (
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="number"
                                    min={1}
                                    value={extendMinutes[auction._id] ?? ''}
                                    onChange={(e) => setExtendMinutes(prev => ({ ...prev, [auction._id]: e.target.value }))}
                                    placeholder="Minutes"
                                    className="w-20 px-2 py-1 border rounded"
                                  />
                                  <button
                                    onClick={() => handleExtendAuction(auction)}
                                    disabled={actionLoading[`extend-${auction._id}`]}
                                    className="text-blue-600 hover:text-blue-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Confirm
                                  </button>
                                </div>
                              )}

                              {/* Cancel Button */}
                              {canCancelAuction(auction) ? (
                                <button
                                  onClick={() => handleCancelAuction(auction)}
                                  disabled={actionLoading[`cancel-${auction._id}`]}
                                  className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Cancel auction"
                                >
                                  {actionLoading[`cancel-${auction._id}`] ? 'Cancelling...' : 'Cancel'}
                                </button>
                              ) : (
                                <span
                                  className="text-gray-400 cursor-not-allowed"
                                  title={auction.bidCount > 0 ? 'Cannot cancel auctions with bids (unless admin)' : 'Cannot cancel this auction'}
                                >
                                  Cancel
                                </span>
                              )}
                              
                              {/* Duplicate Button */}
                              <button 
                                onClick={() => handleDuplicateAuction(auction)}
                                disabled={actionLoading[`duplicate-${auction._id}`]}
                                className="text-purple-600 hover:text-purple-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Duplicate auction"
                              >
                                {actionLoading[`duplicate-${auction._id}`] ? 'Duplicating...' : 'Duplicate'}
                              </button>
                              
                              {/* Delete Button - Conditional */}
                              {canDeleteAuction(auction) ? (
                                <button 
                                  onClick={() => handleDeleteAuction(auction)}
                                  disabled={actionLoading[`delete-${auction._id}`]}
                                  className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Delete auction"
                                >
                                  {actionLoading[`delete-${auction._id}`] ? 'Deleting...' : 'Delete'}
                                </button>
                              ) : (
                                <span 
                                  className="text-gray-400 cursor-not-allowed"
                                  title={auction.status === 'ended' ? 'Cannot delete ended auctions' : 'Cannot delete auctions with bids'}
                                >
                                  Delete
                                </span>
                              )}
                            </div>
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

        {/* Auction History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-medium text-gray-900">Auction History</h3>
              <button
                onClick={async () => {
                  try {
                    setLoading(true);
                    const res = await apiEndpoints.auctions.getUserHistory({ page: 1, limit: 20 });
                    const data = res.data?.data || res.data || {};
                    const endedAuctions = data.auctions || [];
                    setMyAuctions(endedAuctions);
                  } catch (e) {
                    showNotification('Failed to load auction history', 'error');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Loading…' : 'Refresh'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myAuctions.length === 0 && !loading && (
                <p className="text-gray-500">No ended auctions found.</p>
              )}
              {myAuctions.map((auction) => (
                <div key={auction._id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center space-x-4">
                    <img
                      src={auction.images?.find(img => img.isPrimary)?.url || '/placeholder-image.jpg'}
                      alt={auction.title}
                      className="w-16 h-16 rounded object-cover"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{auction.title}</p>
                      <p className="text-sm text-gray-600">Final bid: {formatCurrency(auction.currentBid)}</p>
                      <p className="text-xs text-gray-500">Ended: {new Date(auction.endTime).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disputes Tab */}
        {activeTab === 'disputes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-medium text-gray-900">Payment Disputes</h3>
              <button
                onClick={async () => {
                  try {
                    setLoading(true);
                    const res = await apiEndpoints.payments.getHistory({ page: 1, limit: 20, status: 'disputed' });
                    const data = res.data?.data || res.data || {};
                    const payments = data.payments || [];
                    // Store in actionLoading map temporarily for display; ideally add dedicated state
                    setActionLoading(prev => ({ ...prev, _disputes_count: payments.length }));
                  } catch (e) {
                    showNotification('Failed to load disputes', 'error');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Loading…' : 'Refresh'}
              </button>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h4 className="text-lg font-medium text-gray-900">Your open disputes</h4>
                <p className="text-sm text-gray-500">Count: {actionLoading._disputes_count || 0}</p>
              </div>
              <div className="p-6">
                <p className="text-gray-600">Dispute list and actions will appear here.</p>
              </div>
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
                                ? 'bg-black text-white'
                                : bid.status === 'active'
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-200 text-black'
                            }`}>
                              {bid.winner?._id === user?._id ? 'Won' : bid.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTimeRemaining(bid.endTime)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-black hover:text-gray-900">
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
                    className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-900 transition-colors inline-block"
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
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
                          <span className="text-lg font-bold text-black">
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
                          <button
                            onClick={() => navigate(`/auctions/${auction._id}`)}
                            className="text-black hover:text-gray-900 text-sm font-medium"
                          >
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
                    className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-900 transition-colors inline-block"
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

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Wallet className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-medium text-gray-900">Account Management</h3>
              </div>
              <AccountSection />
            </div>
          </div>
        )}

        {/* Admin Panel Tab */}
        {activeTab === 'admin' && user?.role === 'admin' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-black" />
                <h3 className="text-xl font-medium text-gray-900">Admin Panel</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Create Auction Card */}
                <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gray-200 rounded-lg">
                      <Plus className="w-5 h-5 text-black" />
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
                    <div className="p-2 bg-gray-200 rounded-lg">
                      <User className="w-5 h-5 text-black" />
                    </div>
                    <h4 className="font-medium text-gray-900">User Management</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Manage user accounts, roles, and permissions.
                  </p>
                  <a
                    href="/admin/users"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                  >
                    <User className="w-4 h-4" />
                    Manage Users
                  </a>
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
        {activeTab !== 'overview' && activeTab !== 'profile' && activeTab !== 'admin' && activeTab !== 'account' && (
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

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, auction: null })}
        onConfirm={confirmDeleteAuction}
        title="Delete Auction"
        message={`Are you sure you want to delete "${deleteModal.auction?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        icon="delete"
        loading={actionLoading[`delete-${deleteModal.auction?._id}`]}
      />

      {/* Duplicate Auction Modal */}
      <DuplicateAuctionModal
        isOpen={duplicateModal.isOpen}
        onClose={() => setDuplicateModal({ isOpen: false, auction: null })}
        onConfirm={confirmDuplicateAuction}
        auction={duplicateModal.auction}
        loading={actionLoading[`duplicate-${duplicateModal.auction?._id}`]}
      />

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        isOpen={cancelModal.isOpen}
        onClose={() => setCancelModal({ isOpen: false, auction: null })}
        onConfirm={confirmCancelAuction}
        title="Cancel Auction"
        message={`Are you sure you want to cancel "${cancelModal.auction?.title}"? Bidders will be notified.`}
        confirmText="Cancel Auction"
        cancelText="Keep Auction"
        type="danger"
        icon="warning"
        loading={actionLoading[`cancel-${cancelModal.auction?._id}`]}
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Optional reason</label>
          <input
            type="text"
            value={cancelReasonInput}
            onChange={(e) => setCancelReasonInput(e.target.value)}
            placeholder="Reason for cancellation (optional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </ConfirmationModal>
    </div>
  );
};

export default Dashboard;