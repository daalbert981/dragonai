import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating mock courses...\n');

  // Get instructor and students
  const instructor = await prisma.user.findUnique({
    where: { email: 'instructor@drexel.edu' }
  });

  const student1 = await prisma.user.findUnique({
    where: { email: 'student1@drexel.edu' }
  });

  const student2 = await prisma.user.findUnique({
    where: { email: 'student2@drexel.edu' }
  });

  if (!instructor || !student1 || !student2) {
    throw new Error('Required users not found. Run seed script first.');
  }

  // Course 1: Business Strategy
  const course1 = await prisma.course.create({
    data: {
      name: 'Business Strategy & Competitive Analysis',
      code: 'MGMT450',
      description: 'An advanced course exploring strategic management frameworks, competitive analysis, and business model innovation.',
      syllabus: `# Course Overview
This course provides a comprehensive exploration of strategic management and competitive analysis in modern business environments.

## Learning Objectives
- Understand core strategic frameworks (Porter's Five Forces, SWOT, Blue Ocean Strategy)
- Analyze competitive landscapes and market positioning
- Develop and evaluate business models
- Apply strategic thinking to real-world case studies

## Topics Covered
1. Introduction to Strategic Management
2. Industry Analysis & Competitive Forces
3. Internal Analysis: Resources & Capabilities
4. Business Model Innovation
5. Competitive Advantage & Differentiation
6. Strategic Implementation & Change Management

## Grading
- Case Study Analyses: 40%
- Midterm Exam: 25%
- Final Project: 30%
- Participation: 5%`,
      systemPrompt: `You are an expert business strategy professor with deep knowledge of competitive analysis, strategic frameworks, and business model innovation.

Your teaching approach:
- Help students understand complex strategic concepts through real-world examples
- Guide them to think critically about competitive dynamics
- Encourage application of frameworks like Porter's Five Forces, SWOT, and Blue Ocean Strategy
- Reference case studies from successful and failed companies
- Ask probing questions that develop strategic thinking skills

When students ask questions:
- Break down complex concepts into digestible parts
- Use current business examples (Amazon, Apple, Tesla, Netflix, etc.)
- Connect theory to practice
- Encourage students to analyze "why" behind strategic decisions
- Help them see multiple perspectives in strategic situations

You should be supportive but intellectually rigorous, pushing students to think deeply about strategic challenges.`,
      model: 'gpt-5',
      temperature: 0.7,
      timezone: 'America/New_York',
      reasoningLevel: 'medium',
      messageHistoryLimit: 20,
      sessionRetentionPolicy: 'custom',
      sessionRetentionDays: 90,
      sessionRetentionHours: 0,
      isActive: true,
      instructors: {
        create: {
          userId: instructor.id
        }
      },
      enrollments: {
        create: [
          { userId: student1.id },
          { userId: student2.id }
        ]
      }
    }
  });

  console.log('✓ Created course:', course1.name, `(${course1.code})`);
  console.log(`  - Model: ${course1.model}`);
  console.log(`  - Timezone: ${course1.timezone}`);
  console.log(`  - Enrolled: 2 students\n`);

  // Course 2: Data Science
  const course2 = await prisma.course.create({
    data: {
      name: 'Introduction to Data Science',
      code: 'CS220',
      description: 'A foundational course covering data analysis, machine learning basics, and practical applications of data science.',
      syllabus: `# Course Overview
This course introduces students to the field of data science, covering essential concepts, tools, and techniques for analyzing and extracting insights from data.

## Learning Objectives
- Understand the data science workflow and methodologies
- Perform exploratory data analysis and visualization
- Apply basic machine learning algorithms
- Work with Python data science libraries (pandas, numpy, scikit-learn)
- Communicate data insights effectively

## Topics Covered
1. Introduction to Data Science & Python Setup
2. Data Cleaning & Preprocessing
3. Exploratory Data Analysis (EDA)
4. Data Visualization with matplotlib & seaborn
5. Statistical Analysis & Hypothesis Testing
6. Introduction to Machine Learning
7. Supervised Learning: Regression & Classification
8. Unsupervised Learning: Clustering
9. Model Evaluation & Validation
10. Communicating Data Insights

## Grading
- Weekly Assignments: 30%
- Midterm Project: 25%
- Final Project: 35%
- Participation & Quizzes: 10%`,
      systemPrompt: `You are an enthusiastic data science instructor who makes complex technical concepts accessible and engaging.

Your teaching approach:
- Explain data science concepts clearly with practical examples
- Help students understand both the "how" and "why" of data analysis techniques
- Encourage hands-on learning and experimentation
- Reference real-world applications of data science
- Guide students through debugging and problem-solving

When helping students:
- Start with the fundamentals before moving to advanced topics
- Use analogies to explain abstract concepts
- Provide code examples when relevant (Python, pandas, scikit-learn)
- Help troubleshoot common errors with patience
- Encourage good practices (clean code, documentation, reproducibility)
- Link concepts to real-world data science problems

Technical areas you cover:
- Python programming for data science
- Data cleaning and preprocessing
- Exploratory data analysis
- Statistical analysis
- Machine learning basics (regression, classification, clustering)
- Data visualization
- Model evaluation

Be encouraging and supportive while maintaining technical accuracy. Help students develop both theoretical understanding and practical skills.`,
      model: 'gpt-4o',
      temperature: 0.5,
      timezone: 'America/Los_Angeles',
      reasoningLevel: null,
      messageHistoryLimit: 15,
      sessionRetentionPolicy: 'forever',
      sessionRetentionDays: null,
      sessionRetentionHours: null,
      isActive: true,
      instructors: {
        create: {
          userId: instructor.id
        }
      },
      enrollments: {
        create: [
          { userId: student1.id },
          { userId: student2.id }
        ]
      }
    }
  });

  console.log('✓ Created course:', course2.name, `(${course2.code})`);
  console.log(`  - Model: ${course2.model}`);
  console.log(`  - Timezone: ${course2.timezone}`);
  console.log(`  - Enrolled: 2 students\n`);

  console.log('✅ Successfully created 2 mock courses!');
  console.log('\nCourse Summary:');
  console.log('1. MGMT450 - Business Strategy & Competitive Analysis (GPT-5, ET timezone)');
  console.log('2. CS220 - Introduction to Data Science (GPT-4o, PT timezone)');
  console.log('\nBoth courses have:');
  console.log('- Instructor: instructor@drexel.edu');
  console.log('- Students: student1@drexel.edu, student2@drexel.edu');
}

main()
  .catch((e) => {
    console.error('Error creating mock courses:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
