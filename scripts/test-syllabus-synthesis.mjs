/**
 * Test script for syllabus synthesis feature
 *
 * Tests:
 * 1. GET endpoint - fetch synthesis prompts
 * 2. POST endpoint - upload syllabus file and synthesize
 */

import fs from 'fs';
import FormData from 'form-data';

const API_BASE = 'http://localhost:5782';

// Test course ID (from database)
const TEST_COURSE_ID = 'cmhry294r000622w3rt0mvgqa'; // CS220 - Introduction to Data Science

async function testGetSynthesisPrompts() {
  console.log('\n=== Testing GET /api/admin/courses/[courseId]/synthesize-syllabus ===\n');

  try {
    const response = await fetch(`${API_BASE}/api/admin/courses/${TEST_COURSE_ID}/synthesize-syllabus`, {
      method: 'GET',
      headers: {
        'Cookie': 'next-auth.session-token=YOUR_SESSION_TOKEN_HERE'
      }
    });

    const result = await response.json();

    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ GET endpoint working!');
      console.log('Default prompt length:', result.data.defaultPrompt?.length || 0);
      console.log('Course prompt:', result.data.coursePrompt || 'Not set');
      return true;
    } else {
      console.log('\n❌ GET endpoint failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function testSyllabusSynthesis() {
  console.log('\n=== Testing POST /api/admin/courses/[courseId]/synthesize-syllabus ===\n');

  // Create a sample syllabus file
  const sampleSyllabus = `
CS 101: Introduction to Computer Science
Fall 2024

Course Description:
This course provides a comprehensive introduction to computer science fundamentals,
including programming, data structures, and algorithmic thinking.

Learning Objectives:
1. Understand basic programming concepts and syntax
2. Develop problem-solving skills using computational thinking
3. Learn fundamental data structures (arrays, lists, trees)
4. Analyze algorithm efficiency and complexity
5. Work collaboratively on coding projects

Assessment Methods:
- Weekly programming assignments (40%)
- Midterm exam (25%)
- Final project (25%)
- Class participation (10%)

Required Materials:
- Textbook: "Introduction to Algorithms" by CLRS
- IDE: Visual Studio Code or PyCharm
- Python 3.10 or higher

Course Policies:
- Late submissions: 10% penalty per day
- Academic integrity: Zero tolerance for plagiarism
- Attendance: Required for labs, optional for lectures
- Office hours: Tuesdays 2-4 PM, Thursdays 10-12 PM

Weekly Schedule:
Week 1-2: Python basics and control flow
Week 3-4: Functions and modules
Week 5-6: Data structures (lists, dictionaries, sets)
Week 7-8: Object-oriented programming
Week 9-10: Algorithm analysis
Week 11-12: Sorting and searching
Week 13-14: Final project work
Week 15: Presentations and review
`;

  // Write to temporary file
  const tempFilePath = '/tmp/test-syllabus.txt';
  fs.writeFileSync(tempFilePath, sampleSyllabus);

  console.log('Created test syllabus file:', tempFilePath);
  console.log('File size:', sampleSyllabus.length, 'bytes\n');

  try {
    // Create FormData with file
    const form = new FormData();
    form.append('file', fs.createReadStream(tempFilePath), {
      filename: 'test-syllabus.txt',
      contentType: 'text/plain'
    });

    // Optional: Add custom prompt
    // form.append('customPrompt', 'Extract only the course policies and grading information.');

    const response = await fetch(`${API_BASE}/api/admin/courses/${TEST_COURSE_ID}/synthesize-syllabus`, {
      method: 'POST',
      headers: {
        'Cookie': 'next-auth.session-token=YOUR_SESSION_TOKEN_HERE',
        ...form.getHeaders()
      },
      body: form
    });

    const result = await response.json();

    console.log('Status:', response.status);

    if (result.success) {
      console.log('\n✅ POST endpoint working!\n');
      console.log('=== Synthesized Content ===\n');
      console.log(result.data.synthesizedContent);
      console.log('\n=== Additional Info ===');
      console.log('Prompt used:', result.data.promptUsed);
      console.log('Tokens used:', result.data.tokensUsed);
      console.log('Extracted text length:', result.data.extractedText.length);

      // Clean up
      fs.unlinkSync(tempFilePath);
      console.log('\n✅ Test file cleaned up');

      return true;
    } else {
      console.log('\n❌ POST endpoint failed');
      console.log('Error:', result.error);

      // Clean up
      fs.unlinkSync(tempFilePath);

      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);

    // Clean up
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    return false;
  }
}

async function runTests() {
  console.log('🧪 Syllabus Synthesis Feature Test');
  console.log('====================================');

  console.log('\nNote: This test requires a valid session token.');
  console.log('Please log in as an instructor first, then update the session token in this script.\n');

  // Test GET endpoint
  const getSuccess = await testGetSynthesisPrompts();

  // Test POST endpoint
  const postSuccess = await testSyllabusSynthesis();

  console.log('\n====================================');
  console.log('Test Summary:');
  console.log(`GET endpoint: ${getSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`POST endpoint: ${postSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log('====================================\n');
}

runTests();
