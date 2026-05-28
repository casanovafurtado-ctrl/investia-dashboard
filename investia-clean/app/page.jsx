'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';

// ─── Static reference data ────────────────────────────────────────────────────
const ALLOC_PROFILES = {
  conservador: [
    { name: 'Renda Fixa',    value: 60, color: '#2563EB' },
    { name: 'FIIs',          value: 25, color: '#059669' },
    { name: 'Acoes BR',      value: 10, color: '#D97706' },
    { name: 'Internacional', value:  5, color: '#7C3AED' },
  ],
  moderado: [
    { name: 'Acoes BR',      value: 35, color: '#2563EB' },
    { name: 'FIIs',          value: 25, color: '#059669' },
    { name: 'Renda Fixa',    value: 30, color: '#D97706' },
    { name: 'Internacional', value: 10, color: '#7C3AED' },
  ],
  arrojado: [
    { name: 'Acoes BR',      value: 50, color: '#2563EB' },
    { name: 'Internacional', value: 20, color: '#7C3AED' },
    { name: 'FIIs',          value: 15, color: '#059669' },
    { name: 'Renda Fixa',    value: 15, color: '#D97706' },
  ],
};


const ACOES_BASE = [
  { ticker:'PETR4', empresa:'Petrobras',       setor:'Energia',    pl:'5,1x', rec:'buy'  },
  { ticker:'ITUB4', empresa:'Itau Unibanco',   setor:'Financeiro', pl:'8,4x', rec:'buy'  },
  { ticker:'BBAS3', empresa:'Banco do Brasil', setor:'Financeiro', pl:'4,8x', rec:'buy'  },
  { ticker:'WEGE3', empresa:'WEG',             setor:'Industrial', pl:'28x',  rec:'buy'  },
  { ticker:'VALE3', empresa:'Vale',            setor:'Mineracao',  pl:'6,2x', rec:'hold' },
  { ticker:'RADL3', empresa:'Raia Drogasil',   setor:'Saude',      pl:'22x',  rec:'buy'  },
  { ticker:'RENT3', empresa:'Localiza',        setor:'Mobilidade', pl:'14x',  rec:'hold' },
  { ticker:'MGLU3', empresa:'Mag. Luiza',      setor:'Varejo',     pl:'neg',  rec:'sell' },
];

const FIIS_BASE = [
  { ticker:'MXRF11', nome:'Maxi Renda',     seg:'Papel/CRI',  pvp:'1,01x', rec:'buy'  },
  { ticker:'KNRI11', nome:'Kinea Renda',    seg:'Hibrido',    pvp:'0,94x', rec:'buy'  },
  { ticker:'HGLG11', nome:'CSHG Logistica', seg:'Logistica',  pvp:'0,88x', rec:'buy'  },
  { ticker:'XPLG11', nome:'XP Log',         seg:'Logistica',  pvp:'0,85x', rec:'buy'  },
  { ticker:'VISC11', nome:'Vinci Shopping', seg:'Shoppings',  pvp:'0,96x', rec:'hold' },
  { ticker:'BRCO11', nome:'Bresco Log.',    seg:'Logistica',  pvp:'0,91x', rec:'hold' },
];

const RF = [
  { prod:'Tesouro Selic 2027', taxa:'SELIC+0,06%',  prazo:'2 anos',  risco:'Minimo', rec:'buy'  },
  { prod:'Tesouro IPCA+ 2029', taxa:'IPCA+5,8%',    prazo:'4 anos',  risco:'Baixo',  rec:'buy'  },
  { prod:'Tesouro IPCA+ 2035', taxa:'IPCA+6,1%',    prazo:'10 anos', risco:'Baixo',  rec:'buy'  },
  { prod:'CDB 110% CDI',       taxa:'~11,4%/a',      prazo:'2 anos',  risco:'Baixo',  rec:'buy'  },
  { prod:'LCI/LCA 95% CDI',    taxa:'~9,9%/a liq.', prazo:'1 ano',   risco:'Baixo',  rec:'hold' },
];

const REC_CFG = {
  buy:  { label:'COMPRAR',  bg:'#D1FAE5', tc:'#065F46' },
  hold: { label:'AGUARDAR', bg:'#FEF3C7', tc:'#92400E' },
  sell: { label:'EVITAR',   bg:'#FEE2E2', tc:'#991B1B' },
};

const Badge = ({ rec }) => (
  <span style={{ background:REC_CFG[rec].bg, color:REC_CFG[rec].tc, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:6 }}>
    {REC_CFG[rec].label}
  </span>
);

const Pct = ({ val, positivo }) => {
  if (!val || val === '--') return <span style={{ color:'#94A3B8' }}>--</span>;
  return (
    <span style={{ color: positivo ? '#059669' : '#DC2626', fontWeight:600 }}>
      {val}
    </span>
  );
};

// ─── AI Prompts ────────────────────────────────────────────────────────────────
const buildPrompt = (type, profile, aporte, d, carteiraReal) => {
  const ctx = `Investidor ${profile}, aporte R$ ${Number(aporte).toLocaleString('pt-BR')}/mes. Data: ${d}.`;
  const carteiraCtx = carteiraReal?.length
    ? `Carteira atual do investidor: ${carteiraReal.map(c => `${c.ticker} (${c.qtd} cotas, preco medio R$ ${c.precoMedio})`).join(', ')}.`
    : '';

  const prompts = {
    news: `${ctx} Busque as noticias mais recentes e resuma: 1) TOP 3 NOTICIAS DE IMPACTO HOJE (IBOVESPA, cambio, juros); 2) TENDENCIA GERAL do mercado; 3) O QUE OBSERVAR ESTA SEMANA. Seja direto e pratico.`,
    rec:  `${ctx} Com base nos dados atuais do mercado, recomende: 1) TOP 3 ACOES para comprar (tickers e motivo); 2) TOP 2 FIIS (ticker, DY e motivo); 3) MELHOR RENDA FIXA agora; 4) MELHOR ETF INTERNACIONAL. Seja especifico.`,
    fiis: `${ctx} Analise: 1) IMPACTO DA SELIC no setor de FIIs; 2) MELHORES SEGMENTOS agora; 3) TOP 3 FIIS com melhor risco-retorno (tickers); 4) FIIS A EVITAR. Use dados atuais.`,
    macro:`${ctx} Analise macro: 1) FED E JUROS EUA impacto no Brasil; 2) USD/BRL perspectiva; 3) COMMODITIES tendencia; 4) SELIC proximo COPOM; 5) PRINCIPAL OPORTUNIDADE e PRINCIPAL RISCO. Fundamentado em dados recentes.`,
    carteira: `${ctx} ${carteiraCtx} Analise a carteira: 1) O QUE MANTER e por que; 2) O QUE COMPRAR MAIS agora; 3) O QUE VENDER ou reduzir; 4) AJUSTE IDEAL da alocacao considerando o cenario atual. Seja especifico com cada ativo.`,
    alertas: `${ctx} Liste: 1) TOP 5 ATIVOS PARA MONITORAR esta semana (tickers e por que); 2) EVENTOS MACRO DA SEMANA que podem mover o mercado; 3) SETORES EM DESTAQUE positivo e negativo. Seja objetivo.`,
  };
  return prompts[type] || type;
};

