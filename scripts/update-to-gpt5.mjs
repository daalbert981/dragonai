import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateToGPT5() {
  try {
    // Update the CS101 course to gpt-5
    const updated = await prisma.course.update({
      where: { id: 'cmhpnjjlp00008s721p22unyb' },
      data: {
        model: 'gpt-5',
        reasoningLevel: 'medium'
      }
    })

    console.log('✅ Course updated successfully to GPT-5!')
    console.log(`   ${updated.name} (${updated.code})`)
    console.log(`   Model: ${updated.model}`)
    console.log(`   Reasoning Level: ${updated.reasoningLevel}`)
    console.log('')
    console.log('The chat should now work with GPT-5 using the Responses API.')
  } catch (error) {
    console.error('Error updating course:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

updateToGPT5()
