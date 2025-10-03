// Dev-mode Bid flow test script
// Usage: node backend/scripts/devBidTest.js [auctionId]
// Config via env: API_BASE_URL, DEV_EMAIL, DEV_PASSWORD
const axios = require('axios');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5006/api';
const auctionId = process.env.BID_AUCTION_ID || process.argv[2] || '3';

async function login() {
  const payload = { email: process.env.DEV_EMAIL || 'dev@example.com', password: process.env.DEV_PASSWORD || 'x' };
  const res = await axios.post(`${API_BASE}/auth/login`, payload, { validateStatus: () => true });
  const body = res.data || {};
  const token = body.token || (body.data && body.data.token) || '';
  return token;
}

async function placeBid(token, amount) {
  // Prefer dedicated bids route in dev: /api/bids/:auctionId/place
  const url = `${API_BASE}/bids/${auctionId}/place`;
  const res = await axios.post(url, { amount, bidType: 'manual' }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res;
}

async function getCurrentBid() {
  // Use auctions endpoint which has dev-mode fallback
  const url = `${API_BASE}/auctions/${auctionId}`;
  const res = await axios.get(url, { validateStatus: () => true });
  return res;
}

async function getUserBids(token) {
  // Use "my/bidding" which has dev-mode fallback
  const url = `${API_BASE}/auctions/my/bidding`;
  const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true });
  return res;
}

async function setAutoBid(token, currentPrice, bidIncrement) {
  const url = `${API_BASE}/bids/${auctionId}/auto-bid`;
  const nextMin = (typeof currentPrice === 'number' ? currentPrice : 0) + (typeof bidIncrement === 'number' ? bidIncrement : 1);
  const maxAmount = nextMin + (typeof bidIncrement === 'number' ? bidIncrement : 1);
  const res = await axios.post(url, { maxAmount }, { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true });
  return res;
}

async function run() {
  console.log(`[DEV] API_BASE=${API_BASE}`);
  console.log(`[DEV] AuctionID=${auctionId}`);
  try {
    const token = await login();
    console.log('Token OK:', !!token);

    const current = await getCurrentBid();
    console.log('Current Auction status:', current.status);
    const auction = current.data?.data?.auction || current.data?.auction || {};
    const currentPrice = auction.currentBid;
    const bidIncrement = auction.bidIncrement || 100;
    const minimumNextBid = typeof currentPrice === 'number' ? currentPrice + bidIncrement : bidIncrement;
    console.log('Current Price:', currentPrice);
    console.log('Bid Increment:', bidIncrement);
    console.log('Minimum Next Bid:', minimumNextBid);

    const place = await placeBid(token, minimumNextBid);
    console.log('Place Bid status:', place.status);
    console.log('Place Bid message:', place.data?.message);

    const mine = await getUserBids(token);
    console.log('My Bids status:', mine.status);
    const auctions = mine.data?.data?.auctions || mine.data?.auctions || [];
    const mineOnThisAuction = auctions.find(a => (a._id || a.id) === auctionId);
    const bidsCount = (mineOnThisAuction?.bids || []).length;
    console.log('My Bids on this auction:', bidsCount);

    const auto = await setAutoBid(token, currentPrice, bidIncrement);
    console.log('Set AutoBid status:', auto.status);
    console.log('Set AutoBid message:', auto.data?.message);

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