// ─── Overview Tab Component ───────────────────────────────────────────────────
function OverviewTab({ allocData, profile, profileLabels, aporte, marketData, marketLoading, acoesWithPrice, fiisWithPrice, carteiraReal, runAI, today }) {

  // Carteira resumo — safe calculation
  let totalCusto = 0, totalAtual = 0, carteiraOk = false;
  try {
    (carteiraReal || []).forEach(ativo => {
      if (!ativo || !ativo.ticker || !ativo.qtd || !ativo.precoMedio) return;
      const custo = Number(ativo.qtd) * Number(ativo.precoMedio);
      if (isNaN(custo)) return;
      totalCusto += custo;
      const acoes = Array.isArray(marketData?.acoes) ? marketData.acoes : [];
      const fiis  = Array.isArray(marketData?.fiis)  ? marketData.fiis  : [];
      const live  = [...acoes, ...fiis].find(m => m && m.ticker === ativo.ticker);
      const preco = live?.raw?.regularMarketPrice;
      if (preco && !isNaN(preco)) {
        totalAtual += Number(ativo.qtd) * preco;
        carteiraOk = true;
      }
    });
  } catch(e) { console.error('carteira calc error:', e); }

  const totalRes = totalAtual - totalCusto;
  const totalPct = totalCusto > 0 ? (totalRes / totalCusto) * 100 : 0;

  // Top movers — safe
  let topAlta = [], topBaixa = [];
  try {
    const acoes = Array.isArray(acoesWithPrice) ? acoesWithPrice : [];
    const fiis  = Array.isArray(fiisWithPrice)  ? fiisWithPrice  : [];
    const all   = [...acoes, ...fiis].filter(a => a && typeof a.variacao === 'string' && a.variacao !== '--' && a.positivo !== null && a.positivo !== undefined);
    topAlta  = all.filter(a => a.positivo === true).sort((a,b) => parseFloat(b.variacao) - parseFloat(a.variacao)).slice(0,3);
    topBaixa = all.filter(a => a.positivo === false).sort((a,b) => parseFloat(a.variacao) - parseFloat(b.variacao)).slice(0,3);
  } catch(e) { console.error('movers error:', e); }

  return (
    <div>
      {/* Botao analise IA */}
      <div style={{ background:'linear-gradient(135deg,#EFF6FF,#F0FDF4)', border:'1px solid #BFDBFE', borderRadius:14, padding:16, marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <p style={{ fontSize:13, fontWeight:700, color:'#1E40AF', marginBottom:3 }}>Analise IA do mercado</p>
          <p style={{ fontSize:12, color:'#3B82F6' }}>Clique para gerar uma analise completa com dados em tempo real</p>
        </div>
        <button onClick={() => runAI('news')} style={{ padding:'10px 18px', borderRadius:9, border:'none', background:'#2563EB', color:'white', fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
          Ver analise IA ↗
        </button>
      </div>

      {/* Carteira resumo + Alocacao */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
        <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:14, padding:16 }}>
          <p style={{ fontSize:11, color:'#64748B', textTransform:'uppercase', fontWeight:600, marginBottom:12 }}>Alocacao sugerida - {profileLabels[profile]}</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:8 }}>
            {allocData.map(d => (
              <span key={d.name} style={{ fontSize:11, color:'#64748B', display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ width:8, height:8, borderRadius:2, background:d.color, display:'inline-block' }} />{d.name} {d.value}%
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart><Pie data={allocData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2} dataKey="value">
              {allocData.map((d,i) => <Cell key={i} fill={d.color} />)}
            </Pie><Tooltip formatter={(v,n) => [`${v}%`,n]} /></PieChart>
          </ResponsiveContainer>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:8 }}>
            {allocData.map(d => (
              <div key={d.name} style={{ display:'flex', justifyContent:'space-between', background:'#F8FAFC', borderRadius:6, padding:'6px 10px' }}>
                <span style={{ fontSize:11, color:'#64748B' }}>{d.name}</span>
                <span style={{ fontSize:12, fontWeight:700, color:'#0F172A' }}>R$ {Math.round(aporte*d.value/100).toLocaleString('pt-BR')}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* Resumo carteira */}
          <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:14, padding:16 }}>
            <p style={{ fontSize:11, color:'#64748B', textTransform:'uppercase', fontWeight:600, marginBottom:12 }}>Minha carteira</p>
            {carteiraReal.length === 0 ? (
              <div style={{ textAlign:'center', padding:'16px 0' }}>
                <p style={{ fontSize:24, marginBottom:6 }}>📊</p>
                <p style={{ fontSize:12, color:'#94A3B8' }}>Nenhum ativo cadastrado</p>
                <button onClick={() => runAI('carteira')} style={{ marginTop:8, fontSize:12, padding:'6px 12px', borderRadius:7, border:'none', background:'#EFF6FF', color:'#2563EB', cursor:'pointer', fontWeight:600 }}>
                  Ir para Carteira →
                </button>
              </div>
            ) : (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                  <div style={{ background:'#F8FAFC', borderRadius:8, padding:'10px 12px' }}>
                    <p style={{ fontSize:10, color:'#64748B', marginBottom:2 }}>Custo total</p>
                    <p style={{ fontSize:15, fontWeight:700, color:'#0F172A' }}>R$ {totalCusto.toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
                  </div>
                  <div style={{ background: carteiraOk ? (totalRes >= 0 ? '#D1FAE5' : '#FEE2E2') : '#F8FAFC', borderRadius:8, padding:'10px 12px' }}>
                    <p style={{ fontSize:10, color:'#64748B', marginBottom:2 }}>Resultado</p>
                    <p style={{ fontSize:15, fontWeight:700, color: carteiraOk ? (totalRes >= 0 ? '#059669' : '#DC2626') : '#94A3B8' }}>
                      {carteiraOk ? `${totalRes >= 0 ? '+' : ''}R$ ${totalRes.toLocaleString('pt-BR',{minimumFractionDigits:2})}` : 'Aguardando cotacao'}
                    </p>
                  </div>
                </div>
                {carteiraOk && (
                  <div style={{ background: totalPct >= 0 ? '#D1FAE5' : '#FEE2E2', borderRadius:8, padding:'8px 12px', textAlign:'center' }}>
                    <span style={{ fontSize:14, fontWeight:800, color: totalPct >= 0 ? '#059669' : '#DC2626' }}>
                      {totalPct >= 0 ? '+' : ''}{totalPct.toFixed(2)}% no total
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Top movers */}
          <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:14, padding:16, flex:1 }}>
            <p style={{ fontSize:11, color:'#64748B', textTransform:'uppercase', fontWeight:600, marginBottom:10 }}>
              Maiores movimentos hoje
              {marketLoading && <span style={{ color:'#D97706', marginLeft:6 }}>carregando...</span>}
            </p>
            {topAlta.length === 0 && topBaixa.length === 0 ? (
              <p style={{ fontSize:12, color:'#94A3B8' }}>Cotacoes sendo carregadas...</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {topAlta.map(a => (
                  <div key={a.ticker} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 8px', background:'#F0FDF4', borderRadius:6 }}>
                    <span style={{ fontFamily:'monospace', fontWeight:700, fontSize:12, color:'#059669' }}>{a.ticker}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:'#059669' }}>{a.variacao}</span>
                  </div>
                ))}
                {topBaixa.map(a => (
                  <div key={a.ticker} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 8px', background:'#FEF2F2', borderRadius:6 }}>
                    <span style={{ fontFamily:'monospace', fontWeight:700, fontSize:12, color:'#DC2626' }}>{a.ticker}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:'#DC2626' }}>{a.variacao}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Destaques com cotacoes reais */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <p style={{ fontSize:11, color:'#64748B', textTransform:'uppercase', fontWeight:600 }}>Ativos em destaque — cotacoes ao vivo</p>
        <button onClick={() => runAI('rec')} style={{ fontSize:12, padding:'6px 14px', borderRadius:8, border:'1px solid #E2E8F0', background:'white', color:'#374151', cursor:'pointer' }}>Analise completa ↗</button>
      </div>
      {['PETR4','ITUB4','MXRF11','HGLG11','IVVB11','MGLU3'].map(ticker => {
        const ativo = [...(acoesWithPrice||[]), ...(fiisWithPrice||[])].find(a => a && a.ticker === ticker);
        const rec = ticker === 'MGLU3' ? 'sell' : ticker === 'IVVB11' ? 'buy' : ativo?.rec || 'hold';
        const desc = {
          PETR4: 'Petrobras - dividendos elevados, exposicao ao petroleo',
          ITUB4: 'Itau Unibanco - banco lider com solida gestao de capital',
          MXRF11: 'Maxi Renda FII - papel/CRI com proventos mensais',
          HGLG11: 'CSHG Logistica FII - galpoes logisticos premium',
          IVVB11: 'ETF S&P 500 em R$ - diversificacao internacional',
          MGLU3: 'Magazine Luiza - alta volatilidade, aguardar recuperacao',
        }[ticker] || '';
        return (
          <div key={ticker} style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:12, padding:'12px 16px', marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:3 }}>
                <span style={{ fontFamily:'monospace', fontWeight:800, fontSize:14, color:'#0F172A' }}>{ticker}</span>
                {ativo?.preco !== '--' && <span style={{ fontSize:14, fontWeight:700, color:'#0F172A' }}>R$ {ativo.preco}</span>}
                {ativo?.variacao !== '--' && <span style={{ fontSize:13, fontWeight:700, color: ativo.positivo ? '#059669' : '#DC2626' }}>{ativo.variacao}</span>}
                {(!ativo || ativo.preco === '--') && <span style={{ fontSize:11, color:'#94A3B8' }}>cotacao indisponivel</span>}
              </div>
              <p style={{ fontSize:12, color:'#64748B' }}>{desc}</p>
            </div>
            <div style={{ flexShrink:0 }}>
              <span style={{ background: rec==='buy'?'#D1FAE5':rec==='sell'?'#FEE2E2':'#FEF3C7', color: rec==='buy'?'#065F46':rec==='sell'?'#991B1B':'#92400E', fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:6 }}>
                {rec==='buy'?'COMPRAR':rec==='sell'?'EVITAR':'AGUARDAR'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [showSplash, setShowSplash]   = useState(true);
  const [tab, setTab]                 = useState('overview');
  const [profile, setProfile]         = useState('moderado');
  const [aporte, setAporte]           = useState(5000);
  const [aiTitle, setAiTitle]         = useState('');
  const [aiText, setAiText]           = useState('');
  const [aiLoading, setAiLoading]     = useState(false);
  const [showEmail, setShowEmail]     = useState(false);
  const [email, setEmail]             = useState('');
  const [emailType, setEmailType]     = useState('summary');
  const [emailSending, setEmailSending] = useState(false);
  const [emailMsg, setEmailMsg]       = useState('');
  const [pdfMsg, setPdfMsg]           = useState('');
  const [now, setNow]                 = useState('');
  const [marketData, setMarketData]   = useState(null);
  const [marketLoading, setMarketLoading] = useState(true);
  const CARTEIRA_INICIAL = [
    { ticker:'PETR4',  qtd:'100', precoMedio:'38.50' },
    { ticker:'ITUB4',  qtd:'100', precoMedio:'35.20' },
    { ticker:'BBAS3',  qtd:'100', precoMedio:'28.90' },
    { ticker:'MXRF11', qtd:'200', precoMedio:'10.85' },
    { ticker:'HGLG11', qtd:'50',  precoMedio:'162.00' },
    { ticker:'IVVB11', qtd:'30',  precoMedio:'285.00' },
  ];
  const [carteiraReal, setCarteiraReal] = useState(CARTEIRA_INICIAL);
  const [novoAtivo, setNovoAtivo]     = useState({ ticker:'', qtd:'', precoMedio:'' });
  const pdfRef = useRef(null);

  const profileLabels = { conservador:'Conservador', moderado:'Moderado', arrojado:'Arrojado' };
  const allocData = ALLOC_PROFILES[profile];
  const today = () => new Date().toLocaleDateString('pt-BR');

  // ── Load market data ─────────────────────────────────────────────────────────
  const loadMarket = useCallback(async () => {
    setMarketLoading(true);
    try {
      const res = await fetch('/api/market');
      const data = await res.json();
      if (!data.error) setMarketData(data);
    } catch {}
    finally { setMarketLoading(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('investia_profile');
    if (saved) {
      const p = JSON.parse(saved);
      setProfile(p.profile || 'moderado');
      setAporte(p.aporte || 5000);
    }
    const savedCarteira = localStorage.getItem('investia_carteira');
    if (savedCarteira) {
      const parsed = JSON.parse(savedCarteira);
      if (Array.isArray(parsed) && parsed.length > 0) setCarteiraReal(parsed);
    }

    const tick = () => setNow(new Date().toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' }));
    tick();
    const id = setInterval(tick, 30000);
    loadMarket();
    const mktId = setInterval(loadMarket, 5 * 60 * 1000); // refresh every 5min
    return () => { clearInterval(id); clearInterval(mktId); };
  }, [loadMarket]);

  // ── Merge market data with base data ─────────────────────────────────────────
  const acoesWithPrice = (ACOES_BASE || []).map(a => {
    if (!a) return null;
    const live = marketData?.acoes?.find(m => m && m.ticker === a.ticker);
    return { ...a, preco: live?.preco ?? '--', variacao: live?.variacao ?? '--', positivo: live?.positivo ?? null };
  }).filter(Boolean);

  const fiisWithPrice = (FIIS_BASE || []).map(f => {
    if (!f) return null;
    const live = marketData?.fiis?.find(m => m && m.ticker === f.ticker);
    return { ...f, preco: live?.preco ?? '--', variacao: live?.variacao ?? '--', positivo: live?.positivo ?? null };
  }).filter(Boolean);

  // ── Carteira real ────────────────────────────────────────────────────────────
  const adicionarAtivo = () => {
    if (!novoAtivo.ticker || !novoAtivo.qtd || !novoAtivo.precoMedio) return;
    const novaCarteira = [...carteiraReal, { ...novoAtivo, ticker: novoAtivo.ticker.toUpperCase() }];
    setCarteiraReal(novaCarteira);
    localStorage.setItem('investia_carteira', JSON.stringify(novaCarteira));
    setNovoAtivo({ ticker:'', qtd:'', precoMedio:'' });
  };

  const removerAtivo = (idx) => {
    const nova = carteiraReal.filter((_, i) => i !== idx);
    setCarteiraReal(nova);
    localStorage.setItem('investia_carteira', JSON.stringify(nova));
  };

  const calcCarteiraAtivo = (ativo) => {
    const live = marketData?.acoes?.find(m => m.ticker === ativo.ticker)
              || marketData?.fiis?.find(m => m.ticker === ativo.ticker);
    const precoAtual = live?.raw?.regularMarketPrice;
    const custo = Number(ativo.qtd) * Number(ativo.precoMedio);
    const atual = precoAtual ? Number(ativo.qtd) * precoAtual : null;
    const resultado = atual ? atual - custo : null;
    const pct = resultado ? (resultado / custo) * 100 : null;
    return {
      custo: custo.toLocaleString('pt-BR', { minimumFractionDigits:2 }),
      atual: atual ? atual.toLocaleString('pt-BR', { minimumFractionDigits:2 }) : '--',
      resultado: resultado ? resultado.toLocaleString('pt-BR', { minimumFractionDigits:2 }) : '--',
      pct: pct ? `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%` : '--',
      positivo: resultado ? resultado >= 0 : null,
      precoAtual: precoAtual ? precoAtual.toLocaleString('pt-BR', { minimumFractionDigits:2 }) : '--',
    };
  };

  // ── AI ───────────────────────────────────────────────────────────────────────
  async function runAI(type, customPrompt) {
    const titles = {
      news:'Noticias do mercado hoje', rec:'Melhores investimentos agora',
      carteira:'Analise da carteira', alertas:'Alertas da semana',
      fiis:'Panorama dos FIIs', macro:'Cenario macro global',
    };
    setAiTitle(titles[type] || 'Analise personalizada');
    setAiText(''); setAiLoading(true); setTab('ia');
    try {
      const prompt = customPrompt || buildPrompt(type, profileLabels[profile], aporte, today(), carteiraReal);
      const res = await fetch('/api/analyze', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setAiText(data.result || 'Analise nao disponivel. Tente novamente.');
    } catch { setAiText('Erro ao conectar. Tente novamente.'); }
    finally { setAiLoading(false); }
  }

  // ── PDF ──────────────────────────────────────────────────────────────────────
  async function exportPDF(type) {
    setPdfMsg('Gerando PDF...');
    try {
      const jsPDF   = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;
      const el = pdfRef.current;
      if (!el) { setPdfMsg('Erro.'); return; }

      el.innerHTML = type === 'summary' ? buildSummaryHTML() : buildAiHTML();
      el.style.display = 'block';
      await new Promise(r => setTimeout(r, 300));

      const pdf         = new jsPDF({ orientation:'portrait', unit:'pt', format:'a4' });
      const pageW       = pdf.internal.pageSize.getWidth();   // 595pt
      const pageH       = pdf.internal.pageSize.getHeight();  // 842pt
      const marginX     = 36;   // pt
      const marginTop   = 20;   // pt first page (header already in HTML)
      const marginTopCont = 56; // pt continuation pages (space for mini-header)
      const marginBot   = 36;   // pt

      // ── Render full HTML to canvas ─────────────────────────────────────
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
      });
      el.style.display = 'none';

      const imgData   = canvas.toDataURL('image/png');
      const imgW      = pageW - marginX * 2;
      const imgH      = (canvas.height / canvas.width) * imgW;

      // ── Calculate usable height per page ──────────────────────────────
      const firstPageH = pageH - marginTop  - marginBot;
      const contPageH  = pageH - marginTopCont - marginBot;

      let renderedPt = 0; // how many pt of image already placed
      let pageNum    = 0;

      while (renderedPt < imgH) {
        if (pageNum > 0) {
          pdf.addPage();
          // Mini header on continuation pages
          pdf.setFillColor(37, 99, 235); // #2563EB
          pdf.rect(0, 0, pageW, 44, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(15);
          pdf.text('InvestIA', marginX, 28);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.text('Dashboard de Mercado Financeiro', marginX + 72, 28);
          pdf.setFontSize(10);
          pdf.text(today(), pageW - marginX, 28, { align: 'right' });
          pdf.setTextColor(0, 0, 0);
        }

        const availH    = pageNum === 0 ? firstPageH : contPageH;
        const topY      = pageNum === 0 ? marginTop  : marginTopCont;

        // How many pt of image fit this page
        const sliceH    = Math.min(availH, imgH - renderedPt);

        // Source crop in canvas pixels
        const srcY      = (renderedPt / imgH) * canvas.height;
        const srcH      = (sliceH   / imgH) * canvas.height;

        // Create a temp canvas for this slice
        const slice = document.createElement('canvas');
        slice.width  = canvas.width;
        slice.height = Math.ceil(srcH);
        const ctx = slice.getContext('2d');
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, Math.ceil(srcH));

        pdf.addImage(slice.toDataURL('image/png'), 'PNG', marginX, topY, imgW, sliceH);

        renderedPt += sliceH;
        pageNum++;
      }

      // Page numbers
      const total = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setTextColor(150,150,150);
        pdf.text(`${i} / ${total}`, pageW / 2, pageH - 14, { align:'center' });
      }

      pdf.save(`InvestIA_${type==='summary'?'Resumo':'Analise'}_${today().replace(/\//g,'-')}.pdf`);
      setPdfMsg('PDF baixado!');
    } catch(e) { setPdfMsg('Erro: '+e.message); console.error(e); }
    setTimeout(() => setPdfMsg(''), 5000);
  }

  function buildSummaryHTML() {
    return `<div style="font-family:Arial,sans-serif;padding:0;background:white;">
      <div style="background:linear-gradient(135deg,#1E3A8A,#2563EB);padding:36px 40px;">
        <div style="font-size:26px;font-weight:800;color:white;">InvestIA Dashboard</div>
        <div style="color:rgba(255,255,255,.75);font-size:13px;margin-top:6px;">Resumo do Mercado - ${today()} - Perfil ${profileLabels[profile]}</div>
      </div>
      <div style="padding:28px 40px;">
        <h2 style="font-size:15px;color:#2563EB;margin-bottom:12px;">INDICADORES</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
          <tr style="background:#F8FAFC;">
            <th style="padding:8px 12px;text-align:left;color:#64748B;">Indicador</th>
            <th style="padding:8px 12px;text-align:left;color:#64748B;">Valor</th>
            <th style="padding:8px 12px;text-align:left;color:#64748B;">Variacao</th>
          </tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;">IBOVESPA</td><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:700;">${marketData?.ibov?.valor || '--'}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${marketData?.ibov?.variacao || '--'}</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;">USD/BRL</td><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:700;">R$ ${marketData?.dolar?.valor || '--'}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${marketData?.dolar?.variacao || '--'}</td></tr>
          <tr><td style="padding:8px 12px;">SELIC</td><td style="padding:8px 12px;font-weight:700;">13,00% a.a.</td><td style="padding:8px 12px;">ao ano</td></tr>
        </table>
        <h2 style="font-size:15px;color:#2563EB;margin-bottom:12px;">ALOCACAO SUGERIDA - ${profileLabels[profile].toUpperCase()}</h2>
        ${allocData.map(d => `<div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #eee;">
          <span>${d.name}</span><strong>${d.value}% = R$ ${Math.round(aporte*d.value/100).toLocaleString('pt-BR')}</strong>
        </div>`).join('')}
        <p style="font-size:11px;color:#94A3B8;margin-top:24px;">InvestIA - ${new Date().toLocaleString('pt-BR')} - Nao constitui recomendacao formal de investimento.</p>
      </div>
    </div>`;
  }

  function buildAiHTML() {
    return `<div style="font-family:Arial,sans-serif;padding:0;background:white;">
      <div style="background:linear-gradient(135deg,#1E3A8A,#2563EB);padding:36px 40px;">
        <div style="font-size:26px;font-weight:800;color:white;">InvestIA - Analise IA</div>
        <div style="color:rgba(255,255,255,.75);font-size:13px;margin-top:6px;">${aiTitle} - ${today()}</div>
      </div>
      <div style="padding:28px 40px;">
        <div style="background:#F8FAFC;border-left:4px solid #2563EB;border-radius:8px;padding:20px;font-size:14px;line-height:1.8;color:#1E293B;white-space:pre-wrap;">${aiText}</div>
        <p style="font-size:11px;color:#94A3B8;margin-top:20px;">InvestIA - Claude Sonnet - ${new Date().toLocaleString('pt-BR')} - Nao constitui recomendacao formal de investimento.</p>
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
      if (data.success) { setEmailMsg('E-mail enviado!'); setTimeout(() => { setShowEmail(false); setEmailMsg(''); }, 2000); }
      else setEmailMsg('Erro: '+(data.error||'tente novamente.'));
    } catch { setEmailMsg('Erro ao enviar.'); }
    finally { setEmailSending(false); }
  }

  const TABS = [
    { id:'overview', label:'Visao Geral' },
    { id:'carteira', label:'Carteira' },
    { id:'acoes',    label:'Acoes BR' },
    { id:'fiis',     label:'FIIs' },
    { id:'rf',       label:'Renda Fixa' },
    { id:'intl',     label:'Internacional' },
    { id:'ia',       label:'Analise IA' },
    { id:'perfil',   label:'Meu Perfil' },
  ];

  // ── Splash ───────────────────────────────────────────────────────────────────
  if (showSplash) return (
    <div style={{ position:'fixed', inset:0, background:'linear-gradient(135deg,#1E3A8A,#2563EB)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ fontSize:52, fontWeight:800, color:'white', letterSpacing:'-2px' }}>
        Invest<span style={{ color:'#93C5FD' }}>IA</span>
      </div>
      <div style={{ color:'rgba(255,255,255,.7)', fontSize:14, marginTop:8 }}>Dashboard de Mercado Financeiro</div>
      <div style={{ width:200, height:3, background:'rgba(255,255,255,.2)', borderRadius:2, marginTop:40, overflow:'hidden' }}>
        <div style={{ height:'100%', background:'white', borderRadius:2, animation:'progress 2.5s ease forwards' }} />
      </div>
      <style>{`@keyframes progress { from{width:0} to{width:100%} }`}</style>
    </div>
  );

  // Safety: ensure arrays are always valid before render
  const safeAcoes = Array.isArray(acoesWithPrice) ? acoesWithPrice.filter(Boolean) : [];
  const safeFiis  = Array.isArray(fiisWithPrice)  ? fiisWithPrice.filter(Boolean)  : [];

  return (
    <div style={{ minHeight:'100vh', background:'#F8FAFC' }}>
      <div style={{ maxWidth:1024, margin:'0 auto', padding:'20px 16px 80px' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'#0F172A', letterSpacing:'-0.5px', margin:0 }}>
              <span style={{ color:'#2563EB' }}>◆</span> InvestIA
            </h1>
            <p style={{ fontSize:12, color:'#64748B', marginTop:2 }}>
              {profileLabels[profile]} · R$ {Number(aporte).toLocaleString('pt-BR')}/mes
              {marketData?.updatedAt && <span style={{ color:'#059669' }}> · Atualizado {marketData.updatedAt}</span>}
            </p>
          </div>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:12, color:'#64748B' }}>{now}</p>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:4, marginTop:2 }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background: marketLoading ? '#D97706' : '#059669', display:'inline-block' }} />
              <span style={{ fontSize:12, color: marketLoading ? '#D97706' : '#059669' }}>
                {marketLoading ? 'Atualizando...' : 'Ao vivo'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
          {[
            { label:'IBOVESPA', val: marketData?.ibov?.valor ? `${marketData.ibov.valor} pts` : '--', var: marketData?.ibov?.variacao, pos: marketData?.ibov?.positivo },
            { label:'USD/BRL',  val: marketData?.dolar?.valor ? `R$ ${marketData.dolar.valor}` : '--', var: marketData?.dolar?.variacao, pos: marketData?.dolar?.positivo },
            { label:'SELIC',    val:'13,00%', var:'ao ano', pos: null },
            { label:'S&P 500',  val:'ao vivo', var:'use IA →', pos: null, action:()=>runAI('macro') },
          ].map(c => (
            <div key={c.label} style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:12, padding:'14px 16px' }}>
              <p style={{ fontSize:10, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>{c.label}</p>
              <p style={{ fontSize:18, fontWeight:800, color:'#0F172A' }}>{c.val}</p>
              <p style={{ fontSize:11, marginTop:3, color: c.action ? '#2563EB' : (c.pos === true ? '#059669' : c.pos === false ? '#DC2626' : '#94A3B8'), cursor: c.action ? 'pointer' : 'default', fontWeight: c.pos !== null ? 600 : 400 }}
                 onClick={c.action}>{c.var}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid #E2E8F0', marginBottom:20, overflowX:'auto' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:'10px 16px', fontSize:13, fontWeight:500, whiteSpace:'nowrap', border:'none', background:'transparent', cursor:'pointer', color: tab===t.id ? '#2563EB' : '#64748B', borderBottom: tab===t.id ? '2px solid #2563EB' : '2px solid transparent', transition:'all .15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* VISAO GERAL */}
        {tab==='overview' && (
          <OverviewTab
            allocData={allocData}
            profile={profile}
            profileLabels={profileLabels}
            aporte={aporte}
            marketData={marketData}
            marketLoading={marketLoading}
            acoesWithPrice={safeAcoes}
            fiisWithPrice={safeFiis}
            carteiraReal={carteiraReal}
            runAI={runAI}
            today={today}
          />
        )}

        {/* CARTEIRA */}
        {tab==='carteira' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <p style={{ fontSize:11, color:'#64748B', textTransform:'uppercase', fontWeight:600 }}>Minha carteira real</p>
              <button onClick={() => runAI('carteira')} style={{ fontSize:13, padding:'8px 16px', borderRadius:9, border:'none', background:'#2563EB', color:'white', cursor:'pointer', fontWeight:500 }}>Analisar com IA</button>
            </div>

            {/* Adicionar ativo */}
            <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:14, padding:16, marginBottom:16 }}>
              <p style={{ fontSize:13, fontWeight:600, color:'#0F172A', marginBottom:12 }}>Adicionar ativo</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:8 }}>
                <input value={novoAtivo.ticker} onChange={e => setNovoAtivo({...novoAtivo, ticker:e.target.value.toUpperCase()})}
                  placeholder="Ticker (ex: PETR4)"
                  style={{ border:'1px solid #E2E8F0', borderRadius:8, padding:'9px 12px', fontSize:13, fontFamily:'monospace' }} />
                <input value={novoAtivo.qtd} onChange={e => setNovoAtivo({...novoAtivo, qtd:e.target.value})}
                  placeholder="Quantidade" type="number"
                  style={{ border:'1px solid #E2E8F0', borderRadius:8, padding:'9px 12px', fontSize:13 }} />
                <input value={novoAtivo.precoMedio} onChange={e => setNovoAtivo({...novoAtivo, precoMedio:e.target.value})}
                  placeholder="Preco medio (R$)" type="number"
                  style={{ border:'1px solid #E2E8F0', borderRadius:8, padding:'9px 12px', fontSize:13 }} />
                <button onClick={adicionarAtivo}
                  style={{ padding:'9px 16px', borderRadius:8, border:'none', background:'#2563EB', color:'white', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  + Adicionar
                </button>
              </div>
            </div>

            {/* Lista de ativos */}
            {carteiraReal.length === 0 ? (
              <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:14, padding:40, textAlign:'center' }}>
                <p style={{ fontSize:32, marginBottom:12 }}>📊</p>
                <p style={{ fontSize:14, color:'#64748B' }}>Sua carteira esta vazia. Adicione seus ativos acima!</p>
              </div>
            ) : (
              <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:14, overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'#F8FAFC' }}>
                      {['Ticker','Qtd','Preco Medio','Preco Atual','Custo Total','Valor Atual','Resultado','%',''].map(h => (
                        <th key={h} style={{ padding:'10px 12px', textAlign:'left', color:'#64748B', fontSize:11, fontWeight:600, textTransform:'uppercase', borderBottom:'1px solid #E2E8F0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {carteiraReal.map((ativo, idx) => {
                      const calc = calcCarteiraAtivo(ativo);
                      return (
                        <tr key={idx} style={{ borderBottom:'1px solid #F1F5F9' }}>
                          <td style={{ padding:'10px 12px', fontFamily:'monospace', fontWeight:700, color:'#2563EB' }}>{ativo.ticker}</td>
                          <td style={{ padding:'10px 12px', color:'#374151' }}>{ativo.qtd}</td>
                          <td style={{ padding:'10px 12px', color:'#374151' }}>R$ {Number(ativo.precoMedio).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                          <td style={{ padding:'10px 12px', fontWeight:600 }}>R$ {calc.precoAtual}</td>
                          <td style={{ padding:'10px 12px', color:'#374151' }}>R$ {calc.custo}</td>
                          <td style={{ padding:'10px 12px', fontWeight:600 }}>R$ {calc.atual}</td>
                          <td style={{ padding:'10px 12px', fontWeight:600, color: calc.positivo === true ? '#059669' : calc.positivo === false ? '#DC2626' : '#94A3B8' }}>
                            {calc.resultado !== '--' ? `R$ ${calc.resultado}` : '--'}
                          </td>
                          <td style={{ padding:'10px 12px', fontWeight:700, color: calc.positivo === true ? '#059669' : calc.positivo === false ? '#DC2626' : '#94A3B8' }}>{calc.pct}</td>
                          <td style={{ padding:'10px 12px' }}>
                            <button onClick={() => removerAtivo(idx)} style={{ background:'#FEE2E2', color:'#991B1B', border:'none', borderRadius:6, padding:'4px 10px', fontSize:11, cursor:'pointer', fontWeight:600 }}>Remover</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Totais */}
                {carteiraReal.length > 0 && (() => {
                  let totalCusto = 0, totalAtual = 0;
                  carteiraReal.forEach(ativo => {
                    const calc = calcCarteiraAtivo(ativo);
                    totalCusto += Number(ativo.qtd) * Number(ativo.precoMedio);
                    const live = marketData?.acoes?.find(m => m.ticker === ativo.ticker) || marketData?.fiis?.find(m => m.ticker === ativo.ticker);
                    if (live?.raw?.regularMarketPrice) totalAtual += Number(ativo.qtd) * live.raw.regularMarketPrice;
                  });
                  const totalRes = totalAtual - totalCusto;
                  const totalPct = totalCusto > 0 ? (totalRes / totalCusto) * 100 : 0;
                  return (
                    <div style={{ padding:'12px 16px', background:'#F8FAFC', borderTop:'2px solid #E2E8F0', display:'flex', gap:24, flexWrap:'wrap' }}>
                      <div><span style={{ fontSize:11, color:'#64748B' }}>Custo Total: </span><strong>R$ {totalCusto.toLocaleString('pt-BR', {minimumFractionDigits:2})}</strong></div>
                      {totalAtual > 0 && <>
                        <div><span style={{ fontSize:11, color:'#64748B' }}>Valor Atual: </span><strong>R$ {totalAtual.toLocaleString('pt-BR', {minimumFractionDigits:2})}</strong></div>
                        <div><span style={{ fontSize:11, color:'#64748B' }}>Resultado: </span>
                          <strong style={{ color: totalRes >= 0 ? '#059669' : '#DC2626' }}>
                            R$ {totalRes.toLocaleString('pt-BR', {minimumFractionDigits:2})} ({totalPct >= 0 ? '+' : ''}{totalPct.toFixed(2)}%)
                          </strong>
                        </div>
                      </>}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ACOES */}
        {tab==='acoes' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <p style={{ fontSize:11, color:'#64748B', textTransform:'uppercase', fontWeight:600 }}>Acoes - Bovespa - Tempo Real</p>
                {marketData?.updatedAt && <p style={{ fontSize:11, color:'#059669', marginTop:2 }}>Atualizado as {marketData.updatedAt}</p>}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={loadMarket} style={{ fontSize:12, padding:'6px 12px', borderRadius:8, border:'1px solid #E2E8F0', background:'white', color:'#374151', cursor:'pointer' }}>↻ Atualizar</button>
                <button onClick={() => runAI('rec')} style={{ fontSize:12, padding:'6px 14px', borderRadius:8, border:'1px solid #E2E8F0', background:'white', color:'#374151', cursor:'pointer' }}>Analisar com IA ↗</button>
              </div>
            </div>
            <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:14, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead><tr style={{ background:'#F8FAFC' }}>
                  {['Ticker','Empresa','Setor','P/L','Preco','Variacao','Rec.'].map(h => (
                    <th key={h} style={{ padding:'10px 12px', textAlign:'left', color:'#64748B', fontSize:11, fontWeight:600, textTransform:'uppercase', borderBottom:'1px solid #E2E8F0' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {safeAcoes.map(a => (
                    <tr key={a.ticker} style={{ borderBottom:'1px solid #F1F5F9' }}>
                      <td style={{ padding:'10px 12px', fontFamily:'monospace', fontWeight:700, color:'#2563EB' }}>{a.ticker}</td>
                      <td style={{ padding:'10px 12px', fontWeight:500 }}>{a.empresa}</td>
                      <td style={{ padding:'10px 12px', color:'#64748B', fontSize:12 }}>{a.setor}</td>
                      <td style={{ padding:'10px 12px', color:'#64748B' }}>{a.pl}</td>
                      <td style={{ padding:'10px 12px', fontWeight:700 }}>{a.preco !== '--' ? `R$ ${a.preco}` : <span style={{color:'#94A3B8'}}>--</span>}</td>
                      <td style={{ padding:'10px 12px' }}><Pct val={a.variacao} positivo={a.positivo} /></td>
                      <td style={{ padding:'10px 12px' }}><Badge rec={a.rec} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FIIS */}
        {tab==='fiis' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <p style={{ fontSize:11, color:'#64748B', textTransform:'uppercase', fontWeight:600 }}>Fundos Imobiliarios - Tempo Real</p>
                {marketData?.updatedAt && <p style={{ fontSize:11, color:'#059669', marginTop:2 }}>Atualizado as {marketData.updatedAt}</p>}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={loadMarket} style={{ fontSize:12, padding:'6px 12px', borderRadius:8, border:'1px solid #E2E8F0', background:'white', color:'#374151', cursor:'pointer' }}>↻ Atualizar</button>
                <button onClick={() => runAI('fiis')} style={{ fontSize:12, padding:'6px 14px', borderRadius:8, border:'1px solid #E2E8F0', background:'white', color:'#374151', cursor:'pointer' }}>Analisar com IA ↗</button>
              </div>
            </div>
            <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:14, overflow:'hidden', marginBottom:16 }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead><tr style={{ background:'#F8FAFC' }}>
                  {['Ticker','Fundo','Segmento','P/VP','Preco','Variacao','Rec.'].map(h => (
                    <th key={h} style={{ padding:'10px 12px', textAlign:'left', color:'#64748B', fontSize:11, fontWeight:600, textTransform:'uppercase', borderBottom:'1px solid #E2E8F0' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {safeFiis.map(f => (
                    <tr key={f.ticker} style={{ borderBottom:'1px solid #F1F5F9' }}>
                      <td style={{ padding:'10px 12px', fontFamily:'monospace', fontWeight:700, color:'#059669' }}>{f.ticker}</td>
                      <td style={{ padding:'10px 12px', fontWeight:500 }}>{f.nome}</td>
                      <td style={{ padding:'10px 12px', color:'#64748B', fontSize:12 }}>{f.seg}</td>
                      <td style={{ padding:'10px 12px', color:'#64748B' }}>{f.pvp}</td>
                      <td style={{ padding:'10px 12px', fontWeight:700 }}>{f.preco !== '--' ? `R$ ${f.preco}` : <span style={{color:'#94A3B8'}}>--</span>}</td>
                      <td style={{ padding:'10px 12px' }}><Pct val={f.variacao} positivo={f.positivo} /></td>
                      <td style={{ padding:'10px 12px' }}><Badge rec={f.rec} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* RENDA FIXA */}
        {tab==='rf' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
              {[{l:'SELIC',v:'13,00%',s:'ao ano'},{l:'CDI',v:'12,90%',s:'ao ano'},{l:'IPCA 12m',v:'~4,8%',s:'estimativa'}].map(c => (
                <div key={c.l} style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:12, padding:'14px 16px' }}>
                  <p style={{ fontSize:10, color:'#94A3B8', textTransform:'uppercase', marginBottom:4 }}>{c.l}</p>
                  <p style={{ fontSize:22, fontWeight:800, color:'#0F172A' }}>{c.v}</p>
                  <p style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>{c.s}</p>
                </div>
              ))}
            </div>
            <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:14, overflow:'hidden', marginBottom:16 }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead><tr style={{ background:'#F8FAFC' }}>
                  {['Produto','Taxa','Prazo','Risco','Rec.'].map(h => (
                    <th key={h} style={{ padding:'10px 12px', textAlign:'left', color:'#64748B', fontSize:11, fontWeight:600, textTransform:'uppercase', borderBottom:'1px solid #E2E8F0' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {RF.map(r => (
                    <tr key={r.prod} style={{ borderBottom:'1px solid #F1F5F9' }}>
                      <td style={{ padding:'10px 12px', fontWeight:600 }}>{r.prod}</td>
                      <td style={{ padding:'10px 12px', fontFamily:'monospace', fontWeight:700, color:'#1D4ED8' }}>{r.taxa}</td>
                      <td style={{ padding:'10px 12px', color:'#64748B' }}>{r.prazo}</td>
                      <td style={{ padding:'10px 12px', color:'#64748B', fontSize:12 }}>{r.risco}</td>
                      <td style={{ padding:'10px 12px' }}><Badge rec={r.rec} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={() => runAI('macro')} style={{ fontSize:13, padding:'9px 18px', borderRadius:9, border:'1px solid #E2E8F0', background:'white', color:'#374151', cursor:'pointer', fontWeight:500 }}>Analise macro e renda fixa ↗</button>
          </div>
        )}

        {/* INTERNACIONAL */}
        {tab==='intl' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
              {[{l:'S&P 500',v:'~5.600'},{l:'Fed Funds',v:'4,25-4,5%'},{l:'Nasdaq',v:'~17.500'},{l:'Ouro/oz',v:'~US$3.2k'}].map(c => (
                <div key={c.l} style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:12, padding:'14px 16px' }}>
                  <p style={{ fontSize:10, color:'#94A3B8', textTransform:'uppercase', marginBottom:4 }}>{c.l}</p>
                  <p style={{ fontSize:18, fontWeight:800, color:'#0F172A' }}>{c.v}</p>
                </div>
              ))}
            </div>
            <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:14, overflow:'hidden', marginBottom:16 }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead><tr style={{ background:'#F8FAFC' }}>
                  {['Ativo','Descricao','Risco','Rec.'].map(h => (
                    <th key={h} style={{ padding:'10px 12px', textAlign:'left', color:'#64748B', fontSize:11, fontWeight:600, textTransform:'uppercase', borderBottom:'1px solid #E2E8F0' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {[
                    { a:'IVVB11', d:'ETF S&P 500 em R$',     r:'Medio',      rec:'buy'  },
                    { a:'QDVH11', d:'ETF dividendos globais', r:'Medio',      rec:'buy'  },
                    { a:'GOLD11', d:'ETF ouro em R$',         r:'Medio',      rec:'hold' },
                    { a:'BDR AAPL34', d:'BDR Apple via B3',   r:'Medio-alto', rec:'hold' },
                  ].map(a => (
                    <tr key={a.a} style={{ borderBottom:'1px solid #F1F5F9' }}>
                      <td style={{ padding:'10px 12px', fontFamily:'monospace', fontWeight:700, color:'#7C3AED' }}>{a.a}</td>
                      <td style={{ padding:'10px 12px' }}>{a.d}</td>
                      <td style={{ padding:'10px 12px', color:'#64748B', fontSize:12 }}>{a.r}</td>
                      <td style={{ padding:'10px 12px' }}><Badge rec={a.rec} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={() => runAI('macro')} style={{ fontSize:13, padding:'9px 18px', borderRadius:9, border:'1px solid #E2E8F0', background:'white', color:'#374151', cursor:'pointer', fontWeight:500 }}>Analise do cenario global ↗</button>
          </div>
        )}

        {/* ANALISE IA */}
        {tab==='ia' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <p style={{ fontSize:11, color:'#64748B', textTransform:'uppercase', fontWeight:600 }}>Analise em tempo real</p>
              <span style={{ fontSize:11, background:'#D1FAE5', color:'#065F46', padding:'3px 10px', borderRadius:6, fontWeight:600 }}>Claude Sonnet + Web Search</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
              {[
                { id:'news',     icon:'📰', label:'Noticias do mercado hoje' },
                { id:'rec',      icon:'⭐', label:'Melhores investimentos agora' },
                { id:'carteira', icon:'📊', label:'Analisar minha carteira' },
                { id:'alertas',  icon:'🔔', label:'Alertas da semana' },
                { id:'fiis',     icon:'🏢', label:'Panorama dos FIIs' },
                { id:'macro',    icon:'🌎', label:'Cenario macro global' },
              ].map(b => (
                <button key={b.id} onClick={() => runAI(b.id)} disabled={aiLoading}
                  style={{ padding:14, textAlign:'left', borderRadius:12, border:'1px solid #E2E8F0', background:'white', cursor: aiLoading ? 'wait' : 'pointer' }}>
                  <span style={{ fontSize:20, display:'block', marginBottom:6 }}>{b.icon}</span>
                  <span style={{ fontSize:13, color:'#374151', fontWeight:500 }}>{b.label}</span>
                </button>
              ))}
            </div>

            <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:12, padding:16, marginBottom:16 }}>
              <p style={{ fontSize:12, color:'#64748B', fontWeight:500, marginBottom:8 }}>Consulta personalizada</p>
              <div style={{ display:'flex', gap:8 }}>
                <input id="custom-q" type="text"
                  placeholder="Ex: Vale a pena comprar PETR4 agora?"
                  style={{ flex:1, border:'1px solid #E2E8F0', borderRadius:9, padding:'9px 14px', fontSize:13, outline:'none' }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      const q = e.target.value.trim();
                      runAI('custom', `Investidor ${profileLabels[profile]}, aporte R$ ${Number(aporte).toLocaleString('pt-BR')}/mes. Data: ${today()}. Pergunta: "${q}". Responda com dados atuais.`);
                      e.target.value = '';
                    }
                  }} />
                <button onClick={() => {
                  const inp = document.getElementById('custom-q');
                  if (!inp?.value?.trim()) return;
                  const q = inp.value.trim();
                  runAI('custom', `Investidor ${profileLabels[profile]}, aporte R$ ${Number(aporte).toLocaleString('pt-BR')}/mes. Data: ${today()}. Pergunta: "${q}". Responda com dados atuais.`);
                  inp.value = '';
                }} style={{ padding:'9px 16px', borderRadius:9, border:'1px solid #E2E8F0', background:'white', color:'#374151', fontSize:13, cursor:'pointer', fontWeight:500 }}>
                  Analisar ↗
                </button>
              </div>
            </div>

            {(aiLoading || aiText) && (
              <div style={{ background:'linear-gradient(135deg,#F0F7FF,#F8FAFC)', border:'1px solid #BFDBFE', borderRadius:12, padding:20, marginBottom:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, paddingBottom:12, borderBottom:'1px solid #BFDBFE' }}>
                  <span style={{ color:'#2563EB', fontSize:16 }}>◆</span>
                  <span style={{ fontSize:13, fontWeight:600, color:'#1E293B' }}>{aiTitle}</span>
                  {aiLoading && <span style={{ fontSize:12, color:'#64748B', marginLeft:'auto' }}>Buscando e analisando...</span>}
                </div>
                {aiLoading
                  ? <p style={{ fontSize:13, color:'#94A3B8' }}>Conectando ao mercado e analisando...</p>
                  : <p style={{ fontSize:14, color:'#1E293B', lineHeight:1.8, whiteSpace:'pre-wrap' }}>{aiText}</p>
                }
              </div>
            )}

            {/* Simulador */}
            <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:12, padding:16 }}>
              <p style={{ fontSize:12, color:'#64748B', fontWeight:500, marginBottom:12 }}>Simulador de aporte mensal</p>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <span style={{ fontSize:12, color:'#64748B' }}>R$</span>
                <input type="range" min={500} max={20000} step={500} value={aporte}
                  onChange={e => setAporte(Number(e.target.value))} style={{ flex:1 }} />
                <span style={{ fontSize:15, fontWeight:800, color:'#0F172A', minWidth:80 }}>
                  {Number(aporte).toLocaleString('pt-BR')}
                </span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                {allocData.map(d => (
                  <div key={d.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#F8FAFC', borderRadius:8, padding:'8px 12px' }}>
                    <span style={{ fontSize:12, color:'#64748B', display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ width:8, height:8, borderRadius:2, background:d.color, display:'inline-block' }} />{d.name}
                    </span>
                    <span style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>
                      R$ {Math.round(aporte * d.value / 100).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
              <button onClick={() => runAI('custom', `Investidor ${profileLabels[profile]} tem R$ ${Number(aporte).toLocaleString('pt-BR')} para aportar hoje. Data: ${today()}. Como alocar de forma otimizada considerando o cenario atual? Seja especifico com ativos.`)}
                style={{ width:'100%', padding:'10px', borderRadius:9, border:'1px solid #E2E8F0', background:'white', color:'#374151', fontSize:13, cursor:'pointer', fontWeight:500, textAlign:'center' }}>
                Como alocar R$ {Number(aporte).toLocaleString('pt-BR')} este mes ↗
              </button>
            </div>
          </div>
        )}

        {/* MEU PERFIL */}
        {tab==='perfil' && (
          <div>
            <p style={{ fontSize:11, color:'#64748B', textTransform:'uppercase', fontWeight:600, marginBottom:16 }}>Configure seu perfil</p>

            <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:14, padding:16, marginBottom:16 }}>
              <p style={{ fontSize:13, fontWeight:600, color:'#0F172A', marginBottom:12 }}>Perfil de risco</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                {[
                  { id:'conservador', icon:'🛡️', label:'Conservador', desc:'Seguranca em primeiro lugar. Renda Fixa e FIIs.' },
                  { id:'moderado',    icon:'⚖️', label:'Moderado',    desc:'Equilibrio entre risco e retorno.' },
                  { id:'arrojado',    icon:'🚀', label:'Arrojado',    desc:'Maior risco para maior rentabilidade.' },
                ].map(p => (
                  <div key={p.id} onClick={() => setProfile(p.id)}
                    style={{ border:`2px solid ${profile===p.id ? '#2563EB' : '#E2E8F0'}`, background: profile===p.id ? '#EFF6FF' : 'white', borderRadius:12, padding:16, cursor:'pointer', transition:'all .15s' }}>
                    <span style={{ fontSize:24, display:'block', marginBottom:8 }}>{p.icon}</span>
                    <p style={{ fontSize:13, fontWeight:600, color: profile===p.id ? '#1D4ED8' : '#0F172A', marginBottom:4 }}>{p.label}</p>
                    <p style={{ fontSize:11, color:'#64748B', lineHeight:1.4 }}>{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:14, padding:16, marginBottom:16 }}>
              <p style={{ fontSize:13, fontWeight:600, color:'#0F172A', marginBottom:12 }}>Aporte mensal</p>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                <input type="range" min={500} max={50000} step={500} value={aporte}
                  onChange={e => setAporte(Number(e.target.value))} style={{ flex:1 }} />
                <div style={{ background:'#EFF6FF', borderRadius:10, padding:'8px 16px', minWidth:120, textAlign:'center' }}>
                  <p style={{ fontSize:11, color:'#3B82F6' }}>Aporte</p>
                  <p style={{ fontSize:20, fontWeight:800, color:'#1D4ED8' }}>R$ {Number(aporte).toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {[1000,2000,5000,10000,20000].map(v => (
                  <button key={v} onClick={() => setAporte(v)}
                    style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${aporte===v ? '#2563EB' : '#E2E8F0'}`, background: aporte===v ? '#EFF6FF' : 'white', color: aporte===v ? '#1D4ED8' : '#64748B', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    R$ {v.toLocaleString('pt-BR')}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => { localStorage.setItem('investia_profile', JSON.stringify({ profile, aporte })); alert('Perfil salvo!'); }}
              style={{ width:'100%', padding:14, borderRadius:9, border:'none', background:'#2563EB', color:'white', fontSize:14, fontWeight:600, cursor:'pointer' }}>
              Salvar perfil
            </button>
          </div>
        )}

        {/* Action Bar */}
        <div style={{ marginTop:24, paddingTop:16, borderTop:'1px solid #E2E8F0' }}>
          <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:10 }}>
            <p style={{ fontSize:12, color:'#94A3B8', fontWeight:500, marginRight:4 }}>Exportar:</p>
            {[
              { label:'PDF Resumo', onClick:() => exportPDF('summary') },
              { label:'PDF Analise IA', onClick:() => aiText ? exportPDF('ai') : alert('Gere uma analise IA primeiro.') },
            ].map(b => (
              <button key={b.label} onClick={b.onClick}
                style={{ padding:'8px 16px', borderRadius:9, border:'1px solid #E2E8F0', background:'white', color:'#374151', fontSize:13, cursor:'pointer', fontWeight:500 }}>
                {b.label}
              </button>
            ))}
            <button onClick={() => setShowEmail(true)}
              style={{ padding:'8px 16px', borderRadius:9, border:'none', background:'#2563EB', color:'white', fontSize:13, cursor:'pointer', fontWeight:500 }}>
              Enviar por e-mail
            </button>
            {pdfMsg && <span style={{ fontSize:12, color:'#059669', fontWeight:600 }}>{pdfMsg}</span>}
          </div>
        </div>

        <div ref={pdfRef} style={{ display:'none', position:'absolute', left:-9999, top:0, width:794, background:'white' }} />
      </div>

      {/* Email Modal */}
      {showEmail && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:16 }} onClick={e => e.target === e.currentTarget && setShowEmail(false)}>
          <div style={{ background:'white', borderRadius:16, padding:28, width:'100%', maxWidth:440, boxShadow:'0 24px 48px rgba(0,0,0,.18)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:16, fontWeight:700, color:'#0F172A', margin:0 }}>Enviar relatorio por e-mail</h2>
              <button onClick={() => setShowEmail(false)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#94A3B8', lineHeight:1 }}>×</button>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:'#64748B', fontWeight:500, display:'block', marginBottom:6 }}>Seu e-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
                style={{ width:'100%', border:'1px solid #E2E8F0', borderRadius:9, padding:'10px 14px', fontSize:13, outline:'none', boxSizing:'border-box' }} />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, color:'#64748B', fontWeight:500, display:'block', marginBottom:8 }}>Tipo</label>
              <div style={{ display:'flex', gap:8 }}>
                {[{id:'summary',label:'Resumo Diario'},{id:'ai',label:'Analise IA'}].map(t => (
                  <button key={t.id} onClick={() => setEmailType(t.id)}
                    style={{ flex:1, padding:10, borderRadius:10, border:`2px solid ${emailType===t.id ? '#2563EB' : '#E2E8F0'}`, background: emailType===t.id ? '#EFF6FF' : 'white', color: emailType===t.id ? '#1D4ED8' : '#64748B', fontSize:13, fontWeight:500, cursor:'pointer' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            {emailMsg && <p style={{ fontSize:12, marginBottom:12, fontWeight:600, color: emailMsg.includes('!') ? '#059669' : '#DC2626' }}>{emailMsg}</p>}
            <button onClick={sendEmailReport} disabled={emailSending}
              style={{ width:'100%', padding:12, borderRadius:9, border:'none', background:'#2563EB', color:'white', fontSize:14, fontWeight:600, cursor:'pointer', opacity: emailSending ? .6 : 1 }}>
              {emailSending ? 'Enviando...' : 'Enviar e-mail'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
