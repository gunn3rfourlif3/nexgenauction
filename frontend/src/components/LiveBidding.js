import React, { useState, useEffect, useCallback } from 'react';
import { Zap, Clock, DollarSign, Gavel, User, Cpu } from 'lucide-react';
import RegistrationBadge from './RegistrationBadge';
import { useParams, useNavigate } from 'react-router-dom';
import socketService from '../services/socketService';
import api, { apiEndpoints } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
// Styling aligned with AuctionDetail via Tailwind utility classes

const LiveBidding = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  
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
  const [registration, setRegistration] = useState(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [commissionRate, setCommissionRate] = useState(0.10);
  const [vatRate, setVatRate] = useState(0.15);

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

  // Currency formatting provided by context

  // Format time remaining without state updates (memoized)
  const formatTimeRemaining = useCallback((endTime) => {
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
  }, []);

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
      const [auctionResponse, currentBidRes, historyRes, regRes] = await Promise.all([
        apiEndpoints.auctions.getById(id),
        apiEndpoints.bids.getCurrent(id).then(res => res.data).catch(() => ({ success: false })),
        apiEndpoints.bids.getHistory(id).then(res => res.data).catch(() => ({ success: false })),
        apiEndpoints.auctions.getMyRegistration(id).then(res => res.data).catch(() => ({ success: false }))
      ]);

      const auctionData = (auctionResponse.data && auctionResponse.data.data && auctionResponse.data.data.auction)
        ? auctionResponse.data.data.auction
        : (auctionResponse.data && auctionResponse.data.data)
          ? auctionResponse.data.data
          : auctionResponse.data;

      setAuction(auctionData);
      const regData = regRes && regRes.success ? (regRes.data || null) : null;
      setRegistration(regData);

      const currentBidData = currentBidRes && currentBidRes.success ? (currentBidRes.data?.currentBid || null) : null;
      setCurrentBid(currentBidData);

      const historyData = historyRes && historyRes.success ? (historyRes.data?.bids || []) : [];
      setBidHistory(historyData);
      
      // Set initial bid amount to minimum bid
      const baseAmount = (currentBidData?.amount ?? auctionData?.currentBid ?? auctionData?.startingPrice ?? 0);
      const minBid = calculateMinBid(baseAmount);
      setBidAmount(minBid.toString());
      
    } catch (error) {
      console.error('Error loading auction data:', error);
      setError('Failed to load auction data');
    } finally {
      setLoading(false);
    }
  }, [id, calculateMinBid]);

  // Lightweight refresh for bid data only (current + history)
  const refreshBidData = useCallback(async () => {
    try {
      const [currentBidRes, historyRes] = await Promise.all([
        apiEndpoints.bids.getCurrent(id).then(res => res.data).catch(() => ({ success: false })),
        apiEndpoints.bids.getHistory(id).then(res => res.data).catch(() => ({ success: false }))
      ]);

      const currentBidData = currentBidRes && currentBidRes.success ? (currentBidRes.data?.currentBid || null) : null;
      setCurrentBid(currentBidData);

      const historyData = historyRes && historyRes.success ? (historyRes.data?.bids || []) : [];
      setBidHistory(historyData);

      // Update minimum bid amount based on refreshed state
      const baseAmount = (currentBidData?.amount ?? auction?.currentBid ?? auction?.startingPrice ?? 0);
      const minBid = calculateMinBid(baseAmount);
      setBidAmount(minBid.toString());
    } catch (e) {
      // no-op, UI will rely on websocket or prior state
    }
  }, [id, auction?.currentBid, auction?.startingPrice, calculateMinBid]);

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

  // Handle auction status updates (e.g., soft-close end time extensions)
  const handleAuctionUpdate = useCallback((data) => {
    try {
      if (data && data.endTime) {
        setAuction(prev => prev ? { ...prev, endTime: data.endTime } : prev);
        setTimeRemaining(formatTimeRemaining(data.endTime));
        updateAuctionStatus(data.endTime);
      }
      // If payload includes currentBid or bidCount, sync them too
      if (data && (data.currentBid || data.bidCount)) {
        if (data.currentBid && typeof data.currentBid === 'number') {
          setCurrentBid(prev => prev ? { ...prev, amount: data.currentBid } : { amount: data.currentBid });
          const minBid = calculateMinBid(data.currentBid);
          setBidAmount(minBid.toString());
        }
      }
    } catch (e) {
      // no-op
    }
  }, [updateAuctionStatus, calculateMinBid, formatTimeRemaining]);

  // Handle outbid notification
  const handleOutbid = useCallback((data) => {
    try {
      const previousId = data && data.previousHighestBidderId ? String(data.previousHighestBidderId) : null;
      const currentUserId = user && (user._id || user.id) ? String(user._id || user.id) : null;

      if (previousId && currentUserId && previousId === currentUserId) {
        setError(`You've been outbid! Current bid: ${formatCurrency(data.currentBid)}`);
        setTimeout(() => setError(''), 5000);
      }
      // If the event isn't for the current user, ignore it silently
    } catch (e) {
      // no-op
    }
  }, [formatCurrency, user]);

  // Handle bid error
  const handleBidError = useCallback((errorData) => {
    setError(errorData.message || 'Bid failed');
    setBidding(false);
    setTimeout(() => setError(''), 5000);
  }, []);

  // Validate bid amount
  const validateBidAmount = (amount) => {
    const numAmount = parseFloat(amount);
    const minBid = calculateMinBid(currentBid?.amount ?? auction?.currentBid ?? auction?.startingPrice ?? 0);
    
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

      // Explicitly refresh bid data to ensure UI reflects latest state
      await refreshBidData();

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

      // Refresh bid data to reflect any immediate changes
      await refreshBidData();
      
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

  // Load fees settings once
  useEffect(() => {
    (async () => {
      try {
        const { data: res } = await api.get('/settings/fees');
        const f = res?.data?.fees;
        if (f && typeof f.commissionRate === 'number') setCommissionRate(f.commissionRate);
        if (f && typeof f.vatRate === 'number') setVatRate(f.vatRate);
      } catch {}
    })();
  }, []);

  // Initialize WebSocket connection and load data
  useEffect(() => {
    const initializeConnection = async () => {
      // Connect to WebSocket
      socketService.connect();
      
      // Set up event listeners
      socketService.onNewBid(handleNewBid);
      socketService.onOutbid(handleOutbid);
      socketService.onBidError(handleBidError);
      socketService.onAuctionUpdate(handleAuctionUpdate);
      
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
  }, [id, handleNewBid, handleOutbid, handleBidError, handleAuctionUpdate, loadAuctionData]);

  // Update time remaining every second
  useEffect(() => {
    if (!auction?.endTime) return;

    const timer = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(auction.endTime));
      updateAuctionStatus(auction.endTime);
    }, 1000);

    return () => clearInterval(timer);
  }, [auction?.endTime, updateAuctionStatus, formatTimeRemaining]);

  // Monitor WebSocket connection
  useEffect(() => {
    const checkConnection = setInterval(() => {
      setIsConnected(socketService.getConnectionStatus());
    }, 1000);

    return () => clearInterval(checkConnection);
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-gray-600">Loading auction...</div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-red-700 bg-red-50 rounded-md p-4">Auction not found</div>
      </div>
    );
  }

  const isAuctionActive = new Date(auction.endTime) > new Date();
  const minBid = calculateMinBid(currentBid?.amount ?? auction.currentBid ?? auction.startingPrice);
  
  const bidPreview = parseFloat(bidAmount) || minBid;
  const estCommission = (bidPreview || 0) * commissionRate;
  const estVatOnCommission = estCommission * vatRate;
  const estTotal = (bidPreview || 0) + estCommission + estVatOnCommission;
  const regStatus = registration?.status || 'not_registered';
  const canBidByReg = regStatus === 'approved' || regStatus === 'deposit_received';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          ← Back
        </button>
        <div>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-2 ${
              isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {isConnected ? (
              <>
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-green-600"></span>
                </span>
                <Zap size={16} className="text-black" />
                Live
              </>
            ) : (
              <>
                <span className="h-4 w-4 rounded-full bg-black"></span>
                Disconnected
              </>
            )}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h1 className="text-2xl font-bold mb-4">{auction.title}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <span className="text-sm text-gray-600 flex items-center gap-1"><DollarSign size={16} className="text-gray-500" /> Current Bid:</span>
            <span className="text-xl font-semibold text-gray-800">
              {currentBid ? formatCurrency(currentBid.amount) : formatCurrency(auction.currentBid ?? auction.startingPrice)}
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-sm text-gray-600 flex items-center gap-1"><Clock size={16} className="text-gray-500" /> Time Remaining:</span>
            <div className="flex items-center gap-2">
              <span
                className={`text-base font-medium ${
                  auctionStatus === 'ending_soon'
                    ? 'text-black'
                    : auctionStatus === 'ended'
                      ? 'text-gray-700'
                      : 'text-gray-800'
                }`}
              >
                {timeRemaining || formatTimeRemaining(auction.endTime)}
              </span>
              {auctionStatus === 'ending_soon' && (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-black`}
                >
                  {urgencyLevel === 'critical' ? 'Ending Soon' : 'Ending Soon'}
                </span>
              )}
              {auctionStatus === 'ended' && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-black">Auction Ended</span>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-sm text-gray-600 flex items-center gap-1"><DollarSign size={16} className="text-gray-500" /> Starting Price:</span>
            <span className="text-base font-medium text-gray-800">{formatCurrency(auction.startingPrice)}</span>
          </div>
          <div className="space-y-1">
            <span className="text-sm text-gray-600 flex items-center gap-1">Registration:</span>
            <div><RegistrationBadge status={regStatus} /></div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 flex items-start justify-between">
          <div className="flex items-center gap-2 text-red-700">
            <span className="font-semibold">Error:</span> {error}
          </div>
          <button
            className="text-red-600 hover:text-red-800"
            onClick={() => setError('')}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}
      
      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-4 flex items-start justify-between">
          <div className="flex items-center gap-2 text-green-700">
            <span className="font-semibold">Success:</span> {success}
          </div>
          <button
            className="text-green-600 hover:text-green-800"
            onClick={() => setSuccess('')}
            aria-label="Dismiss success message"
          >
            ✕
          </button>
        </div>
      )}

      {isAuctionActive && (
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Gavel size={18} className="text-blue-600" /> Place Bid</h3>
              <div className="flex gap-2">
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={`Minimum: ${formatCurrency(minBid)}`}
                min={minBid}
                step="1"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={placeBid}
                disabled={bidding || !bidAmount || !canBidByReg}
                className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2"><Gavel size={16} /> {bidding ? 'Placing...' : 'Place Bid'}</span>
              </button>
              {!canBidByReg && (
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-xs text-gray-600">You must be approved to bid on this auction.</p>
                  {user ? (
                    <button
                      onClick={async () => {
                        try {
                          setRegisterLoading(true);
                          const res = await apiEndpoints.auctions.register(id);
                          if (res.data?.success) {
                            const r = await apiEndpoints.auctions.getMyRegistration(id);
                            setRegistration(r.data?.data || null);
                            setSuccess('Registration submitted successfully');
                            setTimeout(() => setSuccess(''), 3000);
                          }
                        } catch (e) {
                          setError(e?.response?.data?.message || 'Failed to register for this auction');
                          setTimeout(() => setError(''), 5000);
                        } finally {
                          setRegisterLoading(false);
                        }
                      }}
                      disabled={registerLoading}
                      className={`px-3 py-1 rounded-md text-xs font-semibold ${registerLoading ? 'bg-gray-200 text-gray-700 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-900'}`}
                    >
                      {registerLoading ? 'Registering…' : 'Register Now'}
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/login')}
                      className="px-3 py-1 bg-black text-white rounded-md hover:bg-gray-900 text-xs"
                    >
                      Register / Login
                    </button>
                  )}
                </div>
              )}
            </div>
              <p className="text-sm text-gray-600 mt-2">Minimum bid: {formatCurrency(minBid)}</p>
              <div className="text-sm text-gray-800 mt-2">
                <div className="flex justify-between"><span>Your Bid</span><span>{formatCurrency(bidPreview)}</span></div>
                <div className="flex justify-between"><span>Buyer’s Commission (10%)</span><span>{formatCurrency(estCommission)}</span></div>
                <div className="flex justify-between"><span>VAT on Commission (15%)</span><span>{formatCurrency(estVatOnCommission)}</span></div>
                <div className="flex justify-between font-semibold border-t pt-1"><span>Total (excl. STC)</span><span>{formatCurrency(estTotal)}</span></div>
              </div>
            </div>

            <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Zap size={18} className="text-blue-600" /> Auto Bid (Proxy Bidding)</h3>
            <div className="flex gap-2">
              <input
                type="number"
                value={autoBidMax}
                onChange={(e) => setAutoBidMax(e.target.value)}
                placeholder="Maximum auto bid amount"
                min={minBid}
                step="1"
                disabled={isAutoBidEnabled}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                onClick={setAutoBid}
                disabled={!autoBidMax || isAutoBidEnabled || !canBidByReg}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2"><Zap size={16} /> {isAutoBidEnabled ? 'Auto Bid Active' : 'Set Auto Bid'}</span>
              </button>
              {!canBidByReg && (
                <p className="text-xs text-gray-600 mt-2">Approval required to set auto-bid.</p>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {isAutoBidEnabled 
                ? `Auto bidding up to ${formatCurrency(parseFloat(autoBidMax))}`
                : 'Set a maximum amount and we\'ll bid for you automatically'}
            </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Gavel size={18} className="text-black" /> Bid History</h3>
        <div className="divide-y max-h-[500px] overflow-y-auto pr-1">
          {bidHistory.length > 0 ? (
            bidHistory.map((bid, index) => (
              <div key={bid._id || index} className="py-3 flex items-center justify-between">
                <div className="text-base font-medium text-gray-800">{formatCurrency(bid.amount)}</div>
                <div className="text-sm text-gray-600 flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    {bid.bidType === 'auto' ? (
                      <Cpu size={14} className="text-black" />
                    ) : (
                      <User size={14} className="text-gray-600" />
                    )}
                    {bid.bidType === 'auto' ? 'Auto Bid' : 'Manual Bid'}
                  </span>
                  <span className="text-gray-500">{new Date(bid.bidTime).toLocaleString()}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-gray-500 text-sm">No bids yet</div>
          )}
        </div>
      </div>

      {/* Bid Confirmation Dialog */}
      {showBidConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow p-6 w-full max-w-md">
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2"><Gavel size={18} className="text-black" /> Confirm Bid</h3>
            </div>
            <div className="space-y-2">
              <p>
                Are you sure you want to place a bid of <strong>{formatCurrency(pendingBidAmount)}</strong>?
              </p>
              <p className="text-sm text-gray-600">This action cannot be undone.</p>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed"
                onClick={confirmBid}
                disabled={bidding}
              >
                {bidding ? 'Placing Bid...' : 'Confirm Bid'}
              </button>
              <button
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
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
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow p-6 w-full max-w-md">
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2"><Zap size={18} className="text-black" /> Confirm Auto Bid</h3>
            </div>
            <div className="space-y-2">
              <p>
                Set auto bid maximum to <strong>{formatCurrency(pendingAutoBidAmount)}</strong>?
              </p>
              <p className="text-sm text-gray-600">The system will automatically bid for you up to this amount.</p>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={confirmAutoBid}
              >
                Confirm Auto Bid
              </button>
              <button
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
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