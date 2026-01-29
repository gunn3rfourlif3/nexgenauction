const mongoose = require('mongoose');
const Auction = require('../models/Auction');
const AuctionRegistration = require('../models/AuctionRegistration');
const devMockStore = require('../services/devMockStore');
const devRegStore = require('../services/devRegStore');

// Register current user for an auction
const registerForAuction = async (req, res) => {
  try {
    const { id: auctionId } = req.params;
    const userId = req.user._id || req.user.id;
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
    const requireEmailVerified = (process.env.REQUIRE_EMAIL_VERIFIED || 'true') !== 'false';
    if (requireEmailVerified) {
      let verified = false;
      if (devFallbackEnabled) {
        verified = !!req.user && !!req.user.isVerified;
      } else {
        const User = require('../models/User');
        const u = await User.findById(userId).select('isVerified');
        verified = !!(u && u.isVerified);
      }
      if (!verified) {
        return res.status(400).json({ success: false, message: 'Please verify your email before registering for this auction' });
      }
    }
    console.info('[registerForAuction] devFallbackEnabled=', devFallbackEnabled, 'env=', process.env.NODE_ENV, 'FORCE_DB_CONNECTION=', process.env.FORCE_DB_CONNECTION, 'ENABLE_DEV_MOCK=', process.env.ENABLE_DEV_MOCK);

    if (devFallbackEnabled) {
      try {
        const a = devMockStore.getAuction(auctionId);
        const status = (a.status || 'active');
        if (status === 'ended' || status === 'cancelled') {
          return res.status(400).json({ success: false, message: 'Registration closed for this auction' });
        }
        const requireDeposit = Boolean(a.depositRequired) || (process.env.DEV_REQUIRE_DEPOSIT === 'true');
        const statusNext = requireDeposit ? 'deposit_pending' : 'registered';
        const reg = devRegStore.upsert(auctionId, userId, { status: statusNext, depositAmount: requireDeposit ? (Number(a.depositAmount) || 500) : undefined });
        return res.json({ success: true, data: reg });
      } catch (e) {
        // fall through to DB path if mock store fails
      }
    }

    if (devFallbackEnabled && (!mongoose.connection || mongoose.connection.readyState !== 1)) {
      try {
        const a = devMockStore.getAuction(auctionId);
        const status = (a.status || 'active');
        if (status === 'ended' || status === 'cancelled') {
          return res.status(400).json({ success: false, message: 'Registration closed for this auction' });
        }
        const requireDeposit = Boolean(a.depositRequired) || (process.env.DEV_REQUIRE_DEPOSIT === 'true');
        const statusNext = requireDeposit ? 'deposit_pending' : 'registered';
        const reg = devRegStore.upsert(auctionId, userId, { status: statusNext, depositAmount: requireDeposit ? (Number(a.depositAmount) || 500) : undefined });
        return res.json({ success: true, data: reg });
      } catch (e) {
        // fall through
      }
    }

    const auction = await Auction.findById(auctionId).select('status depositRequired depositAmount');
    if (!auction) return res.status(404).json({ success: false, message: 'Auction not found' });
    if (auction.status === 'ended' || auction.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Registration closed for this auction' });
    }
    const requireDeposit = Boolean(auction.depositRequired);
    const nextStatus = requireDeposit ? 'deposit_pending' : 'registered';
    const reg = await AuctionRegistration.findOneAndUpdate(
      { auctionId, userId },
      { $setOnInsert: { status: nextStatus }, $set: requireDeposit ? { status: nextStatus, depositAmount: auction.depositAmount || 0 } : {} },
      { upsert: true, new: true }
    );
    return res.json({ success: true, data: reg });
  } catch (e) {
    console.error('registerForAuction error', e);
    return res.status(500).json({ success: false, message: 'Failed to register' });
  }
};

