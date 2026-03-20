import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateToGPT4o() {
  try {
    // Update the CS101 course to gpt-4o
    const updated = await prisma.course.update({
      where: { id: 'cmhpnjjlp00008s721p22unyb' },
      data: {
        model: 'gpt-4o'
        // Keep reasoningLevel for future GPT-5 use
      }
    })

    console.log('✅ Course updated successfully!')
    console.log(`   ${updated.name} (${updated.code})`)
    console.log(`   Model: ${updated.model}`)
    console.log(`   Reasoning Level: ${updated.reasoningLevel} (saved for future GPT-5 use)`)
    console.log('')
    console.log('The chat should now work with gpt-4o. When the TypeScript SDK')
    console.log('supports GPT-5, you can switch back via the settings page.')
  } catch (error) {
    console.error('Error updating course:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

updateToGPT4o()
