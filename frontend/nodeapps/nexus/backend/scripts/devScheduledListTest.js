// Dev-mode upcoming auctions listing test
// Usage: node backend/scripts/devScheduledListTest.js
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

  // Fetch upcoming auctions
  const res = await fetchAuctions({ status: 'upcoming', sort: 'startTime', limit: 50, page: 1 });
  assert(res.status === 200, `status ${res.status}`);
  const data = res.data?.data;
  assert(data && Array.isArray(data.auctions), 'auctions array present');
  const items = data.auctions;

  // Validate presence of newly added mock upcoming items
  const expectedTitles = [
    'Leica M3 Rangefinder Camera with Summicron 50mm',
    'Omega Speedmaster Professional “Moonwatch”',
    'First Edition "The Great Gatsby" by F. Scott Fitzgerald'
  ];

  const titles = items.map(a => a.title);
  expectedTitles.forEach(t => {
    assert(titles.includes(t), `missing expected upcoming title: ${t}`);
  });

  // Ensure all are upcoming and start times are in the future
  items.forEach(a => {
    assert(a.status === 'upcoming', `item not upcoming: ${a.title}`);
    const start = new Date(a.startTime).getTime();
    assert(start > Date.now(), `startTime not in future for: ${a.title}`);
  });

  console.log('Upcoming auctions listing assertions passed.');
}

run().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});