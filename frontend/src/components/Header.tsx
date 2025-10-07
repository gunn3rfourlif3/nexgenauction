import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import WatchlistNotifications from './WatchlistNotifications';
import Logo from './Logo';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
  };

  const handleNotificationClick = (auctionId: string) => {
    navigate(`/auctions/${auctionId}`);
  };

  return (
    <header className="bg-white text-black border-b border-black/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center" aria-label="Nexus Auction Home">
              <Logo className="h-[2.86rem] w-auto" />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors duration-200 ${
                isActive('/') 
                  ? 'text-black border-b-2 border-black pb-1' 
                  : 'text-gray-800 hover:text-black'
              }`}
            >
              Home
            </Link>
            <Link
              to="/auctions"
              className={`text-sm font-medium transition-colors duration-200 ${
                isActive('/auctions') 
                  ? 'text-black border-b-2 border-black pb-1' 
                  : 'text-gray-800 hover:text-black'
              }`}
            >
              Auctions
            </Link>
            {isAuthenticated && (
              <Link
                to="/dashboard"
                className={`text-sm font-medium transition-colors duration-200 ${
                  isActive('/dashboard') 
                    ? 'text-black border-b-2 border-black pb-1' 
                    : 'text-gray-800 hover:text-black'
                }`}
              >
                Dashboard
              </Link>
            )}


          </nav>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-gray-700">Loading...</span>
              </div>
            ) : isAuthenticated ? (
              <>
                {/* Welcome Message */}
                <div className="hidden sm:block text-sm text-gray-700">
                  Welcome back, {user?.firstName || user?.username || 'User'}!
                </div>
                
                {/* Watchlist Notifications */}
                <WatchlistNotifications onNotificationClick={handleNotificationClick} />
                
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center space-x-2 text-sm font-medium text-gray-800 hover:text-black transition-colors duration-200"
                  >
                    <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center">
                      {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                    </div>
                    <span className="hidden sm:block">
                      {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.username}
                    </span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white text-black rounded-md shadow-lg py-1 z-50 border border-black/10">
                    <Link
                      to="/dashboard"
                      className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      to="/my-auctions"
                      className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      My Auctions
                    </Link>
                    <Link
                      to="/watchlist"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      Watchlist
                    </Link>
                    <div className="border-t border-black/10"></div>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-100"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-800 hover:text-black transition-colors duration-200"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-900 transition-colors duration-200"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button className="text-gray-800 hover:text-black">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;