const Auction = require('../models/Auction');
const User = require('../models/User');

// Get all auctions with filtering and pagination
const getAuctions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      subcategory,
      status,
      minPrice,
      maxPrice,
      search,
      sort = '-createdAt',
      featured,
      condition
    } = req.query;

    // Build filter object
    const filter = {};

    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (status) filter.status = status;
    if (condition) filter.condition = condition;
    if (featured !== undefined) filter.featured = featured === 'true';

    // Price range filter - check both starting price and current bid
    if (minPrice || maxPrice) {
      const priceFilter = {};
      if (minPrice) priceFilter.$gte = parseFloat(minPrice);
      if (maxPrice) priceFilter.$lte = parseFloat(maxPrice);
      
      filter.$or = [
        { startingPrice: priceFilter },
        { currentBid: priceFilter }
      ];
    }

    // Search filter - enhanced to include subcategory and condition report
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { subcategory: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
        { 'conditionReport.overall': { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const auctions = await Auction.find(filter)
      .populate('seller', 'username firstName lastName')
      .populate('winner', 'username firstName lastName')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Auction.countDocuments(filter);

    res.json({
      success: true,
      data: {
        auctions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get auctions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching auctions'
    });
  }
};

// Get single auction by ID
const getAuctionById = async (req, res) => {
  try {
    const { id } = req.params;

    const auction = await Auction.findById(id)
      .populate('seller', 'username firstName lastName email phone')
      .populate('winner', 'username firstName lastName')
      .populate('bids.bidder', 'username firstName lastName');

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    // Increment view count if user is not the seller
    if (!req.user || req.user._id.toString() !== auction.seller._id.toString()) {
      auction.views += 1;
      await auction.save();
    }

    res.json({
      success: true,
      data: { auction }
    });
  } catch (error) {
    console.error('Get auction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching auction'
    });
  }
};

// Create new auction
const createAuction = async (req, res) => {
  try {
    const auctionData = {
      ...req.body,
      seller: req.user._id
    };

    const auction = new Auction(auctionData);
    await auction.save();

    // Populate seller information
    await auction.populate('seller', 'username firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Auction created successfully',
      data: { auction }
    });
  } catch (error) {
    console.error('Create auction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating auction'
    });
  }
};

// Update auction
const updateAuction = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const auction = await Auction.findById(id);

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    // Check if user is the seller or admin
    if (auction.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own auctions'
      });
    }

    // Prevent updates if auction has bids (except for admin)
    if (auction.bids.length > 0 && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update auction with existing bids'
      });
    }

    // Update auction
    Object.assign(auction, updates);
    await auction.save();

    await auction.populate('seller', 'username firstName lastName');

    res.json({
      success: true,
      message: 'Auction updated successfully',
      data: { auction }
    });
  } catch (error) {
    console.error('Update auction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating auction'
    });
  }
};

// Delete auction
const deleteAuction = async (req, res) => {
  try {
    const { id } = req.params;

    const auction = await Auction.findById(id);

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    // Check if user is the seller or admin
    if (auction.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own auctions'
      });
    }

    // Prevent deletion if auction has bids (except for admin)
    if (auction.bids.length > 0 && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete auction with existing bids'
      });
    }

    await Auction.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Auction deleted successfully'
    });
  } catch (error) {
    console.error('Delete auction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting auction'
    });
  }
};

// Place bid on auction
const placeBid = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    const auction = await Auction.findById(id);

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    // Check if auction is active
    if (auction.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Auction is not active'
      });
    }

    // Check if user is not the seller
    if (auction.seller.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot bid on your own auction'
      });
    }

    // Place bid using the model method
    const result = await auction.placeBid(req.user._id, amount);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    // Populate the updated auction
    await auction.populate('bids.bidder', 'username firstName lastName');

    res.json({
      success: true,
      message: 'Bid placed successfully',
      data: { auction }
    });
  } catch (error) {
    console.error('Place bid error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while placing bid'
    });
  }
};

// Get user's auctions (selling)
const getUserAuctions = async (req, res) => {
  try {
    const { page = 1, limit = 12, status } = req.query;
    const userId = req.params.userId || req.user._id;

    // Check if user can access these auctions
    if (userId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own auctions'
      });
    }

    const filter = { seller: userId };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const auctions = await Auction.find(filter)
      .populate('winner', 'username firstName lastName')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Auction.countDocuments(filter);

    res.json({
      success: true,
      data: {
        auctions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user auctions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user auctions'
    });
  }
};

// Get user's bids
const getUserBids = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const userId = req.params.userId || req.user._id;

    // Check if user can access these bids
    if (userId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own bids'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const auctions = await Auction.find({
      'bids.bidder': userId
    })
      .populate('seller', 'username firstName lastName')
      .populate('winner', 'username firstName lastName')
      .sort('-bids.timestamp')
      .skip(skip)
      .limit(parseInt(limit));

    // Filter to show user's bids only
    const auctionsWithUserBids = auctions.map(auction => {
      const userBids = auction.bids.filter(bid => bid.bidder.toString() === userId);
      return {
        ...auction.toObject(),
        userBids,
        highestUserBid: Math.max(...userBids.map(bid => bid.amount))
      };
    });

    const total = await Auction.countDocuments({ 'bids.bidder': userId });

    res.json({
      success: true,
      data: {
        auctions: auctionsWithUserBids,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user bids error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user bids'
    });
  }
};

// Add auction to watchlist
const addToWatchlist = async (req, res) => {
  try {
    const { id } = req.params;

    const auction = await Auction.findById(id);

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    // Check if already in watchlist
    if (auction.watchedBy.includes(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'Auction is already in your watchlist'
      });
    }

    auction.watchedBy.push(req.user._id);
    await auction.save();

    res.json({
      success: true,
      message: 'Auction added to watchlist'
    });
  } catch (error) {
    console.error('Add to watchlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding to watchlist'
    });
  }
};

// Remove auction from watchlist
const removeFromWatchlist = async (req, res) => {
  try {
    const { id } = req.params;

    const auction = await Auction.findById(id);

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    auction.watchedBy = auction.watchedBy.filter(
      watcher => watcher.toString() !== req.user._id.toString()
    );
    await auction.save();

    res.json({
      success: true,
      message: 'Auction removed from watchlist'
    });
  } catch (error) {
    console.error('Remove from watchlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing from watchlist'
    });
  }
};

// Get user's watchlist
const getUserWatchlist = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const userId = req.user._id;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const auctions = await Auction.find({
      watchedBy: userId
    })
      .populate('seller', 'username firstName lastName')
      .populate('winner', 'username firstName lastName')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Auction.countDocuments({ watchedBy: userId });

    res.json({
      success: true,
      data: {
        auctions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user watchlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching watchlist'
    });
  }
};

// Get categories with counts
const getCategories = async (req, res) => {
  try {
    const categories = await Auction.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          subcategories: { $addToSet: '$subcategory' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories'
    });
  }
};

module.exports = {
  getAuctions,
  getAuctionById,
  createAuction,
  updateAuction,
  deleteAuction,
  placeBid,
  getUserAuctions,
  getUserBids,
  addToWatchlist,
  removeFromWatchlist,
  getUserWatchlist,
  getCategories
};