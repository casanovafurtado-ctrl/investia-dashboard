import { Resend } from 'resend';

export async function POST(request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { email, type, aiContent, date } = await request.json();
    if (!email) return Response.json({ error: 'E-mail obrigatorio' }, { status: 400 });

    const subject = type === 'summary'
      ? `InvestIA - Resumo do Mercado - ${date}`
      : `InvestIA - Analise IA - ${date}`;

    const html = type === 'summary'
      ? `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:linear-gradient(135deg,#1E3A8A,#2563EB);border-radius:16px 16px 0 0;padding:32px 36px;">
  <div style="font-size:26px;font-weight:800;color:white;">InvestIA Dashboard</div>
  <div style="color:rgba(255,255,255,.75);font-size:13px;margin-top:6px;">Resumo Diario - ${date}</div>
</td></tr>
<tr><td style="background:white;padding:28px 36px;border-radius:0 0 16px 16px;">
  <p style="font-size:14px;color:#1E293B;line-height:1.8;">Acesse o dashboard para ver os indicadores em tempo real, analises completas e recomendacoes de investimento personalizadas para o seu perfil.</p>
  <div style="margin-top:20px;padding:16px;background:#F8FAFC;border-radius:10px;border-left:4px solid #2563EB;">
    <p style="font-size:13px;color:#64748B;">Use a aba Analise IA no dashboard para gerar relatorios detalhados com dados em tempo real do mercado financeiro brasileiro.</p>
  </div>
  <p style="font-size:11px;color:#94A3B8;margin-top:24px;">InvestIA - ${date} - Nao constitui recomendacao formal de investimento.</p>
</td></tr>
</table></td></tr></table></body></html>`
      : `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:linear-gradient(135deg,#1E3A8A,#2563EB);border-radius:16px 16px 0 0;padding:32px 36px;">
  <div style="font-size:26px;font-weight:800;color:white;">InvestIA - Analise IA</div>
  <div style="color:rgba(255,255,255,.75);font-size:13px;margin-top:6px;">Claude Sonnet + Web Search - ${date}</div>
</td></tr>
<tr><td style="background:white;padding:28px 36px;">
  <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
    <div style="font-size:13px;font-weight:700;color:#1E40AF;">Claude Sonnet + Busca na Web em Tempo Real</div>
    <div style="font-size:11px;color:#3B82F6;margin-top:2px;">Analise gerada com dados atuais do mercado financeiro</div>
  </div>
  <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-left:4px solid #2563EB;border-radius:10px;padding:24px;font-size:14px;line-height:1.85;color:#1E293B;white-space:pre-wrap;">${aiContent || 'Acesse o dashboard e gere uma analise IA antes de enviar.'}</div>
  <div style="margin-top:16px;padding:14px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;">
    <p style="font-size:12px;color:#92400E;">Aviso: Analise gerada por IA com fins informativos. Nao constitui recomendacao formal de investimento.</p>
  </div>
</td></tr>
<tr><td style="background:#1E293B;border-radius:0 0 16px 16px;padding:20px 36px;text-align:center;">
  <div style="color:#94A3B8;font-size:11px;">InvestIA Dashboard - Powered by Claude Sonnet - ${date}</div>
</td></tr>
</table></td></tr></table></body></html>`;

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
