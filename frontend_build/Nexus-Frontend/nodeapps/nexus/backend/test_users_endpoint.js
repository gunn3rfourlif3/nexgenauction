const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testUsersEndpoint() {
  try {
    console.log('1. Logging in as admin user...');
    
    // Login with admin user
    const loginOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const loginData = {
      email: 'admin@nexgenauction.com',
      password: 'password123'
    };
    
    const loginResponse = await makeRequest(loginOptions, loginData);
    console.log('Login response status:', loginResponse.statusCode);
    console.log('Login success:', loginResponse.data.success);
    
    if (loginResponse.statusCode === 200 && loginResponse.data.success) {
      const token = loginResponse.data.data.token;
      console.log('Login successful! Token received.');
      
      console.log('\n2. Testing users endpoint...');
      
      // Test users endpoint
      const usersOptions = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/users',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };
      
      const usersResponse = await makeRequest(usersOptions);
      console.log('Users endpoint status:', usersResponse.statusCode);
      
      if (usersResponse.statusCode === 200) {
        console.log('\n✅ SUCCESS! All registered users:');
        console.log('Total users:', usersResponse.data.data.users.length);
        console.log('Users list:');
        usersResponse.data.data.users.forEach((user, index) => {
          console.log(`${index + 1}. ${user.username} (${user.email}) - Role: ${user.role}`);
        });
        
        console.log('\nPagination info:');
        console.log('Current page:', usersResponse.data.data.currentPage);
        console.log('Total pages:', usersResponse.data.data.totalPages);
        console.log('Total users:', usersResponse.data.data.totalUsers);
      } else {
        console.log('❌ Failed to get users:', usersResponse.data);
      }
    } else {
      console.log('❌ Login failed:', loginResponse.data);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testUsersEndpoint();