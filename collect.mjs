#!/usr/bin/env node
/**
 * PENDO — collecteur des indices boursiers africains.
 *
 * Tourne sur GitHub Actions (dépôt public = minutes gratuites). Récupère les indices
 * puis les envoie au backend PENDO, qui les valide et les enregistre.
 * Aucun accès direct à la base ; seul secret : PENDO_CRON_SECRET (secret GitHub).
 *
 * Sources :
 *   AFX Kwayisi    → JSE, NGX, BRVM, NSE Kenya, GSE, BSE, LuSE, ZSE, USE, MSE
 *   Investing.com  → EGX 30, MASI, TUNINDEX, SEMDEX (puis Yahoo Finance en secours)
 *   BRVM officiel  → BRVM Composite (brvm.org)
 *   NGX officiel   → NGX All Share (ngxgroup.com)
 *   Casablanca     → MASI (casablanca-bourse.com, données JSON intégrées à la page)
 *   SEM officiel   → SEMDEX (variation calculée par le backend)
 *   Mubasher       → EGX 30
 *   (DSE Tanzanie et RSE Rwanda sont collectés directement par le backend PENDO)
 */

import https from 'node:https';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const BACKEND = process.env.PENDO_BACKEND_URL || 'https://pendo-backend.vercel.app';
const SECRET = process.env.PENDO_CRON_SECRET;
const DRY_RUN = process.argv.includes('--dry-run');

const AFX = { jse: '/jse/', nse_ng: '/ngx/', brvm: '/brvm/', nse_ke: '/nse/', gse: '/gse/',
  bse: '/bse/', luse: '/luse/', zse: '/zse/', use: '/use/', mse: '/mse/' };
const INVESTING = { egx: 'egx30', masi: 'masi', bvmt: 'tunindex', sem: 'semdex' };
const YAHOO = { egx: '^CASE30', masi: '^MASI', bvmt: 'TUNINDEX.TN', sem: '^SEMDEX', jse: '^J203.JO' };

const round2 = (n) => Math.round(n * 100) / 100;
const num = (s) => parseFloat(String(s).replace(/,/g, ''));

