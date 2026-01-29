const mongoose = require('mongoose');

const DepositReferenceSchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true, index: true },
  auctionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, default: 0 },
  status: { type: String, enum: ['issued','pending_verification','verified','invalid','expired','refunded'], default: 'issued', index: true },
  notes: { type: String },
  claimedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('DepositReference', DepositReferenceSchema);