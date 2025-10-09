const Bid = require('../models/Bid');
const Auction = require('../models/Auction');
const User = require('../models/User');
const devMockStore = require('../services/devMockStore');

// Bid increment rules
const BID_INCREMENT_RULES = {
  0: 5,        // $0-$99: $5 increment
  100: 10,     // $100-$499: $10 increment
  500: 25,     // $500-$999: $25 increment
  1000: 50,    // $1000-$4999: $50 increment
  5000: 100,   // $5000-$9999: $100 increment
  10000: 250,  // $10000+: $250 increment
};

// Anti-sniping soft-close configuration (extend end time when last-minute bids occur)
const SOFT_CLOSE_THRESHOLD_MS = parseInt(process.env.SOFT_CLOSE_THRESHOLD_MS || '120000', 10); // 2 minutes
const SOFT_CLOSE_EXTENSION_MS = parseInt(process.env.SOFT_CLOSE_EXTENSION_MS || '120000', 10); // extend by 2 minutes

// Calculate minimum bid increment based on current price
const calculateMinimumIncrement = (currentBid) => {
  const amount = currentBid || 0;
  
  if (amount < 100) return BID_INCREMENT_RULES[0];
  if (amount < 500) return BID_INCREMENT_RULES[100];
  if (amount < 1000) return BID_INCREMENT_RULES[500];
  if (amount < 5000) return BID_INCREMENT_RULES[1000];
  if (amount < 10000) return BID_INCREMENT_RULES[5000];
  return BID_INCREMENT_RULES[10000];
};

  // Place a bid
  const placeBid = async (req, res) => {
    try {
      const { auctionId } = req.params;
      const { amount, bidType = 'manual', maxAutoBid } = req.body;
      const userId = req.user._id || req.user.id;
      const io = req.app.get('io');
      const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
        (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
      let usedDevMock = false;

    // Validate auction exists and is active
    let auction = null;
    // In dev fallback mode, short-circuit to mock store and NEVER touch the DB
    if (devFallbackEnabled) {
      auction = devMockStore.getAuction(auctionId);
      usedDevMock = true;
    } else {
      auction = await Auction.findById(auctionId);
    }
    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found' });
    }

    if ((auction.status || 'active') !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Auction is not active'
      });
    }

    // Check if auction has ended
    if (new Date() > new Date(auction.endTime)) {
      return res.status(400).json({
        success: false,
        message: 'Auction has ended'
      });
    }

    // Check if user is the seller
    const sellerId = (auction.seller && (typeof auction.seller === 'object' ? (auction.seller._id || auction.seller.id) : auction.seller))?.toString();
    if (sellerId === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot bid on your own auction'
      });
    }

    // Ensure bidder has sufficient wallet balance to place this bid
    let user = null;
    if (!usedDevMock) {
      user = await User.findById(userId).select('accountBalance currency');
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
    }

    // Get current highest bid
    const currentHighestBid = usedDevMock ? (Array.isArray(auction.bids) ? auction.bids[auction.bids.length - 1] : null) : await Bid.getHighestBid(auctionId);
    const currentAmount = currentHighestBid ? currentHighestBid.amount : (auction.currentBid || auction.startingPrice);

    // Calculate minimum required bid
    const minimumIncrement = calculateMinimumIncrement(currentAmount);
    const minimumBid = currentAmount + minimumIncrement;

    // Validate bid amount
    if (amount < minimumBid) {
      return res.status(400).json({
        success: false,
        message: `Minimum bid is $${minimumBid.toFixed(2)} (current: $${currentAmount.toFixed(2)} + $${minimumIncrement.toFixed(2)} increment)`
      });
    }

    // Check if user is already the highest bidder
    if (!usedDevMock && currentHighestBid && currentHighestBid.bidder._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'You are already the highest bidder'
      });
    }

    // Check wallet balance after validating amount but before placing bid
    if (!usedDevMock) {
      const availableBalance = typeof user.accountBalance === 'number' ? user.accountBalance : 0;
      if (availableBalance < amount) {
        return res.status(400).json({ success: false, message: `Insufficient balance to place bid. Required: $${amount.toFixed(2)}, Available: $${availableBalance.toFixed(2)}` });
      }
    }

    // Create new bid
    let newBid;
    if (usedDevMock) {
      const placed = devMockStore.placeBid(auctionId, req.user, amount, bidType, (bidType === 'auto' ? maxAutoBid : null));
      newBid = placed.bid;
      auction = placed.auction;
    } else {
      newBid = new Bid({
        auction: auctionId,
        bidder: userId,
        amount,
        bidType,
        maxAutoBid: bidType === 'auto' ? maxAutoBid : null,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      await newBid.save();
      await newBid.populate('bidder', 'username firstName lastName');
    }

    // Update auction current bid and apply anti-sniping soft-close if needed
    auction.currentBid = amount;
    const now = Date.now();
    const remaining = new Date(auction.endTime).getTime() - now;
    if (remaining > 0 && remaining <= SOFT_CLOSE_THRESHOLD_MS) {
      auction.endTime = new Date(new Date(auction.endTime).getTime() + SOFT_CLOSE_EXTENSION_MS);
    }
    if (!usedDevMock) {
      await auction.save();
    }

    // Compute total bids from Bid collection for accurate count
    const totalBids = usedDevMock ? (Array.isArray(auction.bids) ? auction.bids.length : (auction.bidCount || 0)) : await Bid.countDocuments({ auction: auctionId, isActive: true });

    // Emit real-time update to all users in the auction room
    if (io && io.to) io.to(`auction-${auctionId}`).emit('new-bid', {
      bid: {
        _id: newBid._id,
        amount: newBid.amount,
        bidder: {
          username: newBid.bidder.username,
          firstName: newBid.bidder.firstName,
          lastName: newBid.bidder.lastName
        },
        bidTime: newBid.bidTime,
        bidType: newBid.bidType
      },
      auction: {
        currentBid: auction.currentBid,
        bidCount: totalBids,
        endTime: auction.endTime
      }
    });

    // Notify room listeners that the previous highest bidder has been outbid
    if (!usedDevMock && currentHighestBid) {
      try {
        const prevIdRaw = (currentHighestBid.bidder && (currentHighestBid.bidder._id || currentHighestBid.bidder)) || null;
        const previousHighestBidderId = prevIdRaw && prevIdRaw.toString ? prevIdRaw.toString() : null;
        if (io && io.to) io.to(`auction-${auctionId}`).emit('outbid', {
          auctionId,
          previousHighestBidderId,
          currentBid: auction.currentBid,
          timestamp: Date.now()
        });
      } catch (e) {
        // no-op
      }
    }

    // Emit auction status update for soft-close end time changes
    if (io && io.to) io.to(`auction-${auctionId}`).emit('auction-update', {
      endTime: auction.endTime,
      currentBid: auction.currentBid,
      bidCount: totalBids
    });

    // Handle auto-bidding for other users
    if (!usedDevMock && bidType === 'manual') {
      await processAutoBids(auctionId, amount, userId, io);
    }

    res.status(201).json({
      success: true,
      message: 'Bid placed successfully',
      data: {
        bid: newBid,
        minimumNextBid: amount + calculateMinimumIncrement(amount)
      }
    });

  } catch (error) {
    console.error('Place bid error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to place bid'
    });
  }
};

