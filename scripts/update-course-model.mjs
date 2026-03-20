import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateCourseModel() {
  try {
    // Find all courses with gpt-5-thinking models
    const courses = await prisma.course.findMany({
      where: {
        model: {
          startsWith: 'gpt-5-thinking'
        }
      }
    })

    console.log(`Found ${courses.length} courses with gpt-5-thinking models`)

    for (const course of courses) {
      console.log(`\nUpdating course: ${course.name} (${course.id})`)
      console.log(`  Current model: ${course.model}`)

      // Update to gpt-4o (most capable currently available model)
      const updated = await prisma.course.update({
        where: { id: course.id },
        data: {
          model: 'gpt-4o',
          // Keep the reasoning level for future GPT-5 use
          reasoningLevel: course.reasoningLevel || 'medium'
        }
      })

      console.log(`  Updated to: ${updated.model}`)
    }

    console.log('\n✅ All courses updated successfully!')
  } catch (error) {
    console.error('Error updating courses:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

updateCourseModel()
