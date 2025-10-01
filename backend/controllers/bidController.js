const Bid = require('../models/Bid');
const Auction = require('../models/Auction');
const User = require('../models/User');

// Bid increment rules
const BID_INCREMENT_RULES = {
  0: 5,        // $0-$99: $5 increment
  100: 10,     // $100-$499: $10 increment
  500: 25,     // $500-$999: $25 increment
  1000: 50,    // $1000-$4999: $50 increment
  5000: 100,   // $5000-$9999: $100 increment
  10000: 250,  // $10000+: $250 increment
};

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
    const userId = req.user.id;
    const io = req.app.get('io');

    // Validate auction exists and is active
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    if (auction.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Auction is not active'
      });
    }

    // Check if auction has ended
    if (new Date() > auction.endTime) {
      return res.status(400).json({
        success: false,
        message: 'Auction has ended'
      });
    }

    // Check if user is the seller
    if (auction.seller.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot bid on your own auction'
      });
    }

    // Get current highest bid
    const currentHighestBid = await Bid.getHighestBid(auctionId);
    const currentAmount = currentHighestBid ? currentHighestBid.amount : auction.startingPrice;

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
    if (currentHighestBid && currentHighestBid.bidder._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'You are already the highest bidder'
      });
    }

    // Create new bid
    const newBid = new Bid({
      auction: auctionId,
      bidder: userId,
      amount,
      bidType,
      maxAutoBid: bidType === 'auto' ? maxAutoBid : null,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await newBid.save();

    // Populate bidder information
    await newBid.populate('bidder', 'username firstName lastName');

    // Update auction current price
    auction.currentPrice = amount;
    auction.totalBids = (auction.totalBids || 0) + 1;
    await auction.save();

    // Emit real-time update to all users in the auction room
    io.to(`auction-${auctionId}`).emit('new-bid', {
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
        currentPrice: auction.currentPrice,
        totalBids: auction.totalBids
      }
    });

    // Handle auto-bidding for other users
    if (bidType === 'manual') {
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

        // Update auction
        const auction = await Auction.findById(auctionId);
        auction.currentPrice = nextBidAmount;
        auction.totalBids = (auction.totalBids || 0) + 1;
        await auction.save();

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
            currentPrice: auction.currentPrice,
            totalBids: auction.totalBids
          }
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

    res.json({
      success: true,
      data: {
        currentBid: highestBid,
        currentPrice,
        minimumNextBid,
        totalBids: auction.totalBids || 0,
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
    const userId = req.user.id;

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