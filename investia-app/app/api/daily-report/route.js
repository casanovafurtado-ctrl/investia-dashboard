import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const recipientEmail = process.env.DAILY_REPORT_EMAIL;
  if (!recipientEmail) {
    return Response.json({ error: 'DAILY_REPORT_EMAIL nao configurado' }, { status: 500 });
  }

  const today = new Date().toLocaleDateString('pt-BR');

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const aiResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: `Voce e um analista de mercado financeiro senior especialista no mercado brasileiro.

REGRAS OBRIGATORIAS:
- Responda DIRETO sem avisar que vai pesquisar ou que esta buscando dados
- NUNCA use simbolos Markdown: sem **, sem ##, sem --, sem *
- NUNCA use asteriscos, hashtags ou tracos como formatacao
- Use LETRAS MAIUSCULAS para destacar titulos e secoes importantes
- Separe secoes com uma linha em branco
- Use numeros para listas: 1) 2) 3)
- Seja direto, objetivo e pratico
- Escreva em portugues brasileiro correto`,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Gere um relatorio diario completo do mercado financeiro para investidor MODERADO com aportes de R$ 2.000 a R$ 10.000 por mes. Data de hoje: ${today}.

O relatorio deve conter:
1) MERCADO HOJE - principais movimentos do IBOVESPA, dolar e juros
2) TOP NOTICIAS - 3 noticias mais relevantes para investidores
3) MELHORES OPORTUNIDADES - top 3 ativos para comprar agora com tickers especificos
4) O QUE EVITAR - ativos ou setores a evitar esta semana
5) PERSPECTIVA - o que esperar para os proximos dias

Use dados reais e atuais do mercado.`,
      }],
    });

    const analysis = aiResponse.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: process.env.FROM_EMAIL || 'InvestIA <onboarding@resend.dev>',
      to: [recipientEmail],
      subject: `InvestIA - Relatorio Diario - ${today}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
        <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <tr><td style="background:linear-gradient(135deg,#1E3A8A,#2563EB);border-radius:16px 16px 0 0;padding:32px 36px;">
            <div style="font-size:26px;font-weight:800;color:white;">InvestIA Dashboard</div>
            <div style="color:rgba(255,255,255,.75);font-size:13px;margin-top:6px;">Relatorio Diario - ${today}</div>
          </td></tr>

          <tr><td style="background:white;padding:28px 36px 0;">
            <table cellpadding="0" cellspacing="0" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:14px 18px;width:100%;">
              <tr>
                <td style="font-size:20px;padding-right:10px;">🤖</td>
                <td>
                  <div style="font-size:13px;font-weight:700;color:#1E40AF;">Claude Sonnet + Busca na Web em Tempo Real</div>
                  <div style="font-size:11px;color:#3B82F6;margin-top:2px;">Relatorio gerado automaticamente com dados atuais do mercado</div>
                </td>
                <td align="right">
                  <span style="background:#D1FAE5;color:#065F46;font-size:10px;font-weight:700;padding:4px 10px;border-radius:6px;">AUTOMATICO</span>
                </td>
              </tr>
            </table>
          </td></tr>

          <tr><td style="background:white;padding:24px 36px 28px;">
            <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-left:4px solid #2563EB;border-radius:10px;padding:24px;font-size:14px;line-height:1.85;color:#1E293B;white-space:pre-wrap;">${analysis}</div>
          </td></tr>

          <tr><td style="background:#FFFBEB;border-top:1px solid #FDE68A;border-bottom:1px solid #FDE68A;padding:14px 36px;">
            <div style="font-size:12px;color:#92400E;">
              Aviso: Analise gerada por IA com fins informativos. Nao constitui recomendacao formal de investimento.
            </div>
          </td></tr>

          <tr><td style="background:#1E293B;border-radius:0 0 16px 16px;padding:20px 36px;text-align:center;">
            <div style="color:#94A3B8;font-size:11px;line-height:1.6;">
              InvestIA Dashboard - Envio automatico - ${today}<br/>
              Powered by Claude Sonnet (Anthropic)
            </div>
          </td></tr>

        </table>
        </td></tr></table>
        </body></html>
      `,
    });

    return Response.json({ success: true, date: today });
  } catch (error) {
    console.error('Daily report error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
