// Dev-mode Wallet Top-up test script
// Usage: node backend/scripts/devTopUpTest.js [amount]
// Config via env: API_BASE_URL, DEV_EMAIL, DEV_PASSWORD
const axios = require('axios');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5006/api';
const amountArg = process.argv[2];
const TOP_UP_AMOUNT = amountArg ? parseFloat(amountArg) : parseFloat(process.env.TOP_UP_AMOUNT || '500');

async function login() {
  const payload = { email: process.env.DEV_EMAIL || 'dev@example.com', password: process.env.DEV_PASSWORD || 'x' };
  const res = await axios.post(`${API_BASE}/auth/login`, payload, { validateStatus: () => true });
  const body = res.data || {};
  const token = body.token || (body.data && body.data.token) || '';
  if (!token) throw new Error('Login failed: no token returned');
  return token;
}

async function getBalance(token) {
  const res = await axios.get(`${API_BASE}/account/balance`, { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true });
  return res;
}

async function topUp(token, amount) {
  const payload = { amount, paymentMethod: 'development', currency: 'USD' };
  const res = await axios.post(`${API_BASE}/account/topup`, payload, { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true });
  return res;
}

async function run() {
  console.log(`[DEV] API_BASE=${API_BASE}`);
  console.log(`[DEV] TOP_UP_AMOUNT=${TOP_UP_AMOUNT}`);
  try {
    const token = await login();
    console.log('Token OK:', !!token);

    const before = await getBalance(token);
    console.log('Balance (before) status:', before.status);
    console.log('Balance (before):', JSON.stringify(before.data));

    const res = await topUp(token, TOP_UP_AMOUNT);
    console.log('TopUp status:', res.status);
    console.log('TopUp response:', JSON.stringify(res.data));

    const after = await getBalance(token);
    console.log('Balance (after) status:', after.status);
    console.log('Balance (after):', JSON.stringify(after.data));

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