const SYMBOLS = ['^KS11', '^KQ11', '^IXIC', '^GSPC', '^DJI', 'KRW=X', '005930.KS', '000660.KS', 'TSLA', 'NVDA', 'AAPL', '005380.KS'];

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(SYMBOLS.join(','))}`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error(`Market provider returned ${response.status}`);
    const body = await response.json();
    const quotes = (body.quoteResponse?.result || []).map((item) => ({
      symbol: item.symbol,
      name: item.shortName || item.longName || item.symbol,
      price: item.regularMarketPrice,
      changePercent: item.regularMarketChangePercent,
      marketState: item.marketState,
      time: item.regularMarketTime,
    }));
    res.status(200).json({ quotes, delayed: true, updatedAt: new Date().toISOString() });
  } catch (error) {
    res.status(502).json({ error: '시황 데이터를 불러오지 못했습니다.' });
  }
};
