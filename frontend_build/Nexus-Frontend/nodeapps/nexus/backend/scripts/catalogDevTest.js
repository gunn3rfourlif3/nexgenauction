// Dev-mode catalog search/sort regression test
// Usage: node backend/scripts/catalogDevTest.js
// Optional env: API_BASE_URL (default http://localhost:5006/api)
const axios = require('axios');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5006/api';

function assert(cond, message) {
  if (!cond) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function fetchAuctions(params) {
  const url = `${API_BASE}/auctions`;
  const res = await axios.get(url, { params, validateStatus: () => true });
  return res;
}

async function run() {
  console.log(`Using API: ${API_BASE}`);

  // Baseline: fetch all active, sorted by title asc
  const baseRes = await fetchAuctions({ status: 'active', sort: 'title', limit: 50, page: 1 });
  assert(baseRes.status === 200, `baseline status ${baseRes.status}`);
  const baseData = baseRes.data?.data;
  assert(baseData && Array.isArray(baseData.auctions), 'baseline auctions array present');
  const items = baseData.auctions;
  // Expect 4 seeded items in dev mock
  assert(items.length >= 4, `expected at least 4 items, got ${items.length}`);

  // Titles expected in dev mock data
  const expectedTitles = [
    'Vintage Rolex Submariner 5513 - 1970',
    'Antique Persian Tabriz Rug - 19th Century',
    '1965 Ford Mustang Fastback - Restored',
    'Original Picasso Lithograph - "The Dove" 1949'
  ];

  const titles = items.map(a => a.title);
  expectedTitles.forEach(t => {
    assert(titles.includes(t), `missing expected title: ${t}`);
  });

  // Verify title ascending order when sort=title
  const titleAsc = items.map(a => (a.title || '').toLowerCase());
  const titleAscSorted = [...titleAsc].sort();
  assert(JSON.stringify(titleAsc) === JSON.stringify(titleAscSorted), 'title ascending order');

  // Verify createdAt descending when sort=-createdAt
  const createdRes = await fetchAuctions({ status: 'active', sort: '-createdAt', limit: 50, page: 1 });
  assert(createdRes.status === 200, `createdAt status ${createdRes.status}`);
  const createdItems = createdRes.data?.data?.auctions || [];
  const createdTimes = createdItems.map(a => new Date(a.createdAt || 0).getTime());
  const createdDescSorted = [...createdTimes].sort((a, b) => b - a);
  assert(JSON.stringify(createdTimes) === JSON.stringify(createdDescSorted), 'createdAt descending order');

  // Verify price-low: sort by currentBid ascending
  const priceLowRes = await fetchAuctions({ status: 'active', sort: 'currentBid', limit: 50, page: 1 });
  assert(priceLowRes.status === 200, `price-low status ${priceLowRes.status}`);
  const priceLowItems = priceLowRes.data?.data?.auctions || [];
  const bidsAsc = priceLowItems.map(a => Number(a.currentBid || 0));
  const bidsAscSorted = [...bidsAsc].sort((a, b) => a - b);
  assert(JSON.stringify(bidsAsc) === JSON.stringify(bidsAscSorted), 'currentBid ascending order');

  // Verify price-high: sort by currentBid descending
  const priceHighRes = await fetchAuctions({ status: 'active', sort: '-currentBid', limit: 50, page: 1 });
  assert(priceHighRes.status === 200, `price-high status ${priceHighRes.status}`);
  const priceHighItems = priceHighRes.data?.data?.auctions || [];
  const bidsDesc = priceHighItems.map(a => Number(a.currentBid || 0));
  const bidsDescSorted = [...bidsDesc].sort((a, b) => b - a);
  assert(JSON.stringify(bidsDesc) === JSON.stringify(bidsDescSorted), 'currentBid descending order');

  // Search: case-insensitive matching across title/description/tags/subcategory/conditionReport
  const searchWatchRes = await fetchAuctions({ search: 'watch', sort: 'title', limit: 50, page: 1 });
  assert(searchWatchRes.status === 200, `search watch status ${searchWatchRes.status}`);
  const watchItems = searchWatchRes.data?.data?.auctions || [];
  // At least the Rolex is a watch; may include others depending on descriptions
  assert(watchItems.some(a => /watch/i.test(a.title || '') || /watch/i.test(a.description || '') || /watch/i.test(a.subcategory || '')), 'search watch returns relevant items');

  const searchRugRes = await fetchAuctions({ search: 'rug', sort: 'title', limit: 50, page: 1 });
  assert(searchRugRes.status === 200, `search rug status ${searchRugRes.status}`);
  const rugItems = searchRugRes.data?.data?.auctions || [];
  assert(rugItems.some(a => /rug/i.test(a.title || '') || /rug/i.test(a.description || '') || /rug/i.test(a.subcategory || '')), 'search rug returns relevant items');

  // Combine price range and search
  const priceRangeRes = await fetchAuctions({ search: 'Picasso', minPrice: 10000, maxPrice: 25000, sort: 'title', limit: 50, page: 1 });
  assert(priceRangeRes.status === 200, `price range status ${priceRangeRes.status}`);
  const priceRangeItems = priceRangeRes.data?.data?.auctions || [];
  assert(priceRangeItems.length >= 1, 'price range + search returns items');

  console.log('All assertions passed.');
}

run().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});