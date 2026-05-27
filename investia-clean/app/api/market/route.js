export const dynamic = 'force-dynamic';

const BASE = 'https://brapi.dev/api';

async function fetchQuote(tickers) {
  try {
    const token = process.env.BRAPI_TOKEN;
    const url = `${BASE}/quote/${tickers.join(',')}?token=${token}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    return data.results || [];
  } catch { return []; }
}

async function fetchDolar() {
  try {
    const token = process.env.BRAPI_TOKEN;
    const url = `${BASE}/v2/currency?currency=USD-BRL&token=${token}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    return data.currency?.[0] || null;
  } catch { return null; }
}

export async function GET() {
  try {
    const acoesTickers = ['PETR4','ITUB4','BBAS3','WEGE3','VALE3','RADL3','RENT3','MGLU3'];
    const fiisTickers  = ['MXRF11','KNRI11','HGLG11','XPLG11','VISC11','BRCO11'];
    const indexTickers = ['%5EBVSP'];

    const [acoesData, fiisData, ibovData, dolarData] = await Promise.all([
      fetchQuote(acoesTickers),
      fetchQuote(fiisTickers),
      fetchQuote(indexTickers),
      fetchDolar(),
    ]);

    const fmt    = v => v != null ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 }) : '--';
    const fmtPct = v => v != null ? `${v >= 0 ? '+' : ''}${Number(v).toFixed(2)}%` : '--';

    const mapQuote = (results, tickers) => tickers.map(ticker => {
      const q = results.find(r => r.symbol === ticker || r.symbol === decodeURIComponent(ticker));
      return {
        ticker,
        preco:    q ? fmt(q.regularMarketPrice) : '--',
        variacao: q ? fmtPct(q.regularMarketChangePercent) : '--',
        positivo: q ? q.regularMarketChangePercent >= 0 : null,
        raw:      q || null,
      };
    });

    const ibov = ibovData[0];

    return Response.json({
      acoes: mapQuote(acoesData, acoesTickers),
      fiis:  mapQuote(fiisData,  fiisTickers),
      ibov: ibov ? {
        valor:    fmt(ibov.regularMarketPrice),
        variacao: fmtPct(ibov.regularMarketChangePercent),
        positivo: ibov.regularMarketChangePercent >= 0,
      } : null,
      dolar: dolarData ? {
        valor:    fmt(dolarData.ask),
        variacao: fmtPct(dolarData.pctChange),
        positivo: dolarData.pctChange >= 0,
      } : null,
      updatedAt: new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }),
    });
  } catch (error) {
    console.error('Market API error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
