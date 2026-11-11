// Test ponctuel de sources alternatives depuis GitHub Actions
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const urls = [
  'https://www.african-markets.com/en/stock-markets/brvm',
  'https://www.african-markets.com/en/stock-markets/jse',
  'https://stooq.com/q/l/?s=^jalsh&f=sd2t2ohlcv&h&e=csv',
  'https://query2.finance.yahoo.com/v8/finance/chart/%5EJ203.JO?interval=1d&range=5d',
  'https://www.brvm.org/fr',
  'https://www.casablanca-bourse.com/fr',
  'https://ngxgroup.com/',
  'https://www.egx.com.eg/en/homepage.aspx',
  'https://www.marketwatch.com/investing/index/j203?countrycode=za',
  'https://www.google.com/finance/quote/BRVMC:BRVM',
];
for (const u of urls) {
  try {
    const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept': 'text/html,*/*' }, signal: AbortSignal.timeout(15000) });
    const t = await r.text();
    console.log(`${r.status} ${t.length}B ${u}  ${t.slice(0, 80).replace(/\s+/g, ' ')}`);
  } catch (e) { console.log(`ERR ${e.cause?.code || e.message} ${u}`); }
}
