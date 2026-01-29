// Dev-mode Auction creation test script
// Usage: node backend/scripts/devAuctionCreateTest.js
// Config via env: API_BASE_URL, DEV_EMAIL, DEV_PASSWORD
const axios = require('axios');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5006/api';

async function login() {
  const payload = {
    email: process.env.DEV_EMAIL || 'dev@example.com',
    password: process.env.DEV_PASSWORD || 'x',
  };
  const res = await axios.post(`${API_BASE}/auth/login`, payload, { validateStatus: () => true });
  const body = res.data || {};
  const token = body.token || (body.data && body.data.token) || '';
  if (!token) {
    throw new Error(`Login failed: status=${res.status} body=${JSON.stringify(body)}`);
  }
  return token;
}

function nowPlusHours(h) {
  const d = new Date();
  d.setHours(d.getHours() + h);
  return d.toISOString();
}

function buildPayload() {
  const start = nowPlusHours(1);
  const end = nowPlusHours(24 * 7); // 7 days
  return {
    title: `Dev Test Auction ${new Date().toISOString()}`,
    description: 'Automated test auction to validate creation flow',
    category: 'electronics',
    subcategory: 'testing',
    condition: 'good',
    images: [
      { url: '/api/placeholder/400/300', alt: 'Primary image', isPrimary: true, order: 0 }
    ],
    startingPrice: 100,
    reservePrice: 150,
    bidIncrement: 10,
    startTime: start,
    endTime: end,
    tags: ['dev', 'test'],
    featured: false,
    shippingInfo: {
      weight: 1,
      dimensions: { length: 10, width: 10, height: 10 },
      shippingCost: 0,
      freeShipping: true
    }
  };
}

async function createAuction(token, payload) {
  // Try admin route first; if unauthorized, fall back to user route
  const urlAdmin = `${API_BASE}/auctions/admin`;
  let res = await axios.post(urlAdmin, payload, {
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: () => true
  });
  if (res.status === 401 || res.status === 403) {
    const urlUser = `${API_BASE}/auctions`;
    res = await axios.post(urlUser, payload, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true
    });
  }
  if (res.status >= 400) {
    throw new Error(`Create failed status=${res.status} body=${JSON.stringify(res.data)}`);
  }
  const auction = res.data?.data?.auction || res.data?.auction || {};
  return auction;
}

async function listMySelling(token) {
  const res = await axios.get(`${API_BASE}/auctions/my/selling`, {
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: () => true
  });
  if (res.status >= 400) {
    throw new Error(`List my selling failed status=${res.status} body=${JSON.stringify(res.data)}`);
  }
  return res.data?.data?.auctions || res.data?.auctions || [];
}

async function run() {
  console.log(`[DEV] API_BASE=${API_BASE}`);
  try {
    const token = await login();
    console.log('Login OK');

    const payload = buildPayload();
    console.log('Creating auction with payload:', JSON.stringify(payload));
    const created = await createAuction(token, payload);
    console.log('Create status: OK');
    console.log('Created auction id:', created._id || created.id);
    console.log('Created auction status:', created.status);

    const mine = await listMySelling(token);
    const found = mine.find(a => (a._id || a.id) === (created._id || created.id));
    console.log('Listed auctions count:', mine.length);
    console.log('Created auction present in listing:', !!found);
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