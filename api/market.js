const SYMBOLS = ['^KS11', '^KQ11', '^IXIC', '^GSPC', '^DJI', 'KRW=X', '005930.KS', '000660.KS', 'TSLA', 'NVDA', 'AAPL', '005380.KS'];
const NAMES = {
  '^KS11': 'KOSPI', '^KQ11': 'KOSDAQ', '^IXIC': 'NASDAQ', '^GSPC': 'S&P 500', '^DJI': 'DOW',
  'KRW=X': 'USD/KRW', '005930.KS': '삼성전자', '000660.KS': 'SK하이닉스',
  TSLA: '테슬라', NVDA: '엔비디아', AAPL: '애플', '005380.KS': '현대차'
};

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  try {
    const quotes = (await Promise.all(SYMBOLS.map(async (symbol) => {
      const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!response.ok) return null;
      const body = await response.json();
      const meta = body.chart?.result?.[0]?.meta;
      if (!meta || meta.regularMarketPrice == null) return null;
      const previous = meta.chartPreviousClose || meta.previousClose;
      const changePercent = previous ? ((meta.regularMarketPrice - previous) / previous) * 100 : 0;
      return {
        symbol,
        name: NAMES[symbol] || meta.shortName || symbol,
        price: meta.regularMarketPrice,
        changePercent,
        marketState: meta.marketState,
        time: meta.regularMarketTime,
      };
    }))).filter(Boolean);
    if (!quotes.length) throw new Error('No market quotes returned');
    res.status(200).json({ quotes, delayed: true, updatedAt: new Date().toISOString() });
  } catch (error) {
    res.status(502).json({ error: '시황 데이터를 불러오지 못했습니다.' });
  }
};