// Process auto-bids for other users
const processAutoBids = async (auctionId, newBidAmount, excludeUserId, io) => {
  try {
    // Find active auto-bids for this auction (excluding the user who just bid)
    const autoBids = await Bid.find({
      auction: auctionId,
      bidType: 'auto',
      isActive: true,
      bidder: { $ne: excludeUserId },
      maxAutoBid: { $gt: newBidAmount }
    }).populate('bidder', 'username firstName lastName').sort({ maxAutoBid: -1 });

    for (const autoBid of autoBids) {
      const minimumIncrement = calculateMinimumIncrement(newBidAmount);
      const nextBidAmount = newBidAmount + minimumIncrement;

      if (nextBidAmount <= autoBid.maxAutoBid) {
        // Ensure auto-bidder has sufficient balance for the next bid
        const autoBidderUser = await User.findById(autoBid.bidder._id).select('accountBalance');
        const autoBidderBalance = autoBidderUser && typeof autoBidderUser.accountBalance === 'number' ? autoBidderUser.accountBalance : 0;
        if (autoBidderBalance < nextBidAmount) {
          // Skip placing auto-bid due to insufficient funds
          continue;
        }
        // Place auto-bid
        const newAutoBid = new Bid({
          auction: auctionId,
          bidder: autoBid.bidder._id,
          amount: nextBidAmount,
          bidType: 'auto',
          maxAutoBid: autoBid.maxAutoBid
        });

        await newAutoBid.save();
        await newAutoBid.populate('bidder', 'username firstName lastName');

        // Update auction current bid and apply soft-close if needed
        const auction = await Auction.findById(auctionId);
        auction.currentBid = nextBidAmount;
        const now = Date.now();
        const remaining = new Date(auction.endTime).getTime() - now;
        if (remaining > 0 && remaining <= SOFT_CLOSE_THRESHOLD_MS) {
          auction.endTime = new Date(new Date(auction.endTime).getTime() + SOFT_CLOSE_EXTENSION_MS);
        }
        await auction.save();

        const totalBids = await Bid.countDocuments({ auction: auctionId, isActive: true });

        // Emit auto-bid update
        io.to(`auction-${auctionId}`).emit('new-bid', {
          bid: {
            _id: newAutoBid._id,
            amount: newAutoBid.amount,
            bidder: {
              username: newAutoBid.bidder.username,
              firstName: newAutoBid.bidder.firstName,
              lastName: newAutoBid.bidder.lastName
            },
            bidTime: newAutoBid.bidTime,
            bidType: newAutoBid.bidType
          },
          auction: {
            currentBid: auction.currentBid,
            bidCount: totalBids,
            endTime: auction.endTime
          }
        });

        // Emit outbid event indicating prior highest bidder lost the lead
        try {
          const priorHighest = await Bid.getHighestBid(auctionId); // highest after placing auto-bid is newAutoBid
          // Determine previous bidder before this auto-bid by querying second highest or using newBidAmount
          // As a pragmatic approach, include bidder who was just surpassed (excludeUserId/newBidAmount holder)
          io.to(`auction-${auctionId}`).emit('outbid', {
            auctionId,
            previousHighestBidderId: excludeUserId ? excludeUserId.toString() : null,
            currentBid: auction.currentBid,
            timestamp: Date.now()
          });
        } catch (e) {
          // no-op
        }

        // Emit auction status update for soft-close end time changes
        io.to(`auction-${auctionId}`).emit('auction-update', {
          endTime: auction.endTime,
          currentBid: auction.currentBid,
          bidCount: totalBids
        });

        newBidAmount = nextBidAmount;
        break; // Only one auto-bid per cycle
      }
    }
  } catch (error) {
    console.error('Process auto-bids error:', error);
  }
};

// Get bid history for an auction
const getBidHistory = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { limit = 20, page = 1 } = req.query;


    const bids = await Bid.find({ 
      auction: auctionId, 
      isActive: true 
    })
    .sort({ amount: -1, bidTime: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .populate('bidder', 'username firstName lastName');

    const totalBids = await Bid.countDocuments({ 
      auction: auctionId, 
      isActive: true 
    });

    res.json({
      success: true,
      data: {
        bids,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalBids / parseInt(limit)),
          totalBids,
          hasMore: totalBids > parseInt(page) * parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get bid history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bid history'
    });
  }
};

// Get current highest bid for an auction
const getCurrentBid = async (req, res) => {
  try {
    const { auctionId } = req.params;


    const highestBid = await Bid.getHighestBid(auctionId);
    const auction = await Auction.findById(auctionId);

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    const currentPrice = highestBid ? highestBid.amount : auction.startingPrice;
    const minimumNextBid = currentPrice + calculateMinimumIncrement(currentPrice);
    const totalBids = await Bid.countDocuments({ auction: auctionId, isActive: true });

    res.json({
      success: true,
      data: {
        currentBid: highestBid,
        currentPrice,
        minimumNextBid,
        totalBids,
        minimumIncrement: calculateMinimumIncrement(currentPrice)
      }
    });

  } catch (error) {
    console.error('Get current bid error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current bid'
    });
  }
};

