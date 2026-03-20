import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

async function testGPT4oStreaming() {
  console.log('Testing GPT-4o streaming (to verify streaming works)...\n')

  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Say hello in one word' }
      ],
      stream: true,
      max_tokens: 100
    })

    console.log('✅ Stream created successfully!')
    let output = ''
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      if (content) {
        process.stdout.write(content)
        output += content
      }
    }

    console.log('\n\n✅ GPT-4o streaming works perfectly!')

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testGPT4oStreaming()
