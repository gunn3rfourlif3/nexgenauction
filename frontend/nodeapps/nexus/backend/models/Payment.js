const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // Basic payment information
  paymentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Related entities
  auction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auction',
    required: true,
    index: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Payment details
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
  
  // Payment method and gateway
  paymentMethod: {
    type: String,
    required: true,
    enum: ['stripe', 'paypal', 'bank_transfer', 'crypto']
  },
  paymentGateway: {
    type: String,
    required: true
  },
  gatewayTransactionId: {
    type: String,
    required: true
  },
  
  // Payment status
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'disputed'],
    default: 'pending',
    index: true
  },
  
  // Escrow system
  escrowStatus: {
    type: String,
    required: true,
    enum: ['held', 'released_to_seller', 'refunded_to_buyer', 'disputed'],
    default: 'held',
    index: true
  },
  escrowReleaseDate: {
    type: Date
  },
  escrowReleaseReason: {
    type: String,
    enum: ['item_delivered', 'buyer_confirmed', 'auto_release', 'dispute_resolved', 'admin_override']
  },
  
  // Fee breakdown
  fees: {
    platformFee: {
      type: Number,
      default: 0
    },
    paymentProcessingFee: {
      type: Number,
      default: 0
    },
    buyersPremium: {
      type: Number,
      default: 0
    },
    totalFees: {
      type: Number,
      default: 0
    }
  },
  
  // Invoice information
  invoice: {
    invoiceNumber: {
      type: String,
      unique: true,
      sparse: true
    },
    invoiceDate: Date,
    dueDate: Date,
    taxAmount: {
      type: Number,
      default: 0
    },
    taxRate: {
      type: Number,
      default: 0
    },
    shippingCost: {
      type: Number,
      default: 0
    },
    subtotal: Number,
    total: Number,
    invoiceStatus: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
      default: 'draft'
    }
  },
  
  // Shipping and delivery tracking
  shipping: {
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    trackingNumber: String,
    carrier: String,
    shippedDate: Date,
    deliveredDate: Date,
    deliveryStatus: {
      type: String,
      enum: ['pending', 'shipped', 'in_transit', 'delivered', 'failed_delivery'],
      default: 'pending'
    }
  },
  
  // Dispute and refund information
  dispute: {
    isDisputed: {
      type: Boolean,
      default: false
    },
    disputeReason: String,
    disputeDate: Date,
    disputeStatus: {
      type: String,
      enum: ['open', 'under_review', 'resolved', 'closed']
    },
    resolution: String
  },
  
  refund: {
    isRefunded: {
      type: Boolean,
      default: false
    },
    refundAmount: Number,
    refundReason: String,
    refundDate: Date,
    refundTransactionId: String
  },
  
  // Metadata and tracking
  metadata: {
    userAgent: String,
    ipAddress: String,
    paymentSource: String,
    notes: String
  },
  
  // Timestamps
  paymentDate: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
paymentSchema.index({ status: 1, paymentDate: -1 });
paymentSchema.index({ escrowStatus: 1, escrowReleaseDate: 1 });
paymentSchema.index({ buyer: 1, status: 1 });
paymentSchema.index({ seller: 1, status: 1 });
paymentSchema.index({ auction: 1 });
paymentSchema.index({ 'invoice.invoiceNumber': 1 });
paymentSchema.index({ 'invoice.invoiceStatus': 1 });

// Pre-save middleware to update timestamps and calculate totals
paymentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate total fees
  if (this.fees) {
    this.fees.totalFees = (this.fees.platformFee || 0) + 
                         (this.fees.paymentProcessingFee || 0) + 
                         (this.fees.buyersPremium || 0);
  }
  
  // Calculate invoice total
  if (this.invoice) {
    this.invoice.subtotal = this.amount;
    this.invoice.total = this.amount + 
                        (this.invoice.taxAmount || 0) + 
                        (this.invoice.shippingCost || 0);
  }
  
  next();
});

// Virtual for net amount to seller (after fees)
paymentSchema.virtual('netAmountToSeller').get(function() {
  return this.amount - (this.fees.totalFees || 0);
});

// Virtual for payment age in days
paymentSchema.virtual('paymentAgeInDays').get(function() {
  return Math.floor((new Date() - this.paymentDate) / (1000 * 60 * 60 * 24));
});

// Static method to generate unique payment ID
paymentSchema.statics.generatePaymentId = function() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `PAY_${timestamp}_${random}`.toUpperCase();
};

// Static method to generate unique invoice number
paymentSchema.statics.generateInvoiceNumber = function() {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `INV-${year}-${timestamp}`;
};

// Instance method to check if payment can be refunded
paymentSchema.methods.canBeRefunded = function() {
  return this.status === 'completed' && 
         !this.refund.isRefunded && 
         !this.dispute.isDisputed &&
         this.paymentAgeInDays <= 180; // 6 months refund window
};

// Instance method to check if escrow can be released
paymentSchema.methods.canReleaseEscrow = function() {
  return this.escrowStatus === 'held' && 
         this.status === 'completed' &&
         !this.dispute.isDisputed;
};

module.exports = mongoose.model('Payment', paymentSchema);