import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testBrowserLogin() {
  console.log('🔐 Testing Login (Browser Simulation)...\n');

  try {
    // Step 1: GET the login page to get initial cookies
    console.log('1️⃣ Loading login page...');
    const loginPageRes = await fetch(`${BASE_URL}/login`);
    const pageCookies = loginPageRes.headers.raw()['set-cookie'] || [];
    console.log('✅ Login page loaded');

    // Step 2: Get CSRF token
    console.log('\n2️⃣ Getting CSRF token...');
    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`, {
      headers: {
        'Cookie': pageCookies.join('; ')
      }
    });
    const { csrfToken } = await csrfRes.json();
    console.log('✅ CSRF token:', csrfToken);

    // Collect cookies
    const csrfCookies = csrfRes.headers.raw()['set-cookie'] || [];
    const allCookies = [...pageCookies, ...csrfCookies];

    // Step 3: Submit credentials using signIn endpoint
    console.log('\n3️⃣ Submitting login (via signin/credentials)...');
    const signinRes = await fetch(`${BASE_URL}/api/auth/signin/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': allCookies.join('; ')
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

    console.log('Signin Status:', signinRes.status);
    console.log('Signin Headers:', signinRes.headers.raw());

    const signinCookies = signinRes.headers.raw()['set-cookie'] || [];
    const finalCookies = [...allCookies, ...signinCookies];

    // Step 4: Check session
    console.log('\n4️⃣ Checking session...');
    const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: {
        'Cookie': finalCookies.join('; ')
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

  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

testBrowserLogin().then(success => {
  if (success) {
    console.log('\n🎉 Login test PASSED');
    process.exit(0);
  } else {
    console.log('\n💥 Login test FAILED');
    process.exit(1);
  }
});
