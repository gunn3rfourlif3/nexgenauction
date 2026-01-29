const axios = require('axios');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5006/api';
const auctionId = process.env.BID_AUCTION_ID || '3';

async function run() {
  try {
    const invalid = await axios.get(`${API_BASE}/bids/${auctionId}/history?limit=-1`, { validateStatus: () => true });
    console.log('Invalid limit status:', invalid.status);
    console.log('Invalid limit message:', invalid.data?.message);

    const valid = await axios.get(`${API_BASE}/bids/${auctionId}/history?limit=5&page=1`, { validateStatus: () => true });
    console.log('Valid status:', valid.status);
    const payload = valid.data || {};
    const bids = payload.data?.bids || [];
    const pagination = payload.data?.pagination || {};
    console.log('Bids count:', bids.length);
    console.log('Pagination:', pagination.currentPage, '/', pagination.totalPages);
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