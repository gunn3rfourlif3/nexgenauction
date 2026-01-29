const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  auctionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['not_registered','registered','deposit_pending','deposit_received','approved','rejected','suspended'],
    default: 'registered'
  },
  depositAmount: { type: Number, default: 0 },
  depositRef: { type: String },
  depositReceiptUrl: { type: String },
  depositVerification: {
    status: { type: String, enum: ['none','submitted','reviewing','verified','rejected'], default: 'none' },
    notes: { type: String, maxlength: 500 },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date }
  },
  // Refund tracking
  refundStatus: { type: String, enum: ['none','requested','approved','processing','refunded','failed'], default: 'none' },
  refundAmount: { type: Number, default: 0 },
  refundRef: { type: String },
  refundedAt: { type: Date },
  kycStatus: { type: String, enum: ['none','pending','verified','failed'], default: 'none' },
  notes: { type: String, maxlength: 500 },
}, { timestamps: true });

registrationSchema.index({ auctionId: 1, userId: 1 }, { unique: true });
registrationSchema.index({ auctionId: 1, status: 1 });

module.exports = mongoose.model('AuctionRegistration', registrationSchema);