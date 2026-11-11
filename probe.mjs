import https from 'node:https';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const get = (url) => new Promise((resolve) => {
  const req = https.get(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html,*/*' }, agent: new https.Agent({ rejectUnauthorized: false }), timeout: 20000 }, (res) => {
    let b = ''; res.setEncoding('utf8'); res.on('data', (c) => (b += c)); res.on('end', () => resolve(b));
  });
  req.on('timeout', () => req.destroy(new Error('timeout'))); req.on('error', () => resolve(''));
});
const show = (label, b, re, n = 6) => {
  let m, k = 0; const r = new RegExp(re, 'gi');
  while ((m = r.exec(b)) && k < n) { console.log(`${label} @${m.index}: ${b.slice(Math.max(0, m.index - 80), m.index + 300).replace(/\s+/g, ' ')}`); k++; }
  if (!k) console.log(`${label}: rien`);
};
const sem = await get('https://www.stockexchangeofmauritius.com/');
show('SEM', sem, 'SEMDEX(?![^<]{0,40}trading quotes)', 8);
const mub = await get('https://english.mubasher.info/markets/EGX');
show('MUB', mub, '"(?:lastPrice|price|close|value|changePercentage|change_percent)"\\s*:', 6);
show('MUB30', mub, 'EGX\\s?30', 6);
