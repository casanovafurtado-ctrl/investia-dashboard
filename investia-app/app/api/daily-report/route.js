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
  if (!recipientEmail) return Response.json({ error: 'DAILY_REPORT_EMAIL não configurado' }, { status: 500 });

  const today = new Date().toLocaleDateString('pt-BR');

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const aiResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Você é analista de mercado financeiro. Data: ${today}. Gere relatório diário para investidor MODERADO (aportes R$ 2k–10k/mês): 1) Mercado hoje; 2) Top 3 notícias; 3) Melhores oportunidades (tickers); 4) O que evitar; 5) Perspectiva próximos dias. Use dados reais e atuais.`,
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
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#1E3A8A,#2563EB);padding:28px;border-radius:12px 12px 0 0;">
          <h1 style="color:white;margin:0;font-size:22px;">◆ InvestIA</h1>
          <p style="color:rgba(255,255,255,.8);margin:4px 0 0;font-size:13px;">Relatório Diário · ${today}</p>
        </div>
        <div style="background:white;padding:28px;border-radius:0 0 12px 12px;border:1px solid #E2E8F0;">
          <div style="white-space:pre-wrap;font-size:14px;line-height:1.8;color:#1E293B;">${analysis}</div>
          <p style="font-size:11px;color:#94A3B8;margin-top:24px;padding-top:16px;border-top:1px solid #E2E8F0;">
            InvestIA · Não constitui recomendação formal de investimento.
          </p>
        </div>
      </div>`,
    });

    return Response.json({ success: true, date: today });
  } catch (error) {
    console.error('Daily report error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
