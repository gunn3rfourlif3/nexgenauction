const Auction = require('../models/Auction');
const AuctionRegistration = require('../models/AuctionRegistration');
const devRegStore = require('../services/devRegStore');
const devMockStore = require('../services/devMockStore');
const mongoose = require('mongoose');
const User = require('../models/User');
const DepositReference = require('../models/DepositReference');
const devRefStore = require('../services/devRefStore');
const fs = require('fs');
const path = require('path');

const defaultDepositAmount = () => 500.0;
const buildRef = (auctionId, userId) => `DEP-${String(auctionId).slice(-6)}-${String(userId).slice(-6)}-${Date.now()}`;

function readBankDetails() {
  return {
    bankName: process.env.BANK_NAME || 'FNB',
    accountName: process.env.BANK_ACCOUNT_NAME || 'Gold Business Account',
    branchName: process.env.BANK_BRANCH_NAME || 'Umgeni Junction',
    branchNumber: process.env.BANK_BRANCH_NUMBER || '250655',
    accountNumber: process.env.BANK_ACCOUNT_NUMBER || '62515997289',
    paymentRefPrefix: process.env.BANK_REF_PREFIX || 'DEP'
  };
}

// Return bank details for an auction (and suggested deposit amount)
const getBankDetails = async (req, res) => {
  try {
    const { id: auctionId } = req.params;
    let auction = null;
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
    if (devFallbackEnabled && (!mongoose.connection || mongoose.connection.readyState !== 1)) {
      try { auction = devMockStore.getAuction(auctionId); } catch (_) {}
    }
    if (!auction) {
      auction = await Auction.findById(auctionId).select('_id depositRequired depositAmount');
    }
    if (!auction) return res.status(404).json({ success: false, message: 'Auction not found' });
    const bank = readBankDetails();
    const amount = (auction && typeof auction.depositAmount === 'number' && auction.depositAmount > 0)
      ? auction.depositAmount
      : defaultDepositAmount();
    return res.json({ success: true, data: { bank, amount } });
  } catch (e) {
    console.error('getBankDetails error', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch bank details' });
  }
};

// Create a deposit intent for the current user on an auction
const createDepositIntent = async (req, res) => {
  try {
    const { id: auctionId } = req.params;
    const userId = req.user._id || req.user.id;

    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
    let auction = null;
    if (devFallbackEnabled && (!mongoose.connection || mongoose.connection.readyState !== 1)) {
      try {
        auction = devMockStore.getAuction(auctionId);
      } catch (_) {}
    }
    if (!auction) {
      auction = await Auction.findById(auctionId).select('_id status depositRequired depositAmount');
    }
    if (!auction) return res.status(404).json({ success: false, message: 'Auction not found' });
    if (auction.status === 'ended' || auction.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Deposits closed for this auction' });
    }

    const amount = (auction && typeof auction.depositAmount === 'number' && auction.depositAmount > 0)
      ? auction.depositAmount
      : defaultDepositAmount();
    const reference = buildRef(auctionId, userId);

    // Mark registration as deposit pending, set amount/reference
    let reg;
    if (auction && auction._id && (!devFallbackEnabled || (mongoose.connection && mongoose.connection.readyState === 1))) {
      reg = await AuctionRegistration.findOneAndUpdate(
        { auctionId, userId },
        { $set: { status: 'deposit_pending', depositAmount: amount, depositRef: reference } },
        { upsert: true, new: true }
      );
    } else {
      reg = devRegStore.upsert(auctionId, userId, { status: 'deposit_pending', depositAmount: amount, depositRef: reference });
    }

    const base = `${req.protocol}://${req.get('host')}`;
    const paymentUrl = `${base}/api/deposits/dev/pay?auctionId=${encodeURIComponent(auctionId)}&userId=${encodeURIComponent(userId)}&ref=${encodeURIComponent(reference)}&amount=${encodeURIComponent(amount)}`;
    const bank = readBankDetails();

    if (devFallbackEnabled && (!mongoose.connection || mongoose.connection.readyState !== 1)) {
      devRefStore.upsert(reference, { auctionId, userId, amount, status: 'issued' });
    } else {
      try {
        await DepositReference.create({ reference, auctionId, userId, amount, status: 'issued' });
      } catch (_) {}
    }

    return res.json({ success: true, data: { amount, reference, paymentUrl, bank, registration: reg } });
  } catch (e) {
    console.error('createDepositIntent error', e);
    return res.status(500).json({ success: false, message: 'Failed to create deposit intent' });
  }
};

// Get current user's deposit info for an auction
const getMyDeposit = async (req, res) => {
  try {
    const { id: auctionId } = req.params;
    const userId = req.user._id || req.user.id;
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
    if (devFallbackEnabled && (!mongoose.connection || mongoose.connection.readyState !== 1)) {
      const regDev = devRegStore.get(auctionId, userId);
      return res.json({ success: true, data: regDev ? { depositAmount: regDev.depositAmount, depositRef: regDev.depositRef, status: regDev.status } : null });
    }
    const reg = await AuctionRegistration.findOne({ auctionId, userId });
    return res.json({ success: true, data: reg ? { depositAmount: reg.depositAmount, depositRef: reg.depositRef, status: reg.status } : null });
  } catch (e) {
    console.error('getMyDeposit error', e);
    return res.status(500).json({ success: false, message: 'Failed to get deposit info' });
  }
};

// Dev-only: simulate payment success and mark deposit received
const devPay = async (req, res) => {
  try {
    const { auctionId, userId, ref, amount } = req.query;
    if (!auctionId || !userId || !ref) return res.status(400).send('Missing parameters');

    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
    let reg;
    if (devFallbackEnabled && (!mongoose.connection || mongoose.connection.readyState !== 1)) {
      reg = devRegStore.upsert(auctionId, userId, { status: 'deposit_received', depositRef: ref, depositAmount: Number(amount) || defaultDepositAmount() });
    } else {
      reg = await AuctionRegistration.findOneAndUpdate(
        { auctionId, userId },
        { $set: { status: 'deposit_received', depositRef: ref, depositAmount: Number(amount) || defaultDepositAmount() } },
        { new: true }
      );
    }

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Deposit Received</title></head><body style="font-family:Arial,sans-serif;padding:20px"><h2>Deposit Received</h2><p>Reference: ${String(ref)}</p><p>Amount: ${Number(amount) || defaultDepositAmount()}</p><p>You can close this tab and return to the auction.</p><script>setTimeout(function(){window.close()},1500)</script></body></html>`;
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (e) {
    console.error('devPay error', e);
    return res.status(500).send('Failed to mark deposit');
  }
};

// Placeholder webhook for providers (idempotent)
const webhookDev = async (req, res) => {
  try {
    const { auctionId, userId, ref, amount } = req.body || {};
    if (!auctionId || !userId || !ref) return res.status(400).json({ success: false, message: 'Missing parameters' });
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
    if (devFallbackEnabled && (!mongoose.connection || mongoose.connection.readyState !== 1)) {
      const rec = devRefStore.get(ref);
      if (!rec || String(rec.auctionId) !== String(auctionId) || String(rec.userId) !== String(userId)) {
        devRefStore.upsert(ref, { auctionId, userId, amount: Number(amount) || 0, status: 'invalid' });
        return res.status(400).json({ success: false, message: 'Invalid reference' });
      }
      devRefStore.upsert(ref, { status: 'verified', claimedAt: new Date() });
    } else {
      const rec = await DepositReference.findOne({ reference: ref });
      if (!rec || String(rec.auctionId) !== String(auctionId) || String(rec.userId) !== String(userId)) {
        await DepositReference.updateOne({ reference: ref }, { $set: { status: 'invalid' } }, { upsert: true });
        return res.status(400).json({ success: false, message: 'Invalid reference' });
      }
      await DepositReference.updateOne({ _id: rec._id }, { $set: { status: 'verified', claimedAt: new Date(), amount: Number(amount) || rec.amount } });
    }
    await AuctionRegistration.findOneAndUpdate(
      { auctionId, userId },
      { $set: { status: 'deposit_received', depositRef: ref, depositAmount: Number(amount) || defaultDepositAmount() } },
      { upsert: true, new: true }
    );
    return res.json({ success: true });
  } catch (e) {
    console.error('webhookDev error', e);
    return res.status(500).json({ success: false, message: 'Failed to process webhook' });
  }
};

// Upload bank transfer proof (base64 data URL) and mark proof uploaded
const uploadDepositReceipt = async (req, res) => {
  try {
    const { id: auctionId } = req.params;
    const userId = req.user._id || req.user.id;
    const { dataUrl, reference } = req.body || {};
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      return res.status(400).json({ success: false, message: 'Invalid dataUrl' });
    }
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) return res.status(400).json({ success: false, message: 'Invalid dataUrl format' });
    const mime = match[1];
    const b64 = match[2];
    const ext = mime.split('/')[1] || 'png';
    const buffer = Buffer.from(b64, 'base64');
    const uploadsDir = path.join(process.cwd(), 'uploads', 'deposits');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const fileName = `${String(auctionId)}_${String(userId)}_${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    // Persist file path on registration
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
    let reg;
    if (devFallbackEnabled && (!mongoose.connection || mongoose.connection.readyState !== 1)) {
      reg = devRegStore.upsert(auctionId, userId, { depositReceiptUrl: `/uploads/deposits/${fileName}`, depositVerification: { status: 'submitted' } });
      if (reference) devRefStore.upsert(reference, { status: 'pending_verification' });
    } else {
      reg = await AuctionRegistration.findOneAndUpdate(
        { auctionId, userId },
        { $set: { depositReceiptUrl: `/uploads/deposits/${fileName}`, 'depositVerification.status': 'submitted' } },
        { upsert: true, new: true }
      );
      if (reference) await DepositReference.updateOne({ reference }, { $set: { status: 'pending_verification' } });
    }
    return res.json({ success: true, data: { receiptUrl: `/uploads/deposits/${fileName}`, registration: reg } });
  } catch (e) {
    console.error('uploadDepositReceipt error', e);
    return res.status(500).json({ success: false, message: 'Failed to upload receipt' });
  }
};

const listDepositReferences = async (req, res) => {
  try {
    const { id: auctionId } = req.params;
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
    if (devFallbackEnabled && (!mongoose.connection || mongoose.connection.readyState !== 1)) {
      const refs = require('../services/devRefStore').listByAuction(auctionId);
      return res.json({ success: true, data: refs });
    }
    const refs = await DepositReference.find({ auctionId }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: refs });
  } catch (e) {
    console.error('listDepositReferences error', e);
    return res.status(500).json({ success: false, message: 'Failed to list deposit references' });
  }
};

const validateDepositReference = async (req, res) => {
  try {
    const { id: auctionId } = req.params;
    const { reference, amount } = req.body || {};
    if (!reference) return res.status(400).json({ success: false, message: 'Reference required' });
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
    if (devFallbackEnabled && (!mongoose.connection || mongoose.connection.readyState !== 1)) {
      const rec = devRefStore.get(reference);
      if (!rec || String(rec.auctionId) !== String(auctionId)) return res.status(404).json({ success: false, message: 'Reference not found' });
      devRefStore.upsert(reference, { status: 'pending_verification', amount: Number(amount) || rec.amount });
      return res.json({ success: true, data: devRefStore.get(reference) });
    }
    const rec = await DepositReference.findOne({ reference });
    if (!rec || String(rec.auctionId) !== String(auctionId)) return res.status(404).json({ success: false, message: 'Reference not found' });
    rec.status = 'pending_verification';
    if (typeof amount === 'number') rec.amount = amount;
    await rec.save();
    return res.json({ success: true, data: rec });
  } catch (e) {
    console.error('validateDepositReference error', e);
    return res.status(500).json({ success: false, message: 'Failed to validate reference' });
  }
};

module.exports = {
  getBankDetails,
  createDepositIntent,
  getMyDeposit,
  devPay,
  webhookDev,
  uploadDepositReceipt,
  listDepositReferences,
  validateDepositReference,
  // Request a refund for the current user's deposit
  requestRefund: async (req, res) => {
    try {
      const { id: auctionId } = req.params;
      const userId = req.user._id || req.user.id;
      const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
        (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
      if (devFallbackEnabled && (!mongoose.connection || mongoose.connection.readyState !== 1)) {
        const reg = devRegStore.upsert(auctionId, userId, { refundStatus: 'requested' });
        return res.json({ success: true, data: reg });
      }
      const reg = await AuctionRegistration.findOneAndUpdate(
        { auctionId, userId },
        { $set: { refundStatus: 'requested' } },
        { new: true }
      );
      if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });
      return res.json({ success: true, data: reg });
    } catch (e) {
      console.error('requestRefund error', e);
      return res.status(500).json({ success: false, message: 'Failed to request refund' });
    }
  },
  // Admin approve/process refund; optionally auto-credit to account
  adminRefund: async (req, res) => {
    try {
      const { id: auctionId, regId } = req.params;
      const { status, amount, reference, autoCredit } = req.body || {};
      const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
        (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
      const creditEnabled = autoCredit === true || process.env.ENABLE_ACCOUNT_CREDIT_REFUNDS === 'true';

      let reg;
      if (devFallbackEnabled && (!mongoose.connection || mongoose.connection.readyState !== 1)) {
        reg = devRegStore.get(auctionId, req.user._id || req.user.id) || { auctionId, userId: req.user._id || req.user.id };
        const next = { refundStatus: status || 'approved', refundAmount: Number(amount) || (reg.depositAmount || 0), refundRef: reference || buildRef(auctionId, reg.userId) };
        reg = devRegStore.upsert(auctionId, reg.userId, next);
        if ((status === 'refunded' || next.refundStatus === 'refunded') && creditEnabled) {
          // Dev credit is a no-op to user object in memory
        }
        return res.json({ success: true, data: reg });
      }

      reg = await AuctionRegistration.findOne({ _id: regId, auctionId });
      if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });
      const nextAmount = Number(amount) || reg.depositAmount || 0;
      reg.refundStatus = status || 'approved';
      reg.refundAmount = nextAmount;
      reg.refundRef = reference || reg.refundRef || buildRef(auctionId, String(reg.userId || 'user'));
      if (reg.refundStatus === 'refunded') {
        reg.refundedAt = new Date();
        if (creditEnabled && reg.userId) {
          await User.findByIdAndUpdate(reg.userId, { $inc: { accountBalance: nextAmount } });
        }
      }
      await reg.save();
      return res.json({ success: true, data: reg });
    } catch (e) {
      console.error('adminRefund error', e);
      return res.status(500).json({ success: false, message: 'Failed to process refund' });
    }
  }
};