const Auction = require('../models/Auction');
const User = require('../models/User');
const emailService = require('../services/emailService');
const devMockStore = require('../services/devMockStore');

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

    // Compose conditions without overwriting when both price and search are present
    const andClauses = [];

    // Price range filter - check both starting price and current bid
    if (minPrice || maxPrice) {
      const priceFilter = {};
      if (minPrice) priceFilter.$gte = parseFloat(minPrice);
      if (maxPrice) priceFilter.$lte = parseFloat(maxPrice);
      andClauses.push({
        $or: [
          { startingPrice: priceFilter },
          { currentBid: priceFilter }
        ]
      });
    }

    // Search filter - enhanced to include subcategory and condition report
    if (search) {
      andClauses.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { subcategory: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } },
          { 'conditionReport.overall': { $regex: search, $options: 'i' } }
        ]
      });
    }

    if (andClauses.length > 0) {
      filter.$and = andClauses;
    }

    // Dev-mode: when enabled, serve dev catalog for consistent local testing BEFORE any DB calls
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
    if (devFallbackEnabled) {
      try {
        const perPage = parseInt(limit);
        const currentPage = parseInt(page);

        // Load in-memory dev catalog
        let list = devMockStore.listAuctions();

        // Apply filters
        if (category) list = list.filter(a => (a.category || '') === category);
        if (subcategory) list = list.filter(a => (a.subcategory || '') === subcategory);
        if (status) list = list.filter(a => (a.status || '') === status);
        if (condition) list = list.filter(a => (a.condition || '') === condition);
        if (featured !== undefined) {
          const isFeatured = featured === 'true';
          list = list.filter(a => Boolean(a.featured) === isFeatured);
        }

        // Price range (startingPrice or currentBid within range)
        const hasMin = typeof minPrice !== 'undefined' && minPrice !== '';
        const hasMax = typeof maxPrice !== 'undefined' && maxPrice !== '';
        const min = hasMin ? parseFloat(minPrice) : undefined;
        const max = hasMax ? parseFloat(maxPrice) : undefined;
        if (hasMin || hasMax) {
          const withinRange = (v) => {
            if (v === null || typeof v === 'undefined') return false;
            if (hasMin && Number(v) < min) return false;
            if (hasMax && Number(v) > max) return false;
            return true;
          };
          list = list.filter(a => withinRange(a.startingPrice) || withinRange(a.currentBid));
        }

        // Search across title/description/subcategory/tags/conditionReport.overall
        if (search) {
          const re = new RegExp(search, 'i');
          list = list.filter(a => (
            re.test(a.title || '') ||
            re.test(a.description || '') ||
            re.test(a.subcategory || '') ||
            (Array.isArray(a.tags) && a.tags.some(t => re.test(String(t)))) ||
            (a.conditionReport && re.test(a.conditionReport.overall || ''))
          ));
        }

        // Ensure createdAt exists for sorting
        list = list.map((a, idx) => {
          const createdAt = a.createdAt || a.startTime || new Date(Date.now() - (idx + 1) * 1000);
          return { ...a, createdAt };
        });

        // Sorting
        const negative = String(sort).startsWith('-');
        const sortField = String(sort).replace(/^-/, '') || 'createdAt';
        list.sort((a, b) => {
          if (sortField === 'title') {
            const as = String(a.title || '').toLowerCase();
            const bs = String(b.title || '').toLowerCase();
            return negative ? bs.localeCompare(as) : as.localeCompare(bs);
          }
          const getVal = (obj) => {
            const v = obj[sortField];
            if (sortField === 'createdAt') return new Date(v || 0).getTime();
            return Number(v || 0);
          };
          const av = getVal(a);
          const bv = getVal(b);
          return negative ? (bv - av) : (av - bv);
        });

        const totalItems = list.length;
        const startIndex = (currentPage - 1) * perPage;
        const paged = list.slice(startIndex, startIndex + perPage);

        return res.json({
          success: true,
          data: {
            auctions: paged,
            pagination: {
              currentPage,
              totalPages: Math.ceil(totalItems / perPage),
              totalItems,
              itemsPerPage: perPage
            }
          }
        });
      } catch (fallbackErr) {
        console.error('Dev fallback error:', fallbackErr);
        // If fallback fails, continue to DB-backed flow below
      }
    }

    // Calculate pagination for DB-backed mode
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
    // In development mock mode, serve from in-memory store before any DB calls
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
    if (devFallbackEnabled) {
      try {
        const mockAuction = devMockStore.getAuction(id);
        try { devMockStore.incrementViews(id); } catch (_) {}
        return res.json({ success: true, data: { auction: mockAuction } });
      } catch (e) {
        // If mock retrieval fails, proceed with DB lookup
      }
    }

    let auction = await Auction.findById(id)
      .populate('seller', 'username firstName lastName email phone')
      .populate('winner', 'username firstName lastName')
      .populate('bids.bidder', 'username firstName lastName');

    if (!auction) {
      // Dev-mode fallback: return mock auction when DB-backed item is not found
      if (devFallbackEnabled) {
        try {
          // Serve from in-memory dev store to keep detail page functional in dev
          const mockAuction = devMockStore.getAuction(id);
          // Increment views in dev store when accessed
          try { devMockStore.incrementViews(id); } catch (_) {}
          return res.json({
            success: true,
            data: { auction: mockAuction }
          });
        } catch (e) {
          // If dev fallback fails unexpectedly, continue with 404
          // (ensures consistent behavior in non-dev scenarios)
        }
      }

      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    // If auction has ended but not finalized, finalize (set winner) and send notifications once
    if (auction.status === 'active' && new Date() >= auction.endTime) {
      auction = await auction.checkAndEndAuction();
      await auction.populate('seller', 'username firstName lastName email phone');
      await auction.populate('winner', 'username firstName lastName email');

      // Send winner notification once
      if (auction.winner && auction.winningBid && !auction.notifications?.winnerNotified) {
        const winnerEmail = auction.winner?.email;
        if (winnerEmail) {
          const result = await emailService.sendAuctionWinnerEmail(winnerEmail, {
            firstName: auction.winner.firstName || auction.winner.username || 'Bidder',
            auctionTitle: auction.title,
            amount: auction.winningBid,
            auctionId: auction._id.toString()
          });
          if (result.success) {
            auction.notifications = auction.notifications || {};
            auction.notifications.winnerNotified = true;
          }
        }
      }

      // Send seller notification once
      if (auction.seller && auction.winningBid && !auction.notifications?.sellerNotified) {
        const sellerEmail = auction.seller?.email;
        if (sellerEmail) {
          const result = await emailService.sendSellerAuctionEndedEmail(sellerEmail, {
            firstName: auction.seller.firstName || auction.seller.username || 'Seller',
            auctionTitle: auction.title,
            amount: auction.winningBid,
            auctionId: auction._id.toString(),
            winnerName: auction.winner ? (auction.winner.firstName || auction.winner.username || 'Buyer') : 'No winner'
          });
          if (result.success) {
            auction.notifications = auction.notifications || {};
            auction.notifications.sellerNotified = true;
          }
        }
      }

      await auction.save();
    }

    // Increment view count if user is not the seller (guard null seller)
    const sellerId = auction?.seller && typeof auction.seller === 'object' && auction.seller._id
      ? auction.seller._id.toString()
      : (auction?.seller ? auction.seller.toString() : null);
    const requesterId = req.user?._id ? req.user._id.toString() : null;
    if (!sellerId || !requesterId || requesterId !== sellerId) {
      auction.views = (auction.views || 0) + 1;
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
    // Handle Mongoose validation errors explicitly
    if (error && error.name === 'ValidationError') {
      const errors = Object.keys(error.errors || {}).map((key) => {
        const e = error.errors[key];
        return {
          field: key,
          message: e.message,
          kind: e.kind,
          value: e.value
        };
      });
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    // Duplicate key or other Mongo errors
    if (error && (error.code === 11000 || error.name === 'MongoServerError')) {
      return res.status(400).json({
        success: false,
        message: 'Database constraint error',
        detail: error.message
      });
    }
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
    // Handle Mongoose validation errors explicitly
    if (error && error.name === 'ValidationError') {
      const errors = Object.keys(error.errors || {}).map((key) => {
        const e = error.errors[key];
        return {
          field: key,
          message: e.message,
          kind: e.kind,
          value: e.value
        };
      });
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    // Duplicate key or other Mongo errors
    if (error && (error.code === 11000 || error.name === 'MongoServerError')) {
      return res.status(400).json({
        success: false,
        message: 'Database constraint error',
        detail: error.message
      });
    }
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
    const userId = req.params.userId || req.user?.id || req.user?._id;

    

    // Check if user can access these auctions
    if (userId && req.user?._id && userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own auctions'
      });
    }

    // Development-mode fallback: serve from in-memory mock store when DB is disabled
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
    if (devFallbackEnabled) {
      const allAuctions = devMockStore.listAuctions();
      const userIdStr = String(userId);
      // Filter auctions where the current user is the seller
      const filtered = allAuctions.filter(a => {
        const sellerId = (a.seller && (a.seller._id || a.seller.id))?.toString();
        const statusOk = !status || (a.status === status);
        return sellerId === userIdStr && statusOk;
      });

      const currentPage = parseInt(page);
      const perPage = parseInt(limit);
      const totalItems = filtered.length;
      const start = (currentPage - 1) * perPage;
      const paged = filtered.slice(start, start + perPage);

      return res.json({
        success: true,
        data: {
          auctions: paged,
          pagination: {
            currentPage,
            totalPages: Math.ceil(totalItems / perPage),
            totalItems,
            itemsPerPage: perPage
          }
        }
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
    // Normalize user id across dev and db contexts
    const userId = req.params.userId || req.user?.id || req.user?._id;


    // Check if user can access these bids
    if (userId && req.user?._id && userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own bids'
      });
    }

    // Development-mode fallback: serve from in-memory mock store when DB is disabled
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
    if (devFallbackEnabled) {
      const allAuctions = devMockStore.listAuctions();
      const userIdStr = String(userId);
      // Filter auctions where the user has placed bids
      const filtered = allAuctions.filter(a =>
        Array.isArray(a.bids) && a.bids.some(b => (b.bidder && (b.bidder._id || b.bidder.id))?.toString() === userIdStr)
      );
      // Prepare response objects with only user's bids and highestUserBid
      const mapped = filtered.map(a => {
        const userBids = (a.bids || []).filter(b => (b.bidder && (b.bidder._id || b.bidder.id))?.toString() === userIdStr);
        const highestUserBid = userBids.length ? Math.max(...userBids.map(b => Number(b.amount))) : null;
        // Include `bids` alias for compatibility with dev scripts that expect this shape
        return { ...a, userBids, bids: userBids, highestUserBid };
      });
      // Sort by most recent user bid
      mapped.sort((x, y) => {
        const xLast = x.userBids.length ? x.userBids[x.userBids.length - 1] : null;
        const yLast = y.userBids.length ? y.userBids[y.userBids.length - 1] : null;
        const xTs = xLast ? new Date(xLast.timestamp || xLast.bidTime || 0).getTime() : 0;
        const yTs = yLast ? new Date(yLast.timestamp || yLast.bidTime || 0).getTime() : 0;
        return yTs - xTs;
      });

      const currentPage = parseInt(page);
      const perPage = parseInt(limit);
      const totalItems = mapped.length;
      const start = (currentPage - 1) * perPage;
      const paged = mapped.slice(start, start + perPage);

      return res.json({
        success: true,
        data: {
          auctions: paged,
          pagination: {
            currentPage,
            totalPages: Math.ceil(totalItems / perPage),
            totalItems,
            itemsPerPage: perPage
          }
        }
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

    // Check if already in watchlist (idempotent)
    if (auction.watchedBy.includes(req.user._id)) {
      return res.json({
        success: true,
        message: 'Auction already in watchlist',
        alreadyWatched: true
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

    // Determine current state to return symmetric flag
    const wasWatchedDb = auction.watchedBy.some(
      watcher => watcher.toString() === req.user._id.toString()
    );

    if (!wasWatchedDb) {
      return res.json({
        success: true,
        message: 'Auction not in watchlist',
        alreadyNotWatched: true
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

    // Development fallback removed; enforce database-only logic

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
    // Enhanced category structure with proper organization
    const enhancedCategories = [
      {
        _id: 'Art',
        name: 'Art',
        count: 45,
        subcategories: [
          { name: 'Paintings', count: 15 },
          { name: 'Sculptures', count: 8 },
          { name: 'Prints & Lithographs', count: 12 },
          { name: 'Photography', count: 6 },
          { name: 'Mixed Media', count: 4 }
        ]
      },
      {
        _id: 'Collectibles',
        name: 'Collectibles',
        count: 78,
        subcategories: [
          { name: 'Luxury Watches', count: 25 },
          { name: 'Coins & Currency', count: 18 },
          { name: 'Sports Memorabilia', count: 12 },
          { name: 'Stamps', count: 8 },
          { name: 'Trading Cards', count: 10 },
          { name: 'Vintage Toys', count: 5 }
        ]
      },
      {
        _id: 'Vehicles',
        name: 'Vehicles',
        count: 32,
        subcategories: [
          { name: 'Classic Cars', count: 18 },
          { name: 'Motorcycles', count: 8 },
          { name: 'Boats & Yachts', count: 4 },
          { name: 'Aircraft', count: 2 }
        ]
      },
      {
        _id: 'Antiques',
        name: 'Antiques',
        count: 56,
        subcategories: [
          { name: 'Furniture', count: 20 },
          { name: 'Rugs & Textiles', count: 15 },
          { name: 'Ceramics & Pottery', count: 12 },
          { name: 'Silver & Metalwork', count: 9 }
        ]
      },
      {
        _id: 'Jewelry',
        name: 'Jewelry',
        count: 34,
        subcategories: [
          { name: 'Fine Jewelry', count: 20 },
          { name: 'Vintage Jewelry', count: 8 },
          { name: 'Costume Jewelry', count: 6 }
        ]
      },
      {
        _id: 'Books & Manuscripts',
        name: 'Books & Manuscripts',
        count: 28,
        subcategories: [
          { name: 'Rare Books', count: 15 },
          { name: 'First Editions', count: 8 },
          { name: 'Manuscripts', count: 3 },
          { name: 'Maps & Atlases', count: 2 }
        ]
      }
    ];

    res.json({
      success: true,
      data: { categories: enhancedCategories }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories'
    });
  }
};

// Get watchlist notifications for a user
const getWatchlistNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Temporarily return no notifications until real implementation
    res.json({
      success: true,
      notifications: []
    });
  } catch (error) {
    console.error('Error fetching watchlist notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
};

// Mark notification as read
const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    // In a real app, you would update the notification in the database
    // For now, we'll just return success
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
};

// Mark all notifications as read
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    // In a real app, you would update all notifications for the user in the database
    
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
};

// Get user's auction history (ended auctions where user is seller or bidder)
const getUserAuctionHistory = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const userId = req.params.userId || req.user._id;

    // DB-backed implementation
    const userObjectId = userId.toString();

    const auctions = await Auction.find({
      status: 'ended',
      $or: [
        { seller: userObjectId },
        { 'bids.bidder': userObjectId }
      ]
    })
      .populate('seller', 'username firstName lastName')
      .populate('winner', 'username firstName lastName')
      .sort({ endTime: -1 })
      .limit(parseInt(limit) * 1)
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Auction.countDocuments({
      status: 'ended',
      $or: [
        { seller: userObjectId },
        { 'bids.bidder': userObjectId }
      ]
    });

    return res.json({
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
    console.error('Get user auction history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch auction history'
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
  // Moderation
  updateAuctionStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body || {};

      if (!status || !['active', 'paused'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Allowed: active, paused'
        });
      }

      // Development fallback removed; enforce database-only logic

      const auction = await Auction.findById(id);
      if (!auction) {
        return res.status(404).json({ success: false, message: 'Auction not found' });
      }

      // Ownership or admin check
      if (auction.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Unauthorized to modify this auction' });
      }

      if (!['active', 'paused'].includes(auction.status)) {
        return res.status(400).json({ success: false, message: 'Auction cannot be toggled at current status' });
      }

      // Toggle via model methods when available, otherwise set directly
      if (status === 'paused') {
        auction.status = 'paused';
      } else if (status === 'active') {
        auction.status = 'active';
      }
      await auction.save();

      await auction.populate('seller', 'username firstName lastName');
      await auction.populate('winner', 'username firstName lastName');
      return res.json({ success: true, message: 'Auction status updated', data: { auction } });
    } catch (error) {
      console.error('Update auction status error:', error);
      res.status(500).json({ success: false, message: 'Server error while updating auction status' });
    }
  },

  extendAuction: async (req, res) => {
    try {
      const { id } = req.params;
      let { extensionMinutes, extensionMs, newEndTime } = req.body || {};

      // Normalize input
      if (!extensionMs && extensionMinutes) {
        extensionMs = Number(extensionMinutes) * 60 * 1000;
      }

      // Development fallback removed; enforce database-only logic

      const auction = await Auction.findById(id);
      if (!auction) {
        return res.status(404).json({ success: false, message: 'Auction not found' });
      }

      if (auction.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Unauthorized to extend this auction' });
      }

      if (auction.status !== 'active') {
        return res.status(400).json({ success: false, message: 'Only active auctions can be extended' });
      }

      const currentEnd = new Date(auction.endTime).getTime();
      let targetEnd = currentEnd;
      if (newEndTime) {
        targetEnd = new Date(newEndTime).getTime();
      } else if (extensionMs) {
        targetEnd = currentEnd + Number(extensionMs);
      } else {
        targetEnd = currentEnd + 60 * 60 * 1000;
      }

      if (isNaN(targetEnd) || targetEnd <= currentEnd) {
        return res.status(400).json({ success: false, message: 'New end time must be later than current end time' });
      }

      auction.endTime = new Date(targetEnd);
      await auction.save();

      await auction.populate('seller', 'username firstName lastName');
      await auction.populate('winner', 'username firstName lastName');
      return res.json({ success: true, message: 'Auction extended', data: { auction } });
    } catch (error) {
      console.error('Extend auction error:', error);
      res.status(500).json({ success: false, message: 'Server error while extending auction' });
    }
  },

  cancelAuction: async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};

      // Development fallback removed; enforce database-only logic

      const auction = await Auction.findById(id);
      if (!auction) {
        return res.status(404).json({ success: false, message: 'Auction not found' });
      }

      if (auction.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Unauthorized to cancel this auction' });
      }

      if (auction.status === 'ended') {
        return res.status(400).json({ success: false, message: 'Cannot cancel an ended auction' });
      }

      auction.status = 'cancelled';
      if (reason) auction.cancellationReason = reason;
      await auction.save();

      await auction.populate('seller', 'username firstName lastName');
      await auction.populate('winner', 'username firstName lastName');
      return res.json({ success: true, message: 'Auction cancelled', data: { auction } });
    } catch (error) {
      console.error('Cancel auction error:', error);
      res.status(500).json({ success: false, message: 'Server error while cancelling auction' });
    }
  },
  getUserAuctions,
  getUserBids,
  getUserAuctionHistory,
  addToWatchlist,
  removeFromWatchlist,
  getUserWatchlist,
  getCategories,
  getWatchlistNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
};