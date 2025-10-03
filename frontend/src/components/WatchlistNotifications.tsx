import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Bell, Clock, DollarSign, Gavel } from 'lucide-react';
import api from '../services/api';

interface WatchlistNotification {
  id: string;
  auctionId: string;
  auctionTitle: string;
  type: 'ending_soon' | 'outbid' | 'price_change' | 'status_change';
  message: string;
  timestamp: string;
  read: boolean;
}

interface WatchlistNotificationsProps {
  onNotificationClick?: (auctionId: string) => void;
}

const WatchlistNotifications: React.FC<WatchlistNotificationsProps> = ({
  onNotificationClick
}) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [notifications, setNotifications] = useState<WatchlistNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await api.get('/auctions/my/notifications');
      if (response.status === 200) {
        const payload = response.data?.data || response.data || {};
        const raw = payload.notifications || [];
        const normalized = (Array.isArray(raw) ? raw : []).map((n: any) => ({
          id: n._id || n.id,
          auctionId: n.auctionId,
          auctionTitle: n.auctionTitle,
          type: n.type === 'price_drop' ? 'price_change' : n.type,
          message: n.message,
          timestamp: n.createdAt || n.timestamp,
          read: !!n.read
        }));
        setNotifications(normalized);
        setUnreadCount(normalized.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const response = await api.put(`/auctions/notifications/${notificationId}/read`);
      if (response.status === 200) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId ? { ...notif, read: true } : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;

    try {
      const response = await api.put('/auctions/notifications/read-all');
      if (response.status === 200) {
        setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: WatchlistNotification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (onNotificationClick) {
      onNotificationClick(notification.auctionId);
    }
    
    setIsOpen(false);
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ending_soon':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'outbid':
        return <Gavel className="w-4 h-4 text-red-500" />;
      case 'price_change':
        return <DollarSign className="w-4 h-4 text-green-500" />;
      case 'price_drop':
        return <DollarSign className="w-4 h-4 text-green-500" />;
      case 'status_change':
        return <Bell className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Fetch notifications on component mount and when user changes
  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Set up polling for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Show browser notification for new watchlist updates
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted' && notifications.length > 0) {
      const latestUnread = notifications.find(n => !n.read);
      if (latestUnread) {
        new Notification('Watchlist Update', {
          body: latestUnread.message,
          icon: '/favicon.ico'
        });
      }
    }
  }, [notifications]);

  if (!user) return null;

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Watchlist Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors duration-200 ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {notification.auctionTitle}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTimestamp(notification.timestamp)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to watchlist page
                  window.location.href = '/watchlist';
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-800"
              >
                View all watchlist items
              </button>
            </div>
          )}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default WatchlistNotifications;