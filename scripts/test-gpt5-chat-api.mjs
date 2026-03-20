import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

async function testGPT5ChatAPI() {
  console.log('Testing GPT-5 with CHAT COMPLETIONS API (instead of Responses API)...\n')

  try {
    // Test: Use chat.completions.create() instead of responses.create()
    console.log('Test: GPT-5 with Chat Completions API (streaming)')
    const stream = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Say hello in one word' }
      ],
      stream: true,
      max_completion_tokens: 100
    })

    console.log('✅ Stream created successfully!')
    console.log('Collecting response...\n')

    let output = ''
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      if (content) {
        process.stdout.write(content)
        output += content
      }
    }

    console.log('\n\n✅ Complete!')
    console.log('Full output:', output)

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Status:', error.status)
    console.error('Type:', error.type)
    console.error('Code:', error.code)
  }
}

testGPT5ChatAPI()
