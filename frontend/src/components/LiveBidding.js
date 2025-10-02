import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socketService from '../services/socketService';
import api, { apiEndpoints } from '../services/api';
import './LiveBidding.css';

const LiveBidding = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [auction, setAuction] = useState(null);
  const [currentBid, setCurrentBid] = useState(null);
  const [bidHistory, setBidHistory] = useState([]);
  const [bidAmount, setBidAmount] = useState('');
  const [autoBidMax, setAutoBidMax] = useState('');
  const [isAutoBidEnabled, setIsAutoBidEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bidding, setBidding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showBidConfirmation, setShowBidConfirmation] = useState(false);
  const [pendingBidAmount, setPendingBidAmount] = useState(null);
  const [showAutoBidConfirmation, setShowAutoBidConfirmation] = useState(false);
  const [pendingAutoBidAmount, setPendingAutoBidAmount] = useState(null);
  const [auctionStatus, setAuctionStatus] = useState('active'); // active, ending_soon, ended
  const [urgencyLevel, setUrgencyLevel] = useState('normal'); // normal, warning, critical

  // Calculate minimum bid increment
  const calculateMinBid = useCallback((currentAmount) => {
    if (!currentAmount) return 1;
    
    if (currentAmount < 100) return currentAmount + 5;
    if (currentAmount < 500) return currentAmount + 10;
    if (currentAmount < 1000) return currentAmount + 25;
    if (currentAmount < 5000) return currentAmount + 50;
    if (currentAmount < 10000) return currentAmount + 100;
    return currentAmount + 250;
  }, []);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format time remaining without state updates
  const formatTimeRemaining = (endTime) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;

    if (diff <= 0) {
      return 'Auction Ended';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  // Update auction status and urgency based on time remaining
  const updateAuctionStatus = useCallback((endTime) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;

    if (diff <= 0) {
      setAuctionStatus('ended');
      setUrgencyLevel('normal');
    } else if (diff <= 60000) { // Less than 1 minute
      setAuctionStatus('ending_soon');
      setUrgencyLevel('critical');
    } else if (diff <= 300000) { // Less than 5 minutes
      setAuctionStatus('ending_soon');
      setUrgencyLevel('warning');
    } else {
      setAuctionStatus('active');
      setUrgencyLevel('normal');
    }
  }, []);

  // Load auction data
  const loadAuctionData = useCallback(async () => {
    try {
      setLoading(true);
      const [auctionResponse, currentBidRes, historyRes] = await Promise.all([
        apiEndpoints.auctions.getById(id),
        fetch(`/api/bids/${id}/current`).then(res => res.json()).catch(() => ({ success: false })),
        fetch(`/api/bids/${id}/history`).then(res => res.json()).catch(() => ({ success: false }))
      ]);

      const auctionData = (auctionResponse.data && auctionResponse.data.data && auctionResponse.data.data.auction)
        ? auctionResponse.data.data.auction
        : (auctionResponse.data && auctionResponse.data.data)
          ? auctionResponse.data.data
          : auctionResponse.data;

      setAuction(auctionData);

      const currentBidData = currentBidRes && currentBidRes.success ? currentBidRes.data?.currentBid || null : null;
      setCurrentBid(currentBidData);

      const historyData = historyRes && historyRes.success ? (historyRes.data?.bids || []) : [];
      setBidHistory(historyData);
      
      // Set initial bid amount to minimum bid
      const baseAmount = currentBidData?.amount || auctionData?.startingPrice || 0;
      const minBid = calculateMinBid(baseAmount);
      setBidAmount(minBid.toString());
      
    } catch (error) {
      console.error('Error loading auction data:', error);
      setError('Failed to load auction data');
    } finally {
      setLoading(false);
    }
  }, [id, calculateMinBid]);

  // Handle new bid from WebSocket
  const handleNewBid = useCallback((bidData) => {
    setCurrentBid(bidData);
    setBidHistory(prev => [bidData, ...prev]);
    
    // Update minimum bid amount
    const minBid = calculateMinBid(bidData.amount);
    setBidAmount(minBid.toString());
    
    setSuccess('New bid received!');
    setTimeout(() => setSuccess(''), 3000);
  }, [calculateMinBid]);

  // Handle outbid notification
  const handleOutbid = useCallback((data) => {
    setError(`You've been outbid! Current bid: ${formatCurrency(data.currentBid)}`);
    setTimeout(() => setError(''), 5000);
  }, []);

  // Handle bid error
  const handleBidError = useCallback((errorData) => {
    setError(errorData.message || 'Bid failed');
    setBidding(false);
    setTimeout(() => setError(''), 5000);
  }, []);

  // Validate bid amount
  const validateBidAmount = (amount) => {
    const numAmount = parseFloat(amount);
    const minBid = calculateMinBid(currentBid?.amount || auction?.startingPrice || 0);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      return { isValid: false, message: 'Please enter a valid bid amount' };
    }
    
    if (numAmount < minBid) {
      return { isValid: false, message: `Minimum bid is ${formatCurrency(minBid)}` };
    }
    
    if (numAmount > 1000000) {
      return { isValid: false, message: 'Bid amount cannot exceed $1,000,000' };
    }
    
    return { isValid: true };
  };

  // Show bid confirmation dialog
  const showBidConfirmationDialog = () => {
    const validation = validateBidAmount(bidAmount);
    if (!validation.isValid) {
      setError(validation.message);
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    setPendingBidAmount(parseFloat(bidAmount));
    setShowBidConfirmation(true);
  };

  // Confirm and place bid
  const confirmBid = async () => {
    setShowBidConfirmation(false);
    
    try {
      setBidding(true);
      setError('');
      
      await apiEndpoints.auctions.placeBid(id, {
        amount: pendingBidAmount,
        bidType: 'manual'
      });

      setSuccess(`Bid of ${formatCurrency(pendingBidAmount)} placed successfully!`);
      setTimeout(() => setSuccess(''), 3000);

      // Dispatch a cross-page event so Dashboard can refresh My Bids immediately
      try {
        const eventDetail = {
          auctionId: id,
          amount: pendingBidAmount,
          timestamp: Date.now()
        };
        window.dispatchEvent(new CustomEvent('nexgen:bid-placed', { detail: eventDetail }));
      } catch (e) {
        // no-op: event dispatch should never block UX
      }
      
    } catch (error) {
      console.error('Error placing bid:', error);
      setError(error.response?.data?.message || 'Failed to place bid');
      setTimeout(() => setError(''), 5000);
    } finally {
      setBidding(false);
      setPendingBidAmount(null);
    }
  };

  // Show auto bid confirmation dialog
  const showAutoBidConfirmationDialog = () => {
    const validation = validateBidAmount(autoBidMax);
    if (!validation.isValid) {
      setError(validation.message);
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    setPendingAutoBidAmount(parseFloat(autoBidMax));
    setShowAutoBidConfirmation(true);
  };

  // Confirm and set auto bid
  const confirmAutoBid = async () => {
    setShowAutoBidConfirmation(false);
    
    try {
      setError('');
      
      // Use correct endpoint with axios instance to include auth headers
      const response = await api.post(`/bids/${id}/auto-bid`, {
        maxAmount: pendingAutoBidAmount
      });

      if (!response?.data?.success) {
        throw new Error(response?.data?.message || 'Failed to set auto bid');
      }

      setIsAutoBidEnabled(true);
      setSuccess(`Auto bid set to ${formatCurrency(pendingAutoBidAmount)}`);
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('Error setting auto bid:', error);
      const msg = error.response?.data?.message || error.message || 'Failed to set auto bid';
      setError(msg);
      setTimeout(() => setError(''), 5000);
    } finally {
      setPendingAutoBidAmount(null);
    }
  };

  // Place a manual bid (updated to use confirmation)
  const placeBid = () => {
    showBidConfirmationDialog();
  };

  // Set auto bid (updated to use confirmation)
  const setAutoBid = () => {
    showAutoBidConfirmationDialog();
  };

  // Initialize WebSocket connection and load data
  useEffect(() => {
    const initializeConnection = async () => {
      // Connect to WebSocket
      socketService.connect();
      
      // Set up event listeners
      socketService.onNewBid(handleNewBid);
      socketService.onOutbid(handleOutbid);
      socketService.onBidError(handleBidError);
      
      // Join auction room
      socketService.joinAuction(id);
      
      // Check connection status
      setIsConnected(socketService.getConnectionStatus());
      
      // Load initial data
      await loadAuctionData();
    };

    initializeConnection();

    // Cleanup on unmount
    return () => {
      socketService.leaveAuction(id);
      socketService.removeAllListeners();
    };
  }, [id, handleNewBid, handleOutbid, handleBidError, loadAuctionData]);

  // Update time remaining every second
  useEffect(() => {
    if (!auction?.endTime) return;

    const timer = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(auction.endTime));
      updateAuctionStatus(auction.endTime);
    }, 1000);

    return () => clearInterval(timer);
  }, [auction?.endTime, updateAuctionStatus]);

  // Monitor WebSocket connection
  useEffect(() => {
    const checkConnection = setInterval(() => {
      setIsConnected(socketService.getConnectionStatus());
    }, 1000);

    return () => clearInterval(checkConnection);
  }, []);

  if (loading) {
    return (
      <div className="live-bidding-container">
        <div className="loading">Loading auction...</div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="live-bidding-container">
        <div className="error">Auction not found</div>
      </div>
    );
  }

  const isAuctionActive = new Date(auction.endTime) > new Date();
  const minBid = calculateMinBid(currentBid?.amount || auction.startingPrice);

  return (
    <div className="live-bidding-container">
      <div className="auction-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back
        </button>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '● Live' : '● Disconnected'}
          </span>
        </div>
      </div>

      <div className="auction-info">
        <h1>{auction.title}</h1>
        <div className="auction-details">
          <div className="detail-item">
            <span className="label">Current Bid:</span>
            <span className="current-bid">
              {currentBid ? formatCurrency(currentBid.amount) : formatCurrency(auction.startingPrice)}
            </span>
          </div>
          <div className="detail-item">
            <span className="label">Time Remaining:</span>
            <div className="time-remaining-container">
              <span className={`time-remaining ${auctionStatus} ${urgencyLevel}`}>
                {timeRemaining || formatTimeRemaining(auction.endTime)}
              </span>
              {auctionStatus === 'ending_soon' && (
                <div className="auction-status-indicator">
                  <span className={`status-badge ${urgencyLevel}`}>
                    {urgencyLevel === 'critical' ? '🔥 ENDING SOON!' : '⚠️ Ending Soon'}
                  </span>
                </div>
              )}
              {auctionStatus === 'ended' && (
                <div className="auction-status-indicator">
                  <span className="status-badge ended">🏁 AUCTION ENDED</span>
                </div>
              )}
            </div>
          </div>
          <div className="detail-item">
            <span className="label">Starting Price:</span>
            <span>{formatCurrency(auction.startingPrice)}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <strong>Error:</strong> {error}
          </div>
          <button 
            className="error-dismiss" 
            onClick={() => setError('')}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}
      
      {success && (
        <div className="success-message">
          <div className="success-icon">✅</div>
          <div className="success-content">
            <strong>Success:</strong> {success}
          </div>
          <button 
            className="success-dismiss" 
            onClick={() => setSuccess('')}
            aria-label="Dismiss success message"
          >
            ✕
          </button>
        </div>
      )}

      {isAuctionActive && (
        <div className="bidding-section">
          <div className="manual-bid">
            <h3>Place Bid</h3>
            <div className="bid-input-group">
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={`Minimum: ${formatCurrency(minBid)}`}
                min={minBid}
                step="1"
              />
              <button
                onClick={placeBid}
                disabled={bidding || !bidAmount}
                className="bid-button"
              >
                {bidding ? 'Placing...' : 'Place Bid'}
              </button>
            </div>
            <p className="bid-info">Minimum bid: {formatCurrency(minBid)}</p>
          </div>

          <div className="auto-bid">
            <h3>Auto Bid (Proxy Bidding)</h3>
            <div className="auto-bid-input-group">
              <input
                type="number"
                value={autoBidMax}
                onChange={(e) => setAutoBidMax(e.target.value)}
                placeholder="Maximum auto bid amount"
                min={minBid}
                step="1"
                disabled={isAutoBidEnabled}
              />
              <button
                onClick={setAutoBid}
                disabled={!autoBidMax || isAutoBidEnabled}
                className="auto-bid-button"
              >
                {isAutoBidEnabled ? 'Auto Bid Active' : 'Set Auto Bid'}
              </button>
            </div>
            <p className="auto-bid-info">
              {isAutoBidEnabled 
                ? `Auto bidding up to ${formatCurrency(parseFloat(autoBidMax))}`
                : 'Set a maximum amount and we\'ll bid for you automatically'
              }
            </p>
          </div>
        </div>
      )}

      <div className="bid-history">
        <h3>Bid History</h3>
        <div className="bid-list">
          {bidHistory.length > 0 ? (
            bidHistory.map((bid, index) => (
              <div key={bid._id || index} className="bid-item">
                <div className="bid-amount">{formatCurrency(bid.amount)}</div>
                <div className="bid-details">
                  <span className="bid-type">{bid.bidType === 'auto' ? 'Auto Bid' : 'Manual Bid'}</span>
                  <span className="bid-time">
                    {new Date(bid.bidTime).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="no-bids">No bids yet</div>
          )}
        </div>
      </div>

      {/* Bid Confirmation Dialog */}
      {showBidConfirmation && (
        <div className="confirmation-overlay">
          <div className="confirmation-dialog">
            <div className="confirmation-header">
              <h3>Confirm Bid</h3>
            </div>
            <div className="confirmation-content">
              <p>Are you sure you want to place a bid of <strong>{formatCurrency(pendingBidAmount)}</strong>?</p>
              <p className="confirmation-note">This action cannot be undone.</p>
            </div>
            <div className="confirmation-actions">
              <button 
                className="confirm-button"
                onClick={confirmBid}
                disabled={bidding}
              >
                {bidding ? 'Placing Bid...' : 'Confirm Bid'}
              </button>
              <button 
                className="cancel-button"
                onClick={() => {
                  setShowBidConfirmation(false);
                  setPendingBidAmount(null);
                }}
                disabled={bidding}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Bid Confirmation Dialog */}
      {showAutoBidConfirmation && (
        <div className="confirmation-overlay">
          <div className="confirmation-dialog">
            <div className="confirmation-header">
              <h3>Confirm Auto Bid</h3>
            </div>
            <div className="confirmation-content">
              <p>Set auto bid maximum to <strong>{formatCurrency(pendingAutoBidAmount)}</strong>?</p>
              <p className="confirmation-note">The system will automatically bid for you up to this amount.</p>
            </div>
            <div className="confirmation-actions">
              <button 
                className="confirm-button"
                onClick={confirmAutoBid}
              >
                Confirm Auto Bid
              </button>
              <button 
                className="cancel-button"
                onClick={() => {
                  setShowAutoBidConfirmation(false);
                  setPendingAutoBidAmount(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveBidding;