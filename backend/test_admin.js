const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testAdminEndpoint() {
  try {
    console.log('1. Registering admin user...');
    
    // Register admin user
    const registerResponse = await axios.post(`${API_BASE}/auth/register`, {
      username: 'admin',
      email: 'admin@nexgenauction.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User'
    });
    
    console.log('Registration response:', registerResponse.data);
    
    // Update user role to admin (we'll need to do this directly in the database)
    console.log('\n2. Please manually update the user role to "admin" in the database');
    console.log('You can use MongoDB Compass or run: db.users.updateOne({email:"admin@nexgenauction.com"}, {$set: {role:"admin"}})');
    
    console.log('\n3. Attempting login...');
    
    // Login
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@nexgenauction.com',
      password: 'password123'
    });
    
    console.log('Login successful!');
    const token = loginResponse.data.data.token;
    
    console.log('\n4. Testing users endpoint...');
    
    // Test users endpoint
    const usersResponse = await axios.get(`${API_BASE}/auth/users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Users endpoint response:');
    console.log(JSON.stringify(usersResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAdminEndpoint();