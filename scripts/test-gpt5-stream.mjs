import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

async function testGPT5Streaming() {
  console.log('Testing GPT-5 Responses API with STREAMING...\n')

  try {
    // Test 1: GPT-5 streaming WITHOUT reasoning parameter
    console.log('Test 1: GPT-5 streaming WITHOUT reasoning parameter')
    const stream1 = await openai.responses.create({
      model: 'gpt-5',
      input: 'Say hello in one word',
      instructions: 'You are a helpful assistant',
      stream: true,
      max_output_tokens: 100
    })

    let output1 = ''
    for await (const chunk of stream1) {
      if (chunk.output_text) {
        output1 += chunk.output_text
      }
    }
    console.log('✅ Success!')
    console.log('Output:', output1)
    console.log()

    // Test 2: GPT-5 streaming WITH reasoning parameter
    console.log('Test 2: GPT-5 streaming WITH reasoning parameter')
    const stream2 = await openai.responses.create({
      model: 'gpt-5',
      input: 'Say hello in one word',
      instructions: 'You are a helpful assistant',
      reasoning: { effort: 'medium' },
      stream: true,
      max_output_tokens: 100
    })

    let output2 = ''
    for await (const chunk of stream2) {
      if (chunk.output_text) {
        output2 += chunk.output_text
      }
    }
    console.log('✅ Success!')
    console.log('Output:', output2)
    console.log()

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Status:', error.status)
    console.error('Type:', error.type)
    console.error('Code:', error.code)
  }
}

testGPT5Streaming()
