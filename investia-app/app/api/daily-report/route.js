import { Resend } from 'resend';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const recipientEmail = process.env.DAILY_REPORT_EMAIL;
  if (!recipientEmail) return Response.json({ error: 'DAILY_REPORT_EMAIL não configurado' }, { status: 500 });

  const today = new Date().toLocaleDateString('pt-BR');

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const aiResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Você é um analista de mercado financeiro sênior. Data: ${today}.
        
Gere um relatório diário completo para investidor MODERADO (aportes R$ 2k–10k/mês):

1. MERCADO HOJE: principais movimentos do IBOVESPA, dólar e juros
2. TOP NOTÍCIAS: 3 notícias mais relevantes para investidores
3. MELHORES OPORTUNIDADES: top 3 ativos para comprar agora (tickers + motivo)
4. O QUE EVITAR: ativos ou setores a evitar esta semana
5. PERSPECTIVA: o que esperar para os próximos dias

Use dados reais e atuais. Seja direto e prático.`,
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
      subject: `📊 InvestIA — Relatório Diário · ${today}`,
      html: buildDailyEmail(today, analysis),
    });

    console.log(`Daily report sent to ${recipientEmail} on ${today}`);
    return Response.json({ success: true, date: today });
  } catch (error) {
    console.error('Daily report error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function buildDailyEmail(date, analysis) {
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <tr><td style="background:linear-gradient(135deg,#1E3A8A 0%,#2563EB 60%,#3B82F6 100%);border-radius:16px 16px 0 0;padding:36px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <div style="font-size:28px;font-weight:800;color:white;letter-spacing:-1px;">◆ InvestIA</div>
          <div style="color:rgba(255,255,255,.75);font-size:13px;margin-top:6px;">Relatório Automático Diário</div>
        </td>
        <td align="right">
          <div style="background:rgba(255,255,255,.15);border-radius:10px;padding:10px 16px;text-align:right;">
            <div style="color:rgba(255,255,255,.7);font-size:10px;text-transform:uppercase;letter-spacing:.08em;">Data</div>
            <div style="color:white;font-weight:700;font-size:14px;margin-top:2px;">${date}</div>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="background:white;padding:24px 40px 0;">
    <table cellpadding="0" cellspacing="0" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:14px 18px;width:100%;">
      <tr>
        <td style="font-size:20px;padding-right:10px;vertical-align:middle;">🤖</td>
        <td style="vertical-align:middle;">
          <div style="font-size:13px;font-weight:700;color:#1E40AF;">Claude AI + Busca na Web</div>
          <div style="font-size:11px;color:#3B82F6;margin-top:2px;">Relatório gerado automaticamente com dados do mercado de hoje</div>
        </td>
        <td align="right">
          <span style="background:#D1FAE5;color:#065F46;font-size:10px;font-weight:700;padding:4px 10px;border-radius:6px;">● AUTOMÁTICO</span>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="background:white;padding:20px 40px 28px;">
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-left:4px solid #2563EB;border-radius:10px;padding:24px;font-size:14px;line-height:1.85;color:#1E293B;white-space:pre-wrap;">${analysis}</div>
  </td></tr>

  <tr><td style="background:#FFFBEB;border-top:1px solid #FDE68A;border-bottom:1px solid #FDE68A;padding:14px 40px;">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="font-size:20px;padding-right:10px;vertical-align:middle;">⚠️</td>
      <td style="font-size:12px;color:#92400E;line-height:1.5;"><strong>Aviso:</strong> Análise gerada por IA com fins informativos. Não constitui recomendação formal de investimento.</td>
    </tr></table>
  </td></tr>

  <tr><td style="background:linear-gradient(135deg,#EFF6FF,#F0FDF4);padding:24px 40px;text-align:center;">
    <div style="font-size:13px;color:#475569;margin-bottom:14px;">Acesse o dashboard para mais análises e exportações em PDF</div>
    <a href="#" style="background:#2563EB;color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:13px;font-weight:700;display:inline-block;">Abrir InvestIA Dashboard →</a>
  </td></tr>

  <tr><td style="background:#1E293B;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
    <div style="color:#94A3B8;font-size:11px;line-height:1.6;">
      <strong style="color:#CBD5E1;">InvestIA Dashboard</strong> · Envio automático · ${date}<br/>
      Powered by Claude AI (Anthropic) · Não constitui recomendação formal de investimento.
    </div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}
