const fetch = require('node-fetch');

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/users', {
      headers: {
        'Cookie': 'auth_cookie=test'
      }
    });
    const data = await res.json();
    console.log('Users endpoint response:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}

test();