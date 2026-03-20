import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

async function testGPT5StreamingNoReasoning() {
  console.log('Testing GPT-5 streaming WITHOUT reasoning parameter...\n')

  try {
    const stream = await openai.responses.create({
      model: 'gpt-5',
      input: 'Say hello in one word',
      instructions: 'You are a helpful assistant',
      stream: true,
      max_output_tokens: 100
    })

    console.log('✅ Stream created successfully!')
    console.log('Collecting response...\n')

    let output = ''
    for await (const chunk of stream) {
      if (chunk.output_text) {
        process.stdout.write(chunk.output_text)
        output += chunk.output_text
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

testGPT5StreamingNoReasoning()
