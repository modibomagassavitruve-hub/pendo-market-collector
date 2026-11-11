// Test : quels indices africains sont disponibles sur Google Finance
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const cands = {
  brvm: ['BRVMC:BRVM', 'BRVM10:BRVM'],
  jse: ['J203:JSE', 'JALSH:INDEXJSE', 'J200:JSE', 'SA40:INDEXFTSE'],
  nse_ng: ['NGSEINDX:NSENG', 'NGXASI:NSENG', 'NGSEINDEX:INDEXNSENG'],
  egx: ['EGX30:EGX', 'CASE30:INDEXEGX', 'EGX30:INDEXEGX'],
  masi: ['MASI:CSE', 'MASI:INDEXCSE'],
  bvmt: ['TUNINDEX:BVMT', 'TUNINDEX:INDEXBVMT'],
  sem: ['SEMDEX:SEM', 'SEMDEX:INDEXSEM'],
  nse_ke: ['N20I:NSE', 'NSE20:NAIROBI', 'NASI:NAIROBI'],
  gse: ['GSE-CI:GSE', 'GGSECI:GSE'],
  bse: ['BSEDCI:BSE'],
  luse: ['LASI:LUSE'],
  zse: ['ZSEASI:ZSE'],
};
const pick = (html, re) => { const m = html.match(re); return m ? m[1] : null; };
for (const [id, list] of Object.entries(cands)) {
  for (const sym of list) {
    try {
      const r = await fetch(`https://www.google.com/finance/quote/${sym}?hl=en`, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' }, signal: AbortSignal.timeout(15000) });
      const h = await r.text();
      const last = pick(h, /data-last-price="([\d.]+)"/);
      const prev = pick(h, /Previous close<\/div>[\s\S]{0,300}?>([\d,]+\.?\d*)</);
      const name = pick(h, /<div class="zzDege">([^<]+)</);
      console.log(`${id.padEnd(7)} ${sym.padEnd(24)} ${r.status} last=${last} prev=${prev} name=${name}`);
    } catch (e) { console.log(`${id.padEnd(7)} ${sym.padEnd(24)} ERR ${e.message}`); }
  }
}
