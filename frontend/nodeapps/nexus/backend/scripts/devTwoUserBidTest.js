// Two-user dev-mode bidding competition script with Socket.IO listening
// Usage: node backend/scripts/devTwoUserBidTest.js [auctionId]
// Env: API_BASE_URL, DEV_EMAIL_A, DEV_EMAIL_B, DEV_PASSWORD
const axios = require('axios');
const ioClient = require('socket.io-client');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5006/api';
const BACKEND_WS = process.env.BACKEND_WS_URL || (API_BASE.replace(/\/api$/, ''));
const auctionId = process.env.BID_AUCTION_ID || process.argv[2] || '3';

const emailA = process.env.DEV_EMAIL_A || 'devA@example.com';
const emailB = process.env.DEV_EMAIL_B || 'devB@example.com';
const password = process.env.DEV_PASSWORD || 'x';

async function login(email) {
  const payload = { email, password };
  const res = await axios.post(`${API_BASE}/auth/login`, payload, { validateStatus: () => true });
  const body = res.data || {};
  const token = body.token || (body.data && body.data.token) || '';
  const user = body.user || (body.data && body.data.user) || { email };
  return { token, user };
}

async function getAuction() {
  const url = `${API_BASE}/auctions/${auctionId}`;
  const res = await axios.get(url, { validateStatus: () => true });
  return res.data?.data?.auction || res.data?.auction || {};
}

async function getCurrentBidDb() {
  // DB-backed endpoint; in dev mock may not return data
  const url = `${API_BASE}/bids/${auctionId}/current`;
  const res = await axios.get(url, { validateStatus: () => true });
  return res;
}

async function getBidHistoryDb(limit = 10) {
  const url = `${API_BASE}/bids/${auctionId}/history?limit=${limit}`;
  const res = await axios.get(url, { validateStatus: () => true });
  return res;
}

async function placeBid(token, amount, bidType = 'manual') {
  const url = `${API_BASE}/bids/${auctionId}/place`;
  const res = await axios.post(url, { amount, bidType }, {
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: () => true,
  });
  return res;
}

async function setAutoBid(token, maxAmount) {
  const url = `${API_BASE}/bids/${auctionId}/auto-bid`;
  const res = await axios.post(url, { maxAmount }, {
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: () => true,
  });
  return res;
}

function setupSocket() {
  const socket = ioClient(BACKEND_WS, {
    transports: ['websocket'],
    autoConnect: true,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
    // Server expects raw auctionId as payload
    socket.emit('join-auction', auctionId);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('new-bid', (payload) => {
    const amt = payload?.bid?.amount;
    const by = payload?.bid?.bidder?.username || 'unknown';
    const type = payload?.bid?.bidType;
    const cur = payload?.auction?.currentBid;
    console.log(`[Socket] New bid: $${amt} by ${by} (${type}), currentBid=$${cur}`);
  });

  socket.on('outbid', (payload) => {
    console.log('[Socket] Outbid event:', payload);
  });

  socket.on('auction-update', (payload) => {
    console.log('[Socket] Auction update:', payload);
  });

  socket.on('bid-error', (payload) => {
    console.log('[Socket] Bid error:', payload);
  });

  return socket;
}

async function run() {
  console.log(`[DEV] API_BASE=${API_BASE}`);
  console.log(`[DEV] WS_BASE=${BACKEND_WS}`);
  console.log(`[DEV] AuctionID=${auctionId}`);

  const socket = setupSocket();

  try {
    const auction = await getAuction();
    const currentPrice = auction.currentBid;
    const bidIncrement = auction.bidIncrement || 100;
    const nextBid = (typeof currentPrice === 'number' ? currentPrice : 0) + bidIncrement;
    console.log(`[INIT] Auction current=$${currentPrice}, increment=$${bidIncrement}, nextMin=$${nextBid}`);

    // Verify DB-backed endpoints (may be empty in dev mock)
    const curDb = await getCurrentBidDb();
    console.log('[Check] /current status:', curDb.status);
    const histDb = await getBidHistoryDb(5);
    console.log('[Check] /history status:', histDb.status);

    // Login two users
    const { token: tokenA, user: userA } = await login(emailA);
    const { token: tokenB, user: userB } = await login(emailB);
    console.log(`[AUTH] A=${userA.email}, B=${userB.email}`);

    // Sequence:
    // A places min bid, B outbids with +increment, A sets auto-bid slightly higher
    const r1 = await placeBid(tokenA, nextBid);
    console.log('[A] place status:', r1.status, r1.data?.message);
    const a1 = await getAuction();
    console.log('[A] current after A:', a1.currentBid || a1?.data?.auction?.currentBid);

    const r2 = await placeBid(tokenB, nextBid + bidIncrement);
    console.log('[B] place status:', r2.status, r2.data?.message);
    const a2 = await getAuction();
    console.log('[B] current after B:', a2.currentBid || a2?.data?.auction?.currentBid);

    const autoMax = nextBid + bidIncrement * 2;
    const r3 = await setAutoBid(tokenA, autoMax);
    console.log('[A] set auto-bid:', r3.status, r3.data?.message);

    // Place one more B bid to trigger auto-bid if applicable
    const r4 = await placeBid(tokenB, nextBid + bidIncrement * 2);
    console.log('[B] place again:', r4.status, r4.data?.message);

    // Small delay to receive socket events
    await new Promise(res => setTimeout(res, 1500));

    // Cleanup
    // Leave room before disconnect
    socket.emit('leave-auction', auctionId);
    socket.disconnect();
  } catch (err) {
    if (err.response) {
      console.error('Error status:', err.response.status);
      console.error('Error data:', JSON.stringify(err.response.data));
    } else {
      console.error('Error:', err.message);
    }
    // Attempt cleanup
    try { socket.emit('leave-auction', auctionId); } catch {}
    try { socket.disconnect(); } catch {}
    process.exitCode = 1;
  }
}

run();