// Get user's bids for an auction
const getUserBids = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const userId = req.user.id;

    // Development-mode fallback: read from mock store when DB is disabled
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
    if (devFallbackEnabled) {
      try {
        const a = devMockStore.getAuction(auctionId);
        const bids = (a.bids || []).filter(b => (b.bidder && (b.bidder._id || b.bidder.id))?.toString() === userId.toString());
        return res.json({ success: true, data: { bids } });
      } catch (e) {
        // Fall through to DB-backed implementation
      }
    }

    const userBids = await Bid.getUserBids(auctionId, userId);

    res.json({
      success: true,
      data: { bids: userBids }
    });

  } catch (error) {
    console.error('Get user bids error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user bids'
    });
  }
};

// Set auto-bid (proxy bidding)
const setAutoBid = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { maxAmount } = req.body;
    const userId = req.user._id || req.user.id;

    // Enable development fallback when DB is disabled
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
    if (devFallbackEnabled) {
      // Validate auction exists in mock store and is active
      const mockAuction = devMockStore.getAuction(auctionId);
      if ((mockAuction.status || 'active') !== 'active') {
        return res.status(400).json({ success: false, message: 'Auction is not available for bidding' });
      }
      const sellerId = (mockAuction.seller && (typeof mockAuction.seller === 'object' ? (mockAuction.seller._id || mockAuction.seller.id) : mockAuction.seller))?.toString();
      if (sellerId === String(userId)) {
        return res.status(400).json({ success: false, message: 'You cannot set auto-bid on your own auction' });
      }
      const currentPrice = typeof mockAuction.currentBid === 'number' ? mockAuction.currentBid : mockAuction.startingPrice;
      if (Number(maxAmount) <= Number(currentPrice)) {
        return res.status(400).json({ success: false, message: `Auto-bid maximum must be higher than current price ($${Number(currentPrice).toFixed(2)})` });
      }
      // Record auto-bid preference in mock store
      devMockStore.setAutoBid(auctionId, req.user, maxAmount);
      return res.json({ success: true, message: 'Auto-bid set successfully', data: { maxAmount } });
    }

    // Validate auction
    const auction = await Auction.findById(auctionId);
    if (!auction || auction.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Auction is not available for bidding'
      });
    }

    // Check if user is the seller
    if (auction.seller.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot set auto-bid on your own auction'
      });
    }

    const currentHighestBid = await Bid.getHighestBid(auctionId);
    const currentPrice = currentHighestBid ? currentHighestBid.amount : auction.startingPrice;

    if (maxAmount <= currentPrice) {
      return res.status(400).json({
        success: false,
        message: `Auto-bid maximum must be higher than current price ($${currentPrice.toFixed(2)})`
      });
    }

    // Ensure user has sufficient balance for the auto-bid maximum
    const user = await User.findById(userId).select('accountBalance');
    const availableBalance = user && typeof user.accountBalance === 'number' ? user.accountBalance : 0;
    if (availableBalance < maxAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance for auto-bid maximum. Required: $${Number(maxAmount).toFixed(2)}, Available: $${availableBalance.toFixed(2)}`
      });
    }

    // Deactivate any existing auto-bids for this user on this auction
    await Bid.updateMany(
      { auction: auctionId, bidder: userId, bidType: 'auto' },
      { isActive: false }
    );

    // Create new auto-bid entry
    const autoBid = new Bid({
      auction: auctionId,
      bidder: userId,
      amount: currentPrice, // This will be updated when auto-bidding occurs
      bidType: 'auto',
      maxAutoBid: maxAmount
    });

    await autoBid.save();

    res.json({
      success: true,
      message: 'Auto-bid set successfully',
      data: { maxAmount }
    });

  } catch (error) {
    console.error('Set auto-bid error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set auto-bid'
    });
  }
};

module.exports = {
  placeBid,
  getBidHistory,
  getCurrentBid,
  getUserBids,
  setAutoBid,
  calculateMinimumIncrement
};