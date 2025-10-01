const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  auction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auction',
    required: true,
    index: true
  },
  bidder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Bid amount must be positive']
  },
  bidType: {
    type: String,
    enum: ['manual', 'auto'],
    default: 'manual'
  },
  maxAutoBid: {
    type: Number,
    default: null,
    min: [0, 'Maximum auto bid must be positive']
  },
  isWinning: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  bidTime: {
    type: Date,
    default: Date.now,
    index: true
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
bidSchema.index({ auction: 1, amount: -1 });
bidSchema.index({ auction: 1, bidTime: -1 });
bidSchema.index({ bidder: 1, auction: 1 });
bidSchema.index({ auction: 1, isWinning: 1 });

// Virtual for bid increment validation
bidSchema.virtual('isValidIncrement').get(function() {
  return this.amount > 0;
});

// Static method to get current highest bid for an auction
bidSchema.statics.getHighestBid = async function(auctionId) {
  return await this.findOne({ 
    auction: auctionId, 
    isActive: true 
  })
  .sort({ amount: -1, bidTime: 1 })
  .populate('bidder', 'username firstName lastName');
};

// Static method to get bid history for an auction
bidSchema.statics.getBidHistory = async function(auctionId, limit = 10) {
  return await this.find({ 
    auction: auctionId, 
    isActive: true 
  })
  .sort({ amount: -1, bidTime: -1 })
  .limit(limit)
  .populate('bidder', 'username firstName lastName');
};

// Static method to get user's bids for an auction
bidSchema.statics.getUserBids = async function(auctionId, userId) {
  return await this.find({ 
    auction: auctionId, 
    bidder: userId,
    isActive: true 
  })
  .sort({ bidTime: -1 });
};

// Method to check if this bid can be placed
bidSchema.methods.canBePlaced = async function() {
  const highestBid = await this.constructor.getHighestBid(this.auction);
  
  if (!highestBid) {
    return true; // First bid
  }
  
  return this.amount > highestBid.amount;
};

// Pre-save middleware to update winning status
bidSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Mark all other bids for this auction as not winning
    await this.constructor.updateMany(
      { auction: this.auction, _id: { $ne: this._id } },
      { isWinning: false }
    );
    
    // Mark this bid as winning if it's the highest
    const canBePlaced = await this.canBePlaced();
    if (canBePlaced) {
      this.isWinning = true;
    }
  }
  next();
});

module.exports = mongoose.model('Bid', bidSchema);