import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socketService from '../services/socketService';
import api from '../services/api';
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

  // Format time remaining
  const formatTimeRemaining = (endTime) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;

    if (diff <= 0) return 'Auction Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  // Load auction data
  const loadAuctionData = useCallback(async () => {
    try {
      setLoading(true);
      const [auctionResponse, bidResponse, historyResponse] = await Promise.all([
        api.get(`/auctions/${id}`),
        api.get(`/bids/current/${id}`),
        api.get(`/bids/history/${id}`)
      ]);

      setAuction(auctionResponse.data.data);
      setCurrentBid(bidResponse.data.data);
      setBidHistory(historyResponse.data.data || []);
      
      // Set initial bid amount to minimum bid
      const minBid = calculateMinBid(bidResponse.data.data?.amount || auctionResponse.data.data.startingBid);
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

  // Place a manual bid
  const placeBid = async () => {
    if (!bidAmount || bidding) return;

    const amount = parseFloat(bidAmount);
    const minBid = calculateMinBid(currentBid?.amount || auction?.startingBid || 0);

    if (amount < minBid) {
      setError(`Minimum bid is ${formatCurrency(minBid)}`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      setBidding(true);
      setError('');
      
      await api.post('/bids/place', {
        auctionId: id,
        amount: amount,
        bidType: 'manual'
      });

      setSuccess('Bid placed successfully!');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('Error placing bid:', error);
      setError(error.response?.data?.message || 'Failed to place bid');
      setTimeout(() => setError(''), 5000);
    } finally {
      setBidding(false);
    }
  };

  // Set auto bid
  const setAutoBid = async () => {
    if (!autoBidMax) return;

    const maxAmount = parseFloat(autoBidMax);
    const minBid = calculateMinBid(currentBid?.amount || auction?.startingBid || 0);

    if (maxAmount < minBid) {
      setError(`Auto bid maximum must be at least ${formatCurrency(minBid)}`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      setError('');
      
      await api.post('/bids/auto', {
        auctionId: id,
        maxAmount: maxAmount
      });

      setIsAutoBidEnabled(true);
      setSuccess(`Auto bid set to ${formatCurrency(maxAmount)}`);
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('Error setting auto bid:', error);
      setError(error.response?.data?.message || 'Failed to set auto bid');
      setTimeout(() => setError(''), 5000);
    }
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
    }, 1000);

    return () => clearInterval(timer);
  }, [auction?.endTime]);

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
  const minBid = calculateMinBid(currentBid?.amount || auction.startingBid);

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
              {currentBid ? formatCurrency(currentBid.amount) : formatCurrency(auction.startingBid)}
            </span>
          </div>
          <div className="detail-item">
            <span className="label">Time Remaining:</span>
            <span className={`time-remaining ${!isAuctionActive ? 'ended' : ''}`}>
              {timeRemaining || formatTimeRemaining(auction.endTime)}
            </span>
          </div>
          <div className="detail-item">
            <span className="label">Starting Bid:</span>
            <span>{formatCurrency(auction.startingBid)}</span>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

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
    </div>
  );
};

export default LiveBidding;