import Anthropic from '@anthropic-ai/sdk';

export async function POST(request) {
  try {
    const { prompt } = await request.json();
    if (!prompt) {
      return Response.json({ error: 'Prompt obrigatorio' }, { status: 400 });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const systemPrompt = `Voce e um analista de mercado financeiro senior especialista no mercado brasileiro.

REGRAS OBRIGATORIAS:
- Responda DIRETO, sem avisar que vai pesquisar ou que esta buscando dados
- NUNCA use simbolos Markdown: sem **, sem ##, sem --, sem *
- NUNCA use asteriscos, hashtags ou tracos como formatacao
- Use LETRAS MAIUSCULAS para destacar titulos e secoes importantes
- Separe secoes com uma linha em branco
- Use numeros e letras para listas: 1) 2) 3) ou a) b) c)
- Seja direto, objetivo e pratico
- Escreva em portugues brasileiro correto`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
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
