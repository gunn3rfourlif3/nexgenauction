import React, { useState, useEffect, useCallback } from 'react';
import './PaymentStatus.css';

interface PaymentStatusProps {
  paymentId?: string;
  auctionId?: string;
  onStatusChange?: (status: string) => void;
}

interface PaymentDetails {
  id: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  auction: {
    id: string;
    title: string;
    images: string[];
  };
  paymentMethod: {
    type: string;
    last4?: string;
    brand?: string;
  };
  escrow?: {
    status: string;
    releaseDate?: string;
  };
  invoice?: {
    id: string;
    downloadUrl: string;
  };
  refund?: {
    amount: number;
    reason: string;
    processedAt: string;
  };
}

interface Transaction {
  id: string;
  type: 'payment' | 'refund' | 'fee' | 'escrow_release';
  amount: number;
  currency: string;
  status: string;
  description: string;
  createdAt: string;
}

const PaymentStatus: React.FC<PaymentStatusProps> = ({ paymentId, auctionId, onStatusChange }) => {
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Effect moved below memoized callbacks to avoid TDZ on dependencies

  useEffect(() => {
    if (payment?.status && onStatusChange) {
      onStatusChange(payment.status);
    }
  }, [payment?.status, onStatusChange]);

  const loadPaymentDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setPayment(data.data.payment);
      } else {
        setError(data.message);
      }
    } catch (error: any) {
      console.error('Failed to load payment details:', error);
      setError('Failed to load payment details');
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  const loadTransactionHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/payments/${paymentId}/transactions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setTransactions(data.data.transactions);
      }
    } catch (error) {
      console.error('Failed to load transaction history:', error);
    }
  }, [paymentId]);

  const refreshPaymentStatus = useCallback(async () => {
    if (refreshing) return;
    
    try {
      setRefreshing(true);
      const response = await fetch(`/api/payments/${paymentId}/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (data.success && data.data.payment) {
        setPayment(prev => prev ? { ...prev, ...data.data.payment } : data.data.payment);
      }
    } catch (error) {
      console.error('Failed to refresh payment status:', error);
    } finally {
      setRefreshing(false);
    }
  }, [paymentId, refreshing]);

  // Initialize data and polling after callbacks are declared
  useEffect(() => {
    if (paymentId) {
      loadPaymentDetails();
      loadTransactionHistory();
      
      // Set up polling for status updates
      const interval = setInterval(() => {
        refreshPaymentStatus();
      }, 10000); // Poll every 10 seconds

      return () => clearInterval(interval);
    }
  }, [paymentId, loadPaymentDetails, loadTransactionHistory, refreshPaymentStatus]);

  const handleRefund = async () => {
    if (!payment || !window.confirm('Are you sure you want to request a refund?')) {
      return;
    }

    try {
      const response = await fetch(`/api/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          reason: 'Customer requested refund'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await loadPaymentDetails();
        await loadTransactionHistory();
      } else {
        setError(data.message);
      }
    } catch (error: any) {
      console.error('Failed to process refund:', error);
      setError('Failed to process refund');
    }
  };

  const downloadInvoice = async () => {
    if (!payment?.invoice) return;

    try {
      const response = await fetch(`/api/invoices/${payment.invoice.id}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${payment.invoice.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to download invoice:', error);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return '✓';
      case 'failed':
        return '✗';
      case 'cancelled':
        return '⊘';
      case 'refunded':
        return '↩';
      case 'processing':
        return '⟳';
      default:
        return '○';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return '#28a745';
      case 'failed':
        return '#dc3545';
      case 'cancelled':
        return '#6c757d';
      case 'refunded':
        return '#17a2b8';
      case 'processing':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Payment Pending';
      case 'processing':
        return 'Processing Payment';
      case 'succeeded':
        return 'Payment Successful';
      case 'failed':
        return 'Payment Failed';
      case 'cancelled':
        return 'Payment Cancelled';
      case 'refunded':
        return 'Payment Refunded';
      default:
        return 'Unknown Status';
    }
  };

  if (loading) {
    return (
      <div className="payment-status loading">
        <div className="spinner"></div>
        <p>Loading payment details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-status error">
        <div className="error-icon">⚠</div>
        <h3>Error Loading Payment</h3>
        <p>{error}</p>
        <button onClick={loadPaymentDetails} className="btn-retry">
          Try Again
        </button>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="payment-status not-found">
        <div className="not-found-icon">?</div>
        <h3>Payment Not Found</h3>
        <p>The requested payment could not be found.</p>
      </div>
    );
  }

  return (
    <div className="payment-status">
      <div className="payment-header">
        <div className="status-indicator" style={{ backgroundColor: getStatusColor(payment.status) }}>
          <span className="status-icon">{getStatusIcon(payment.status)}</span>
        </div>
        <div className="payment-info">
          <h2>{getStatusText(payment.status)}</h2>
          <p className="payment-amount">{formatCurrency(payment.amount, payment.currency)}</p>
          <p className="payment-date">Created: {formatDate(payment.createdAt)}</p>
          {payment.updatedAt !== payment.createdAt && (
            <p className="payment-date">Updated: {formatDate(payment.updatedAt)}</p>
          )}
        </div>
        <div className="payment-actions">
          <button 
            onClick={refreshPaymentStatus} 
            className="btn-refresh"
            disabled={refreshing}
          >
            {refreshing ? '⟳' : '↻'} Refresh
          </button>
        </div>
      </div>

      <div className="payment-details">
        <div className="detail-section">
          <h3>Auction Details</h3>
          <div className="auction-info">
            {payment.auction.images[0] && (
              <img src={payment.auction.images[0]} alt={payment.auction.title} className="auction-thumbnail" />
            )}
            <div>
              <h4>{payment.auction.title}</h4>
              <p>Auction ID: {payment.auction.id}</p>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Payment Method</h3>
          <div className="payment-method">
            <span className="method-type">{payment.paymentMethod.type}</span>
            {payment.paymentMethod.brand && payment.paymentMethod.last4 && (
              <span className="card-details">
                {payment.paymentMethod.brand} ending in {payment.paymentMethod.last4}
              </span>
            )}
          </div>
        </div>

        {payment.escrow && (
          <div className="detail-section">
            <h3>Escrow Status</h3>
            <div className="escrow-info">
              <p>Status: <span className="escrow-status">{payment.escrow.status}</span></p>
              {payment.escrow.releaseDate && (
                <p>Release Date: {formatDate(payment.escrow.releaseDate)}</p>
              )}
            </div>
          </div>
        )}

        {payment.refund && (
          <div className="detail-section">
            <h3>Refund Details</h3>
            <div className="refund-info">
              <p>Amount: {formatCurrency(payment.refund.amount, payment.currency)}</p>
              <p>Reason: {payment.refund.reason}</p>
              <p>Processed: {formatDate(payment.refund.processedAt)}</p>
            </div>
          </div>
        )}
      </div>

      <div className="payment-actions-section">
        {payment.invoice && (
          <button onClick={downloadInvoice} className="btn-secondary">
            📄 Download Invoice
          </button>
        )}
        
        {payment.status === 'succeeded' && !payment.refund && (
          <button onClick={handleRefund} className="btn-danger">
            ↩ Request Refund
          </button>
        )}
      </div>

      {transactions.length > 0 && (
        <div className="transaction-history">
          <h3>Transaction History</h3>
          <div className="transaction-list">
            {transactions.map(transaction => (
              <div key={transaction.id} className="transaction-item">
                <div className="transaction-info">
                  <div className="transaction-type">{transaction.type}</div>
                  <div className="transaction-description">{transaction.description}</div>
                  <div className="transaction-date">{formatDate(transaction.createdAt)}</div>
                </div>
                <div className="transaction-amount">
                  <span className={`amount ${transaction.type === 'refund' ? 'negative' : 'positive'}`}>
                    {transaction.type === 'refund' ? '-' : '+'}
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </span>
                  <span className="transaction-status" style={{ color: getStatusColor(transaction.status) }}>
                    {transaction.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentStatus;