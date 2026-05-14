import Anthropic from '@anthropic-ai/sdk';

export async function POST(request) {
  try {
    const { prompt } = await request.json();
    if (!prompt) return Response.json({ error: 'Prompt obrigatório' }, { status: 400 });

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    });

    const result = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    return Response.json({ result });
  } catch (error) {
    console.error('Analyze error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
