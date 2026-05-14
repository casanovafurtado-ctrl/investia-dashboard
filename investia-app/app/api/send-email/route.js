import { Resend } from 'resend';

export async function POST(request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { email, type, aiContent, date } = await request.json();
    if (!email) return Response.json({ error: 'E-mail obrigatório' }, { status: 400 });
    if (!process.env.RESEND_API_KEY) return Response.json({ error: 'RESEND_API_KEY não configurada' }, { status: 500 });

    const subject = type === 'summary'
      ? `📊 InvestIA — Resumo do Mercado · ${date}`
      : `🤖 InvestIA — Análise IA · ${date}`;

    const html = type === 'summary' ? buildSummaryEmail(date) : buildAiEmail(date, aiContent);

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

function buildSummaryEmail(date) {
  const metrics = [
    ['IBOVESPA', '~135.000 pts', '#2563EB'],
    ['USD / BRL', '~R$ 5,70',    '#7C3AED'],
    ['SELIC meta','10,50% a.a.', '#059669'],
    ['S&P 500',   '~5.600 pts',  '#D97706'],
  ];
  const alloc = [
    ['Ações BR',      '35%', 'R$ 1.750', '#2563EB'],
    ['Renda Fixa',    '30%', 'R$ 1.500', '#059669'],
    ['FIIs',          '25%', 'R$ 1.250', '#D97706'],
    ['Internacional', '10%', 'R$   500', '#7C3AED'],
  ];
  const recs = [
    ['PETR4 — Petrobras PN', 'COMPRAR', '#D1FAE5', '#065F46', 'Dividendos ~13% DY, valuation descontado vs. pares globais.'],
    ['MXRF11 — Maxi Renda',  'COMPRAR', '#D1FAE5', '#065F46', 'FII de papel/CRI com ~13%/ano de DY e proventos mensais.'],
    ['Tesouro IPCA+ 2029',   'COMPRAR', '#D1FAE5', '#065F46', 'Taxa real ~5,8% + IPCA. Proteção contra inflação.'],
    ['IVVB11 — ETF S&P 500', 'COMPRAR', '#D1FAE5', '#065F46', 'Diversificação internacional via B3, sem conta no exterior.'],
    ['MGLU3 — Mag. Luiza',   'EVITAR',  '#FEE2E2', '#991B1B', 'Alta volatilidade, dívida elevada. Aguardar recuperação.'],
  ];

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>InvestIA — Resumo Diário</title></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#1E3A8A 0%,#2563EB 60%,#3B82F6 100%);border-radius:16px 16px 0 0;padding:36px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <div style="font-size:28px;font-weight:800;color:white;letter-spacing:-1px;line-height:1;">◆ InvestIA</div>
          <div style="color:rgba(255,255,255,.75);font-size:13px;margin-top:6px;font-weight:400;">Dashboard de Mercado Financeiro com IA</div>
        </td>
        <td align="right" style="vertical-align:top;">
          <div style="background:rgba(255,255,255,.15);border-radius:10px;padding:10px 16px;text-align:right;">
            <div style="color:rgba(255,255,255,.7);font-size:10px;text-transform:uppercase;letter-spacing:.08em;">Relatório</div>
            <div style="color:white;font-weight:700;font-size:14px;margin-top:2px;">${date}</div>
          </div>
        </td>
      </tr>
      <tr><td colspan="2" style="padding-top:20px;">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:rgba(255,255,255,.18);border-radius:8px;padding:8px 14px;margin-right:8px;">
              <div style="color:rgba(255,255,255,.7);font-size:10px;text-transform:uppercase;letter-spacing:.06em;">Perfil</div>
              <div style="color:white;font-weight:700;font-size:13px;margin-top:1px;">Moderado</div>
            </td>
            <td style="width:8px;"></td>
            <td style="background:rgba(255,255,255,.18);border-radius:8px;padding:8px 14px;">
              <div style="color:rgba(255,255,255,.7);font-size:10px;text-transform:uppercase;letter-spacing:.06em;">Aporte Mensal</div>
              <div style="color:white;font-weight:700;font-size:13px;margin-top:1px;">R$ 5.000</div>
            </td>
            <td style="width:8px;"></td>
            <td style="background:rgba(16,185,129,.3);border-radius:8px;padding:8px 14px;">
              <div style="color:rgba(255,255,255,.7);font-size:10px;text-transform:uppercase;letter-spacing:.06em;">Status</div>
              <div style="color:#6EE7B7;font-weight:700;font-size:13px;margin-top:1px;">● Mercado Ativo</div>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- METRICS -->
  <tr><td style="background:white;padding:28px 40px 20px;">
    <div style="font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:.08em;font-weight:700;margin-bottom:14px;">Indicadores do dia</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        ${metrics.map(([l,v,c])=>`
        <td width="25%" style="padding-right:8px;">
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-top:3px solid ${c};border-radius:10px;padding:12px 14px;">
            <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">${l}</div>
            <div style="font-size:16px;font-weight:800;color:#0F172A;">${v}</div>
          </div>
        </td>`).join('')}
      </tr>
    </table>
  </td></tr>

  <!-- ALLOCATION -->
  <tr><td style="background:white;padding:20px 40px;">
    <div style="font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:.08em;font-weight:700;margin-bottom:14px;">Alocação sugerida — perfil moderado</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        ${alloc.map(([n,p,v,c])=>`
        <td width="25%" style="padding-right:8px;">
          <div style="background:#F8FAFC;border-radius:10px;padding:12px 14px;border-left:4px solid ${c};">
            <div style="font-size:10px;color:#64748B;margin-bottom:4px;">${n}</div>
            <div style="font-size:20px;font-weight:800;color:${c};">${p}</div>
            <div style="font-size:12px;color:#0F172A;font-weight:600;margin-top:2px;">${v}</div>
          </div>
        </td>`).join('')}
      </tr>
    </table>
  </td></tr>

  <!-- DIVIDER -->
  <tr><td style="background:white;padding:0 40px;"><div style="height:1px;background:#F1F5F9;"></div></td></tr>

  <!-- RECOMMENDATIONS -->
  <tr><td style="background:white;padding:20px 40px 28px;">
    <div style="font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:.08em;font-weight:700;margin-bottom:14px;">Destaques de recomendação</div>
    ${recs.map(([t,r,bg,tc,d])=>`
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr>
        <td style="background:#FAFAFA;border:1px solid #E2E8F0;border-radius:10px;padding:12px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <div style="font-size:14px;font-weight:700;color:#0F172A;">${t}</div>
                <div style="font-size:12px;color:#64748B;margin-top:3px;">${d}</div>
              </td>
              <td align="right" style="vertical-align:middle;padding-left:12px;white-space:nowrap;">
                <span style="background:${bg};color:${tc};font-size:11px;font-weight:800;padding:4px 12px;border-radius:6px;letter-spacing:.03em;">${r}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`).join('')}
  </td></tr>

  <!-- CTA -->
  <tr><td style="background:linear-gradient(135deg,#EFF6FF,#F0FDF4);border-top:1px solid #E2E8F0;padding:24px 40px;text-align:center;">
    <div style="font-size:13px;color:#475569;margin-bottom:14px;">Acesse o dashboard para análises em tempo real com IA</div>
    <a href="#" style="background:#2563EB;color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:13px;font-weight:700;display:inline-block;">Abrir InvestIA Dashboard →</a>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#1E293B;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
    <div style="color:#94A3B8;font-size:11px;line-height:1.6;">
      <strong style="color:#CBD5E1;">InvestIA Dashboard</strong> · Perfil Moderado · ${date}<br/>
      Powered by Claude AI · As informações não constituem recomendação formal de investimento.<br/>
      <span style="color:#64748B;">Consulte sempre um assessor de investimentos certificado.</span>
    </div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

function buildAiEmail(date, aiContent) {
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>InvestIA — Análise IA</title></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#1E3A8A 0%,#2563EB 60%,#3B82F6 100%);border-radius:16px 16px 0 0;padding:36px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <div style="font-size:28px;font-weight:800;color:white;letter-spacing:-1px;">◆ InvestIA</div>
          <div style="color:rgba(255,255,255,.75);font-size:13px;margin-top:6px;">Análise por Inteligência Artificial</div>
        </td>
        <td align="right" style="vertical-align:top;">
          <div style="background:rgba(255,255,255,.15);border-radius:10px;padding:10px 16px;text-align:right;">
            <div style="color:rgba(255,255,255,.7);font-size:10px;text-transform:uppercase;letter-spacing:.08em;">Gerado em</div>
            <div style="color:white;font-weight:700;font-size:14px;margin-top:2px;">${date}</div>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- AI BADGE -->
  <tr><td style="background:white;padding:24px 40px 0;">
    <table cellpadding="0" cellspacing="0" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:14px 18px;width:100%;">
      <tr>
        <td style="width:36px;vertical-align:middle;">
          <div style="width:36px;height:36px;background:#2563EB;border-radius:8px;display:flex;align-items:center;justify-content:center;text-align:center;line-height:36px;font-size:18px;">🤖</div>
        </td>
        <td style="padding-left:12px;vertical-align:middle;">
          <div style="font-size:13px;font-weight:700;color:#1E40AF;">Claude AI + Busca na Web em Tempo Real</div>
          <div style="font-size:11px;color:#3B82F6;margin-top:2px;">Análise gerada com dados atuais do mercado financeiro</div>
        </td>
        <td align="right" style="vertical-align:middle;">
          <span style="background:#D1FAE5;color:#065F46;font-size:10px;font-weight:700;padding:4px 10px;border-radius:6px;">● TEMPO REAL</span>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- AI CONTENT -->
  <tr><td style="background:white;padding:20px 40px 28px;">
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-left:4px solid #2563EB;border-radius:10px;padding:24px;font-size:14px;line-height:1.85;color:#1E293B;white-space:pre-wrap;">${aiContent || 'Conteúdo não disponível. Acesse o dashboard e gere uma análise IA antes de enviar.'}</div>
  </td></tr>

  <!-- DISCLAIMER -->
  <tr><td style="background:#FFFBEB;border-top:1px solid #FDE68A;border-bottom:1px solid #FDE68A;padding:14px 40px;">
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size:20px;padding-right:10px;vertical-align:middle;">⚠️</td>
        <td style="font-size:12px;color:#92400E;line-height:1.5;"><strong>Aviso importante:</strong> Esta análise é gerada por inteligência artificial com fins informativos. Não constitui recomendação formal de investimento. Consulte sempre um assessor certificado antes de investir.</td>
      </tr>
    </table>
  </td></tr>

  <!-- CTA -->
  <tr><td style="background:linear-gradient(135deg,#EFF6FF,#F0FDF4);padding:24px 40px;text-align:center;">
    <div style="font-size:13px;color:#475569;margin-bottom:14px;">Gere novas análises a qualquer momento no dashboard</div>
    <a href="#" style="background:#2563EB;color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:13px;font-weight:700;display:inline-block;">Abrir InvestIA Dashboard →</a>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#1E293B;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
    <div style="color:#94A3B8;font-size:11px;line-height:1.6;">
      <strong style="color:#CBD5E1;">InvestIA Dashboard</strong> · Perfil Moderado · ${date}<br/>
      Powered by Claude AI (Anthropic) · Não constitui recomendação formal de investimento.
    </div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}
