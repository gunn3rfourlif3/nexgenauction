import React, { useState, useEffect } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

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

interface SearchFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  categories?: Category[];
  loading?: boolean;
  onSearch?: () => void;
  showSearch?: boolean;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onFiltersChange,
  categories = [],
  loading = false,
  onSearch,
  showSearch = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const conditionOptions = [
    { value: '', label: 'All Conditions' },
    { value: 'new', label: 'New' },
    { value: 'like-new', label: 'Like New' },
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' }
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'active', label: 'Active' },
    { value: 'ended', label: 'Ended' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const sortOptions = [
    { value: 'endTime', label: 'Ending Soon' },
    { value: 'startTime', label: 'Recently Listed' },
    { value: 'currentBid', label: 'Price' },
    { value: 'views', label: 'Most Viewed' },
    { value: 'bidCount', label: 'Most Bids' }
  ];

  useEffect(() => {
    const category = categories.find(cat => cat._id === filters.category);
    setSelectedCategory(category || null);
  }, [filters.category, categories]);

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...filters, [key]: value };
    
    // Reset subcategory when category changes
    if (key === 'category') {
      newFilters.subcategory = '';
    }
    
    onFiltersChange(newFilters);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch();
    }
  };

  const clearFilters = () => {
    onFiltersChange({
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
  };

  const hasActiveFilters = filters.category || filters.subcategory || filters.condition || 
    filters.status || filters.minPrice || filters.maxPrice || filters.featured;

  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Search Bar */}
        {showSearch && (
          <form onSubmit={handleSearch} className="mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search auctions by title, description, or tags..."
                className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              />
              <div className="absolute inset-y-0 right-0 flex items-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="mr-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-900 disabled:bg-gray-400 transition-colors duration-200"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Filter Toggle */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-4">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
            )}

            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Sort by:</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                {filters.sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category._id} value={category._id}>
                    {category._id} ({category.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategory Filter */}
            {selectedCategory && selectedCategory.subcategories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subcategory
                </label>
                <select
                  value={filters.subcategory}
                  onChange={(e) => handleFilterChange('subcategory', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Subcategories</option>
                  {selectedCategory.subcategories.map(subcategory => (
                    <option key={subcategory.name} value={subcategory.name}>
                      {subcategory.name} ({subcategory.count})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Condition Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condition
              </label>
              <select
                value={filters.condition}
                onChange={(e) => handleFilterChange('condition', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              >
                {conditionOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Range
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  placeholder="Min Price"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                />
                <span className="flex items-center text-gray-500">to</span>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  placeholder="Max Price"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Featured Toggle */}
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.featured}
                  onChange={(e) => handleFilterChange('featured', e.target.checked)}
                  className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                />
                <span className="text-sm font-medium text-gray-700">
                  Featured Only
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.category && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-200 text-black rounded-full text-sm">
                Category: {filters.category}
                <button
                  onClick={() => handleFilterChange('category', '')}
                  className="ml-1 hover:text-black"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.subcategory && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-200 text-black rounded-full text-sm">
                Subcategory: {filters.subcategory}
                <button
                  onClick={() => handleFilterChange('subcategory', '')}
                  className="ml-1 hover:text-black"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.condition && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-200 text-black rounded-full text-sm">
                Condition: {filters.condition}
                <button
                  onClick={() => handleFilterChange('condition', '')}
                  className="ml-1 hover:text-black"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.status && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-200 text-black rounded-full text-sm">
                Status: {filters.status}
                <button
                  onClick={() => handleFilterChange('status', '')}
                  className="ml-1 hover:text-black"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(filters.minPrice || filters.maxPrice) && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-200 text-black rounded-full text-sm">
                Price: {filters.minPrice || '0'} - {filters.maxPrice || '∞'}
                <button
                  onClick={() => {
                    handleFilterChange('minPrice', '');
                    handleFilterChange('maxPrice', '');
                  }}
                  className="ml-1 hover:text-blue-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.featured && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                Featured Only
                <button
                  onClick={() => handleFilterChange('featured', false)}
                  className="ml-1 hover:text-blue-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchFilters;