import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function listCourses() {
  try {
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        model: true,
        temperature: true,
        reasoningLevel: true,
        isActive: true
      }
    })

    console.log(`\nFound ${courses.length} courses:\n`)

    courses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.name} (${course.code})`)
      console.log(`   ID: ${course.id}`)
      console.log(`   Model: ${course.model}`)
      console.log(`   Temperature: ${course.temperature}`)
      console.log(`   Reasoning Level: ${course.reasoningLevel}`)
      console.log(`   Active: ${course.isActive}`)
      console.log('')
    })
  } catch (error) {
    console.error('Error listing courses:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

listCourses()
