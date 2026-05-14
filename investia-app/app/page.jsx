'use client';
import { useState, useEffect, useRef } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar,
} from 'recharts';

// ─── Data ─────────────────────────────────────────────────────────────────────
const ALLOC_PROFILES = {
  conservador: [
    { name: 'Renda Fixa', value: 60, color: '#2563EB' },
    { name: 'FIIs',       value: 25, color: '#059669' },
    { name: 'Ações BR',   value: 10, color: '#D97706' },
    { name: 'Internacional', value: 5, color: '#7C3AED' },
  ],
  moderado: [
    { name: 'Ações BR',      value: 35, color: '#2563EB' },
    { name: 'FIIs',          value: 25, color: '#059669' },
    { name: 'Renda Fixa',    value: 30, color: '#D97706' },
    { name: 'Internacional', value: 10, color: '#7C3AED' },
  ],
  arrojado: [
    { name: 'Ações BR',      value: 50, color: '#2563EB' },
    { name: 'Internacional', value: 20, color: '#7C3AED' },
    { name: 'FIIs',          value: 15, color: '#059669' },
    { name: 'Renda Fixa',    value: 15, color: '#D97706' },
  ],
};

const PERF_DATA = [
  { m:'Mai', p:100, i:100 }, { m:'Jun', p:102, i:99 },
  { m:'Jul', p:105, i:103 }, { m:'Ago', p:101, i:97 },
  { m:'Set', p:108, i:104 }, { m:'Out', p:112, i:107 },
  { m:'Nov', p:110, i:103 }, { m:'Dez', p:116, i:109 },
  { m:'Jan', p:119, i:112 }, { m:'Fev', p:115, i:106 },
  { m:'Mar', p:122, i:110 }, { m:'Abr', p:128, i:114 },
];

const ACOES = [
  { ticker:'PETR4', empresa:'Petrobras',      setor:'Energia',    pl:'5,1x', dy:'13,2%', rec:'buy',  score:92 },
  { ticker:'ITUB4', empresa:'Itaú Unibanco',  setor:'Financeiro', pl:'8,4x', dy:'8,1%',  rec:'buy',  score:88 },
  { ticker:'BBAS3', empresa:'Banco do Brasil',setor:'Financeiro', pl:'4,8x', dy:'10,5%', rec:'buy',  score:90 },
  { ticker:'WEGE3', empresa:'WEG',             setor:'Industrial', pl:'28x',  dy:'2,1%',  rec:'buy',  score:85 },
  { ticker:'VALE3', empresa:'Vale',            setor:'Mineração',  pl:'6,2x', dy:'9,8%',  rec:'hold', score:70 },
  { ticker:'RADL3', empresa:'Raia Drogasil',   setor:'Saúde',      pl:'22x',  dy:'1,5%',  rec:'buy',  score:82 },
  { ticker:'RENT3', empresa:'Localiza',        setor:'Mobilidade', pl:'14x',  dy:'1,8%',  rec:'hold', score:68 },
  { ticker:'MGLU3', empresa:'Mag. Luiza',      setor:'Varejo',     pl:'neg',  dy:'0%',    rec:'sell', score:25 },
];

const FIIS = [
  { ticker:'MXRF11', nome:'Maxi Renda',     seg:'Papel/CRI',  pvp:'1,01x', dy:'13,1%', rec:'buy',  score:91 },
  { ticker:'KNRI11', nome:'Kinea Renda',    seg:'Híbrido',    pvp:'0,94x', dy:'9,2%',  rec:'buy',  score:86 },
  { ticker:'HGLG11', nome:'CSHG Logística', seg:'Logística',  pvp:'0,88x', dy:'10,8%', rec:'buy',  score:89 },
  { ticker:'XPLG11', nome:'XP Log',         seg:'Logística',  pvp:'0,85x', dy:'11,2%', rec:'buy',  score:88 },
  { ticker:'VISC11', nome:'Vinci Shopping', seg:'Shoppings',  pvp:'0,96x', dy:'8,7%',  rec:'hold', score:72 },
  { ticker:'BRCO11', nome:'Bresco Log.',    seg:'Logística',  pvp:'0,91x', dy:'9,5%',  rec:'hold', score:74 },
];

const RF = [
  { prod:'Tesouro Selic 2027',  taxa:'SELIC+0,06%',   prazo:'2 anos',  risco:'Mínimo', rec:'buy'  },
  { prod:'Tesouro IPCA+ 2029',  taxa:'IPCA+5,8%',     prazo:'4 anos',  risco:'Baixo',  rec:'buy'  },
  { prod:'Tesouro IPCA+ 2035',  taxa:'IPCA+6,1%',     prazo:'10 anos', risco:'Baixo',  rec:'buy'  },
  { prod:'CDB 110% CDI',        taxa:'~11,4%/a',       prazo:'2 anos',  risco:'Baixo',  rec:'buy'  },
  { prod:'LCI/LCA 95% CDI',     taxa:'~9,9%/a líq.',  prazo:'1 ano',   risco:'Baixo',  rec:'hold' },
];

const CARTEIRA_PERF = [
  { name:'PETR4', ret:'+18,4%', val:2400, color:'#2563EB' },
  { name:'ITUB4', ret:'+12,1%', val:1800, color:'#059669' },
  { name:'MXRF11',ret:'+9,8%',  val:2200, color:'#D97706' },
  { name:'HGLG11',ret:'+11,2%', val:1600, color:'#7C3AED' },
  { name:'IVVB11',ret:'+22,3%', val:1000, color:'#0891B2' },
];

const REC_CONFIG = {
  buy:  { label:'COMPRAR',  cls:'badge-buy'  },
  hold: { label:'AGUARDAR', cls:'badge-hold' },
  sell: { label:'EVITAR',   cls:'badge-sell' },
};

const Badge = ({ rec }) => (
  <span className={`badge ${REC_CONFIG[rec].cls}`}>{REC_CONFIG[rec].label}</span>
);

const ScoreBar = ({ score }) => (
  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
    <div style={{ flex:1, height:6, background:'#F1F5F9', borderRadius:3, overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${score}%`, borderRadius:3,
        background: score>80?'#059669':score>60?'#D97706':'#DC2626',
        transition:'width .4s ease' }} />
    </div>
    <span style={{ fontSize:11, color:'#64748B', fontWeight:600, minWidth:28 }}>{score}</span>
  </div>
);

// ─── AI Prompts ────────────────────────────────────────────────────────────────
const buildPrompt = (type, profile, aporte, d) => {
  const ctx = `Investidor ${profile}, aporte R$ ${Number(aporte).toLocaleString('pt-BR')}/mês. Data: ${d}.`;
  const prompts = {
    news: `Você é analista de mercado financeiro. ${ctx} Busque as notícias mais recentes e resuma: 1) Top 3 notícias de impacto hoje (IBOVESPA, câmbio, juros); 2) Tendência geral; 3) O que observar esta semana. Seja direto e prático.`,
    rec:  `Você é gestor de portfólio sênior. ${ctx} Com base nos dados atuais do mercado, recomende: 1) Top 3 ações (tickers + motivo); 2) Top 2 FIIs (ticker + DY + motivo); 3) Melhor renda fixa agora; 4) 1 ETF internacional. Seja específico.`,
    fiis: `Você é especialista em FIIs. ${ctx} Analise: 1) Impacto da SELIC no setor; 2) Melhores segmentos agora; 3) Top 3 FIIs com melhor risco-retorno (tickers); 4) FIIs a evitar. Use dados atuais.`,
    macro:`Você é economista de mercado. ${ctx} Análise macro: 1) Fed e juros EUA — impacto no Brasil; 2) USD/BRL perspectiva; 3) Commodities tendência; 4) SELIC — próximo COPOM; 5) 1 oportunidade e 1 risco principal. Fundamentado em dados recentes.`,
    carteira: `Você é gestor de carteira. ${ctx} Analise a carteira recomendada (PETR4, ITUB4, BBAS3, MXRF11, HGLG11, IVVB11, Tesouro IPCA+): 1) O que MANTER; 2) O que COMPRAR mais agora; 3) O que VENDER ou reduzir; 4) Ajuste ideal da alocação considerando o cenário atual. Seja específico com cada ativo.`,
    alertas:`Você é analista técnico. ${ctx} Com base no mercado atual, liste: 1) Top 5 ativos para monitorar de perto esta semana (tickers + por quê); 2) Níveis de preço importantes (suporte/resistência simplificado); 3) Eventos macro da semana que podem mover o mercado. Seja objetivo.`,
  };
  return prompts[type] || type;
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [showSplash, setShowSplash] = useState(true);
  const [tab, setTab]               = useState('overview');
  const [profile, setProfile]       = useState('moderado');
  const [aporte, setAporte]         = useState(5000);
  const [interests, setInterests]   = useState(['acoes','fiis','rf','intl']);
  const [aiTitle, setAiTitle]       = useState('');
  const [aiText, setAiText]         = useState('');
  const [aiLoading, setAiLoading]   = useState(false);
  const [showEmail, setShowEmail]   = useState(false);
  const [email, setEmail]           = useState('');
  const [emailType, setEmailType]   = useState('summary');
  const [emailSending, setEmailSending] = useState(false);
  const [emailMsg, setEmailMsg]     = useState('');
  const [pdfMsg, setPdfMsg]         = useState('');
  const [now, setNow]               = useState('');
  const pdfRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('investia_profile');
    if (saved) {
      const p = JSON.parse(saved);
      setProfile(p.profile || 'moderado');
      setAporte(p.aporte || 5000);
      setInterests(p.interests || ['acoes','fiis','rf','intl']);
    }
    const tick = () => setNow(new Date().toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const saveProfile = () => {
    localStorage.setItem('investia_profile', JSON.stringify({ profile, aporte, interests }));
    alert('Perfil salvo!');
  };

  const today = () => new Date().toLocaleDateString('pt-BR');

  const profileLabels = { conservador:'Conservador', moderado:'Moderado', arrojado:'Arrojado' };
  const allocData = ALLOC_PROFILES[profile];

  // ── AI ──────────────────────────────────────────────────────────────────────
  async function runAI(type, customPrompt) {
    const prompt = customPrompt || buildPrompt(type, profileLabels[profile], aporte, today());
    setAiTitle(
      type==='news'?'Notícias do mercado hoje':
      type==='rec'?'Melhores investimentos agora':
      type==='fiis'?'Panorama dos FIIs':
      type==='macro'?'Cenário macro global':
      type==='carteira'?'Análise da carteira':
      type==='alertas'?'Alertas da semana':
      'Análise personalizada'
    );
    setAiText(''); setAiLoading(true); setTab('ia');
    try {
      const res = await fetch('/api/analyze', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setAiText(data.result || 'Análise não disponível. Tente novamente.');
    } catch { setAiText('Erro ao conectar. Tente novamente.'); }
    finally { setAiLoading(false); }
  }

  // ── PDF ──────────────────────────────────────────────────────────────────────
  async function exportPDF(type) {
    setPdfMsg('Gerando PDF...');
    try {
      const jsPDF     = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;
      const el = pdfRef.current;
      if (!el) { setPdfMsg('Erro: elemento não encontrado.'); return; }

      // Build PDF content
      el.innerHTML = type === 'summary' ? buildSummaryHTML() : buildAiHTML();
      el.style.display = 'block';
      await new Promise(r => setTimeout(r, 200));

      const canvas = await html2canvas(el, { scale:2, useCORS:true, logging:false, backgroundColor:'#ffffff' });
      el.style.display = 'none';

      const pdf   = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
      const imgW  = 210;
      const imgH  = (canvas.height * imgW) / canvas.width;
      let y = 0;
      while (y < imgH) {
        if (y > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, -y, imgW, imgH);
        y += 297;
      }
      const fname = `InvestIA_${type==='summary'?'Resumo':'Analise'}_${today().replace(/\//g,'-')}.pdf`;
      pdf.save(fname);
      setPdfMsg('✓ PDF baixado!');
    } catch(e) { setPdfMsg('Erro: '+e.message); }
    setTimeout(() => setPdfMsg(''), 4000);
  }

  function buildSummaryHTML() {
    const alloc = allocData.map(d =>
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;">
        <span style="display:inline-block;width:10px;height:10px;background:${d.color};border-radius:2px;margin-right:8px;vertical-align:middle;"></span>${d.name}
      </td><td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;font-weight:700;color:#0F172A;">${d.value}%</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;color:#64748B;">R$ ${Math.round(aporte*d.value/100).toLocaleString('pt-BR')}</td></tr>`
    ).join('');
    return `
    <div style="font-family:Arial,sans-serif;padding:0;background:white;">
      <div style="background:linear-gradient(135deg,#1E3A8A,#2563EB);padding:36px 40px;margin-bottom:0;">
        <div style="font-size:28px;font-weight:700;color:white;letter-spacing:-1px;">◆ InvestIA</div>
        <div style="color:rgba(255,255,255,.8);font-size:14px;margin-top:6px;">Resumo Diário do Mercado · ${today()}</div>
        <div style="margin-top:12px;display:flex;gap:16px;flex-wrap:wrap;">
          ${[['Perfil',profileLabels[profile]],['Aporte','R$ '+Number(aporte).toLocaleString('pt-BR')],['Data',today()]].map(([k,v])=>
            `<div style="background:rgba(255,255,255,.15);border-radius:8px;padding:8px 14px;">
              <div style="color:rgba(255,255,255,.7);font-size:11px;text-transform:uppercase;letter-spacing:.05em;">${k}</div>
              <div style="color:white;font-weight:600;font-size:15px;">${v}</div>
            </div>`).join('')}
        </div>
      </div>
      <div style="padding:32px 40px;">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:28px;">
          ${[['IBOVESPA','~135k pts'],['USD/BRL','~R$ 5,70'],['SELIC','10,50% a.a.'],['S&P 500','~5.600 pts']].map(([k,v])=>
            `<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px;">
              <div style="font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">${k}</div>
              <div style="font-size:20px;font-weight:700;color:#0F172A;">${v}</div>
            </div>`).join('')}
        </div>
        <h2 style="font-size:16px;color:#2563EB;font-weight:700;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #BFDBFE;">Alocação Sugerida — ${profileLabels[profile]}</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
          <thead><tr style="background:#F8FAFC;">
            <th style="padding:8px 12px;text-align:left;color:#64748B;font-size:12px;font-weight:600;">Classe</th>
            <th style="padding:8px 12px;text-align:left;color:#64748B;font-size:12px;font-weight:600;">%</th>
            <th style="padding:8px 12px;text-align:left;color:#64748B;font-size:12px;font-weight:600;">Valor/mês</th>
          </tr></thead>
          <tbody>${alloc}</tbody>
        </table>
        <h2 style="font-size:16px;color:#2563EB;font-weight:700;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #BFDBFE;">Destaques de Recomendação</h2>
        ${[
          ['PETR4 — Petrobras PN','COMPRAR','#D1FAE5','#065F46','Dividendos ~13% DY, valuation descontado.'],
          ['MXRF11 — Maxi Renda','COMPRAR','#D1FAE5','#065F46','FII papel/CRI com ~13%/ano de DY.'],
          ['Tesouro IPCA+ 2029','COMPRAR','#D1FAE5','#065F46','Taxa real ~5,8%+IPCA, proteção à inflação.'],
          ['IVVB11 — ETF S&P 500','COMPRAR','#D1FAE5','#065F46','Diversificação internacional via B3.'],
          ['MGLU3 — Mag. Luiza','EVITAR','#FEE2E2','#991B1B','Alta volatilidade, resultados frágeis.'],
        ].map(([t,r,bg,tc,d])=>`
          <div style="border:1px solid #E2E8F0;border-radius:10px;padding:12px 16px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:flex-start;">
            <div><div style="font-weight:700;font-size:14px;color:#0F172A;margin-bottom:3px;">${t}</div>
            <div style="font-size:12px;color:#64748B;">${d}</div></div>
            <span style="background:${bg};color:${tc};font-size:11px;font-weight:700;padding:3px 10px;border-radius:6px;white-space:nowrap;margin-left:12px;">${r}</span>
          </div>`).join('')}
        <div style="margin-top:28px;padding-top:16px;border-top:1px solid #E2E8F0;text-align:center;">
          <p style="font-size:11px;color:#94A3B8;">InvestIA · ${new Date().toLocaleString('pt-BR')} · Não constitui recomendação formal de investimento.</p>
        </div>
      </div>
    </div>`;
  }

  function buildAiHTML() {
    return `
    <div style="font-family:Arial,sans-serif;padding:0;background:white;">
      <div style="background:linear-gradient(135deg,#1E3A8A,#2563EB);padding:36px 40px;">
        <div style="font-size:28px;font-weight:700;color:white;letter-spacing:-1px;">◆ InvestIA</div>
        <div style="color:rgba(255,255,255,.8);font-size:14px;margin-top:6px;">Análise por Inteligência Artificial · ${today()}</div>
        <div style="margin-top:10px;background:rgba(255,255,255,.15);border-radius:8px;padding:8px 14px;display:inline-block;">
          <span style="color:white;font-size:13px;font-weight:600;">${aiTitle}</span>
        </div>
      </div>
      <div style="padding:32px 40px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;padding:12px 16px;background:#EFF6FF;border-radius:10px;border:1px solid #BFDBFE;">
          <span style="font-size:18px;">🤖</span>
          <div>
            <div style="font-size:12px;font-weight:700;color:#1E40AF;">Claude AI + Busca na Web em Tempo Real</div>
            <div style="font-size:11px;color:#3B82F6;">Análise gerada com dados atuais do mercado</div>
          </div>
          <div style="margin-left:auto;font-size:11px;color:#64748B;">${new Date().toLocaleString('pt-BR')}</div>
        </div>
        <div style="font-size:14px;line-height:1.85;color:#1E293B;white-space:pre-wrap;background:#F8FAFC;border-radius:10px;padding:20px;border:1px solid #E2E8F0;">${aiText || 'Gere uma análise na aba ✦ Análise IA antes de exportar.'}</div>
        <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
          ${[['Perfil',profileLabels[profile]],['Aporte','R$ '+Number(aporte).toLocaleString('pt-BR')],['Modelo','Claude Haiku + Web Search']].map(([k,v])=>
            `<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px 14px;">
              <div style="font-size:10px;color:#64748B;text-transform:uppercase;letter-spacing:.05em;">${k}</div>
              <div style="font-size:13px;font-weight:600;color:#0F172A;margin-top:2px;">${v}</div>
            </div>`).join('')}
        </div>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #E2E8F0;text-align:center;">
          <p style="font-size:11px;color:#94A3B8;">InvestIA · Não constitui recomendação formal de investimento. Consulte um assessor certificado.</p>
        </div>
      </div>
    </div>`;
  }

  // ── Email ────────────────────────────────────────────────────────────────────
  async function sendEmailReport() {
    if (!email) { setEmailMsg('Digite seu e-mail.'); return; }
    setEmailSending(true); setEmailMsg('');
    try {
      const res = await fetch('/api/send-email', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email, type:emailType, aiContent:aiText, date:today() }),
      });
      const data = await res.json();
      if (data.success) { setEmailMsg('E-mail enviado!'); setTimeout(()=>{setShowEmail(false);setEmailMsg('');},2000); }
      else setEmailMsg('Erro: '+(data.error||'tente novamente.'));
    } catch { setEmailMsg('Erro ao enviar.'); }
    finally { setEmailSending(false); }
  }

  const TABS = [
    { id:'overview', label:'Visão Geral' },
    { id:'carteira', label:'📊 Carteira' },
    { id:'acoes',    label:'Ações BR' },
    { id:'fiis',     label:'FIIs' },
    { id:'rf',       label:'Renda Fixa' },
    { id:'intl',     label:'Internacional' },
    { id:'ia',       label:'✦ Análise IA' },
    { id:'perfil',   label:'👤 Meu Perfil' },
  ];

  if (showSplash) return (
    <div className="splash">
      <div className="splash-logo">Invest<span>IA</span></div>
      <div className="splash-sub">Dashboard de Mercado Financeiro · IA</div>
      <div className="splash-bar"><div className="splash-bar-fill" /></div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#F8FAFC' }}>
      <div style={{ maxWidth:1024, margin:'0 auto', padding:'20px 16px 80px' }}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="fade-up" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, color:'#0F172A', letterSpacing:'-0.5px' }}>
              <span style={{ color:'#2563EB' }}>◆</span> InvestIA
            </h1>
            <p style={{ fontSize:12, color:'#64748B', marginTop:2 }}>
              {profileLabels[profile]} · R$ {Number(aporte).toLocaleString('pt-BR')}/mês · Análise com IA
            </p>
          </div>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:12, color:'#64748B' }}>{now}</p>
            <p style={{ fontSize:12, marginTop:2, display:'flex', alignItems:'center', justifyContent:'flex-end', gap:4 }}>
              <span className="pulse" style={{ width:7, height:7, borderRadius:'50%', background:'#059669', display:'inline-block' }} />
              <span style={{ color:'#059669' }}>Ativo</span>
            </p>
          </div>
        </div>

        {/* ── Metrics ────────────────────────────────────────────────────────── */}
        <div className="fade-up" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
          {[
            { label:'IBOVESPA', val:'~135k',    sub:'use IA →', action:()=>runAI('news') },
            { label:'USD/BRL',  val:'~R$ 5,70', sub:'use IA →', action:()=>runAI('macro') },
            { label:'SELIC',    val:'10,50%',   sub:'ao ano' },
            { label:'S&P 500',  val:'~5.600',   sub:'use IA →', action:()=>runAI('macro') },
          ].map(c => (
            <div key={c.label} className="metric-card">
              <p style={{ fontSize:10, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>{c.label}</p>
              <p style={{ fontSize:20, fontWeight:700, color:'#0F172A' }}>{c.val}</p>
              <p style={{ fontSize:11, marginTop:3, color: c.action?'#2563EB':'#94A3B8', cursor: c.action?'pointer':'default' }}
                 onClick={c.action}>{c.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────────── */}
        <div className="tab-nav" style={{ marginBottom:20 }}>
          {TABS.map(t => (
            <button key={t.id} className={`tab-btn ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ VISÃO GERAL ══════════════════════════════════════════════════════ */}
        {tab==='overview' && (
          <div className="fade-up">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }} className="grid-2">
              <div className="card">
                <p style={{ fontSize:11, color:'#64748B', textTransform:'uppercase', letterSpacing:'.05em', fontWeight:600, marginBottom:12 }}>Alocação — {profileLabels[profile]}</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:8 }}>
                  {allocData.map(d=>(
                    <span key={d.name} style={{ fontSize:11, color:'#64748B', display:'flex', alignItems:'center', gap:4 }}>
                      <span style={{ width:8, height:8, borderRadius:2, background:d.color, display:'inline-block' }} />{d.name} {d.value}%
                    </span>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart><Pie data={allocData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={2} dataKey="value">
                    {allocData.map((d,i)=><Cell key={i} fill={d.color} />)}
                  </Pie><Tooltip formatter={(v,n)=>[`${v}%`,n]} /></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <p style={{ fontSize:11, color:'#64748B', textTransform:'uppercase', letterSpacing:'.05em', fontWeight:600, marginBottom:12 }}>Performance simulada — 12m</p>
                <ResponsiveContainer width="100%" height={190}>
                  <LineChart data={PERF_DATA} margin={{top:0,right:4,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="m" tick={{fontSize:10,fill:'#94A3B8'}} />
                    <YAxis tick={{fontSize:10,fill:'#94A3B8'}} tickFormatter={v=>`${v}%`} />
                    <Tooltip formatter={(v,n)=>[`${v}%`,n==='p'?'Portfólio':'IBOV']} />
                    <Line type="monotone" dataKey="p" stroke="#2563EB" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="i" stroke="#94A3B8" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <p style={{ fontSize:11, color:'#94A3B8', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:12 }}>Destaques do dia</p>
            {[
              { t:'PETR4 — Petrobras PN', rec:'buy',  d:'Dividendos ~13% DY, valuation descontado vs. pares globais.' },
              { t:'MXRF11 — Maxi Renda',  rec:'buy',  d:'FII papel/CRI com ~13%/ano de DY e proventos mensais consistentes.' },
              { t:'Tesouro IPCA+ 2029',   rec:'buy',  d:'Taxa real ~5,8%+IPCA. Proteção à inflação com retorno atrativo.' },
              { t:'IVVB11 — ETF S&P 500', rec:'buy',  d:'Diversificação internacional pela B3, proteção cambial.' },
              { t:'MGLU3 — Mag. Luiza',   rec:'sell', d:'Alta volatilidade, dívida elevada. Aguardar recuperação.' },
            ].map(r=>(
              <div key={r.t} className="rec-card" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                <div>
                  <p style={{ fontWeight:600, fontSize:14, color:'#0F172A', marginBottom:4 }}>{r.t}</p>
                  <p style={{ fontSize:12, color:'#64748B', lineHeight:1.5 }}>{r.d}</p>
                </div>
                <div style={{ flexShrink:0 }}><Badge rec={r.rec} /></div>
              </div>
            ))}
            <p style={{ fontSize:11, color:'#94A3B8', marginTop:12 }}>* Dados de referência. Use ✦ Análise IA para dados em tempo real.</p>
          </div>
        )}

        {/* ══ CARTEIRA ═════════════════════════════════════════════════════════ */}
        {tab==='carteira' && (
          <div className="fade-up">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <p style={{ fontSize:11, color:'#64748B', textTransform:'uppercase', letterSpacing:'.05em', fontWeight:600 }}>Análise da carteira recomendada</p>
              <button className="btn btn-primary" onClick={()=>runAI('carteira')}>Analisar com IA ↗</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }} className="grid-2">
              <div className="card">
                <p style={{ fontSize:11, color:'#64748B', textTransform:'uppercase', letterSpacing:'.05em', fontWeight:600, marginBottom:12 }}>Performance dos ativos (%)</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={CARTEIRA_PERF} margin={{top:0,right:0,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{fontSize:10,fill:'#94A3B8'}} />
                    <YAxis tick={{fontSize:10,fill:'#94A3B8'}} />
                    <Tooltip />
                    <Bar dataKey="val" radius={[4,4,0,0]}>
                      {CARTEIRA_PERF.map((e,i)=><Cell key={i} fill={e.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <p style={{ fontSize:11, color:'#64748B', textTransform:'uppercase', letterSpacing:'.05em', fontWeight:600, marginBottom:12 }}>Distribuição atual</p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart><Pie data={CARTEIRA_PERF} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="val">
                    {CARTEIRA_PERF.map((e,i)=><Cell key={i} fill={e.color} />)}
                  </Pie><Tooltip formatter={(v,n)=>[`R$ ${v}`,n]} /></PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card" style={{ marginBottom:16 }}>
              <p style={{ fontSize:11, color:'#64748B', textTransform:'uppercase', letterSpacing:'.05em', fontWeight:600, marginBottom:14 }}>Posições recomendadas</p>
              <table className="fin-table">
                <thead><tr><th>Ativo</th><th>Retorno est.</th><th>Score IA</th><th>Rec.</th></tr></thead>
                <tbody>
                  {CARTEIRA_PERF.map(a=>(
                    <tr key={a.name}>
                      <td style={{ fontFamily:'monospace', fontWeight:600, fontSize:13 }}>{a.name}</td>
                      <td style={{ color:'#059669', fontWeight:600 }}>{a.ret}</td>
                      <td style={{ width:140 }}><ScoreBar score={70+Math.floor(Math.random()*25)} /></td>
                      <td><Badge rec="buy" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              {[
                { icon:'✅', title:'Manter', items:['PETR4','ITUB4','MXRF11'], color:'#D1FAE5', tc:'#065F46' },
                { icon:'➕', title:'Comprar mais', items:['HGLG11','BBAS3','IVVB11'], color:'#EFF6FF', tc:'#1E40AF' },
                { icon:'⚠️', title:'Monitorar', items:['VALE3','RENT3','VISC11'], color:'#FEF3C7', tc:'#92400E' },
              ].map(g=>(
                <div key={g.title} style={{ background:g.color, borderRadius:12, padding:'14px 16px' }}>
                  <p style={{ fontSize:13, fontWeight:700, color:g.tc, marginBottom:10 }}>{g.icon} {g.title}</p>
                  {g.items.map(i=>(
                    <div key={i} style={{ fontSize:12, color:g.tc, fontFamily:'monospace', fontWeight:600, padding:'4px 0', borderBottom:`1px solid ${g.color === '#D1FAE5' ? '#A7F3D0' : g.color === '#EFF6FF' ? '#BFDBFE' : '#FDE68A'}` }}>{i}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ AÇÕES ════════════════════════════════════════════════════════════ */}
        {tab==='acoes' && (
          <div className="fade-up">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <p style={{ fontSize:11, color:'#64748B', textTransform:'uppercase', letterSpacing:'.05em', fontWeight:600 }}>Principais ações — Bovespa</p>
              <button className="btn btn-secondary" onClick={()=>runAI('rec')}>Analisar com IA ↗</button>
            </div>
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table className="fin-table">
                <thead><tr><th>Ticker</th><th>Empresa</th><th className="hide-sm">Setor</th><th>P/L</th><th>DY</th><th>Score</th><th>Rec.</th></tr></thead>
                <tbody>
                  {ACOES.map(a=>(
                    <tr key={a.ticker}>
                      <td style={{ fontFamily:'monospace', fontWeight:700, fontSize:13, color:'#2563EB' }}>{a.ticker}</td>
                      <td style={{ fontWeight:500 }}>{a.empresa}</td>
                      <td className="hide-sm" style={{ color:'#64748B', fontSize:12 }}>{a.setor}</td>
                      <td style={{ color:'#64748B' }}>{a.pl}</td>
                      <td style={{ fontWeight:600, color: parseFloat(a.dy)>8?'#059669':'#374151' }}>{a.dy}</td>
                      <td style={{ width:100 }}><ScoreBar score={a.score} /></td>
                      <td><Badge rec={a.rec} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize:11, color:'#94A3B8', marginTop:10 }}>* Indicadores de referência. Use "Analisar com IA" para dados atualizados.</p>
          </div>
        )}

        {/* ══ FIIs ═════════════════════════════════════════════════════════════ */}
        {tab==='fiis' && (
          <div className="fade-up">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <p style={{ fontSize:11, color:'#64748B', textTransform:'uppercase', letterSpacing:'.05em', fontWeight:600 }}>Fundos imobiliários</p>
              <button className="btn btn-secondary" onClick={()=>runAI('fiis')}>Analisar com IA ↗</button>
            </div>
            <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:16 }}>
              <table className="fin-table">
                <thead><tr><th>Ticker</th><th>Fundo</th><th className="hide-sm">Segmento</th><th>P/VP</th><th>DY 12m</th><th>Score</th><th>Rec.</th></tr></thead>
                <tbody>
                  {FIIS.map(f=>(
                    <tr key={f.ticker}>
                      <td style={{ fontFamily:'monospace', fontWeight:700, fontSize:13, color:'#059669' }}>{f.ticker}</td>
                      <td style={{ fontWeight:500 }}>{f.nome}</td>
                      <td className="hide-sm" style={{ color:'#64748B', fontSize:12 }}>{f.seg}</td>
                      <td style={{ color: parseFloat(f.pvp)<1?'#059669':'#64748B', fontWeight:600 }}>{f.pvp}</td>
                      <td style={{ fontWeight:600, color: parseFloat(f.dy)>10?'#059669':'#374151' }}>{f.dy}</td>
                      <td style={{ width:100 }}><ScoreBar score={f.score} /></td>
                      <td><Badge rec={f.rec} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card">
              <p style={{ fontSize:11, color:'#64748B', textTransform:'uppercase', letterSpacing:'.05em', fontWeight:600, marginBottom:12 }}>Mix sugerido de FIIs</p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={[{n:'Papel',v:40},{n:'Logística',v:35},{n:'Shoppings',v:15},{n:'Outros',v:10}]}
                    cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="v" nameKey="n">
                    {['#2563EB','#059669','#D97706','#94A3B8'].map((c,i)=><Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip formatter={(v,n)=>[`${v}%`,n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ══ RENDA FIXA ═══════════════════════════════════════════════════════ */}
        {tab==='rf' && (
          <div className="fade-up">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
              {[{l:'SELIC',v:'10,50%',s:'ao ano'},{l:'CDI',v:'10,40%',s:'ao ano'},{l:'IPCA 12m',v:'~4,8%',s:'estimativa'}].map(c=>(
                <div key={c.l} className="metric-card">
                  <p style={{ fontSize:10, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>{c.l}</p>
                  <p style={{ fontSize:22, fontWeight:700, color:'#0F172A' }}>{c.v}</p>
                  <p style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>{c.s}</p>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:16 }}>
              <table className="fin-table">
                <thead><tr><th>Produto</th><th>Taxa</th><th className="hide-sm">Prazo</th><th>Risco</th><th>Rec.</th></tr></thead>
                <tbody>
                  {RF.map(r=>(
                    <tr key={r.prod}>
                      <td style={{ fontWeight:600 }}>{r.prod}</td>
                      <td style={{ fontFamily:'monospace', fontSize:12, fontWeight:700, color:'#1D4ED8' }}>{r.taxa}</td>
                      <td className="hide-sm" style={{ color:'#64748B' }}>{r.prazo}</td>
                      <td style={{ color:'#64748B', fontSize:12 }}>{r.risco}</td>
                      <td><Badge rec={r.rec} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn btn-secondary" onClick={()=>runAI('macro')}>Análise macro e renda fixa ↗</button>
          </div>
        )}

        {/* ══ INTERNACIONAL ════════════════════════════════════════════════════ */}
        {tab==='intl' && (
          <div className="fade-up">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
              {[{l:'S&P 500',v:'~5.600'},{l:'Fed Funds',v:'4,25–4,5%'},{l:'Nasdaq',v:'~17.500'},{l:'Ouro/oz',v:'~US$3.2k'}].map(c=>(
                <div key={c.l} className="metric-card">
                  <p style={{ fontSize:10, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>{c.l}</p>
                  <p style={{ fontSize:18, fontWeight:700, color:'#0F172A' }}>{c.v}</p>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:16 }}>
              <table className="fin-table">
                <thead><tr><th>Ativo</th><th>Descrição</th><th className="hide-sm">Risco</th><th>Rec.</th></tr></thead>
                <tbody>
                  {[
                    { a:'IVVB11', d:'ETF S&P 500 em R$',        r:'Médio',      rec:'buy'  },
                    { a:'QDVH11', d:'ETF dividendos globais',    r:'Médio',      rec:'buy'  },
                    { a:'GOLD11', d:'ETF ouro em R$',            r:'Médio',      rec:'hold' },
                    { a:'BDR AAPL34', d:'BDR Apple via B3',      r:'Médio-alto', rec:'hold' },
                  ].map(a=>(
                    <tr key={a.a}>
                      <td style={{ fontFamily:'monospace', fontWeight:700, fontSize:13, color:'#7C3AED' }}>{a.a}</td>
                      <td>{a.d}</td>
                      <td className="hide-sm" style={{ color:'#64748B', fontSize:12 }}>{a.r}</td>
                      <td><Badge rec={a.rec} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn btn-secondary" onClick={()=>runAI('macro')}>Análise do cenário global ↗</button>
          </div>
        )}

        {/* ══ ANÁLISE IA ═══════════════════════════════════════════════════════ */}
        {tab==='ia' && (
          <div className="fade-up">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <p style={{ fontSize:11, color:'#64748B', textTransform:'uppercase', letterSpacing:'.05em', fontWeight:600 }}>Análise em tempo real</p>
              <span style={{ fontSize:11, background:'#D1FAE5', color:'#065F46', padding:'3px 10px', borderRadius:6, fontWeight:600 }}>Claude + Web Search</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
              {[
                { id:'news',     icon:'📰', label:'Notícias do mercado hoje' },
                { id:'rec',      icon:'⭐', label:'Melhores investimentos agora' },
                { id:'carteira', icon:'📊', label:'Analisar minha carteira' },
                { id:'alertas',  icon:'🔔', label:'Alertas da semana' },
                { id:'fiis',     icon:'🏢', label:'Panorama dos FIIs' },
                { id:'macro',    icon:'🌎', label:'Cenário macro global' },
              ].map(b=>(
                <button key={b.id} onClick={()=>runAI(b.id)} disabled={aiLoading}
                  style={{ padding:'14px', textAlign:'left', borderRadius:12, border:'1px solid #E2E8F0', background:'white', cursor:aiLoading?'wait':'pointer', transition:'all .15s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
                  onMouseLeave={e=>e.currentTarget.style.background='white'}>
                  <span style={{ fontSize:20, display:'block', marginBottom:6 }}>{b.icon}</span>
                  <span style={{ fontSize:13, color:'#374151', fontWeight:500 }}>{b.label}</span>
                </button>
              ))}
            </div>

            <div className="card" style={{ marginBottom:16 }}>
              <p style={{ fontSize:12, color:'#64748B', fontWeight:500, marginBottom:8 }}>Consulta personalizada</p>
              <div style={{ display:'flex', gap:8 }}>
                <input id="custom-q" type="text"
                  placeholder={`Ex: Vale comprar PETR4 hoje para perfil ${profile}?`}
                  style={{ flex:1, border:'1px solid #E2E8F0', borderRadius:9, padding:'9px 14px', fontSize:13, outline:'none' }}
                  onKeyDown={e=>{
                    if (e.key==='Enter'&&e.target.value.trim()) {
                      const q=e.target.value.trim();
                      const p=`Você é analista de mercado. Investidor ${profileLabels[profile]}, aporte R$ ${Number(aporte).toLocaleString('pt-BR')}/mês. Data: ${today()}. Pergunta: "${q}". Responda com dados atuais do mercado.`;
                      runAI('custom',p); e.target.value='';
                    }
                  }} />
                <button className="btn btn-secondary" onClick={()=>{
                  const inp=document.getElementById('custom-q');
                  if(!inp?.value?.trim()) return;
                  const q=inp.value.trim();
                  const p=`Você é analista de mercado. Investidor ${profileLabels[profile]}, aporte R$ ${Number(aporte).toLocaleString('pt-BR')}/mês. Data: ${today()}. Pergunta: "${q}". Responda com dados atuais.`;
                  runAI('custom',p); inp.value='';
                }}>Analisar ↗</button>
              </div>
            </div>

            {(aiLoading||aiText) && (
              <div className="ai-box">
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, paddingBottom:12, borderBottom:'1px solid #BFDBFE' }}>
                  <span style={{ color:'#2563EB', fontSize:16 }}>◆</span>
                  <span style={{ fontSize:13, fontWeight:600, color:'#1E293B' }}>{aiTitle}</span>
                  {aiLoading && <span style={{ fontSize:12, color:'#64748B', marginLeft:'auto' }}>Buscando dados e analisando...</span>}
                </div>
                {aiLoading
                  ? <p style={{ fontSize:13, color:'#94A3B8' }}>Conectando ao mercado e analisando com IA...</p>
                  : <p style={{ fontSize:14, color:'#1E293B', lineHeight:1.8, whiteSpace:'pre-wrap' }}>{aiText}</p>
                }
              </div>
            )}

            <div className="card" style={{ marginTop:16 }}>
              <p style={{ fontSize:12, color:'#64748B', fontWeight:500, marginBottom:12 }}>Simulador de aporte mensal</p>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <span style={{ fontSize:12, color:'#64748B' }}>R$</span>
                <input type="range" min={500} max={20000} step={500} value={aporte}
                  onChange={e=>setAporte(Number(e.target.value))} style={{ flex:1 }} />
                <span style={{ fontSize:15, fontWeight:700, color:'#0F172A', minWidth:80 }}>
                  {Number(aporte).toLocaleString('pt-BR')}
                </span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                {allocData.map(d=>(
                  <div key={d.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#F8FAFC', borderRadius:8, padding:'8px 12px' }}>
                    <span style={{ fontSize:12, color:'#64748B', display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ width:8, height:8, borderRadius:2, background:d.color, display:'inline-block' }} />{d.name}
                    </span>
                    <span style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>
                      R$ {Math.round(aporte*d.value/100).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
              <button className="btn btn-secondary" style={{ width:'100%', justifyContent:'center' }}
                onClick={()=>runAI('custom',`Você é planejador financeiro. Investidor ${profileLabels[profile]} tem R$ ${Number(aporte).toLocaleString('pt-BR')} para aportar este mês. Data: ${today()}. Como alocar otimamente considerando o cenário atual? Seja específico com ativos.`)}>
                Como alocar R$ {Number(aporte).toLocaleString('pt-BR')} este mês ↗
              </button>
            </div>
          </div>
        )}

        {/* ══ MEU PERFIL ═══════════════════════════════════════════════════════ */}
        {tab==='perfil' && (
          <div className="fade-up">
            <p style={{ fontSize:11, color:'#64748B', textTransform:'uppercase', letterSpacing:'.05em', fontWeight:600, marginBottom:16 }}>Configure seu perfil de investidor</p>

            <div className="card" style={{ marginBottom:16 }}>
              <p style={{ fontSize:13, fontWeight:600, color:'#0F172A', marginBottom:12 }}>Perfil de risco</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                {[
                  { id:'conservador', icon:'🛡️', label:'Conservador', desc:'Segurança em primeiro lugar. Renda Fixa e FIIs.' },
                  { id:'moderado',    icon:'⚖️', label:'Moderado',    desc:'Equilíbrio entre risco e retorno.' },
                  { id:'arrojado',    icon:'🚀', label:'Arrojado',    desc:'Maior risco para maior rentabilidade.' },
                ].map(p=>(
                  <div key={p.id} className={`profile-card ${profile===p.id?'selected':''}`} onClick={()=>setProfile(p.id)}>
                    <div style={{ width:36, height:36, borderRadius:8, background: profile===p.id?'#2563EB':'#F1F5F9', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8, transition:'all .15s' }}>
                      <span style={{ fontSize:18 }}>{p.icon}</span>
                    </div>
                    <p style={{ fontSize:13, fontWeight:600, color: profile===p.id?'#1D4ED8':'#0F172A', marginBottom:4 }}>{p.label}</p>
                    <p style={{ fontSize:11, color:'#64748B', lineHeight:1.4 }}>{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginBottom:16 }}>
              <p style={{ fontSize:13, fontWeight:600, color:'#0F172A', marginBottom:12 }}>Valor de aporte mensal</p>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                <input type="range" min={500} max={50000} step={500} value={aporte}
                  onChange={e=>setAporte(Number(e.target.value))} style={{ flex:1 }} />
                <div style={{ background:'#EFF6FF', borderRadius:10, padding:'8px 16px', minWidth:120, textAlign:'center' }}>
                  <p style={{ fontSize:11, color:'#3B82F6', fontWeight:500 }}>Aporte mensal</p>
                  <p style={{ fontSize:20, fontWeight:700, color:'#1D4ED8' }}>R$ {Number(aporte).toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {[1000,2000,5000,10000,20000].map(v=>(
                  <button key={v} onClick={()=>setAporte(v)}
                    style={{ padding:'6px 14px', borderRadius:8, border:'1px solid', borderColor:aporte===v?'#2563EB':'#E2E8F0', background:aporte===v?'#EFF6FF':'white', color:aporte===v?'#1D4ED8':'#64748B', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    R$ {v.toLocaleString('pt-BR')}
                  </button>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginBottom:16 }}>
              <p style={{ fontSize:13, fontWeight:600, color:'#0F172A', marginBottom:12 }}>Mercados de interesse</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  { id:'acoes', label:'Ações BR (Bovespa)', icon:'📈' },
                  { id:'fiis',  label:'Fundos Imobiliários', icon:'🏢' },
                  { id:'rf',    label:'Renda Fixa / Tesouro', icon:'🔒' },
                  { id:'intl',  label:'Internacional (EUA)', icon:'🌎' },
                ].map(m=>{
                  const sel = interests.includes(m.id);
                  return (
                    <div key={m.id} onClick={()=>setInterests(sel?interests.filter(i=>i!==m.id):[...interests,m.id])}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:10, border:`2px solid ${sel?'#2563EB':'#E2E8F0'}`, background:sel?'#EFF6FF':'white', cursor:'pointer', transition:'all .15s' }}>
                      <span style={{ fontSize:20 }}>{m.icon}</span>
                      <span style={{ fontSize:13, fontWeight:500, color:sel?'#1D4ED8':'#374151' }}>{m.label}</span>
                      {sel && <span style={{ marginLeft:'auto', color:'#2563EB', fontWeight:700 }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ marginBottom:16 }}>
              <p style={{ fontSize:13, fontWeight:600, color:'#0F172A', marginBottom:8 }}>Alocação do seu perfil</p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8 }}>
                {allocData.map(d=>(
                  <span key={d.name} style={{ fontSize:12, color:'#64748B', display:'flex', alignItems:'center', gap:4 }}>
                    <span style={{ width:8, height:8, borderRadius:2, background:d.color, display:'inline-block' }} />
                    {d.name} {d.value}%
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart><Pie data={allocData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value">
                  {allocData.map((d,i)=><Cell key={i} fill={d.color} />)}
                </Pie><Tooltip formatter={(v,n)=>[`${v}%`,n]} /></PieChart>
              </ResponsiveContainer>
            </div>

            <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'14px' }} onClick={saveProfile}>
              💾 Salvar perfil
            </button>
          </div>
        )}

        {/* ── Action Bar ──────────────────────────────────────────────────────── */}
        <div style={{ marginTop:24, paddingTop:16, borderTop:'1px solid #E2E8F0' }}>
          <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:10 }}>
            <p style={{ fontSize:12, color:'#94A3B8', fontWeight:500, marginRight:4 }}>Exportar:</p>
            <button className="btn btn-secondary" onClick={()=>exportPDF('summary')}>📄 PDF Resumo</button>
            <button className="btn btn-secondary" onClick={()=>aiText?exportPDF('ai'):alert('Gere uma análise IA primeiro.')}>🤖 PDF Análise IA</button>
            <button className="btn btn-primary" onClick={()=>setShowEmail(true)}>✉️ Enviar por e-mail</button>
            {pdfMsg && <span style={{ fontSize:12, color:'#059669', fontWeight:600 }}>{pdfMsg}</span>}
          </div>
        </div>

        {/* ── PDF Hidden Area ──────────────────────────────────────────────────── */}
        <div id="pdf-content" ref={pdfRef} style={{ display:'none' }} />

      </div>

      {/* ── Email Modal ─────────────────────────────────────────────────────── */}
      {showEmail && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowEmail(false)}>
          <div className="modal-card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:16, fontWeight:700, color:'#0F172A' }}>Enviar relatório por e-mail</h2>
              <button onClick={()=>setShowEmail(false)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#94A3B8', lineHeight:1 }}>×</button>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:'#64748B', fontWeight:500, display:'block', marginBottom:6 }}>Seu e-mail</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com"
                style={{ width:'100%', border:'1px solid #E2E8F0', borderRadius:9, padding:'10px 14px', fontSize:13, outline:'none' }} />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, color:'#64748B', fontWeight:500, display:'block', marginBottom:8 }}>Tipo de relatório</label>
              <div style={{ display:'flex', gap:8 }}>
                {[{id:'summary',icon:'📄',label:'Resumo Diário'},{id:'ai',icon:'🤖',label:'Análise IA'}].map(t=>(
                  <button key={t.id} onClick={()=>setEmailType(t.id)}
                    style={{ flex:1, padding:'10px', borderRadius:10, border:`2px solid ${emailType===t.id?'#2563EB':'#E2E8F0'}`, background:emailType===t.id?'#EFF6FF':'white', color:emailType===t.id?'#1D4ED8':'#64748B', fontSize:13, fontWeight:500, cursor:'pointer' }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>
            {emailMsg && <p style={{ fontSize:12, marginBottom:12, fontWeight:600, color:emailMsg.includes('!')?'#059669':'#DC2626' }}>{emailMsg}</p>}
            <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'12px' }}
              onClick={sendEmailReport} disabled={emailSending}>
              {emailSending ? 'Enviando...' : '✉️ Enviar e-mail'}
            </button>
            <p style={{ fontSize:11, color:'#94A3B8', marginTop:10, textAlign:'center' }}>Configure RESEND_API_KEY no Vercel para ativar.</p>
          </div>
        </div>
      )}
    </div>
  );
}
