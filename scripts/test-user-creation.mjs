const API_BASE = 'http://localhost:3000';

async function testUserCreation() {
  console.log('🧪 Testing User Creation API\n');

  // First, we need to authenticate as superadmin
  console.log('1. Authenticating as superadmin...');
  const loginResponse = await fetch(`${API_BASE}/api/auth/signin/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      username: 'admin',
      password: 'Admin123!',
    }),
  });

  if (!loginResponse.ok) {
    console.error('❌ Failed to authenticate');
    return;
  }

  // Extract session cookie
  const cookies = loginResponse.headers.get('set-cookie');
  console.log('✓ Authenticated successfully\n');

  // Test 1: Create a student user
  console.log('2. Creating a student user...');
  const studentData = {
    username: 'testStudent123',
    email: 'test.student@drexel.edu',
    password: 'TestPass123!',
    role: 'STUDENT',
  };

  const studentResponse = await fetch(`${API_BASE}/api/superadmin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies || '',
    },
    body: JSON.stringify(studentData),
  });

  const studentResult = await studentResponse.json();

  if (studentResponse.ok) {
    console.log('✓ Student created successfully:', {
      id: studentResult.id,
      username: studentResult.username,
      email: studentResult.email,
      role: studentResult.role,
    });
  } else {
    console.log('ℹ️ Student creation result:', studentResult.error);
  }

  // Test 2: Create an instructor user
  console.log('\n3. Creating an instructor user...');
  const instructorData = {
    username: 'testInstructor123',
    email: 'test.instructor@drexel.edu',
    password: 'TestPass123!',
    role: 'INSTRUCTOR',
  };

  const instructorResponse = await fetch(`${API_BASE}/api/superadmin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies || '',
    },
    body: JSON.stringify(instructorData),
  });

  const instructorResult = await instructorResponse.json();

  if (instructorResponse.ok) {
    console.log('✓ Instructor created successfully:', {
      id: instructorResult.id,
      username: instructorResult.username,
      email: instructorResult.email,
      role: instructorResult.role,
    });
  } else {
    console.log('ℹ️ Instructor creation result:', instructorResult.error);
  }

  // Test 3: Create a superadmin user
  console.log('\n4. Creating a superadmin user...');
  const superadminData = {
    username: 'testSuperadmin123',
    email: 'test.superadmin@drexel.edu',
    password: 'TestPass123!',
    role: 'SUPERADMIN',
  };

  const superadminResponse = await fetch(`${API_BASE}/api/superadmin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies || '',
    },
    body: JSON.stringify(superadminData),
  });

  const superadminResult = await superadminResponse.json();

  if (superadminResponse.ok) {
    console.log('✓ Superadmin created successfully:', {
      id: superadminResult.id,
      username: superadminResult.username,
      email: superadminResult.email,
      role: superadminResult.role,
    });
  } else {
    console.log('ℹ️ Superadmin creation result:', superadminResult.error);
  }

  // Test 4: Try to create duplicate user (should fail)
  console.log('\n5. Testing duplicate username validation...');
  const duplicateResponse = await fetch(`${API_BASE}/api/superadmin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies || '',
    },
    body: JSON.stringify(studentData),
  });

  const duplicateResult = await duplicateResponse.json();

  if (!duplicateResponse.ok && duplicateResult.error === 'Username already exists') {
    console.log('✓ Duplicate validation working correctly');
  } else {
    console.log('⚠️ Duplicate validation result:', duplicateResult);
  }

  console.log('\n✅ User creation tests completed!');
}

testUserCreation().catch(console.error);
