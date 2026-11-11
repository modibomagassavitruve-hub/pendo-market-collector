import https from 'node:https';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const get = (url) => new Promise((resolve) => {
  const req = https.get(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html,*/*' }, timeout: 20000 }, (res) => {
    let b = ''; res.setEncoding('utf8'); res.on('data', (c) => (b += c)); res.on('end', () => resolve(b));
  });
  req.on('timeout', () => req.destroy(new Error('timeout'))); req.on('error', () => resolve(''));
});
const clean = (s) => s.replace(/https?:\/\/[^\s"']+/g, 'URL').replace(/\s+/g, ' ');
const sem = await get('https://www.stockexchangeofmauritius.com/');
let i = sem.indexOf('title-latest'); console.log('SEM-A', clean(sem.slice(i - 400, i + 400)));
i = sem.indexOf('fade-down'); console.log('SEM-B', clean(sem.slice(i, i + 700)));
const mub = await get('https://english.mubasher.info/markets/EGX');
i = mub.indexOf('market-summary__last-price'); console.log('MUB', clean(mub.slice(i - 100, i + 900)));
