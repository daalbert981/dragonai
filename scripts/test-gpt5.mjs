import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

async function testGPT5() {
  console.log('Testing GPT-5 Responses API...\n')

  try {
    // Test 1: Basic GPT-5 request without reasoning
    console.log('Test 1: GPT-5 without reasoning parameter')
    const response1 = await openai.responses.create({
      model: 'gpt-5',
      input: 'Say hello in one word',
      instructions: 'You are a helpful assistant',
      stream: false,
      max_output_tokens: 100
    })
    console.log('✅ Success!')
    console.log('Output:', response1.output_text)
    console.log()

    // Test 2: GPT-5 with reasoning parameter
    console.log('Test 2: GPT-5 WITH reasoning parameter')
    const response2 = await openai.responses.create({
      model: 'gpt-5',
      input: 'Say hello in one word',
      instructions: 'You are a helpful assistant',
      reasoning: { effort: 'medium' },
      stream: false,
      max_output_tokens: 100
    })
    console.log('✅ Success!')
    console.log('Output:', response2.output_text)
    console.log()

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Status:', error.status)
    console.error('Type:', error.type)
    console.error('Code:', error.code)
  }
}

testGPT5()