// Get current user's registration for an auction
const getMyRegistration = async (req, res) => {
  try {
    const { id: auctionId } = req.params;
    const userId = req.user._id || req.user.id;
    const devFallbackEnabled = (process.env.ENABLE_DEV_MOCK === 'true') ||
      (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_CONNECTION !== 'true');
    console.info('[getMyRegistration] devFallbackEnabled=', devFallbackEnabled, 'env=', process.env.NODE_ENV, 'FORCE_DB_CONNECTION=', process.env.FORCE_DB_CONNECTION, 'ENABLE_DEV_MOCK=', process.env.ENABLE_DEV_MOCK);

    if (devFallbackEnabled) {
      const key = `${auctionId}:${userId}`;
      const reg = devRegStore.get(key) || null;
      return res.json({ success: true, data: reg });
    }

    const reg = await AuctionRegistration.findOne({ auctionId, userId });
    return res.json({ success: true, data: reg || null });
  } catch (e) {
    console.error('getMyRegistration error', e);
    return res.status(500).json({ success: false, message: 'Failed to get registration' });
  }
};

// Admin: list registrations for an auction
const listRegistrations = async (req, res) => {
  try {
    const { id: auctionId } = req.params;
    const { status, q } = req.query;
    const filter = { auctionId };
    if (status) filter.status = status;
    const regs = await AuctionRegistration.find(filter)
      .populate('userId', 'username email firstName lastName')
      .sort({ createdAt: -1 });
    // Optional simple client-side search
    const filtered = q ? regs.filter(r => {
      const u = r.userId || {};
      const s = `${u.username || ''} ${u.email || ''} ${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
      return s.includes(String(q).toLowerCase());
    }) : regs;
    return res.json({ success: true, data: filtered });
  } catch (e) {
    console.error('listRegistrations error', e);
    return res.status(500).json({ success: false, message: 'Failed to list registrations' });
  }
};

// Admin: update status (approve/reject/suspend)
const updateRegistrationStatus = async (req, res) => {
  try {
    const { id: auctionId, regId } = req.params;
    const { status, notes } = req.body;
    if (!['approved','rejected','suspended','registered','deposit_pending','deposit_received'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const reg = await AuctionRegistration.findOneAndUpdate(
      { _id: regId, auctionId },
      { status, notes },
      { new: true }
    );
    if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });
    return res.json({ success: true, data: reg });
  } catch (e) {
    console.error('updateRegistrationStatus error', e);
    return res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

// Admin: update deposit info
const updateRegistrationDeposit = async (req, res) => {
  try {
    const { id: auctionId, regId } = req.params;
    const { depositAmount, depositRef, status } = req.body;
    const update = { depositAmount, depositRef };
    if (status) update.status = status;
    const reg = await AuctionRegistration.findOneAndUpdate(
      { _id: regId, auctionId },
      update,
      { new: true }
    );
    if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });
    return res.json({ success: true, data: reg });
  } catch (e) {
    console.error('updateRegistrationDeposit error', e);
    return res.status(500).json({ success: false, message: 'Failed to update deposit' });
  }
};

// Admin: verify deposit proof and optionally approve
const verifyDeposit = async (req, res) => {
  try {
    const { id: auctionId, regId } = req.params;
    const { verificationStatus, notes, approve } = req.body || {};
    if (!['reviewing','verified','rejected'].includes(verificationStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid verification status' });
    }
    const update = {
      depositVerification: {
        status: verificationStatus,
        notes: notes || undefined,
        verifiedBy: req.user._id,
        verifiedAt: verificationStatus === 'verified' ? new Date() : undefined
      }
    };
    const reg = await AuctionRegistration.findOneAndUpdate(
      { _id: regId, auctionId },
      update,
      { new: true }
    );
    if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });
    // Optionally set overall registration status
    if (verificationStatus === 'verified') {
      reg.status = approve ? 'approved' : 'deposit_received';
      await reg.save();
    }
    return res.json({ success: true, data: reg });
  } catch (e) {
    console.error('verifyDeposit error', e);
    return res.status(500).json({ success: false, message: 'Failed to verify deposit' });
  }
};

module.exports = {
  registerForAuction,
  getMyRegistration,
  listRegistrations,
  updateRegistrationStatus,
  updateRegistrationDeposit
  , verifyDeposit
};