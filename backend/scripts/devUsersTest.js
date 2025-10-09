// Dev-mode Users endpoint test script
// Usage: node backend/scripts/devUsersTest.js
// Config via env: API_BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, DEV_EMAIL, DEV_PASSWORD
const axios = require('axios');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5006/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.DEV_EMAIL || 'admin@nexusauctions.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.DEV_PASSWORD || 'x';

async function login() {
  const payload = { email: ADMIN_EMAIL, password: ADMIN_PASSWORD };
  const res = await axios.post(`${API_BASE}/auth/login`, payload, { validateStatus: () => true });
  const body = res.data || {};
  const token = body.token || (body.data && body.data.token) || '';
  return { status: res.status, body, token };
}

async function getUsers(token) {
  const res = await axios.get(`${API_BASE}/auth/users`, {
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: () => true,
  });
  return { status: res.status, body: res.data };
}

async function main() {
  try {
    console.log('API base:', API_BASE);
    console.log('Logging in as admin:', ADMIN_EMAIL);
    const loginRes = await login();
    console.log('Login status:', loginRes.status);
    if (loginRes.status !== 200 || !loginRes.token) {
      console.error('Login failed. Response:', JSON.stringify(loginRes.body));
      process.exit(1);
    }
    console.log('Token acquired. Fetching users...');

    const usersRes = await getUsers(loginRes.token);
    console.log('Users endpoint status:', usersRes.status);
    if (usersRes.status !== 200) {
      console.error('Failed to fetch users. Response:', JSON.stringify(usersRes.body));
      process.exit(2);
    }

    const data = usersRes.body && usersRes.body.data ? usersRes.body.data : {};
    const users = data.users || [];
    console.log('Total users:', data.totalUsers || users.length);
    console.log('Page info:', {
      currentPage: data.currentPage || (data.pagination && data.pagination.currentPage),
      totalPages: data.totalPages || (data.pagination && data.pagination.totalPages),
    });
    console.log('Users list:');
    users.forEach((u, i) => {
      const role = u.role || (u.roles && u.roles[0]) || 'user';
      console.log(`${i + 1}. ${u.username} (${u.email}) - Role: ${role}`);
    });

    console.log('\n✅ Admin users endpoint verified successfully.');
  } catch (e) {
    if (e.response) {
      console.error('Request failed:', e.response.status, JSON.stringify(e.response.data));
    } else {
      console.error('Error:', e.message);
    }
    process.exit(3);
  }
}

main();