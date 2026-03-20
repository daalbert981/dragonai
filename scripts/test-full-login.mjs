import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testFullLogin() {
  console.log('🔐 Testing Full Login Flow...\n');

  try {
    // Step 1: Get CSRF token
    console.log('1️⃣ Getting CSRF token...');
    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
    const { csrfToken } = await csrfRes.json();
    console.log('✅ CSRF token:', csrfToken);

    // Step 2: Attempt login
    console.log('\n2️⃣ Attempting login...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        csrfToken,
        email: 'student1@drexel.edu',
        password: 'Student123!',
        callbackUrl: '/student',
        json: 'true'
      }),
      redirect: 'manual'
    });

    console.log('Status:', loginRes.status);
    console.log('Status Text:', loginRes.statusText);

    const cookies = loginRes.headers.raw()['set-cookie'];
    console.log('Cookies:', cookies);

    if (loginRes.status === 302 || loginRes.status === 200) {
      console.log('✅ Login request accepted');
      console.log('Redirect location:', loginRes.headers.get('location'));
    } else {
      console.log('❌ Login failed');
      const body = await loginRes.text();
      console.log('Response:', body.substring(0, 500));
    }

    // Step 3: Check session with cookies
    if (cookies && cookies.length > 0) {
      console.log('\n3️⃣ Checking session with cookies...');
      const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
        headers: {
          'Cookie': cookies.join('; ')
        }
      });

      const session = await sessionRes.json();
      console.log('Session:', JSON.stringify(session, null, 2));

      if (session && session.user) {
        console.log('\n✅ LOGIN SUCCESSFUL!');
        console.log('User:', session.user);
        return true;
      } else {
        console.log('\n❌ No session created');
        return false;
      }
    } else {
      console.log('\n❌ No cookies received');
      return false;
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

testFullLogin().then(success => {
  if (success) {
    console.log('\n🎉 Login test PASSED');
    process.exit(0);
  } else {
    console.log('\n💥 Login test FAILED');
    process.exit(1);
  }
});
