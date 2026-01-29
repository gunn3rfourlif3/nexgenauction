const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  // Basic transaction information
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Transaction type and category
  type: {
    type: String,
    required: true,
    enum: [
      'deposit',           // User deposits funds
      'withdrawal',        // User withdraws funds
      'payment',          // Payment for auction
      'refund',           // Refund to buyer
      'payout',           // Payout to seller
      'fee',              // Platform fee collection
      'escrow_hold',      // Funds held in escrow
      'escrow_release',   // Funds released from escrow
      'chargeback',       // Payment chargeback
      'adjustment'        // Manual adjustment
    ],
    index: true
  },
  
  category: {
    type: String,
    required: true,
    enum: ['auction', 'wallet', 'fee', 'refund', 'adjustment'],
    index: true
  },
  
  // Related entities
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  auction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auction',
    index: true
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    index: true
  },
  relatedTransaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    index: true
  },
  
  // Financial details
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount must be positive']
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    uppercase: true,
    validate: {
      validator: function(v) {
        const supportedCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL'];
        return supportedCurrencies.includes(v);
      },
      message: 'Currency not supported'
    }
  },
  exchangeRate: {
    type: Number,
    default: 1.0,
    min: 0
  },
  baseAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Balance tracking
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  
  // Transaction status
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'reversed'],
    default: 'pending',
    index: true
  },
  
  // Payment method and gateway information
  paymentMethod: {
    type: String,
    enum: ['stripe', 'paypal', 'bank_transfer', 'crypto', 'wallet', 'internal']
  },
  gatewayTransactionId: {
    type: String,
    index: true
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Fee information
  fees: {
    processingFee: {
      type: Number,
      default: 0
    },
    platformFee: {
      type: Number,
      default: 0
    },
    totalFees: {
      type: Number,
      default: 0
    }
  },
  
  // Description and metadata
  description: {
    type: String,
    required: true
  },
  internalNotes: {
    type: String
  },
  
  // Reconciliation and accounting
  reconciled: {
    type: Boolean,
    default: false
  },
  reconciledDate: {
    type: Date
  },
  accountingPeriod: {
    type: String // Format: YYYY-MM
  },
  
  // Risk and fraud detection
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  flagged: {
    type: Boolean,
    default: false
  },
  flagReason: {
    type: String
  },
  
  // Metadata
  metadata: {
    userAgent: String,
    ipAddress: String,
    source: String,
    reference: String,
    tags: [String]
  },
  
  // Timestamps
  processedAt: {
    type: Date
  },
  scheduledFor: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ category: 1, createdAt: -1 });
transactionSchema.index({ status: 1, scheduledFor: 1 });
transactionSchema.index({ reconciled: 1, accountingPeriod: 1 });
transactionSchema.index({ flagged: 1, riskScore: -1 });
transactionSchema.index({ auction: 1, type: 1 });

// Pre-save middleware
transactionSchema.pre('save', function(next) {
  // Calculate total fees
  if (this.fees) {
    this.fees.totalFees = (this.fees.processingFee || 0) + (this.fees.platformFee || 0);
  }
  
  // Set accounting period
  if (!this.accountingPeriod) {
    const date = this.createdAt || new Date();
    this.accountingPeriod = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  
  // Set processed date for completed transactions
  if (this.status === 'completed' && !this.processedAt) {
    this.processedAt = new Date();
  }
  
  next();
});

// Virtual for net amount (amount minus fees)
transactionSchema.virtual('netAmount').get(function() {
  return this.amount - (this.fees.totalFees || 0);
});

// Virtual for transaction age in hours
transactionSchema.virtual('ageInHours').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60));
});

// Static method to generate unique transaction ID
transactionSchema.statics.generateTransactionId = function(type) {
  const prefix = {
    'deposit': 'DEP',
    'withdrawal': 'WTH',
    'payment': 'PAY',
    'refund': 'REF',
    'payout': 'OUT',
    'fee': 'FEE',
    'escrow_hold': 'ESH',
    'escrow_release': 'ESR',
    'chargeback': 'CHB',
    'adjustment': 'ADJ'
  };
  
  const typePrefix = prefix[type] || 'TXN';
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `${typePrefix}_${timestamp}_${random}`.toUpperCase();
};

// Static method to get user's transaction summary
transactionSchema.statics.getUserTransactionSummary = async function(userId, period = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);
  
  const pipeline = [
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalFees: { $sum: '$fees.totalFees' }
      }
    }
  ];
  
  return await this.aggregate(pipeline);
};

// Static method to get platform revenue summary
transactionSchema.statics.getPlatformRevenueSummary = async function(startDate, endDate) {
  const pipeline = [
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'completed',
        type: { $in: ['fee', 'payment'] }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          type: '$type'
        },
        totalAmount: { $sum: '$amount' },
        totalFees: { $sum: '$fees.totalFees' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.date': 1 }
    }
  ];
  
  return await this.aggregate(pipeline);
};

// Instance method to check if transaction can be reversed
transactionSchema.methods.canBeReversed = function() {
  return this.status === 'completed' && 
         ['payment', 'payout'].includes(this.type) &&
         this.ageInHours <= 72; // 3 days reversal window
};

// Instance method to create reversal transaction
transactionSchema.methods.createReversal = function(reason) {
  return {
    transactionId: this.constructor.generateTransactionId('adjustment'),
    type: 'adjustment',
    category: 'adjustment',
    user: this.user,
    auction: this.auction,
    relatedTransaction: this._id,
    amount: -this.amount,
    currency: this.currency,
    exchangeRate: this.exchangeRate,
    amountInUSD: -this.amountInUSD,
    balanceBefore: 0, // Will be set when processing
    balanceAfter: 0,  // Will be set when processing
    status: 'pending',
    description: `Reversal of transaction ${this.transactionId}: ${reason}`,
    internalNotes: `Auto-generated reversal for ${this.transactionId}`,
    metadata: {
      source: 'system',
      reference: this.transactionId,
      tags: ['reversal', 'auto-generated']
    }
  };
};

module.exports = mongoose.model('Transaction', transactionSchema);