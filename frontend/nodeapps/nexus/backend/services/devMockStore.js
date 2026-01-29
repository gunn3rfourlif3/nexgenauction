// Simple in-memory mock store for development without MongoDB
// Provides auction data and updates for bidding flows

const DEFAULT_SELLER = {
  _id: '507f1f77bcf86cd799439012',
  username: 'watchcollector',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+1234567890'
};

const store = new Map(); // auctionId => auction object

// Predefined catalog aligned with mock data in auctionController.getAuctions
// Ensures detail pages display correct titles/categories per ID in dev mode
const CATALOG = (() => {
  const now = Date.now();
  return {
    '507f1f77bcf86cd799439011': {
      _id: '507f1f77bcf86cd799439011',
      title: 'Vintage Rolex Submariner 5513 - 1970',
      description: 'An exceptional vintage Rolex Submariner reference 5513 from 1970.',
      category: 'Collectibles',
      subcategory: 'Luxury Watches',
      startingPrice: 5000,
      currentBid: 7500,
      bidIncrement: 250,
      status: 'active',
      condition: 'excellent',
      featured: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&h=600&fit=crop', alt: 'Rolex Submariner front view', isPrimary: true, order: 1 },
        { url: 'https://images.unsplash.com/photo-1594534475808-b18fc33b045e?w=800&h=600&fit=crop', alt: 'Rolex Submariner side profile', isPrimary: false, order: 2 },
        { url: 'https://images.unsplash.com/photo-1548181622-6ac3b2c2b8b7?w=800&h=600&fit=crop', alt: 'Rolex Submariner case back', isPrimary: false, order: 3 }
      ],
      endTime: new Date(now + 5 * 24 * 60 * 60 * 1000),
      startTime: new Date(now - 2 * 24 * 60 * 60 * 1000),
      seller: { ...DEFAULT_SELLER },
      views: 342,
      tags: ['rolex', 'vintage', 'luxury', 'submariner', '1970s'],
      bids: [],
      watchedBy: [],
      bidCount: 0,
      winner: null
    },
    '507f1f77bcf86cd799439013': {
      _id: '507f1f77bcf86cd799439013',
      title: 'Antique Persian Tabriz Rug - 19th Century',
      description: 'Magnificent hand-knotted Persian Tabriz rug from the late 19th century.',
      category: 'Antiques',
      subcategory: 'Rugs & Textiles',
      startingPrice: 2000,
      currentBid: 3200,
      bidIncrement: 100,
      status: 'active',
      condition: 'good',
      featured: false,
      images: [
        { url: 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&h=600&fit=crop', alt: 'Persian rug full view', isPrimary: true, order: 1 },
        { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop', alt: 'Persian rug detail', isPrimary: false, order: 2 }
      ],
      endTime: new Date(now + 3 * 24 * 60 * 60 * 1000),
      startTime: new Date(now - 1 * 24 * 60 * 60 * 1000),
      seller: { ...DEFAULT_SELLER, username: 'antiquedealer' },
      views: 189,
      tags: ['persian', 'antique', 'handwoven', 'tabriz', '19th-century'],
      bids: [],
      watchedBy: [],
      bidCount: 0,
      winner: null
    },
    '507f1f77bcf86cd799439018': {
      _id: '507f1f77bcf86cd799439018',
      title: '1965 Ford Mustang Fastback - Restored',
      description: 'Stunning 1965 Ford Mustang Fastback with complete restoration.',
      category: 'Vehicles',
      subcategory: 'Classic Cars',
      startingPrice: 25000,
      currentBid: 32000,
      bidIncrement: 500,
      status: 'active',
      condition: 'excellent',
      featured: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop', alt: 'Ford Mustang exterior', isPrimary: true, order: 1 },
        { url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop', alt: 'Ford Mustang interior', isPrimary: false, order: 2 }
      ],
      endTime: new Date(now + 4 * 24 * 60 * 60 * 1000),
      startTime: new Date(now - 3 * 24 * 60 * 60 * 1000),
      seller: { ...DEFAULT_SELLER, username: 'classiccardealer' },
      views: 567,
      tags: ['ford', 'mustang', 'classic', 'restored', '1965', 'fastback'],
      bids: [],
      watchedBy: [],
      bidCount: 0,
      winner: null
    },
    '507f1f77bcf86cd799439023': {
      _id: '507f1f77bcf86cd799439023',
      title: 'Original Picasso Lithograph - "The Dove" 1949',
      description: 'Original Picasso lithograph created for the World Peace Congress in Paris.',
      category: 'Art',
      subcategory: 'Prints & Lithographs',
      startingPrice: 15000,
      currentBid: 18500,
      bidIncrement: 500,
      status: 'active',
      condition: 'excellent',
      featured: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=800&h=600&fit=crop', alt: 'Picasso lithograph', isPrimary: true, order: 1 },
        { url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop', alt: 'Picasso signature detail', isPrimary: false, order: 2 }
      ],
      endTime: new Date(now + 2 * 24 * 60 * 60 * 1000),
      startTime: new Date(now - 4 * 24 * 60 * 60 * 1000),
      seller: { ...DEFAULT_SELLER, username: 'artgallery' },
      views: 423,
      tags: ['picasso', 'lithograph', 'peace', 'dove', 'original', 'modern-art'],
      bids: [],
      watchedBy: [],
      bidCount: 0,
      winner: null
    }
    ,
// Upcoming auctions for development catalog
    '607f1f77bcf86cd799439101': {
      _id: '607f1f77bcf86cd799439101',
      title: 'Leica M3 Rangefinder Camera with Summicron 50mm',
      description: 'Classic Leica M3 camera body paired with a Summicron 50mm lens. Excellent optics, CLA serviced.',
      category: 'collectibles',
      subcategory: 'cameras',
      startingPrice: 1800,
      currentBid: 1800,
      bidIncrement: 50,
    status: 'upcoming',
      condition: 'good',
      featured: false,
      images: [
        { url: 'https://images.unsplash.com/photo-1518773553398-650c184e0bb3?w=800&h=600&fit=crop', alt: 'Leica M3 front view', isPrimary: true, order: 1 },
        { url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&h=600&fit=crop', alt: 'Summicron 50mm lens', isPrimary: false, order: 2 }
      ],
      startTime: new Date(Date.now() + 12 * 60 * 60 * 1000), // starts in 12 hours
      endTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      seller: { ...DEFAULT_SELLER, username: 'rangefinderfan' },
      views: 42,
      tags: ['leica', 'm3', 'summicron', 'rangefinder', 'camera'],
      bids: [],
      watchedBy: [],
      bidCount: 0,
      winner: null
    },
    '607f1f77bcf86cd799439102': {
      _id: '607f1f77bcf86cd799439102',
      title: 'Omega Speedmaster Professional “Moonwatch”',
      description: 'Iconic chronograph in excellent condition with bracelet and box set.',
      category: 'fashion',
      subcategory: 'watches',
      startingPrice: 3200,
      currentBid: 3200,
      bidIncrement: 100,
    status: 'upcoming',
      condition: 'like-new',
      featured: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=600&fit=crop', alt: 'Omega Speedmaster dial', isPrimary: true, order: 1 },
        { url: 'https://images.unsplash.com/photo-1520523830893-9800a8a207b4?w=800&h=600&fit=crop', alt: 'Moonwatch bracelet', isPrimary: false, order: 2 }
      ],
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // starts in 24 hours
      endTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      seller: { ...DEFAULT_SELLER, username: 'watchcollector' },
      views: 65,
      tags: ['omega', 'speedmaster', 'moonwatch', 'chronograph', 'luxury'],
      bids: [],
      watchedBy: [],
      bidCount: 0,
      winner: null
    },
    '607f1f77bcf86cd799439103': {
      _id: '607f1f77bcf86cd799439103',
      title: 'First Edition "The Great Gatsby" by F. Scott Fitzgerald',
      description: 'Rare first edition copy with original jacket (restored). A cornerstone of 20th-century literature.',
      category: 'books',
      subcategory: 'rare-books',
      startingPrice: 5000,
      currentBid: 5000,
      bidIncrement: 250,
    status: 'upcoming',
      condition: 'fair',
      featured: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800&h=600&fit=crop', alt: 'Great Gatsby cover', isPrimary: true, order: 1 },
        { url: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&h=600&fit=crop', alt: 'Vintage book pages', isPrimary: false, order: 2 }
      ],
      startTime: new Date(Date.now() + 36 * 60 * 60 * 1000), // starts in 36 hours
      endTime: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      seller: { ...DEFAULT_SELLER, username: 'rarebookdealer' },
      views: 28,
      tags: ['first-edition', 'fitzgerald', 'gatsby', 'literature', 'rare'],
      bids: [],
      watchedBy: [],
      bidCount: 0,
      winner: null
    }
  };
})();

function createDefaultAuction(id) {
  const now = Date.now();
  return {
    _id: id,
    title: `Auction Item ${id}`,
    description:
      'Development placeholder auction item. Replace with real data when DB is enabled.',
    category: 'Miscellaneous',
    subcategory: 'General',
    startingPrice: 5000,
    currentBid: 7500,
    bidIncrement: 250,
    status: 'active',
    condition: 'excellent',
    featured: true,
    images: [
      { url: '/api/placeholder/400/300', alt: 'Primary image', isPrimary: true, order: 1 },
      { url: '/api/placeholder/400/300', alt: 'Secondary image', isPrimary: false, order: 2 },
      { url: '/api/placeholder/400/300', alt: 'Tertiary image', isPrimary: false, order: 3 }
    ],
    endTime: new Date(now + 7 * 24 * 60 * 60 * 1000),
    startTime: new Date(now - 24 * 60 * 60 * 1000),
    seller: { ...DEFAULT_SELLER },
    views: 156,
    tags: ['development', 'placeholder'],
    bids: [
      {
        _id: 'mock_bid_initial',
        amount: 7500,
        bidder: { _id: '507f1f77bcf86cd799439016', username: 'bidder1', firstName: 'Alice', lastName: 'Johnson' },
        timestamp: new Date(now - 60 * 60 * 1000)
      }
    ],
    watchedBy: [],
    bidCount: 1,
    winner: null
  };
}

function getAuction(id) {
  if (!store.has(id)) {
    // Seed with catalog item when available; otherwise create a generic placeholder
    const preset = CATALOG[id];
    store.set(id, preset ? { ...preset } : createDefaultAuction(id));
  }
  return store.get(id);
}

function incrementViews(id) {
  const a = getAuction(id);
  a.views = (a.views || 0) + 1;
  return a.views;
}

function placeBid(auctionId, bidder, amount, bidType = 'manual', maxAutoBid = null) {
  const auction = getAuction(auctionId);

  const bid = {
    _id: 'mock_bid_' + Date.now(),
    amount,
    bidder: {
      _id: bidder._id || bidder.id,
      username: bidder.username || 'devuser',
      firstName: bidder.firstName || 'Dev',
      lastName: bidder.lastName || 'User'
    },
    bidTime: new Date(),
    timestamp: new Date(),
    bidType,
    maxAutoBid
  };

  auction.bids = auction.bids || [];
  auction.bids.push(bid);
  auction.currentBid = amount;
  auction.bidCount = (auction.bidCount || 0) + 1;

  return { bid, auction };
}

function updateAuctionStatus(id, status) {
  const a = getAuction(id);
  if (!['active', 'paused'].includes(a.status)) {
    throw new Error('Auction cannot be toggled at current status');
  }
  if (!['active', 'paused'].includes(status)) {
    throw new Error('Invalid status update');
  }
  a.status = status;
  return a;
}

function extendAuctionDev(id, { extensionMs, newEndTime } = {}) {
  const a = getAuction(id);
  if (a.status !== 'active') {
    throw new Error('Only active auctions can be extended');
  }
  const currentEnd = new Date(a.endTime).getTime();
  let targetEnd = currentEnd;
  if (newEndTime) {
    targetEnd = new Date(newEndTime).getTime();
  } else if (extensionMs) {
    targetEnd = currentEnd + Number(extensionMs);
  } else {
    targetEnd = currentEnd + 60 * 60 * 1000; // default 60 minutes
  }
  if (isNaN(targetEnd) || targetEnd <= currentEnd) {
    throw new Error('New end time must be later than current end time');
  }
  a.endTime = new Date(targetEnd);
  return a;
}

function cancelAuctionDev(id, reason = 'Cancelled by seller') {
  const a = getAuction(id);
  if (a.status === 'ended') {
    throw new Error('Cannot cancel an ended auction');
  }
  a.status = 'cancelled';
  a.cancellationReason = reason;
  return a;
}

module.exports = {
  getAuction,
  incrementViews,
  placeBid,
  updateAuctionStatus,
  extendAuctionDev,
  cancelAuctionDev,
  // End an auction immediately in dev mode and compute winner
  endAuctionDev: (id) => {
    const a = getAuction(id);
    // If already ended or cancelled, do nothing
    if (a.status === 'ended' || a.status === 'cancelled') return a;
    // Mark as ended now
    a.status = 'ended';
    a.endTime = new Date();
    // Determine winner by highest bid meeting reserve (if any)
    const bids = Array.isArray(a.bids) ? a.bids.slice() : [];
    if (bids.length > 0) {
      const highestBid = bids.reduce((prev, current) => (
        (prev && prev.amount > current.amount) ? prev : current
      ));
      const reserve = typeof a.reservePrice === 'number' ? a.reservePrice : undefined;
      if (reserve === undefined || (highestBid && highestBid.amount >= reserve)) {
        a.winner = highestBid.bidder;
        a.winningBid = highestBid.amount;
      }
    }
    return a;
  },
  // List all auctions currently in the dev store
  listAuctions: () => {
    // Ensure catalog items are included even if not yet accessed
    for (const id of Object.keys(CATALOG)) {
      if (!store.has(id)) store.set(id, { ...CATALOG[id] });
    }
    return Array.from(store.values());
  },
  // Record a user's auto-bid preference in dev mode
  setAutoBid: (auctionId, bidder, maxAmount) => {
    const a = getAuction(auctionId);
    const bidderId = (bidder && typeof bidder === 'object') ? (bidder._id || bidder.id) : bidder;
    if (!a.autoBids) a.autoBids = [];
    // Deactivate any existing auto-bid for this user
    a.autoBids = a.autoBids.map(ab => {
      if (String(ab.bidderId) === String(bidderId)) {
        return { ...ab, isActive: false };
      }
      return ab;
    });
    a.autoBids.push({
      bidderId: String(bidderId),
      maxAmount: Number(maxAmount),
      isActive: true,
      createdAt: new Date()
    });
    return { auction: a };
  }
};