const Auction = require('../models/Auction');
const User = require('../models/User');

// Get all auctions with filtering and pagination
const getAuctions = async (req, res) => {
  try {
    // Check if we're in development mode without database connection
    if (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true') {
      // Return enhanced mock auction data for development
      const mockAuctions = [
        {
          _id: '507f1f77bcf86cd799439011',
          title: 'Vintage Rolex Submariner 5513 - 1970',
          description: 'An exceptional vintage Rolex Submariner reference 5513 from 1970. This iconic timepiece features the classic no-date configuration with a matte black dial and matching bezel insert. The watch has been carefully maintained and serviced, retaining its original patina and character. The case shows minimal wear consistent with age, and the movement runs accurately within COSC specifications. This particular example represents one of the most sought-after vintage Rolex models, perfect for collectors and enthusiasts alike.',
          category: 'Collectibles',
          subcategory: 'Luxury Watches',
          startingPrice: 5000,
          currentBid: 7500,
          reservePrice: 8000,
          bidIncrement: 250,
          status: 'active',
          condition: 'excellent',
          conditionReport: {
            overall: 'Excellent condition with original patina and minimal wear consistent with age.',
            defects: ['Minor scratches on case back', 'Slight fading on bezel insert at 12 o\'clock'],
            authenticity: {
              verified: true,
              certificate: 'Rolex Service Certificate included',
              verifiedBy: 'Authorized Rolex Service Center'
            },
            provenance: 'Single owner since 1975, purchased from authorized Rolex dealer in Geneva.'
          },
          featured: true,
          images: [
            {
              url: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&h=600&fit=crop',
              alt: 'Rolex Submariner front view',
              isPrimary: true,
              caption: 'Front view showing the iconic black dial and bezel',
              order: 1
            },
            {
              url: 'https://images.unsplash.com/photo-1594534475808-b18fc33b045e?w=800&h=600&fit=crop',
              alt: 'Rolex Submariner side profile',
              isPrimary: false,
              caption: 'Side profile highlighting the case thickness and crown guards',
              order: 2
            },
            {
              url: 'https://images.unsplash.com/photo-1548181622-6ac3b2c2b8b7?w=800&h=600&fit=crop',
              alt: 'Rolex Submariner case back',
              isPrimary: false,
              caption: 'Case back showing serial number and engravings',
              order: 3
            },
            {
              url: 'https://images.unsplash.com/photo-1606859065739-36a0b6ac2e8b?w=800&h=600&fit=crop',
              alt: 'Rolex Submariner movement',
              isPrimary: false,
              caption: 'Caliber 1520 automatic movement',
              order: 4
            }
          ],
          startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          seller: { 
            _id: '507f1f77bcf86cd799439012', 
            username: 'watchcollector', 
            firstName: 'John', 
            lastName: 'Doe',
            email: 'john.doe@example.com'
          },
          views: 342,
          watchedBy: ['507f1f77bcf86cd799439015', '507f1f77bcf86cd799439016'],
          bidCount: 12,
          tags: ['rolex', 'vintage', 'luxury', 'submariner', '1970s'],
          shippingInfo: {
            cost: 50,
            methods: ['Insured Express', 'Registered Mail'],
            international: true
          },
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        {
          _id: '507f1f77bcf86cd799439013',
          title: 'Antique Persian Tabriz Rug - 19th Century',
          description: 'A magnificent hand-knotted Persian Tabriz rug from the late 19th century, featuring intricate floral medallion design with rich burgundy and navy blue colors. This exceptional piece measures approximately 9x12 feet and showcases the masterful craftsmanship of Tabriz weavers. The rug features a central medallion surrounded by elaborate corner spandrels and a complex border system with multiple guard borders. The wool is of exceptional quality with a silk highlight that adds luminosity to the design. This rug has been professionally cleaned and is in remarkable condition for its age.',
          category: 'Art',
          subcategory: 'Antique Textiles',
          startingPrice: 2000,
          currentBid: 3200,
          reservePrice: 4500,
          bidIncrement: 100,
          status: 'active',
          condition: 'good',
          conditionReport: {
            overall: 'Good condition with age-appropriate wear. Colors remain vibrant with minimal fading.',
            defects: ['Minor edge wear on two corners', 'Small repair in border area (professionally done)', 'Light overall wear consistent with age'],
            authenticity: {
              verified: true,
              certificate: 'Certificate of Authenticity from Persian Rug Society',
              verifiedBy: 'Dr. Sarah Mitchell, Textile Historian'
            },
            provenance: 'Estate collection, originally purchased in Tehran in 1920s by British diplomat.'
          },
          featured: false,
          images: [
            {
              url: 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&h=600&fit=crop',
              alt: 'Persian rug full view',
              isPrimary: true,
              caption: 'Full view of the Tabriz rug showing central medallion design',
              order: 1
            },
            {
              url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
              alt: 'Persian rug detail',
              isPrimary: false,
              caption: 'Close-up detail of the intricate knotwork and silk highlights',
              order: 2
            },
            {
              url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop',
              alt: 'Persian rug border detail',
              isPrimary: false,
              caption: 'Border detail showing the complex guard border system',
              order: 3
            }
          ],
          startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          seller: { 
            _id: '507f1f77bcf86cd799439014', 
            username: 'antiquedealer', 
            firstName: 'Jane', 
            lastName: 'Smith',
            email: 'jane.smith@example.com'
          },
          views: 189,
          watchedBy: ['507f1f77bcf86cd799439017'],
          bidCount: 8,
          tags: ['persian', 'antique', 'handwoven', 'tabriz', '19th-century'],
          shippingInfo: {
            cost: 150,
            methods: ['White Glove Delivery', 'Freight'],
            international: false
          },
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        },
        {
          _id: '507f1f77bcf86cd799439018',
          title: '1965 Ford Mustang Fastback - Restored',
          description: 'A stunning 1965 Ford Mustang Fastback that has undergone a complete frame-off restoration. This iconic American muscle car features the original 289 V8 engine paired with a 4-speed manual transmission. The restoration was completed in 2020 and includes a fresh Wimbledon White paint job with Pony interior. All chrome has been re-plated, and the car sits on period-correct Magnum 500 wheels. The engine bay is detailed to show quality, and the undercarriage is equally impressive. This Mustang runs and drives exceptionally well and is ready for shows or weekend cruising.',
          category: 'Vehicles',
          subcategory: 'Classic Cars',
          startingPrice: 25000,
          currentBid: 32000,
          reservePrice: 35000,
          bidIncrement: 500,
          status: 'active',
          condition: 'excellent',
          conditionReport: {
            overall: 'Excellent condition following complete restoration. Show-quality finish throughout.',
            defects: ['Minor stone chips on front bumper', 'Small scratch on driver door handle'],
            authenticity: {
              verified: true,
              certificate: 'Marti Report confirming original specifications',
              verifiedBy: 'Classic Car Authentication Services'
            },
            provenance: 'California car since new, complete restoration documentation available.'
          },
          featured: true,
          images: [
            {
              url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop',
              alt: 'Ford Mustang exterior',
              isPrimary: true,
              caption: '1965 Ford Mustang Fastback in Wimbledon White',
              order: 1
            },
            {
              url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop',
              alt: 'Ford Mustang interior',
              isPrimary: false,
              caption: 'Restored Pony interior with original-style appointments',
              order: 2
            },
            {
              url: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&h=600&fit=crop',
              alt: 'Ford Mustang engine',
              isPrimary: false,
              caption: 'Original 289 V8 engine, fully rebuilt and detailed',
              order: 3
            },
            {
              url: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&h=600&fit=crop',
              alt: 'Ford Mustang side profile',
              isPrimary: false,
              caption: 'Side profile showing the classic fastback silhouette',
              order: 4
            }
          ],
          startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          seller: { 
            _id: '507f1f77bcf86cd799439019', 
            username: 'classiccardealer', 
            firstName: 'Mike', 
            lastName: 'Johnson',
            email: 'mike.johnson@example.com'
          },
          views: 567,
          watchedBy: ['507f1f77bcf86cd799439020', '507f1f77bcf86cd799439021', '507f1f77bcf86cd799439022'],
          bidCount: 15,
          tags: ['ford', 'mustang', 'classic', 'restored', '1965', 'fastback'],
          shippingInfo: {
            cost: 800,
            methods: ['Enclosed Transport', 'Open Transport'],
            international: true
          },
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        },
        {
          _id: '507f1f77bcf86cd799439023',
          title: 'Original Picasso Lithograph - "The Dove" 1949',
          description: 'An original lithograph by Pablo Picasso titled "The Dove" from 1949, created for the World Peace Congress in Paris. This iconic image became a symbol of the peace movement and represents one of Picasso\'s most recognizable works. The lithograph is printed on Arches paper and bears the artist\'s signature in the stone. The piece is in excellent condition and has been professionally framed with museum-quality materials. Provenance includes gallery documentation and previous exhibition history. This is a rare opportunity to acquire an authentic Picasso work at auction.',
          category: 'Art',
          subcategory: 'Prints & Multiples',
          startingPrice: 15000,
          currentBid: 18500,
          reservePrice: 22000,
          bidIncrement: 500,
          status: 'active',
          condition: 'excellent',
          conditionReport: {
            overall: 'Excellent condition with strong, unfaded colors and clean margins.',
            defects: ['Minor foxing in lower right margin (outside image area)'],
            authenticity: {
              verified: true,
              certificate: 'Certificate of Authenticity from Picasso Estate',
              verifiedBy: 'Maya Widmaier-Picasso Authentication Committee'
            },
            provenance: 'Galerie Louise Leiris, Paris; Private collection, New York; Exhibited at MoMA 1980.'
          },
          featured: true,
          images: [
            {
              url: 'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=800&h=600&fit=crop',
              alt: 'Picasso lithograph',
              isPrimary: true,
              caption: 'Picasso\'s "The Dove" lithograph, 1949',
              order: 1
            },
            {
              url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop',
              alt: 'Picasso signature detail',
              isPrimary: false,
              caption: 'Detail showing Picasso\'s signature in the stone',
              order: 2
            },
            {
              url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop',
              alt: 'Framed artwork',
              isPrimary: false,
              caption: 'Museum-quality framing with conservation materials',
              order: 3
            }
          ],
          startTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          seller: { 
            _id: '507f1f77bcf86cd799439024', 
            username: 'artgallery', 
            firstName: 'Sarah', 
            lastName: 'Williams',
            email: 'sarah.williams@example.com'
          },
          views: 423,
          watchedBy: ['507f1f77bcf86cd799439025', '507f1f77bcf86cd799439026'],
          bidCount: 9,
          tags: ['picasso', 'lithograph', 'peace', 'dove', 'original', 'modern-art'],
          shippingInfo: {
            cost: 100,
            methods: ['Insured Art Transport', 'White Glove Delivery'],
            international: true
          },
          createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
        }
      ];

      // Basic filtering for development mode
      // If a watchedBy filter is provided in dev-mode, dynamically mark
      // a subset of mock auctions as watched by that user so the watchlist
      // surfaces meaningful data on the Dashboard without a database.
      const devWatchedBy = req.query.watchedBy;
      if (devWatchedBy) {
        const markCount = Math.min(4, mockAuctions.length);
        for (let i = 0; i < markCount; i++) {
          const a = mockAuctions[i];
          if (!Array.isArray(a.watchedBy)) a.watchedBy = [];
          const alreadyWatched = a.watchedBy.some(w => {
            if (typeof w === 'string') return w === devWatchedBy;
            if (w && typeof w === 'object' && w._id) return w._id === devWatchedBy;
            return false;
          });
          if (!alreadyWatched) {
            a.watchedBy.push(devWatchedBy);
          }
        }
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 12;
      const { status, watchedBy } = req.query;

      let filtered = mockAuctions;
      if (status) {
        filtered = filtered.filter(a => a.status === status);
      }
      if (watchedBy) {
        filtered = filtered.filter(a => Array.isArray(a.watchedBy) && a.watchedBy.some(w => {
          if (typeof w === 'string') return w === watchedBy;
          if (w && typeof w === 'object' && w._id) return w._id === watchedBy;
          return false;
        }));
      }

      const start = (page - 1) * limit;
      const paged = filtered.slice(start, start + limit);

      return res.json({
        success: true,
        data: {
          auctions: paged,
          pagination: {
            currentPage: page,
            totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
            totalItems: filtered.length,
            itemsPerPage: limit
          }
        }
      });
    }

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

    // Check if we're in development mode without database connection
    if (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true') {
      // Use dev mock store to return consistent mock data
      const { getAuction } = require('../services/devMockStore');
      const mockAuction = getAuction(id);
      return res.json({ success: true, data: { auction: mockAuction } });
    }

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

    // Development mode: simulate update without DB connection
    if (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true') {
      // Ensure a user exists on request (middleware provides mock user in dev)
      const sellerId = req.user?._id || 'mock_seller_id';

      // Basic authorization: allow seller or admin
      const isAdmin = req.user?.role === 'admin';
      const isSeller = true; // In dev mode, assume ownership for simplicity
      if (!isAdmin && !isSeller) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own auctions'
        });
      }

      // Compose a mock auction object merging updates
      const mockAuction = {
        _id: id,
        title: 'Mock Auction (updated)',
        description: 'This is a development-mode updated auction.',
        category: 'Collectibles',
        subcategory: 'Mock Items',
        startingPrice: 100,
        currentBid: 150,
        reservePrice: 200,
        bidIncrement: 10,
        status: 'active',
        condition: 'good',
        images: [],
        startTime: new Date(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        seller: {
          _id: sellerId,
          username: 'devuser',
          firstName: 'Dev',
          lastName: 'User'
        },
        views: 0,
        watchedBy: [],
        bids: [],
        ...updates
      };

      return res.json({
        success: true,
        message: 'Auction updated successfully (development mode)',
        data: { auction: mockAuction }
      });
    }

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

    // Development-mode fallback: aggregate bids from in-memory dev store
    if (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true') {
      try {
        const { listAuctions } = require('../services/devMockStore');
        const allAuctions = listAuctions();

        // Filter auctions where this user has bids
        const userAuctions = allAuctions.filter(a => Array.isArray(a.bids) && a.bids.some(b => {
          const bidderId = (b.bidder && (b.bidder._id || b.bidder)) || '';
          return bidderId.toString() === userId.toString();
        }));

        // Sort by most recent bid timestamp
        userAuctions.sort((a, b) => {
          const aLatest = Math.max(...(a.bids || []).map(bid => new Date(bid.timestamp || bid.bidTime || 0).getTime()));
          const bLatest = Math.max(...(b.bids || []).map(bid => new Date(bid.timestamp || bid.bidTime || 0).getTime()));
          return bLatest - aLatest;
        });

        // Pagination in memory
        const start = (parseInt(page) - 1) * parseInt(limit);
        const end = start + parseInt(limit);
        const paged = userAuctions.slice(start, end).map(a => {
          const userBids = (a.bids || []).filter(b => {
            const bidderId = (b.bidder && (b.bidder._id || b.bidder)) || '';
            return bidderId.toString() === userId.toString();
          });
          const highestUserBid = userBids.length ? Math.max(...userBids.map(b => Number(b.amount) || 0)) : 0;
          return {
            ...a,
            userBids,
            highestUserBid
          };
        });

        const total = userAuctions.length;

        return res.json({
          success: true,
          data: {
            auctions: paged,
            pagination: {
              currentPage: parseInt(page),
              totalPages: Math.ceil(total / parseInt(limit)),
              totalItems: total,
              itemsPerPage: parseInt(limit)
            }
          }
        });
      } catch (e) {
        console.error('Dev-mode getUserBids aggregation error:', e);
        return res.json({
          success: true,
          data: {
            auctions: [],
            pagination: {
              currentPage: parseInt(page),
              totalPages: 0,
              totalItems: 0,
              itemsPerPage: parseInt(limit)
            }
          }
        });
      }
    }

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

    // Development-mode fallback: aggregate bids from in-memory dev store
    if (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true') {
      try {
        const { listAuctions } = require('../services/devMockStore');
        const allAuctions = listAuctions();

        // Filter auctions where this user has bids
        const userBidAuctions = allAuctions.filter(a => Array.isArray(a.bids) && a.bids.some(b => {
          const bidderId = (b.bidder && (b.bidder._id || b.bidder)) || '';
          return bidderId.toString() === userId.toString();
        }));

        // Sort by most recent bid timestamp
        userBidAuctions.sort((a, b) => {
          const aLatest = Math.max(...(a.bids || []).map(bid => new Date(bid.timestamp || bid.bidTime || 0).getTime()));
          const bLatest = Math.max(...(b.bids || []).map(bid => new Date(bid.timestamp || bid.bidTime || 0).getTime()));
          return bLatest - aLatest;
        });

        // Pagination in memory
        const start = (parseInt(page) - 1) * parseInt(limit);
        const end = start + parseInt(limit);
        const paged = userBidAuctions.slice(start, end).map(a => {
          const userBids = (a.bids || []).filter(b => {
            const bidderId = (b.bidder && (b.bidder._id || b.bidder)) || '';
            return bidderId.toString() === userId.toString();
          });
          const highestUserBid = userBids.length ? Math.max(...userBids.map(b => Number(b.amount) || 0)) : 0;
          return {
            ...a,
            userBids,
            highestUserBid
          };
        });

        const total = userBidAuctions.length;

        return res.json({
          success: true,
          data: {
            auctions: paged,
            pagination: {
              currentPage: parseInt(page),
              totalPages: Math.ceil(total / parseInt(limit)),
              totalItems: total,
              itemsPerPage: parseInt(limit)
            }
          }
        });
      } catch (e) {
        console.error('Dev-mode getUserBids aggregation error:', e);
        return res.json({
          success: true,
          data: {
            auctions: [],
            pagination: {
              currentPage: parseInt(page),
              totalPages: 0,
              totalItems: 0,
              itemsPerPage: parseInt(limit)
            }
          }
        });
      }
    }

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

    // Development-mode fallback: mutate in-memory store when DB is disabled
    if (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true') {
      try {
        const { getAuction } = require('../services/devMockStore');
        const auction = getAuction(id);
        auction.watchedBy = Array.isArray(auction.watchedBy) ? auction.watchedBy : [];

        const userId = (req.user && (req.user._id || req.user.id))?.toString();
        const alreadyWatched = auction.watchedBy.some(w => {
          if (typeof w === 'string') return w === userId;
          if (w && typeof w === 'object' && w._id) return w._id.toString() === userId;
          return false;
        });

        if (alreadyWatched) {
          return res.json({
            success: true,
            message: 'Auction already in watchlist (development mode)',
            alreadyWatched: true
          });
        }

        auction.watchedBy.push(userId);
        return res.json({
          success: true,
          message: 'Auction added to watchlist (development mode)'
        });
      } catch (e) {
        console.error('Dev-mode addToWatchlist error:', e);
        return res.status(500).json({
          success: false,
          message: 'Server error while adding to watchlist (development mode)'
        });
      }
    }

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

    // Development-mode fallback: mutate in-memory store when DB is disabled
    if (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true') {
      try {
        const { getAuction } = require('../services/devMockStore');
        const auction = getAuction(id);
        auction.watchedBy = Array.isArray(auction.watchedBy) ? auction.watchedBy : [];

        const userId = (req.user && (req.user._id || req.user.id))?.toString();
        // Determine current state to return symmetric flag
        const wasWatched = auction.watchedBy.some(w => {
          if (typeof w === 'string') return w === userId;
          if (w && typeof w === 'object' && w._id) return w._id.toString() === userId;
          return false;
        });

        if (!wasWatched) {
          return res.json({
            success: true,
            message: 'Auction not in watchlist (development mode)',
            alreadyNotWatched: true
          });
        }

        auction.watchedBy = auction.watchedBy.filter(w => {
          if (typeof w === 'string') return w !== userId;
          if (w && typeof w === 'object' && w._id) return w._id.toString() !== userId;
          return true;
        });

        return res.json({
          success: true,
          message: 'Auction removed from watchlist (development mode)'
        });
      } catch (e) {
        console.error('Dev-mode removeFromWatchlist error:', e);
        return res.status(500).json({
          success: false,
          message: 'Server error while removing from watchlist (development mode)'
        });
      }
    }

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

    // Development-mode fallback: read from in-memory store when DB is disabled
    if (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true') {
      try {
        const { listAuctions } = require('../services/devMockStore');
        const all = listAuctions();
        const uid = (userId && userId.toString()) || '';

        const watched = all.filter(a => Array.isArray(a.watchedBy) && a.watchedBy.some(w => {
          if (typeof w === 'string') return w === uid;
          if (w && typeof w === 'object' && w._id) return w._id.toString() === uid;
          return false;
        }));

        const start = (parseInt(page) - 1) * parseInt(limit);
        const end = start + parseInt(limit);
        const paged = watched.slice(start, end);

        return res.json({
          success: true,
          data: {
            auctions: paged,
            pagination: {
              currentPage: parseInt(page),
              totalPages: Math.ceil(watched.length / parseInt(limit)) || 0,
              totalItems: watched.length,
              itemsPerPage: parseInt(limit)
            }
          }
        });
      } catch (e) {
        console.error('Dev-mode getUserWatchlist error:', e);
        return res.json({
          success: true,
          data: {
            auctions: [],
            pagination: {
              currentPage: parseInt(page),
              totalPages: 0,
              totalItems: 0,
              itemsPerPage: parseInt(limit)
            }
          }
        });
      }
    }

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
    
    // Mock notifications data - in a real app, this would come from a database
    const mockNotifications = [
      {
        _id: '1',
        auctionId: '1',
        auctionTitle: 'Vintage Rolex Submariner',
        type: 'ending_soon',
        message: 'Auction ending in 2 hours',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        read: false
      },
      {
        _id: '2',
        auctionId: '3',
        auctionTitle: 'Original Picasso Sketch',
        type: 'outbid',
        message: 'You have been outbid',
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        read: false
      },
      {
        _id: '3',
        auctionId: '5',
        auctionTitle: 'Rare Baseball Card Collection',
        type: 'price_drop',
        message: 'Starting bid reduced by 20%',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        read: true
      }
    ];

    res.json({
      success: true,
      notifications: mockNotifications
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
  getCategories,
  getWatchlistNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
};