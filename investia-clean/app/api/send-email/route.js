import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';

export async function POST(request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { email, type, aiContent, date } = await request.json();
    if (!email) return Response.json({ error: 'E-mail obrigatorio' }, { status: 400 });

    let content = aiContent || '';

    // Se for resumo e nao tiver conteudo, gera com IA
    if (type === 'summary' && !content) {
      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const res = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 4000,
          system: `Voce e um analista de mercado financeiro senior. REGRAS: Responda DIRETO sem avisar que vai pesquisar. NUNCA use **, ##, --, *. Use LETRAS MAIUSCULAS para titulos. Separe secoes com linha em branco. Use 1) 2) 3) para listas. Portugues brasileiro correto.`,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{
            role: 'user',
            content: `Gere um resumo diario do mercado financeiro para investidor MODERADO (aportes R$ 2k-10k/mes). Data: ${date}. Inclua: 1) MERCADO HOJE - IBOVESPA, dolar e juros; 2) TOP 3 NOTICIAS relevantes; 3) MELHORES OPORTUNIDADES com tickers; 4) O QUE EVITAR; 5) PERSPECTIVA proximos dias. Use dados reais e atuais.`,
          }],
        });
        content = res.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      } catch(e) {
        content = 'Nao foi possivel gerar a analise automatica. Acesse o dashboard para ver os dados em tempo real.';
      }
    }

    const subject = type === 'summary'
      ? `InvestIA - Resumo do Mercado - ${date}`
      : `InvestIA - Analise IA - ${date}`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

<tr><td style="background:linear-gradient(135deg,#1E3A8A,#2563EB);border-radius:16px 16px 0 0;padding:32px 36px;">
  <div style="font-size:26px;font-weight:800;color:white;">InvestIA Dashboard</div>
  <div style="color:rgba(255,255,255,.75);font-size:13px;margin-top:6px;">${type === 'summary' ? 'Resumo Diario' : 'Analise IA'} - ${date}</div>
</td></tr>

<tr><td style="background:white;padding:24px 36px 0;">
  <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:14px 18px;">
    <div style="font-size:13px;font-weight:700;color:#1E40AF;">Claude Sonnet + Busca na Web em Tempo Real</div>
    <div style="font-size:11px;color:#3B82F6;margin-top:2px;">Analise gerada com dados atuais do mercado financeiro brasileiro</div>
  </div>
</td></tr>

<tr><td style="background:white;padding:20px 36px 28px;">
  <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-left:4px solid #2563EB;border-radius:10px;padding:24px;font-size:14px;line-height:1.85;color:#1E293B;white-space:pre-wrap;">${content}</div>
</td></tr>

<tr><td style="background:#FFFBEB;border-top:1px solid #FDE68A;padding:14px 36px;">
  <p style="font-size:12px;color:#92400E;margin:0;">Aviso: Analise gerada por IA com fins informativos. Nao constitui recomendacao formal de investimento.</p>
</td></tr>

<tr><td style="background:#1E293B;border-radius:0 0 16px 16px;padding:20px 36px;text-align:center;">
  <div style="color:#94A3B8;font-size:11px;">InvestIA Dashboard - Powered by Claude Sonnet - ${date}</div>
</td></tr>

</table>
</td></tr></table>
</body></html>`;

    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'InvestIA <onboarding@resend.dev>',
      to: [email],
      subject,
      html,
    });

    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ success: true, id: data?.id });
  } catch (error) {
    console.error('Send email error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
