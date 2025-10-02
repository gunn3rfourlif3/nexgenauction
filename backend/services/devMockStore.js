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

function createDefaultAuction(id) {
  const now = Date.now();
  return {
    _id: id,
    title: 'Vintage Rolex Submariner',
    description:
      'A beautiful vintage Rolex Submariner in excellent condition. This timepiece represents the pinnacle of Swiss watchmaking craftsmanship.',
    category: 'Watches',
    subcategory: 'Luxury Watches',
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
    tags: ['rolex', 'vintage', 'luxury'],
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
    store.set(id, createDefaultAuction(id));
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

module.exports = {
  getAuction,
  incrementViews,
  placeBid,
  // List all auctions currently in the dev store
  listAuctions: () => Array.from(store.values())
};