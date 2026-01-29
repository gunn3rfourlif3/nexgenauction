// Dev-mode: Simulate winning outcome and finalize auction via dev endpoint
// Usage: node backend/scripts/devWinAuctionTest.js [auctionId]
// Env: API_BASE_URL, DEV_EMAIL_A, DEV_EMAIL_B, DEV_PASSWORD
const axios = require('axios');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5006/api';
const auctionId = process.env.BID_AUCTION_ID || process.argv[2] || '507f1f77bcf86cd799439011';

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

async function placeBid(token, amount) {
  const url = `${API_BASE}/bids/${auctionId}/place`;
  const res = await axios.post(url, { amount, bidType: 'manual' }, {
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: () => true,
  });
  return res;
}

async function endNowDev(token) {
  const url = `${API_BASE}/auctions/${auctionId}/dev/end-now`;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const res = await axios.post(url, {}, { headers, validateStatus: () => true });
  return res;
}

async function run() {
  console.log(`[DEV] API_BASE=${API_BASE}`);
  console.log(`[DEV] AuctionID=${auctionId}`);

  try {
    const auction = await getAuction();
    const currentPrice = auction.currentBid || auction.startingPrice || 1000;
    const inc = auction.bidIncrement || 100;
    const next = currentPrice + inc;
    console.log(`[INIT] current=$${currentPrice}, increment=$${inc}, next=$${next}`);

    const { token: tokenA, user: userA } = await login(emailA);
    const { token: tokenB, user: userB } = await login(emailB);
    console.log(`[AUTH] A=${userA.email}, B=${userB.email}`);

    // A bids min, B bids higher to be top
    const r1 = await placeBid(tokenA, next);
    console.log('[A] status:', r1.status, r1.data?.message);
    const a1 = await getAuction();
    console.log('[A] current:', a1.currentBid);

    const r2 = await placeBid(tokenB, next + inc);
    console.log('[B] status:', r2.status, r2.data?.message);
    const a2 = await getAuction();
    console.log('[B] current:', a2.currentBid);

    // End auction now (dev)
    const endRes = await endNowDev(tokenB);
    console.log('[END] status:', endRes.status, endRes.data?.message);
    const ended = endRes.data?.data?.auction || endRes.data?.auction || {};
    console.log(`[RESULT] status=${ended.status}, winner=${ended.winner?.email || ended.winner?.username}, winningBid=$${ended.winningBid}`);

    // Sanity: refetch auction
    const final = await getAuction();
    console.log(`[FINAL] status=${final.status}, bidCount=${final.bidCount}, currentBid=$${final.currentBid}`);

    // Expectations in dev mode: ended status set, winner equals highest bidder
    if (final.status !== 'ended') {
      console.error('Expectation failed: status should be ended');
      process.exitCode = 1;
    }
    if (!final.winner) {
      console.error('Expectation failed: winner should be present');
      process.exitCode = 1;
    }
    if (typeof final.winningBid !== 'number') {
      console.error('Expectation failed: winningBid should be numeric');
      process.exitCode = 1;
    }
  } catch (err) {
    if (err.response) {
      console.error('Error status:', err.response.status);
      console.error('Error data:', JSON.stringify(err.response.data));
    } else {
      console.error('Error:', err.message);
    }
    process.exitCode = 1;
  }
}

run();