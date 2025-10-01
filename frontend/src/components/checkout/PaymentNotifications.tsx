import React, { useState, useEffect, useCallback } from 'react';
import './PaymentNotifications.css';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  paymentId?: string;
  auctionId?: string;
  autoClose?: boolean;
  duration?: number;
  actions?: NotificationAction[];
}

interface NotificationAction {
  label: string;
  action: () => void;
  type?: 'primary' | 'secondary';
}

interface PaymentNotificationsProps {
  userId?: string;
  onNotificationClick?: (notification: Notification) => void;
  maxNotifications?: number;
}

const PaymentNotifications: React.FC<PaymentNotificationsProps> = ({ 
  userId, 
  onNotificationClick,
  maxNotifications = 5 
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize WebSocket connection for real-time notifications
    initializeWebSocket();
    
    // Load recent notifications
    loadRecentNotifications();

    return () => {
      // Cleanup WebSocket connection
      if ((window as any).paymentWebSocket) {
        (window as any).paymentWebSocket.close();
      }
    };
  }, [userId]);

  const initializeWebSocket = () => {
    if (!userId) return;

    const wsUrl = `${process.env.REACT_APP_WS_URL || 'ws://localhost:3001'}/payments`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Payment notifications WebSocket connected');
      setIsConnected(true);
      
      // Subscribe to user-specific payment notifications
      ws.send(JSON.stringify({
        type: 'subscribe',
        userId: userId,
        channel: 'payment_notifications'
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('Payment notifications WebSocket disconnected');
      setIsConnected(false);
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (userId) {
          initializeWebSocket();
        }
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error('Payment notifications WebSocket error:', error);
      setIsConnected(false);
    };

    // Store WebSocket instance globally for cleanup
    (window as any).paymentWebSocket = ws;
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'payment_status_update':
        handlePaymentStatusUpdate(data.payload);
        break;
      case 'payment_confirmation':
        handlePaymentConfirmation(data.payload);
        break;
      case 'payment_failed':
        handlePaymentFailed(data.payload);
        break;
      case 'refund_processed':
        handleRefundProcessed(data.payload);
        break;
      case 'escrow_released':
        handleEscrowReleased(data.payload);
        break;
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  };

  const handlePaymentStatusUpdate = (payload: any) => {
    const notification: Notification = {
      id: `payment_status_${payload.paymentId}_${Date.now()}`,
      type: getNotificationTypeFromStatus(payload.status),
      title: 'Payment Status Update',
      message: `Your payment for "${payload.auctionTitle}" is now ${payload.status}`,
      timestamp: new Date(),
      paymentId: payload.paymentId,
      auctionId: payload.auctionId,
      autoClose: payload.status === 'processing',
      duration: 5000,
      actions: payload.status === 'succeeded' ? [
        {
          label: 'View Details',
          action: () => viewPaymentDetails(payload.paymentId),
          type: 'primary' as const
        }
      ] : undefined
    };

    addNotification(notification);
  };

  const handlePaymentConfirmation = (payload: any) => {
    const notification: Notification = {
      id: `payment_confirmed_${payload.paymentId}_${Date.now()}`,
      type: 'success',
      title: 'Payment Confirmed!',
      message: `Your payment of ${payload.amount} ${payload.currency} for "${payload.auctionTitle}" has been confirmed.`,
      timestamp: new Date(),
      paymentId: payload.paymentId,
      auctionId: payload.auctionId,
      autoClose: false,
      actions: [
        {
          label: 'Download Invoice',
          action: () => downloadInvoice(payload.invoiceId),
          type: 'primary' as const
        },
        {
          label: 'View Order',
          action: () => viewOrderDetails(payload.paymentId),
          type: 'secondary' as const
        }
      ]
    };

    addNotification(notification);
  };

  const handlePaymentFailed = (payload: any) => {
    const notification: Notification = {
      id: `payment_failed_${payload.paymentId}_${Date.now()}`,
      type: 'error',
      title: 'Payment Failed',
      message: `Your payment for "${payload.auctionTitle}" failed: ${payload.reason}`,
      timestamp: new Date(),
      paymentId: payload.paymentId,
      auctionId: payload.auctionId,
      autoClose: false,
      actions: [
        {
          label: 'Retry Payment',
          action: () => retryPayment(payload.paymentId),
          type: 'primary' as const
        },
        {
          label: 'Contact Support',
          action: () => contactSupport(payload.paymentId),
          type: 'secondary' as const
        }
      ]
    };

    addNotification(notification);
  };

  const handleRefundProcessed = (payload: any) => {
    const notification: Notification = {
      id: `refund_processed_${payload.paymentId}_${Date.now()}`,
      type: 'info',
      title: 'Refund Processed',
      message: `Your refund of ${payload.amount} ${payload.currency} for "${payload.auctionTitle}" has been processed.`,
      timestamp: new Date(),
      paymentId: payload.paymentId,
      auctionId: payload.auctionId,
      autoClose: false,
      actions: [
        {
          label: 'View Details',
          action: () => viewPaymentDetails(payload.paymentId),
          type: 'primary' as const
        }
      ]
    };

    addNotification(notification);
  };

  const handleEscrowReleased = (payload: any) => {
    const notification: Notification = {
      id: `escrow_released_${payload.paymentId}_${Date.now()}`,
      type: 'success',
      title: 'Funds Released',
      message: `Escrow funds for "${payload.auctionTitle}" have been released to the seller.`,
      timestamp: new Date(),
      paymentId: payload.paymentId,
      auctionId: payload.auctionId,
      autoClose: false,
      actions: [
        {
          label: 'View Transaction',
          action: () => viewPaymentDetails(payload.paymentId),
          type: 'primary' as const
        }
      ]
    };

    addNotification(notification);
  };

  const getNotificationTypeFromStatus = (status: string): Notification['type'] => {
    switch (status) {
      case 'succeeded':
        return 'success';
      case 'failed':
      case 'cancelled':
        return 'error';
      case 'processing':
        return 'info';
      case 'refunded':
        return 'warning';
      default:
        return 'info';
    }
  };

  const loadRecentNotifications = async () => {
    if (!userId) return;

    try {
      const response = await fetch(`/api/notifications/payment?userId=${userId}&limit=${maxNotifications}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        const recentNotifications = data.data.notifications.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        setNotifications(recentNotifications);
      }
    } catch (error) {
      console.error('Failed to load recent notifications:', error);
    }
  };

  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => {
      const updated = [notification, ...prev].slice(0, maxNotifications);
      
      // Auto-close notification if specified
      if (notification.autoClose && notification.duration) {
        setTimeout(() => {
          removeNotification(notification.id);
        }, notification.duration);
      }
      
      return updated;
    });

    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id
      });
    }
  }, [maxNotifications]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const viewPaymentDetails = (paymentId: string) => {
    window.location.href = `/payments/${paymentId}`;
  };

  const viewOrderDetails = (paymentId: string) => {
    window.location.href = `/orders/${paymentId}`;
  };

  const downloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to download invoice:', error);
    }
  };

  const retryPayment = (paymentId: string) => {
    window.location.href = `/checkout/retry/${paymentId}`;
  };

  const contactSupport = (paymentId: string) => {
    window.location.href = `/support?payment=${paymentId}`;
  };

  const handleNotificationClick = (notification: Notification) => {
    if (onNotificationClick) {
      onNotificationClick(notification);
    } else if (notification.paymentId) {
      viewPaymentDetails(notification.paymentId);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="payment-notifications">
      <div className="notifications-header">
        <div className="notifications-title">
          <span>Payment Notifications</span>
          {!isConnected && (
            <span className="connection-status offline">Offline</span>
          )}
        </div>
        <button onClick={clearAllNotifications} className="clear-all-btn">
          Clear All
        </button>
      </div>

      <div className="notifications-list">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`notification-item ${notification.type}`}
            onClick={() => handleNotificationClick(notification)}
          >
            <div className="notification-icon">
              {getNotificationIcon(notification.type)}
            </div>
            
            <div className="notification-content">
              <div className="notification-header">
                <h4 className="notification-title">{notification.title}</h4>
                <span className="notification-time">
                  {formatTimestamp(notification.timestamp)}
                </span>
              </div>
              
              <p className="notification-message">{notification.message}</p>
              
              {notification.actions && notification.actions.length > 0 && (
                <div className="notification-actions">
                  {notification.actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        action.action();
                      }}
                      className={`notification-action-btn ${action.type || 'secondary'}`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeNotification(notification.id);
              }}
              className="notification-close-btn"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PaymentNotifications;