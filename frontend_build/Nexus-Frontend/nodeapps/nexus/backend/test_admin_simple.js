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

async function testAdminEndpoint() {
  try {
    console.log('1. Registering admin user...');
    
    // Register admin user
    const registerOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const registerData = {
      username: 'admin',
      email: 'admin@nexgenauction.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User'
    };
    
    const registerResponse = await makeRequest(registerOptions, registerData);
    console.log('Registration response:', registerResponse);
    
    if (registerResponse.statusCode === 201 || registerResponse.statusCode === 400) {
      console.log('\n2. Attempting login...');
      
      // Login
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
      console.log('Login response:', loginResponse);
      
      if (loginResponse.statusCode === 200 && loginResponse.data.success) {
        const token = loginResponse.data.data.token;
        console.log('Login successful! Token:', token.substring(0, 20) + '...');
        
        console.log('\n3. Testing users endpoint...');
        
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
        console.log('Users endpoint response:');
        console.log(JSON.stringify(usersResponse, null, 2));
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAdminEndpoint();