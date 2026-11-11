import https from 'node:https';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const get = (url) => new Promise((resolve) => {
  const req = https.get(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html,*/*' }, agent: new https.Agent({ rejectUnauthorized: false }), timeout: 20000 }, (res) => {
    let b = ''; res.setEncoding('utf8'); res.on('data', (c) => (b += c)); res.on('end', () => resolve({ s: res.statusCode, b, loc: res.headers.location }));
  });
  req.on('timeout', () => req.destroy(new Error('timeout'))); req.on('error', (e) => resolve({ s: 'ERR ' + (e.code || e.message), b: '' }));
});
const tests = [
  ['sem', 'https://www.stockexchangeofmauritius.com/', /SEMDEX/i],
  ['sem', 'https://www.stockexchangeofmauritius.com/products-market-data/indices', /SEMDEX/i],
  ['bvmt', 'https://www.bvmt.com.tn/fr', /TUNINDEX/i],
  ['bvmt', 'https://www.ilboursa.com/', /TUNINDEX/i],
  ['nsx', 'https://www.nsx.com.na/', /Overall|NSX/i],
  ['egx', 'https://www.egx.com.eg/en/Indices.aspx', /EGX\s?30/i],
  ['egx', 'https://english.mubasher.info/markets/EGX', /EGX\s?30/i],
];
for (const [id, u, re] of tests) {
  const r = await get(u);
  const i = r.b.search(re);
  console.log(`${id} ${r.s} ${r.b.length}B ${u} ${r.loc ? '-> ' + r.loc : ''}\n   ${i >= 0 ? r.b.slice(i, i + 260).replace(/\s+/g, ' ') : '(motif absent) ' + r.b.slice(0, 120).replace(/\s+/g, ' ')}`);
}
