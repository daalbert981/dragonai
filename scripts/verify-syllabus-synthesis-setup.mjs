/**
 * Verification script for syllabus synthesis feature setup
 *
 * Checks:
 * 1. Database schema has syllabusSynthesisPrompt field
 * 2. API endpoints exist
 * 3. Form component has been updated
 * 4. File parser utility exists
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

console.log('🔍 Verifying Syllabus Synthesis Feature Setup\n');
console.log('='.repeat(60));

let allChecksPassed = true;

// Check 1: Database schema
console.log('\n1. Checking database schema...');
try {
  const course = await prisma.course.findFirst({
    select: {
      id: true,
      name: true,
      syllabusSynthesisPrompt: true
    }
  });

  if (course) {
    console.log('   ✅ Database schema includes syllabusSynthesisPrompt field');
    console.log(`   📝 Test course: ${course.name}`);
    console.log(`   📝 Current synthesis prompt: ${course.syllabusSynthesisPrompt ? 'Set' : 'Not set (will use default)'}`);
  } else {
    console.log('   ⚠️  No courses found in database');
  }
} catch (error) {
  console.log('   ❌ Database schema check failed:', error.message);
  allChecksPassed = false;
}

// Check 2: API endpoint file exists
console.log('\n2. Checking API endpoint files...');
const synthesisEndpoint = '/Users/da692/Dropbox/Py/dragonai/app/api/admin/courses/[courseId]/synthesize-syllabus/route.ts';
const settingsEndpoint = '/Users/da692/Dropbox/Py/dragonai/app/api/admin/courses/[courseId]/settings/route.ts';

if (fs.existsSync(synthesisEndpoint)) {
  console.log('   ✅ Synthesis endpoint exists');
  const content = fs.readFileSync(synthesisEndpoint, 'utf8');

  // Check for key components
  const hasPost = content.includes('export async function POST');
  const hasGet = content.includes('export async function GET');
  const hasOpenAI = content.includes('openai.chat.completions.create');
  const hasFileExtract = content.includes('extractTextFromFile');
  const hasDefaultPrompt = content.includes('DEFAULT_SYNTHESIS_PROMPT');

  console.log(`      - POST endpoint: ${hasPost ? '✅' : '❌'}`);
  console.log(`      - GET endpoint: ${hasGet ? '✅' : '❌'}`);
  console.log(`      - OpenAI integration: ${hasOpenAI ? '✅' : '❌'}`);
  console.log(`      - File text extraction: ${hasFileExtract ? '✅' : '❌'}`);
  console.log(`      - Default prompt: ${hasDefaultPrompt ? '✅' : '❌'}`);

  if (!hasPost || !hasGet || !hasOpenAI || !hasFileExtract || !hasDefaultPrompt) {
    allChecksPassed = false;
  }
} else {
  console.log('   ❌ Synthesis endpoint does not exist');
  allChecksPassed = false;
}

if (fs.existsSync(settingsEndpoint)) {
  console.log('   ✅ Settings endpoint exists');
  const content = fs.readFileSync(settingsEndpoint, 'utf8');

  // Check if it updates syllabusSynthesisPrompt
  const updatesSynthesisPrompt = content.includes('syllabusSynthesisPrompt');
  console.log(`      - Updates synthesis prompt: ${updatesSynthesisPrompt ? '✅' : '❌'}`);

  if (!updatesSynthesisPrompt) {
    allChecksPassed = false;
  }
} else {
  console.log('   ❌ Settings endpoint does not exist');
  allChecksPassed = false;
}

// Check 3: Form component
console.log('\n3. Checking form component...');
const formComponent = '/Users/da692/Dropbox/Py/dragonai/components/admin/CourseSettingsForm.tsx';

if (fs.existsSync(formComponent)) {
  console.log('   ✅ CourseSettingsForm component exists');
  const content = fs.readFileSync(formComponent, 'utf8');

  // Check for key features
  const hasFileInput = content.includes('type="file"');
  const hasFileSelect = content.includes('handleFileSelect');
  const hasSynthesizeFunction = content.includes('handleSynthesizeSyllabus');
  const hasSynthesisPromptState = content.includes('syllabusSynthesisPrompt');
  const hasCollapsible = content.includes('showSynthesisPrompt');
  const hasUploadIcon = content.includes('Upload');
  const hasSparklesIcon = content.includes('Sparkles');

  console.log(`      - File input: ${hasFileInput ? '✅' : '❌'}`);
  console.log(`      - File select handler: ${hasFileSelect ? '✅' : '❌'}`);
  console.log(`      - Synthesize handler: ${hasSynthesizeFunction ? '✅' : '❌'}`);
  console.log(`      - Synthesis prompt state: ${hasSynthesisPromptState ? '✅' : '❌'}`);
  console.log(`      - Collapsible prompt editor: ${hasCollapsible ? '✅' : '❌'}`);
  console.log(`      - Upload icon: ${hasUploadIcon ? '✅' : '❌'}`);
  console.log(`      - Sparkles icon: ${hasSparklesIcon ? '✅' : '❌'}`);

  if (!hasFileInput || !hasFileSelect || !hasSynthesizeFunction ||
      !hasSynthesisPromptState || !hasCollapsible) {
    allChecksPassed = false;
  }
} else {
  console.log('   ❌ CourseSettingsForm component does not exist');
  allChecksPassed = false;
}

// Check 4: File parser utility
console.log('\n4. Checking file parser utility...');
const fileParser = '/Users/da692/Dropbox/Py/dragonai/lib/file-parser.ts';

if (fs.existsSync(fileParser)) {
  console.log('   ✅ File parser utility exists');
  const content = fs.readFileSync(fileParser, 'utf8');

  const hasExtractFunction = content.includes('extractTextFromFile');
  const supportsPDF = content.includes('pdf') || content.includes('PDF');
  const supportsDOCX = content.includes('docx') || content.includes('DOCX');

  console.log(`      - Extract function: ${hasExtractFunction ? '✅' : '❌'}`);
  console.log(`      - PDF support: ${supportsPDF ? '✅' : '❌'}`);
  console.log(`      - DOCX support: ${supportsDOCX ? '✅' : '❌'}`);

  if (!hasExtractFunction) {
    allChecksPassed = false;
  }
} else {
  console.log('   ❌ File parser utility does not exist');
  allChecksPassed = false;
}

// Check 5: OpenAI API key
console.log('\n5. Checking environment variables...');
if (process.env.OPENAI_API_KEY) {
  console.log('   ✅ OPENAI_API_KEY is set');
} else {
  console.log('   ❌ OPENAI_API_KEY is not set');
  allChecksPassed = false;
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Verification Summary\n');

if (allChecksPassed) {
  console.log('✅ ALL CHECKS PASSED');
  console.log('\nThe syllabus synthesis feature is properly set up and ready to use!\n');
  console.log('Next steps:');
  console.log('1. Log in as an instructor at http://localhost:5782');
  console.log('2. Navigate to a course settings page');
  console.log('3. Try uploading a syllabus file (PDF, DOCX, or TXT)');
  console.log('4. Click "Synthesize with AI" and verify the results');
} else {
  console.log('❌ SOME CHECKS FAILED');
  console.log('\nPlease review the failed checks above and fix any issues.');
}

console.log('\n' + '='.repeat(60) + '\n');

await prisma.$disconnect();
