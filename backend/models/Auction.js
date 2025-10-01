const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  bidder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Bid amount must be positive']
  },
  bidTime: {
    type: Date,
    default: Date.now
  }
});

const auctionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Auction title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['electronics', 'art', 'jewelry', 'vehicles', 'home', 'fashion', 'collectibles', 'other']
  },
  condition: {
    type: String,
    required: [true, 'Condition is required'],
    enum: ['new', 'like-new', 'good', 'fair', 'poor']
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startingPrice: {
    type: Number,
    required: [true, 'Starting price is required'],
    min: [0, 'Starting price must be positive']
  },
  reservePrice: {
    type: Number,
    min: [0, 'Reserve price must be positive'],
    validate: {
      validator: function(value) {
        return !value || value >= this.startingPrice;
      },
      message: 'Reserve price must be greater than or equal to starting price'
    }
  },
  currentBid: {
    type: Number,
    default: function() {
      return this.startingPrice;
    }
  },
  bidIncrement: {
    type: Number,
    default: 1,
    min: [0.01, 'Bid increment must be at least 0.01']
  },
  bids: [bidSchema],
  startTime: {
    type: Date,
    required: [true, 'Start time is required'],
    validate: {
      validator: function(value) {
        return value >= new Date();
      },
      message: 'Start time must be in the future'
    }
  },
  endTime: {
    type: Date,
    required: [true, 'End time is required'],
    validate: {
      validator: function(value) {
        return value > this.startTime;
      },
      message: 'End time must be after start time'
    }
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'ended', 'cancelled'],
    default: 'draft'
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  winningBid: {
    type: Number,
    default: null
  },
  shippingInfo: {
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    shippingCost: {
      type: Number,
      min: [0, 'Shipping cost must be positive']
    },
    freeShipping: {
      type: Boolean,
      default: false
    }
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  views: {
    type: Number,
    default: 0
  },
  watchedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  featured: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
auctionSchema.index({ status: 1, endTime: 1 });
auctionSchema.index({ category: 1, status: 1 });
auctionSchema.index({ seller: 1 });
auctionSchema.index({ title: 'text', description: 'text', tags: 'text' });
auctionSchema.index({ featured: 1, status: 1 });

// Virtual for time remaining
auctionSchema.virtual('timeRemaining').get(function() {
  if (this.status !== 'active') return null;
  const now = new Date();
  const remaining = this.endTime - now;
  return remaining > 0 ? remaining : 0;
});

// Virtual for bid count
auctionSchema.virtual('bidCount').get(function() {
  return this.bids.length;
});

// Virtual for highest bidder
auctionSchema.virtual('highestBidder').get(function() {
  if (this.bids.length === 0) return null;
  const highestBid = this.bids.reduce((prev, current) => 
    (prev.amount > current.amount) ? prev : current
  );
  return highestBid.bidder;
});

// Method to place a bid
auctionSchema.methods.placeBid = function(bidderId, amount) {
  if (this.status !== 'active') {
    throw new Error('Auction is not active');
  }
  
  if (new Date() > this.endTime) {
    throw new Error('Auction has ended');
  }
  
  if (amount <= this.currentBid) {
    throw new Error(`Bid must be higher than current bid of $${this.currentBid}`);
  }
  
  if (amount < this.currentBid + this.bidIncrement) {
    throw new Error(`Bid must be at least $${this.currentBid + this.bidIncrement}`);
  }
  
  this.bids.push({
    bidder: bidderId,
    amount: amount
  });
  
  this.currentBid = amount;
  return this.save();
};

// Method to check if auction should end
auctionSchema.methods.checkAndEndAuction = function() {
  if (this.status === 'active' && new Date() >= this.endTime) {
    this.status = 'ended';
    
    if (this.bids.length > 0) {
      const highestBid = this.bids.reduce((prev, current) => 
        (prev.amount > current.amount) ? prev : current
      );
      
      // Check if reserve price is met
      if (!this.reservePrice || highestBid.amount >= this.reservePrice) {
        this.winner = highestBid.bidder;
        this.winningBid = highestBid.amount;
      }
    }
    
    return this.save();
  }
  return Promise.resolve(this);
};

// Pre-save middleware to update status based on time
auctionSchema.pre('save', function(next) {
  const now = new Date();
  
  if (this.status === 'scheduled' && now >= this.startTime) {
    this.status = 'active';
  }
  
  next();
});

// Ensure virtual fields are serialized
auctionSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Auction', auctionSchema);