async function get(url, timeout = 20000) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html,application/json,*/*', 'Accept-Language': 'en-US,en;q=0.9' },
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function fromAfx(id) {
  const html = await get(`https://afx.kwayisi.org${AFX[id]}`);
  const table = html.match(/<table\s+style[^>]*>([\s\S]*?)<\/table>/);
  const td = table && table[0].match(/<td>([\d,]+\.?\d*)\s*<span\s+class=(hi|lo)>\(([+-]?[\d,.]+)\)<\/span>/);
  if (!td) throw new Error('format AFX inattendu');
  const value = num(td[1]);
  const pts = Math.abs(num(td[3])) * (td[2] === 'lo' ? -1 : 1);
  const prev = value - pts;
  const change = prev ? (pts / prev) * 100 : 0;
  return { value, change: round2(change), source: 'AFX Kwayisi' };
}

async function fromInvesting(id) {
  const html = await get(`https://www.investing.com/indices/${INVESTING[id]}`);
  const p = html.match(/data-test="instrument-price-last"[^>]*>([\d,.]+)/);
  if (!p) throw new Error('prix introuvable');
  const c = html.match(/data-test="instrument-price-change-percent"[^>]*>\(?([+-]?[\d.]+)%?\)?/);
  return { value: num(p[1]), change: c ? round2(parseFloat(c[1])) : 0, source: 'Investing.com' };
}

async function fromYahoo(id) {
  const raw = await get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(YAHOO[id])}?interval=1d&range=5d`);
  const meta = JSON.parse(raw)?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) throw new Error('pas de prix');
  const prev = meta.chartPreviousClose || meta.previousClose;
  const change = prev ? ((meta.regularMarketPrice - prev) / prev) * 100 : 0;
  return { value: meta.regularMarketPrice, change: round2(change), source: 'Yahoo Finance' };
}

// ── Sites officiels (accessibles depuis GitHub Actions) ─────────────
async function fromBrvm() {
  const html = await get('https://www.brvm.org/fr');
  const m = html.match(/<td>BRVM-C<\/td>\s*<td[^>]*>([\d\s .,]+)<\/td>\s*<td[^>]*>\s*([+-]?[\d\s .,]+)%\s*<span class="icone-seance\s*(\w*)/);
  if (!m) throw new Error('BRVM-C introuvable');
  const frNum = (x) => parseFloat(x.replace(/[\s ]/g, '').replace(',', '.'));
  const value = frNum(m[1]);
  let change = frNum(m[2]);
  if (m[3] === 'bad' && change > 0) change = -change;
  return { value, change: round2(change), source: 'BRVM Official' };
}

async function fromNgx() {
  const json = JSON.parse(await get('https://ngxgroup.com/wp-json/ngx-data-widgets/v1/home/index-chart?index=ASI', 30000));
  const q = json?.quote;
  if (!q?.currentPrice) throw new Error('ASI introuvable');
  return { value: q.currentPrice, change: round2(q.changePercentage || 0), source: 'NGX Official' };
}

// Le site de la Bourse de Casablanca sert une chaîne de certificats incomplète :
// on désactive la vérification uniquement pour cette requête (lecture de données publiques).
function getInsecure(url, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html' },
      agent: new https.Agent({ rejectUnauthorized: false }),
      timeout,
    }, (res) => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      let body = ''; res.setEncoding('utf8');
      res.on('data', (c) => (body += c)); res.on('end', () => resolve(body));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

async function fromCasablanca() {
  const html = await getInsecure('https://www.casablanca-bourse.com/live-market/indices');
  const m = html.match(/"code":"MASI","value":([\d.]+),"previous_close":[^,]*,"change_pct":(-?[\d.]+)/);
  if (!m) throw new Error('MASI introuvable');
  return { value: round2(parseFloat(m[1])), change: round2(parseFloat(m[2])), source: 'Bourse de Casablanca' };
}

async function fromSem() {
  const html = await get('https://www.stockexchangeofmauritius.com/');
  const m = html.match(/class="name">SEMDEX<\/div>\s*<div class="num[^"]*">(?:\s*<\/?span[^>]*>)*\s*([\d,]+\.\d+)/)
    || html.match(/class="name">SEMDEX<\/div>[\s\S]{0,200}?class="title-latest">LATEST<\/div>\s*<div class="name[^"]*">([\d,]+\.\d+)/);
  if (!m) throw new Error('SEMDEX introuvable');
  // La page ne donne pas la variation : le backend la calcule depuis la clôture précédente
  return { value: num(m[1]), change: null, source: 'SEM Official' };
}

async function fromMubasherEgx() {
  const html = await get('https://english.mubasher.info/markets/EGX');
  const v = html.match(/market-summary__last-price[^"]*">\s*([\d,.]+)/);
  const c = html.match(/market-summary__change-percentage[^"]*?\b(up|down)\b[^"]*"[^>]*>\s*\(?\s*([+-]?[\d.]+)\s*%/);
  if (!v) throw new Error('EGX30 introuvable');
  let change = c ? parseFloat(c[2]) : null;
  if (c && c[1] === 'down' && change > 0) change = -change;
  return { value: num(v[1]), change: change === null ? null : round2(change), source: 'Mubasher' };
}

async function collect(id) {
  const chain = [];
  if (id === 'sem') chain.push(fromSem);
  if (id === 'egx') chain.push(fromMubasherEgx);
  if (id === 'masi') chain.push(fromCasablanca);
  if (id === 'brvm') chain.push(fromBrvm);
  if (id === 'nse_ng') chain.push(fromNgx);
  if (AFX[id]) chain.push(() => fromAfx(id));
  if (INVESTING[id]) chain.push(() => fromInvesting(id));
  if (YAHOO[id]) chain.push(() => fromYahoo(id));
  const errors = [];
  for (const fn of chain) {
    try {
      const r = await fn();
      if (r && r.value > 0) return { id, ...r };
    } catch (e) { errors.push(e.message); }
  }
  console.log(`  ✗ ${id.padEnd(7)} ${errors.join(' | ')}`);
  return null;
}

// PENDO_SKIP=brvm,nse_ng : indices déjà collectés ailleurs (ex. par GitHub Actions)
const SKIP = new Set((process.env.PENDO_SKIP || '').split(',').map((x) => x.trim()).filter(Boolean));
// PENDO_ONLY=brvm,nse_ng : ne collecter que ces indices
const ONLY = new Set((process.env.PENDO_ONLY || '').split(',').map((x) => x.trim()).filter(Boolean));
const IDS = [...Object.keys(AFX), ...Object.keys(INVESTING)]
  .filter((id) => !SKIP.has(id) && (!ONLY.size || ONLY.has(id)));
const results = (await Promise.all(IDS.map(collect))).filter(Boolean);
for (const r of results) console.log(`  ✓ ${r.id.padEnd(7)} ${String(r.value).padStart(12)}  ${r.change === null ? '(variation calculée par le backend)' : `${r.change >= 0 ? '+' : ''}${r.change}%`}  [${r.source}]`);
console.log(`\n${results.length}/${IDS.length} indices collectés`);

if (DRY_RUN) process.exit(0);
if (!SECRET) { console.error('PENDO_CRON_SECRET manquant'); process.exit(1); }
if (!results.length) { console.error('Aucun indice collecté'); process.exit(1); }

const res = await fetch(`${BACKEND}/api/cron/ingest-markets`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SECRET}` },
  body: JSON.stringify({ markets: results }),
  signal: AbortSignal.timeout(30000),
});
const body = await res.text();
console.log(`Backend : HTTP ${res.status} ${body.slice(0, 300)}`);
if (!res.ok) process.exit(1);
