// Dev-mode Notifications flow test script
// Usage: node backend/scripts/devNotificationsTest.js
// Config via env: API_BASE_URL, DEV_EMAIL, DEV_PASSWORD
const axios = require('axios');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5006/api';

async function login() {
  const payload = { email: process.env.DEV_EMAIL || 'dev@example.com', password: process.env.DEV_PASSWORD || 'x' };
  const res = await axios.post(`${API_BASE}/auth/login`, payload, { validateStatus: () => true });
  const body = res.data || {};
  const token = body.token || (body.data && body.data.token) || '';
  return token;
}

async function listNotifications(token) {
  const url = `${API_BASE}/auctions/my/notifications`;
  const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true });
  return res;
}

async function markOneRead(token, notificationId) {
  const url = `${API_BASE}/auctions/notifications/${notificationId}/read`;
  const res = await axios.put(url, {}, { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true });
  return res;
}

async function markAllRead(token) {
  const url = `${API_BASE}/auctions/notifications/read-all`;
  const res = await axios.put(url, {}, { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true });
  return res;
}

async function run() {
  console.log(`[DEV] API_BASE=${API_BASE}`);
  try {
    const token = await login();
    console.log('Token OK:', !!token);

    const list = await listNotifications(token);
    console.log('List Notifications status:', list.status);
    const notifications = list.data?.notifications || list.data?.data?.notifications || [];
    console.log('Notifications count:', notifications.length);
    notifications.slice(0, 3).forEach(n => console.log(`- [${n._id}] ${n.type}: ${n.message}`));

    if (notifications.length > 0) {
      const firstId = notifications[0]._id || notifications[0].id;
      const markOne = await markOneRead(token, firstId);
      console.log('Mark One Read status:', markOne.status);
      console.log('Mark One Read message:', markOne.data?.message);
    }

    const markAll = await markAllRead(token);
    console.log('Mark All Read status:', markAll.status);
    console.log('Mark All Read message:', markAll.data?.message);

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