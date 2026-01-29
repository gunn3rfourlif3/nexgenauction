const axios = require('axios');

const baseApi = process.env.API_BASE_URL || 'http://localhost:5006/api';
const watchAuctionId = process.env.WATCH_AUCTION_ID || '3';

async function main() {
  const loginPayload = {
    email: process.env.DEV_EMAIL || 'dev@example.com',
    password: process.env.DEV_PASSWORD || 'x',
  };

  let token = '';
  try {
    const loginRes = await axios.post(`${baseApi}/auth/login`, loginPayload, { validateStatus: () => true });
    const body = loginRes.data || {};
    token = body.token || (body.data && body.data.token) || '';
    console.log('Login status:', loginRes.status);
    if (!token) {
      console.error('Failed to obtain token from login response:', JSON.stringify(body));
      process.exit(1);
    } else {
      console.log('Token acquired.');
    }
  } catch (e) {
    console.error('Login request failed:', e.message);
    process.exit(1);
  }

  const auth = { headers: { Authorization: `Bearer ${token}` } };

  try {
    const addRes = await axios.post(`${baseApi}/auctions/${watchAuctionId}/watch`, null, auth);
    console.log('Add status:', addRes.status);
    console.log(JSON.stringify(addRes.data));
  } catch (e) {
    if (e.response) {
      console.log('Add status:', e.response.status);
      console.log(JSON.stringify(e.response.data));
    } else {
      console.error('Add request error:', e.message);
      process.exit(1);
    }
  }

  try {
    const listRes = await axios.get(`${baseApi}/auctions/my/watchlist`, auth);
    console.log('List status:', listRes.status);
    console.log(JSON.stringify(listRes.data));
  } catch (e) {
    if (e.response) {
      console.log('List status:', e.response.status);
      console.log(JSON.stringify(e.response.data));
    } else {
      console.error('List request error:', e.message);
      process.exit(1);
    }
  }

  try {
    const rmRes = await axios.delete(`${baseApi}/auctions/${watchAuctionId}/watch`, auth);
    console.log('Remove status:', rmRes.status);
    console.log(JSON.stringify(rmRes.data));
  } catch (e) {
    if (e.response) {
      console.log('Remove status:', e.response.status);
      console.log(JSON.stringify(e.response.data));
    } else {
      console.error('Remove request error:', e.message);
      process.exit(1);
    }
  }

  try {
    const list2Res = await axios.get(`${baseApi}/auctions/my/watchlist`, auth);
    console.log('List2 status:', list2Res.status);
    console.log(JSON.stringify(list2Res.data));
  } catch (e) {
    if (e.response) {
      console.log('List2 status:', e.response.status);
      console.log(JSON.stringify(e.response.data));
    } else {
      console.error('List2 request error:', e.message);
      process.exit(1);
    }
  }
}

main();