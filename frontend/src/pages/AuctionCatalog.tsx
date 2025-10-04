import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SearchFilters from '../components/SearchFilters';
import AuctionGrid from '../components/AuctionGrid';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiEndpoints } from '../services/api';
import { normalizeIds } from '../utils/idUtils';

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

interface Category {
  _id: string;
  count: number;
  subcategories: Array<{
    name: string;
    count: number;
  }>;
}

interface FilterOptions {
  search: string;
  category: string;
  subcategory: string;
  condition: string;
  status: string;
  minPrice: string;
  maxPrice: string;
  featured: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const AuctionCatalog: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { showNotification } = useNotification();

  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12
  });

  // Initialize filters from URL params
  const [filters, setFilters] = useState<FilterOptions>({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    subcategory: searchParams.get('subcategory') || '',
    condition: searchParams.get('condition') || '',
    status: searchParams.get('status') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    featured: searchParams.get('featured') === 'true',
    sortBy: searchParams.get('sortBy') || 'endTime',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc'
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== '' && value !== false) {
        params.set(key, value.toString());
      }
    });
    if (pagination.currentPage > 1) {
      params.set('page', pagination.currentPage.toString());
    }
    setSearchParams(params);
  }, [filters, pagination.currentPage, setSearchParams]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/auctions/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  // Fetch auctions
  const fetchAuctions = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      // Add filters to params
      if (filters.search) params.set('search', filters.search);
      if (filters.category) params.set('category', filters.category);
      if (filters.subcategory) params.set('subcategory', filters.subcategory);
      if (filters.condition) params.set('condition', filters.condition);
      if (filters.status) params.set('status', filters.status);
      if (filters.minPrice) params.set('minPrice', filters.minPrice);
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
      if (filters.featured) params.set('featured', 'true');
      
      // Add pagination and sorting
      params.set('page', page.toString());
      params.set('limit', pagination.itemsPerPage.toString());
      params.set('sortBy', filters.sortBy);
      params.set('sortOrder', filters.sortOrder);

      const response = await fetch(`/api/auctions?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch auctions');
      }

      const data = await response.json();
      // Normalize watchedBy to string IDs for consistent UI state
      const normalizeIds = (arr: any[]) => (Array.isArray(arr) ? arr : [])
        .map((w: any) => {
          if (typeof w === 'string') return w;
          if (w && typeof w === 'object' && w._id) return w._id.toString();
          return '';
        })
        .filter(Boolean);

      const normalizedAuctions = (data.data?.auctions || []).map((auction: any) => ({
        ...auction,
        watchedBy: normalizeIds(auction.watchedBy),
      }));

      setAuctions(normalizedAuctions);
      setPagination(prev => ({
        ...prev,
        currentPage: data.data?.pagination?.currentPage || 1,
        totalPages: data.data?.pagination?.totalPages || 1,
        totalItems: data.data?.pagination?.totalItems || 0
      }));
    } catch (error) {
      console.error('Error fetching auctions:', error);
      setError('Failed to load auctions. Please try again.');
      showNotification('Failed to load auctions', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.itemsPerPage, showNotification]);

  // Handle watchlist toggle
  const handleWatchlistToggle = async (auctionId: string, shouldWatch: boolean) => {
    if (!user) {
      showNotification('Please log in to use the watchlist', 'error');
      navigate('/login');
      return;
    }

    try {
      let alreadyNotWatchedFlag = false;
      if (shouldWatch) {
        await apiEndpoints.auctions.addToWatchlist(auctionId);
      } else {
        const { data: res } = await apiEndpoints.auctions.removeFromWatchlist(auctionId);
        // Support both direct and nested data formats
        alreadyNotWatchedFlag = (res && res.data && typeof res.data.alreadyNotWatched !== 'undefined')
          ? !!res.data.alreadyNotWatched
          : !!res?.alreadyNotWatched;
      }

      // Update the auction in the local state
      setAuctions(prev => prev.map(auction => {
        if (auction._id === auctionId) {
          const current = auction.watchedBy || [];
          const currentIds = normalizeIds(current);
          const watchedBy = shouldWatch 
            ? Array.from(new Set([...currentIds, user._id]))
            : currentIds.filter((id: string) => id !== user._id);
          return { ...auction, watchedBy };
        }
        return auction;
      }));

      // Idempotent feedback: if removal requested but it wasn't watched, show info
      if (!shouldWatch && alreadyNotWatchedFlag) {
        showNotification('Item was not in your watchlist', 'info');
      } else {
        showNotification(shouldWatch ? 'Added to watchlist' : 'Removed from watchlist', 'success');
      }
    } catch (error) {
      const anyErr: any = error;
      // Handle idempotent cases: treat certain 400s as success
      const status = anyErr?.response?.status;
      const msg: string = (anyErr?.response?.data?.message || anyErr?.response?.data?.error || '').toLowerCase();

      const isAddAlready = shouldWatch && status === 400 && msg.includes('already');
      const isRemoveNotPresent = !shouldWatch && status === 400 && msg.includes('not in');

      if (isAddAlready || isRemoveNotPresent) {
        setAuctions(prev => prev.map(auction => {
          if (auction._id === auctionId) {
            const current = auction.watchedBy || [];
            const currentIds = normalizeIds(current);
            const watchedBy = shouldWatch 
              ? Array.from(new Set([...currentIds, user._id]))
              : currentIds.filter((id: string) => id !== user._id);
            return { ...auction, watchedBy };
          }
          return auction;
        }));

        showNotification(shouldWatch ? 'Added to watchlist' : 'Removed from watchlist', 'success');
        return;
      }

      console.error('Error updating watchlist:', error);
      showNotification('Failed to update watchlist', 'error');
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
    fetchAuctions(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle filters change
  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Handle search
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    fetchAuctions(1);
  };

  // Initial data fetch
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '1');
    setPagination(prev => ({ ...prev, currentPage: page }));
    fetchAuctions(page);
  }, [fetchAuctions, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search and Filters */}
      <SearchFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        categories={categories}
        loading={loading}
        onSearch={handleSearch}
        showSearch={!!isAuthenticated}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Results Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {filters.search ? `Search Results for "${filters.search}"` : 'Auction Catalog'}
            </h1>
            <p className="text-gray-600 mt-1">
              {loading ? 'Loading...' : `${pagination.totalItems} auction${pagination.totalItems !== 1 ? 's' : ''} found`}
            </p>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => fetchAuctions(pagination.currentPage)}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Auction Grid */}
        <AuctionGrid
          auctions={auctions}
          loading={loading}
          onWatchlistToggle={handleWatchlistToggle}
          currentUserId={user?._id}
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

        {/* Empty State */}
        {!loading && auctions.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No auctions found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search criteria or browse all categories.
              </p>
              <button
                onClick={() => {
                  setFilters({
                    search: '',
                    category: '',
                    subcategory: '',
                    condition: '',
                    status: '',
                    minPrice: '',
                    maxPrice: '',
                    featured: false,
                    sortBy: 'endTime',
                    sortOrder: 'asc'
                  });
                  setPagination(prev => ({ ...prev, currentPage: 1 }));
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuctionCatalog;