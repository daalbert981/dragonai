#!/bin/bash

echo "🧪 Testing NextAuth API..."
echo ""

# Test 1: Check if NextAuth signin endpoint exists
echo "1️⃣ Testing NextAuth signin endpoint..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/signin/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student1@drexel.edu",
    "password": "Student123!",
    "redirect": false
  }')

echo "Response: $RESPONSE"
echo ""

# Test 2: Try callback credentials
echo "2️⃣ Testing callback credentials..."
RESPONSE2=$(curl -s -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=student1@drexel.edu&password=Student123!&redirect=false&json=true" \
  -c /tmp/cookies.txt \
  -v 2>&1 | grep -E "(HTTP|Set-Cookie|Location)")

echo "$RESPONSE2"
echo ""

# Test 3: Check session
echo "3️⃣ Testing session endpoint..."
SESSION=$(curl -s http://localhost:3000/api/auth/session \
  -b /tmp/cookies.txt)

echo "Session: $SESSION"
echo ""

echo "✅ API Test Complete"
