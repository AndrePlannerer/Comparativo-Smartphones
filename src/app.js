(() => {
'use strict';
const D = JSON.parse(document.getElementById('dados').textContent);
const P = D.phones, BRANDS = D.brands, RATE = D.meta.usd_brl;
const byId = new Map(P.map(p => [p.id, p]));
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem('cs:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('cs:' + k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } }
};

const TIER = { basico: 'Básico', inter: 'Intermediário', topo: 'Topo de linha' };
const CAT = { tela: 'Tela', camera: 'Câmera', desempenho: 'Desempenho', jogos: 'Jogos', bateria: 'Bateria', conect: 'Conectividade' };
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'];
const TIER_COLOR = { topo: 'var(--s1)', inter: 'var(--s2)', basico: 'var(--s3)' };
const DEFAULT_CMP = ['samsung-galaxy-s26-ultra', 'apple-iphone-18-pro-max', 'xiaomi-17-ultra'];
const PRESETS = [
  ['Topos de linha', ['samsung-galaxy-s26-ultra', 'apple-iphone-18-pro-max', 'xiaomi-17-ultra', 'google-pixel-11-pro-xl']],
  ['Intermediários no Brasil', ['samsung-galaxy-a57-5g', 'motorola-edge-70-fusion', 'xiaomi-poco-x8-pro', 'xiaomi-redmi-note-17-pro']],
  ['Até R$ 1.500', ['samsung-galaxy-a17-5g', 'motorola-moto-g17', 'xiaomi-poco-c85-5g', 'samsung-galaxy-a27-5g']],
  ['Dobráveis', ['samsung-galaxy-z-fold-8', 'apple-iphone-duo', 'honor-magic-v6', 'google-pixel-11-pro-fold']],
  ['Compactos potentes', ['apple-iphone-18-pro', 'samsung-galaxy-s26-snapdragon', 'xiaomi-17', 'oneplus-15t']]
];
const FEATS = [
  ['g5', '5G', p => p.con.g5], ['nfc', 'NFC', p => !!p.con.nfc], ['esim', 'eSIM', p => p.con.esim],
  ['wl', 'Carga sem fio', p => p.bat.wl > 0], ['tele', 'Teleobjetiva', p => !!p.cam.zoom],
  ['ip', 'IP68 ou IP69', p => /IP6[89]/.test(p.body.ip || '')], ['upd', '6+ anos de atualização', p => p.os_years >= 6],
  ['big', 'Bateria de 6.000 mAh ou mais', p => p.bat.mah >= 6000], ['compact', 'Compacto (até 6,4")', p => !p.fold && p.disp.inch <= 6.4],
  ['fold', 'Dobrável', p => !!p.fold], ['sd', 'Cartão microSD', p => p.sd], ['jack', 'Fone P2', p => p.con.jack]
];
const BANDS = {
  br: [['Até R$ 1.500', 0, 1500], ['R$ 1.500 a 3.000', 1500, 3000], ['R$ 3.000 a 6.000', 3000, 6000], ['R$ 6.000 a 10.000', 6000, 10000], ['Acima de R$ 10.000', 10000, 1e9]],
  usd: [['Até US$ 250', 0, 250], ['US$ 250 a 500', 250, 500], ['US$ 500 a 900', 500, 900], ['US$ 900 a 1.300', 900, 1300], ['Acima de US$ 1.300', 1300, 1e9]]
};
const SORTS = [['score', 'Maior nota geral'], ['cb', 'Melhor custo-benefício'], ['pasc', 'Menor preço'], ['pdesc', 'Maior preço'],
  ['camera', 'Melhor câmera'], ['desempenho', 'Melhor desempenho'], ['bateria', 'Melhor bateria'], ['tela', 'Melhor tela'], ['new', 'Mais recentes']];

const S = {
  base: store.get('base', 'br') === 'usd' ? 'usd' : 'br', tab: 'catalogo',
  q: '', brands: new Set(), tiers: new Set(), band: -1, feats: new Set(), onlyPriced: false, sort: 'score',
  cmp: (store.get('cmp', null) || DEFAULT_CMP).filter(id => byId.has(id)).slice(0, 4),
  rkTier: '', rkPriced: true, brMetric: 'score', chBrand: ''
};

/* ---------- números ---------- */
const n = (v, d = 0) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: d });
const fBRL = v => 'R$ ' + n(Math.round(v));
const fUSD = v => 'US$ ' + n(Math.round(v));
const priceBR = p => p.brl_now ?? p.brl_launch ?? null;
const price = p => S.base === 'br' ? priceBR(p) : (p.usd ?? null);
const fPrice = v => v == null ? '—' : (S.base === 'br' ? fBRL(v) : fUSD(v));
const fDate = s => { if (!s) return '—'; const [y, m] = s.split('-'); return MES[+m - 1] + '/' + y; };
const qual = v => v >= 90 ? [5, 'Excelente'] : v >= 80 ? [4, 'Muito bom'] : v >= 70 ? [3, 'Bom'] : v >= 55 ? [2, 'Regular'] : [1, 'Fraco'];
const qTag = v => { const [k, t] = qual(v); return `<span class="q q${k}">${t}</span>`; };
const fCB = v => v == null ? '—' : (v > 0 ? '+' : '') + n(v, 1);
const cbLabel = v => v == null ? 'Sem preço nesta base' : v >= 8 ? 'Muito acima do esperado' : v >= 3 ? 'Acima do esperado' : v > -3 ? 'Dentro do esperado' : v > -8 ? 'Abaixo do esperado' : 'Muito abaixo do esperado';
const yn = v => v ? 'Sim' : 'Não';
const nz = v => n(v, v % 1 ? 1 : 0);

/* Custo-benefício: resíduo da regressão nota ~ ln(preço) na base escolhida. */
let FIT = null;
function computeCB() {
  const pts = P.filter(p => price(p) != null).map(p => [Math.log(price(p)), p.score]);
  const m = pts.length, sx = pts.reduce((a, b) => a + b[0], 0), sy = pts.reduce((a, b) => a + b[1], 0);
  const sxx = pts.reduce((a, b) => a + b[0] * b[0], 0), sxy = pts.reduce((a, b) => a + b[0] * b[1], 0);
  const b = (m * sxy - sx * sy) / (m * sxx - sx * sx), a = (sy - b * sx) / m;
  FIT = { a, b };
  for (const p of P) { const v = price(p); p.cb = v == null ? null : p.score - (a + b * Math.log(v)); }
}

/* ---------- ilustração esquemática, em milímetros ---------- */
const COL = { White: '#e6e8ec', Black: '#23262c', Silver: '#c5cad1', Gray: '#7c838d', Blue: '#4d7cc0', Green: '#5d8c70', Red: '#b9453e', Pink: '#e3a6ba', Purple: '#8b79c4', Orange: '#dd8444', Gold: '#d2b47a', Yellow: '#e2cb58', Brown: '#86674f', Burgundy: '#6a2636', Aqua: '#7cc3c3' };
function bodyColor(p) {
  const c = p.body.colors; const pick = c.find(x => !['White', 'Black', 'Silver', 'Gray'].includes(x)) || c[0] || 'Gray';
  return COL[pick] || COL.Gray;
}
function camStyle(p) {
  if (p.fold === 'book') return 'col'; if (p.fold === 'flip') return 'row';
  const b = p.brand, m = p.model;
  if (b === 'Apple') return /Pro|Air/.test(m) ? 'bar' : 'pill';
  if (b === 'Google') return 'bar';
  if (b === 'Samsung') return 'col';
  if (b === 'Nothing') return 'row';
  if (['Xiaomi', 'Oppo', 'Vivo', 'Honor', 'OnePlus', 'Realme', 'Poco'].includes(b) && p.tier === 'topo') return 'circle';
  return 'square';
}
function phoneSVG(p, k) {
  const w = p.body.w, h = p.body.h, col = bodyColor(p);
  const lum = parseInt(col.slice(1, 3), 16) * .3 + parseInt(col.slice(3, 5), 16) * .59 + parseInt(col.slice(5, 7), 16) * .11;
  const ov = lum < 110 ? 'rgba(255,255,255,.13)' : 'rgba(0,0,0,.13)';
  const L = Math.min(w, h) * .085, cnt = Math.max(1, Math.min(4, p.cam.lenses.length)), st = camStyle(p);
  const lens = (x, y) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${L.toFixed(1)}" fill="#14171c" stroke="#5c6470" stroke-width="1.1"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(L * .38).toFixed(1)}" fill="#3a4658"/>`;
  let g = '';
  if (st === 'col' || st === 'pill') {
    const x = (p.fold === 'book' ? w * .5 : 0) + Math.min(w, h) * .2, y0 = h * .1;
    if (st === 'pill') g += `<rect x="${x - L * 1.6}" y="${y0 - L * 1.6}" width="${L * 3.2}" height="${(cnt - 1) * L * 2.6 + L * 3.2}" rx="${L * 1.6}" fill="${ov}"/>`;
    for (let i = 0; i < cnt; i++) g += lens(x, y0 + i * L * 2.6);
  } else if (st === 'bar') {
    g += `<rect x="${w * .07}" y="${h * .055}" width="${w * .86}" height="${L * 3.3}" rx="${L * 1.65}" fill="${ov}"/>`;
    for (let i = 0; i < cnt; i++) g += lens(w * .07 + L * 1.9 + i * L * 2.6, h * .055 + L * 1.65);
  } else if (st === 'row') {
    for (let i = 0; i < cnt; i++) g += lens(w * .2 + i * L * 2.7, h * .08);
  } else if (st === 'circle') {
    const cx = w / 2, cy = h * .21, R = w * .3; g += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${ov}"/>`;
    const pos = { 1: [[0, 0]], 2: [[-1.4, 0], [1.4, 0]], 3: [[-1.4, -1.1], [1.4, -1.1], [0, 1.4]], 4: [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]] }[cnt];
    for (const [dx, dy] of pos) g += lens(cx + dx * L, cy + dy * L);
  } else {
    const s = L * 5.6, x0 = w * .08, y0 = h * .045; g += `<rect x="${x0}" y="${y0}" width="${s}" height="${s}" rx="${L * 1.5}" fill="${ov}"/>`;
    const pos = { 1: [[.5, .5]], 2: [[.5, .27], [.5, .73]], 3: [[.27, .27], [.27, .73], [.73, .5]], 4: [[.27, .27], [.73, .27], [.27, .73], [.73, .73]] }[cnt];
    for (const [fx, fy] of pos) g += lens(x0 + fx * s, y0 + fy * s);
  }
  if (p.fold === 'book') g += `<line x1="${w / 2}" y1="1" x2="${w / 2}" y2="${h - 1}" stroke="${ov}" stroke-width="1.6"/>`;
  if (p.fold === 'flip') g += `<line x1="1" y1="${h / 2}" x2="${w - 1}" y2="${h / 2}" stroke="${ov}" stroke-width="1.6"/><rect x="${w * .1}" y="${h * .17}" width="${w * .8}" height="${h * .27}" rx="4" fill="#14171c" opacity=".85"/>`;
  const r = Math.min(w, h) * .13;
  return `<svg width="${(w * k).toFixed(0)}" height="${(h * k).toFixed(0)}" viewBox="-1 -1 ${w + 2} ${h + 2}" role="img" aria-label="Ilustração do ${esc(p.name)}"><rect x="0" y="0" width="${w}" height="${h}" rx="${r}" fill="${col}" stroke="var(--line-2)" stroke-width="1.4"/>${g}</svg>`;
}
const phoneFit = (p, maxW, maxH) => phoneSVG(p, Math.min(maxW / p.body.w, maxH / p.body.h));

/* ---------- leitura qualitativa gerada a partir da ficha ---------- */
function proscons(p) {
  const pro = [], con = [], s = p.s, b = p.bat, c = p.cam, d = p.disp, top = p.tier === 'topo';
  if (s.bateria >= 95) pro.push(b.life ? `Autonomia entre as melhores: ${n(b.life, 1)} h no teste de uso geral` : `Bateria de ${n(b.mah)} mAh, entre as maiores`);
  else if (s.bateria >= 85) pro.push(`Boa autonomia (${n(b.mah)} mAh)`);
  if (b.w >= 80) pro.push(`Carga muito rápida de ${b.w} W` + (b.full ? `, 100% em ${b.full} min` : ''));
  if (s.camera >= 93) pro.push('Conjunto de câmeras de referência'); else if (s.camera >= 85) pro.push('Câmeras muito boas');
  if (c.zoom >= 5) pro.push(`Teleobjetiva com zoom óptico de ${nz(c.zoom)}x`); else if (c.zoom && !top) pro.push(`Tem teleobjetiva (${nz(c.zoom)}x), rara na faixa`);
  if (s.desempenho >= 95) pro.push(`Desempenho de topo (${p.chip})`); else if (!top && s.desempenho >= 70) pro.push(`Desempenho forte para a faixa (${p.chip})`);
  if (s.tela >= 94) pro.push(`Tela de ponta: ${d.type} de ${d.hz} Hz` + (d.nits ? ` com pico de ${n(d.nits)} nits` : ''));
  if (p.os_years >= 6) pro.push(`${p.os_years} anos de atualização de sistema`);
  if (p.body.ip === 'IP69') pro.push('Resistência IP69 a água e poeira'); else if (p.body.ip === 'IP68' && !top) pro.push('Resistência IP68, incomum na faixa');
  if (b.wl > 0 && !top) pro.push(`Carga sem fio de ${b.wl} W`);
  if (!p.fold && d.inch <= 6.4 && top) pro.push(`Compacto (${n(d.inch, 2)}") com desempenho de topo`);
  if (p.body.g <= 180 && !p.fold) pro.push(`Leve: ${n(p.body.g)} g`);
  if (p.sd) pro.push('Aceita cartão microSD');
  if (p.con.jack) pro.push('Tem entrada P2 para fone');
  if (p.cb != null && p.cb >= 6) pro.push('Nota acima do esperado para o preço');

  if (s.bateria < 65) con.push(`Autonomia abaixo da média (${n(b.mah)} mAh)`);
  if (b.w != null && b.w <= 25) con.push(`Carga lenta de ${b.w} W` + (b.full ? `, ${b.full} min até 100%` : ''));
  if (top && !c.zoom && !p.fold) con.push('Sem teleobjetiva');
  if (top && b.wl === 0) con.push('Sem carga sem fio');
  if (s.camera < 60) con.push('Câmeras simples');
  if (!c.ois) con.push('Câmera principal sem estabilização óptica');
  if (s.desempenho < 35) con.push('Desempenho limitado para jogos e multitarefa'); else if (top && s.jogos < 50) con.push('Fraco em jogos para um topo de linha');
  if (/^720/.test(d.res)) con.push('Tela de resolução HD');
  if (d.hz <= 60) con.push('Tela de 60 Hz');
  if (/LCD|TFT/.test(d.type) && p.tier !== 'basico') con.push('Tela LCD em vez de OLED');
  if (p.os_years == null) con.push('Política de atualização não informada'); else if (p.os_years <= 2) con.push(`Só ${p.os_years} ${p.os_years === 1 ? 'ano' : 'anos'} de atualização de sistema`);
  if (p.body.g >= 225 && !p.fold) con.push(`Pesado: ${n(p.body.g)} g`);
  if (p.con.nfc === false) con.push('Sem NFC');
  if (!p.con.g5) con.push('Só 4G');
  if (/eMMC/.test(p.rom_type || '')) con.push('Armazenamento eMMC, mais lento');
  if (b.charger === false && !top) con.push('Sem carregador na caixa');
  if (BRANDS[p.brand].br_lvl === 0) con.push('Sem venda oficial nem garantia no Brasil'); else if (priceBR(p) == null) con.push('Sem preço no Brasil encontrado');
  if (p.cb != null && p.cb <= -6) con.push('Nota abaixo do esperado para o preço');
  return { pro: pro.slice(0, 6), con: con.slice(0, 6) };
}
function tags(p) {
  const t = [];
  if (p.s.camera >= 90) t.push('Fotografia'); if (p.s.jogos >= 85) t.push('Jogos'); if (p.s.bateria >= 92) t.push('Bateria longa');
  if (!p.fold && p.disp.inch <= 6.4) t.push('Uso com uma mão'); if (p.cb != null && p.cb >= 6) t.push('Custo-benefício');
  if (p.os_years >= 6) t.push('Ficar anos com o aparelho'); if (p.fold) t.push('Tela grande dobrável');
  return t;
}
function verdict(p) {
  const e = Object.entries(p.s).filter(([k]) => k !== 'jogos').sort((a, b) => b[1] - a[1]);
  return `${TIER[p.tier]}${p.fold ? ' dobrável' : ''} lançado em ${fDate(p.released)}. Nota geral ${p.score} de 100. Vai melhor em ${CAT[e[0][0]].toLowerCase()} (${e[0][1]}) e ${CAT[e[1][0]].toLowerCase()} (${e[1][1]}); o ponto mais fraco é ${CAT[e[e.length - 1][0]].toLowerCase()} (${e[e.length - 1][1]}).`;
}
function priceBlock(p) {
  if (S.base === 'usd') return p.usd != null ? `${fUSD(p.usd)}<small>lançamento global</small>` : `—<small>sem preço em dólar</small>`;
  if (p.brl_now != null) return `${fBRL(p.brl_now)}<small>menor preço atual</small>`;
  if (p.brl_launch != null) return `${fBRL(p.brl_launch)}<small>preço de lançamento</small>`;
  return p.usd != null ? `${fUSD(p.usd)}<small>lançamento global · sem preço no Brasil</small>` : `—<small>sem preço encontrado</small>`;
}

/* ---------- catálogo ---------- */
function filtered() {
  const q = S.q.trim().toLowerCase(), band = S.band >= 0 ? BANDS[S.base][S.band] : null;
  let r = P.filter(p => {
    if (q && !(p.name + ' ' + p.brand + ' ' + p.chip).toLowerCase().includes(q)) return false;
    if (S.brands.size && !S.brands.has(p.brand)) return false;
    if (S.tiers.size && !S.tiers.has(p.tier)) return false;
    if (S.onlyPriced && priceBR(p) == null) return false;
    if (band) { const v = price(p); if (v == null || v < band[1] || v >= band[2]) return false; }
    for (const f of FEATS) if (S.feats.has(f[0]) && !f[2](p)) return false;
    return true;
  });
  const nl = (v, d) => v == null ? d : v;
  const cmp = {
    score: (a, b) => b.score - a.score, cb: (a, b) => nl(b.cb, -99) - nl(a.cb, -99),
    pasc: (a, b) => nl(price(a), 1e12) - nl(price(b), 1e12), pdesc: (a, b) => nl(price(b), -1) - nl(price(a), -1),
    camera: (a, b) => b.s.camera - a.s.camera, desempenho: (a, b) => b.s.desempenho - a.s.desempenho,
    bateria: (a, b) => b.s.bateria - a.s.bateria, tela: (a, b) => b.s.tela - a.s.tela,
    new: (a, b) => (b.released || '').localeCompare(a.released || '')
  }[S.sort];
  return r.sort((a, b) => cmp(a, b) || b.score - a.score);
}
function card(p) {
  const sel = S.cmp.includes(p.id), lvl0 = BRANDS[p.brand].br_lvl === 0;
  return `<article class="card${sel ? ' sel' : ''}">
    <div class="art">${phoneFit(p, 62, 108)}</div>
    <div class="brand"><span class="eyebrow">${esc(p.brand)} · ${TIER[p.tier]}</span>${lvl0 ? '<span class="badge import">importado</span>' : ''}</div>
    <h3><button type="button" data-open="${p.id}">${esc(p.name)}</button></h3>
    <div class="price">${priceBlock(p)}</div>
    <div class="specs">
      <div>Tela <b>${n(p.disp.inch, 2)}" ${p.disp.hz} Hz</b></div><div>Chip <b>${esc(p.chip.replace('Snapdragon', 'SD').replace('Dimensity', 'Dim.'))}</b></div>
      <div>Bateria <b>${n(p.bat.mah)} mAh${p.bat.w ? ' · ' + p.bat.w + ' W' : ''}</b></div><div>Câmera <b>${p.cam.main} MP${p.cam.zoom ? ' · ' + nz(p.cam.zoom) + 'x' : ''}</b></div>
    </div>
    <div class="card-foot">
      <span class="score"><span class="v">${p.score}</span>${qTag(p.score)}</span>
      <label class="cmp-toggle"><input type="checkbox" id="c-${p.id}" data-cmp="${p.id}"${sel ? ' checked' : ''}${!sel && S.cmp.length >= 4 ? ' disabled' : ''}> Comparar</label>
    </div>
  </article>`;
}
function chipRow(label, items) { return `<div class="f-row"><span class="eyebrow">${label}</span>${items}</div>`; }
function renderCatalog(keepFocus) {
  const el = $('#v-catalogo'), counts = {};
  for (const p of P) counts[p.brand] = (counts[p.brand] || 0) + 1;
  const list = filtered();
  const active = S.q || S.brands.size || S.tiers.size || S.feats.size || S.band >= 0 || S.onlyPriced;
  el.innerHTML = `
  <div class="filters">
    <div class="f-row">
      <label class="field grow"><span class="eyebrow">Buscar</span><input type="search" id="f-q" placeholder="modelo, marca ou chip" value="${esc(S.q)}" autocomplete="off"></label>
      <label class="field"><span class="eyebrow">Ordenar</span><select id="f-sort">${SORTS.map(([k, t]) => `<option value="${k}"${S.sort === k ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
    </div>
    ${chipRow('Marca', Object.keys(BRANDS).map(b => `<button type="button" class="chip" data-f="brand" data-v="${b}" aria-pressed="${S.brands.has(b)}">${b}<span class="n">${counts[b]}</span></button>`).join(''))}
    ${chipRow('Faixa', Object.entries(TIER).map(([k, t]) => `<button type="button" class="chip" data-f="tier" data-v="${k}" aria-pressed="${S.tiers.has(k)}">${t}</button>`).join(''))}
    ${chipRow('Preço', BANDS[S.base].map((b, i) => `<button type="button" class="chip" data-f="band" data-v="${i}" aria-pressed="${S.band === i}">${b[0]}</button>`).join('')
      + `<button type="button" class="chip" data-f="priced" aria-pressed="${S.onlyPriced}">Só com preço no Brasil</button>`)}
    ${chipRow('Recursos', FEATS.map(f => `<button type="button" class="chip" data-f="feat" data-v="${f[0]}" aria-pressed="${S.feats.has(f[0])}">${f[1]}</button>`).join(''))}
  </div>
  <div class="result-bar"><span><b>${list.length}</b> de ${P.length} aparelhos</span>${active ? '<button type="button" class="linkbtn" data-f="clear">Limpar filtros</button>' : '<span>Marque até 4 aparelhos para comparar lado a lado.</span>'}</div>
  ${list.length ? `<div class="grid">${list.map(card).join('')}</div>` : '<div class="empty">Nenhum aparelho passa por esses filtros. Remova um recurso ou amplie a faixa de preço.</div>'}`;
  if (keepFocus) { const i = $('#f-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
}

/* ---------- comparação ---------- */
const best = (vals, dir) => { const v = vals.filter(x => x != null && !isNaN(x)); if (v.length < 2) return null; const t = dir === 'min' ? Math.min(...v) : Math.max(...v); return v.every(x => x === t) ? null : t; };
const ROWS = [
  ['Preço'],
  ['Menor preço atual no Brasil', p => p.brl_now != null ? fBRL(p.brl_now) : '—', p => p.brl_now, 'min'],
  ['Lançamento no Brasil', p => p.brl_launch != null ? fBRL(p.brl_launch) : '—'],
  ['Lançamento global', p => p.usd != null ? fUSD(p.usd) : '—', p => p.usd, 'min'],
  ['Custo-benefício', p => p.cb == null ? '—' : `${fCB(p.cb)} pts · ${cbLabel(p.cb)}`, p => p.cb, 'max'],
  ['Notas (0 a 100)'],
  ['Geral', p => `${p.score} · ${qual(p.score)[1]}`, p => p.score, 'max'],
  ...Object.entries(CAT).map(([k, t]) => [t, p => `${p.s[k]} · ${qual(p.s[k])[1]}`, p => p.s[k], 'max']),
  ['Tela'],
  ['Tamanho e tipo', p => `${n(p.disp.inch, 2)}" ${p.disp.type}`],
  ['Resolução', p => `${p.disp.res}${p.disp.ppi ? ' · ' + p.disp.ppi + ' ppi' : ''}`, p => p.disp.ppi, 'max'],
  ['Taxa de atualização', p => p.disp.hz + ' Hz', p => p.disp.hz, 'max'],
  ['Brilho de pico declarado', p => p.disp.nits ? n(p.disp.nits) + ' nits' : '—', p => p.disp.nits, 'max'],
  ['Brilho medido', p => p.disp.nits_test ? n(p.disp.nits_test) + ' nits' : '—', p => p.disp.nits_test, 'max'],
  ['Proteção', p => p.disp.prot || '—'],
  ['Desempenho'],
  ['Processador', p => p.chip + (p.nm ? ` (${p.nm} nm)` : '')],
  ['AnTuTu 11', p => p.antutu ? n(p.antutu) : '—', p => p.antutu, 'max'],
  ['Geekbench 6 (1 núcleo / todos)', p => p.gb6s ? `${n(p.gb6s)} / ${n(p.gb6m)}` : '—', p => p.gb6m, 'max'],
  ['RAM', p => p.ram.length ? p.ram.join(' / ') + ' GB' : '—', p => p.ram.length ? Math.max(...p.ram) : null, 'max'],
  ['Armazenamento', p => (p.rom.length ? p.rom.map(g => g >= 1024 ? g / 1024 + ' TB' : g + ' GB').join(' / ') : '—') + (p.rom_type ? ' · ' + p.rom_type : '')],
  ['Cartão microSD', p => yn(p.sd)],
  ['Bateria'],
  ['Capacidade', p => n(p.bat.mah) + ' mAh', p => p.bat.mah, 'max'],
  ['Autonomia medida (uso geral)', p => p.bat.life ? n(p.bat.life, 1) + ' h' : '—', p => p.bat.life, 'max'],
  ['Carga com fio', p => p.bat.w ? p.bat.w + ' W' : '—', p => p.bat.w, 'max'],
  ['Tempo até 100%', p => p.bat.full ? p.bat.full + ' min' : '—', p => p.bat.full, 'min'],
  ['Carga sem fio', p => p.bat.wl ? p.bat.wl + ' W' : 'Não', p => p.bat.wl, 'max'],
  ['Carregador na caixa', p => p.bat.charger == null ? '—' : yn(p.bat.charger)],
  ['Câmera'],
  ['Lentes traseiras', p => p.cam.lenses.map(esc).join('<br>')],
  ['Sensor principal', p => p.cam.sensor || '—'],
  ['Zoom óptico', p => p.cam.zoom ? nz(p.cam.zoom) + 'x' : 'Não', p => p.cam.zoom || 0, 'max'],
  ['Estabilização óptica', p => yn(p.cam.ois)],
  ['Vídeo máximo', p => p.cam.video || '—'],
  ['Câmera frontal', p => p.cam.selfie ? n(p.cam.selfie, 1) + ' MP' : '—', p => p.cam.selfie, 'max'],
  ['DxOMark', p => p.cam.dxo || '—', p => p.cam.dxo, 'max'],
  ['Construção'],
  ['Dimensões', p => `${n(p.body.h, 1)} × ${n(p.body.w, 1)} × ${n(p.body.t, 1)} mm`],
  ['Peso', p => n(p.body.g) + ' g', p => p.body.g, 'min'],
  ['Resistência', p => p.body.ip || '—'],
  ['Materiais', p => [p.body.back && 'traseira: ' + matPT(p.body.back), p.body.frame && 'moldura: ' + matPT(p.body.frame)].filter(Boolean).join(' · ') || '—'],
  ['Software'],
  ['Sistema', p => (p.os || '—') + (p.ui ? ' · ' + p.ui : '')],
  ['Atualizações de sistema', p => p.os_years ? p.os_years + ' anos' : 'Não informado', p => p.os_years, 'max'],
  ['Atualizações de segurança', p => p.sec_years ? p.sec_years + ' anos' : 'Não informado', p => p.sec_years, 'max'],
  ['Conectividade'],
  ['Rede', p => p.con.g5 ? '5G' : '4G'], ['Wi-Fi', p => p.con.wifi || '—'], ['Bluetooth', p => p.con.bt || '—'],
  ['NFC', p => p.con.nfc === 'region' ? 'Depende da região' : p.con.nfc == null ? '—' : yn(p.con.nfc)], ['eSIM', p => yn(p.con.esim)],
  ['Fone P2', p => yn(p.con.jack)], ['Som estéreo', p => yn(p.con.stereo)],
  ['Lançamento global', p => fDate(p.released)]
];
function matPT(m) { return ({ Glass: 'vidro', Metal: 'metal', Plastic: 'plástico', 'Eco-leather': 'couro sintético' })[m] || m; }
function renderCompare() {
  const el = $('#v-comparar'), sel = S.cmp.map(id => byId.get(id));
  const opts = Object.keys(BRANDS).map(b => `<optgroup label="${b}">${P.filter(p => p.brand === b).map(p => `<option value="${p.id}"${S.cmp.includes(p.id) ? ' disabled' : ''}>${esc(p.name)}</option>`).join('')}</optgroup>`).join('');
  let h = `<div class="view-head"><div><h2>Comparar lado a lado</h2><p>Até 4 aparelhos. O melhor valor de cada linha fica destacado.</p></div></div>
  <div class="presets"><span class="eyebrow" style="align-self:center">Comparações prontas</span>${PRESETS.map((x, i) => `<button type="button" class="chip" data-preset="${i}">${x[0]}</button>`).join('')}</div>
  <div class="cmp-add"><label class="field grow"><span class="eyebrow">Adicionar</span><select id="cmp-add"${sel.length >= 4 ? ' disabled' : ''}><option value="">${sel.length >= 4 ? 'Limite de 4 aparelhos atingido' : 'Escolha um aparelho'}</option>${opts}</select></label></div>`;
  if (!sel.length) { el.innerHTML = h + '<div class="empty">Escolha aparelhos acima ou marque "Comparar" nas fichas do catálogo.</div>'; return; }
  const k = Math.min(150 / Math.max(...sel.map(p => p.body.h)), 1.05);
  h += `<div class="panel"><div class="cmp-heads" style="--n:${sel.length}">${sel.map((p, i) => `<div class="cmp-head">
      <div class="stage">${phoneSVG(p, window.innerWidth < 640 ? Math.min(k * .7, (window.innerWidth - 80) / sel.length / p.body.w) : k)}</div>
      <h4>${esc(p.name)}</h4><span class="key"><span class="dot" style="background:${SERIES[i]}"></span><span class="num">${fPrice(price(p))}</span></span>
      <button type="button" class="linkbtn small" data-rm="${p.id}">Remover</button></div>`).join('')}</div>
    <p class="small muted" style="margin:10px 0 0;text-align:center">Silhuetas na mesma escala, vistas por trás.</p></div>`;
  if (sel.length >= 2) {
    const win = (label, f, dir, fmt) => { const vals = sel.map(f), t = best(vals, dir); if (t == null) return ''; const w = sel.filter((p, i) => vals[i] === t); return `<li><span>${label}</span><b>${w.map(p => esc(p.name)).join(', ')} <span class="num muted">${fmt(t)}</span></b></li>`; };
    h += `<div class="panel"><h3>Quem leva em cada quesito</h3><ul class="verdicts">
      ${win('Nota geral', p => p.score, 'max', v => v)}${Object.entries(CAT).map(([c, t]) => win(t, p => p.s[c], 'max', v => v)).join('')}
      ${win('Custo-benefício', p => p.cb == null ? null : +p.cb.toFixed(1), 'max', v => fCB(v))}${win('Menor preço', p => price(p), 'min', fPrice)}
      ${win('Mais leve', p => p.body.g, 'min', v => n(v) + ' g')}${win('Carga mais rápida', p => p.bat.full, 'min', v => v + ' min')}</ul></div>`;
  }
  const val = (p, c) => c === 'geral' ? p.score : p.s[c];
  h += `<div class="panel"><h3>Notas por categoria</h3>
    <div class="legend">${sel.map((p, i) => `<span><span class="dot" style="background:${SERIES[i]}"></span>${esc(p.name)}</span>`).join('')}<span class="muted">escala de 0 a 100</span></div>
    <div class="strip">${['geral', ...Object.keys(CAT)].map(c => `<span class="lab">${c === 'geral' ? 'Geral' : CAT[c]}</span><div class="gbars">${sel.map((p, i) => `<div class="gb" data-tip="${esc(p.name)}|${c === 'geral' ? 'Geral' : CAT[c]}: ${val(p, c)} · ${qual(val(p, c))[1]}"><i style="width:${val(p, c)}%;background:${SERIES[i]}"></i><span class="num">${val(p, c)}</span></div>`).join('')}</div>`).join('')}</div></div>`;
  h += `<div class="tbl-wrap"><table class="cmp-table"><thead><tr><th scope="col">Item</th>${sel.map(p => `<th scope="col">${esc(p.name)}</th>`).join('')}</tr></thead><tbody>`;
  for (const r of ROWS) {
    if (r.length === 1) { h += `<tr class="group"><th colspan="${sel.length + 1}" scope="colgroup">${r[0]}</th></tr>`; continue; }
    const vals = r[2] ? sel.map(r[2]) : null, t = vals ? best(vals, r[3]) : null;
    h += `<tr><th scope="row">${r[0]}</th>${sel.map((p, i) => `<td class="${t != null && vals[i] === t ? 'best' : ''}">${r[1](p)}</td>`).join('')}</tr>`;
  }
  el.innerHTML = h + '</tbody></table></div>';
}

/* ---------- rankings ---------- */
function renderRankings() {
  const el = $('#v-rankings');
  const pool = P.filter(p => (!S.rkTier || p.tier === S.rkTier) && (!S.rkPriced || price(p) != null));
  const lists = [
    ['Nota geral', p => p.score, 'max', v => v], ['Custo-benefício', p => p.cb, 'max', v => fCB(v) + ' pts'],
    ['Câmera', p => p.s.camera, 'max', v => v], ['Desempenho', p => p.s.desempenho, 'max', v => v],
    ['Bateria', p => p.s.bateria, 'max', v => v], ['Tela', p => p.s.tela, 'max', v => v],
    ['Autonomia medida', p => p.bat.life, 'max', v => n(v, 1) + ' h'], ['Carga completa mais rápida', p => p.bat.full, 'min', v => v + ' min']
  ];
  const block = ([title, f, dir, fmt]) => {
    const arr = pool.filter(p => f(p) != null).sort((a, b) => (dir === 'max' ? f(b) - f(a) : f(a) - f(b)) || b.score - a.score).slice(0, 8);
    if (!arr.length) return '';
    const vs = arr.map(f), lo = Math.min(...vs, 0), hi = Math.max(...vs);
    const wid = v => dir === 'max' ? (hi === lo ? 100 : Math.max(4, (v - lo) / (hi - lo) * 100)) : Math.min(...vs) / v * 100;
    return `<div class="panel rank"><h3>${title}</h3><ol>${arr.map((p, i) => `<li><span class="pos">${i + 1}</span><button type="button" data-open="${p.id}">${esc(p.name)}</button><span class="num">${fmt(f(p))}</span>
      <span class="bar"><i style="width:${wid(f(p)).toFixed(1)}%"></i></span><span></span><span class="sub">${fPrice(price(p))}</span><span></span></li>`).join('')}</ol></div>`;
  };
  el.innerHTML = `<div class="view-head"><div><h2>Rankings</h2><p>Os 8 primeiros em cada quesito entre ${pool.length} aparelhos. O filtro de faixa muda todas as listas.</p></div>
    <div class="f-row">${[['', 'Todas as faixas'], ...Object.entries(TIER)].map(([k, t]) => `<button type="button" class="chip" data-rk="${k}" aria-pressed="${S.rkTier === k}">${t}</button>`).join('')}
    <button type="button" class="chip" data-rkp aria-pressed="${S.rkPriced}">Só com preço ${S.base === 'br' ? 'no Brasil' : 'em dólar'}</button></div></div>
    <div class="rank-grid">${lists.map(block).join('')}</div>`;
}

/* ---------- marcas ---------- */
function brandStats() {
  return Object.keys(BRANDS).map(b => {
    const ps = P.filter(p => p.brand === b), avg = f => { const v = ps.map(f).filter(x => x != null); return v.length ? v.reduce((a, c) => a + c, 0) / v.length : null; };
    const pr = ps.map(price).filter(x => x != null), top = [...ps].sort((a, c) => c.score - a.score)[0], cbs = ps.filter(p => p.cb != null).sort((a, c) => c.cb - a.cb)[0];
    return { b, n: ps.length, priced: pr.length, score: avg(p => p.score), camera: avg(p => p.s.camera), desempenho: avg(p => p.s.desempenho), bateria: avg(p => p.s.bateria), tela: avg(p => p.s.tela), cb: avg(p => p.cb), min: pr.length ? Math.min(...pr) : null, max: pr.length ? Math.max(...pr) : null, top, cbs };
  });
}
function renderBrands() {
  const el = $('#v-marcas'), st = brandStats(), M = { score: 'Nota geral média', camera: 'Câmera', desempenho: 'Desempenho', bateria: 'Bateria', tela: 'Tela', cb: 'Custo-benefício médio' }, m = S.brMetric;
  const rows = st.filter(x => x[m] != null).sort((a, c) => c[m] - a[m]), isCB = m === 'cb', mx = Math.max(...rows.map(x => Math.abs(x[m])));
  const bar = x => isCB
    ? `<div class="track"><i class="${x.cb < 0 ? 'neg' : ''}" style="${x.cb < 0 ? `left:${50 - Math.abs(x.cb) / mx * 50}%;right:50%;border-radius:4px 0 0 4px` : `left:50%;width:${x.cb / mx * 50}%`}"></i></div>`
    : `<div class="track"><i style="width:${x[m]}%"></i></div>`;
  const lvl = v => `<span class="lvl" aria-hidden="true">${[1, 2, 3].map(i => `<i class="${i <= v ? 'on' : ''}"></i>`).join('')}</span>`;
  el.innerHTML = `<div class="view-head"><div><h2>Marcas</h2><p>Média dos modelos de cada marca nesta base. Marcas com mais aparelhos baratos no catálogo têm média menor, então compare também a faixa de preço.</p></div>
    <label class="field"><span class="eyebrow">Medir por</span><select id="br-metric">${Object.entries(M).map(([k, t]) => `<option value="${k}"${k === m ? ' selected' : ''}>${t}</option>`).join('')}</select></label></div>
    <div class="panel"><h3>${M[m]}${isCB ? ' (pontos acima ou abaixo do esperado pelo preço)' : ' (0 a 100)'}</h3>
      <div class="brand-bars">${rows.map(x => `<div class="bb" data-tip="${x.b}: ${isCB ? fCB(x.cb) + ' pts' : n(x[m], 1)} em ${x.n} modelos"><span>${x.b}</span>${bar(x)}<span class="num" style="text-align:right">${isCB ? fCB(x.cb) : n(x[m], 1)}</span></div>`).join('')}</div></div>
    <div class="tbl-wrap"><table class="brand-table"><thead><tr><th>Marca</th><th>Modelos</th><th>Nota média</th><th>Faixa de preço</th><th>Maior nota</th><th>Melhor custo-benefício</th><th>Atualizações</th><th>No Brasil</th></tr></thead><tbody>
      ${st.sort((a, c) => c.score - a.score).map(x => `<tr><td>${x.b}</td><td class="num">${x.n}</td><td class="num">${n(x.score, 1)}</td><td class="num">${x.min == null ? '—' : fPrice(x.min) + ' a ' + fPrice(x.max)}</td>
        <td><button type="button" class="linkbtn" data-open="${x.top.id}">${esc(x.top.model)}</button> <span class="num muted">${x.top.score}</span></td>
        <td>${x.cbs ? `<button type="button" class="linkbtn" data-open="${x.cbs.id}">${esc(x.cbs.model)}</button> <span class="num muted">${fCB(x.cbs.cb)}</span>` : '—'}</td>
        <td>${BRANDS[x.b].upd}</td><td>${lvl(BRANDS[x.b].br_lvl)}${BRANDS[x.b].br}</td></tr>`).join('')}</tbody></table></div>
    <div class="brand-cards">${Object.entries(BRANDS).map(([b, i]) => `<div class="brand-card"><h3>${b}<span class="small muted" style="font:400 13px var(--f-body)">${P.filter(p => p.brand === b).length} modelos</span></h3>
      <dl><div><dt>Ponto forte</dt><dd>${i.forte}</dd></div><div><dt>Ponto fraco</dt><dd>${i.fraco}</dd></div><div><dt>No Brasil</dt><dd>${lvl(i.br_lvl)}${i.br}</dd></div></dl>
      <button type="button" class="linkbtn" data-brand="${b}" style="justify-self:start">Ver modelos no catálogo</button></div>`).join('')}</div>`;
}

/* ---------- preço × nota ---------- */
function renderChart() {
  const el = $('#v-grafico'), pts = P.filter(p => price(p) != null);
  const narrow = window.innerWidth < 640, W = narrow ? 440 : 920, H = narrow ? 430 : 500, m = { l: narrow ? 34 : 46, r: 14, t: 30, b: 46 }, xs = pts.map(price);
  const x0 = Math.log(Math.min(...xs) * .85), x1 = Math.log(Math.max(...xs) * 1.12), y0 = 40, y1 = 100;
  const X = v => m.l + (Math.log(v) - x0) / (x1 - x0) * (W - m.l - m.r), Y = v => H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b);
  const ticks = (S.base === 'br' ? (narrow ? [1000, 4000, 16000] : [1000, 2000, 4000, 8000, 16000]) : (narrow ? [100, 400, 1600] : [100, 200, 400, 800, 1600])).filter(t => Math.log(t) > x0 && Math.log(t) < x1);
  const lo = Math.exp(x0), hi = Math.exp(x1), fy = v => Math.max(y0, Math.min(y1, FIT.a + FIT.b * Math.log(v)));
  const dim = p => S.chBrand && p.brand !== S.chBrand;
  const order = [...pts].sort((a, b) => (dim(b) - dim(a)) || (S.cmp.includes(a.id) - S.cmp.includes(b.id)));
  let g = '';
  for (let v = 40; v <= 100; v += 10) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${m.l - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="12" fill="var(--ink-3)">${v}</text>`;
  for (const t of ticks) g += `<line x1="${X(t)}" x2="${X(t)}" y1="${m.t}" y2="${H - m.b}" stroke="var(--line)"/><text x="${X(t)}" y="${H - m.b + 18}" text-anchor="middle" font-size="12" fill="var(--ink-3)">${fPrice(t)}</text>`;
  g += `<text x="${(m.l + W - m.r) / 2}" y="${H - 6}" text-anchor="middle" font-size="12" fill="var(--ink-2)">Preço (escala logarítmica)</text><text x="${m.l}" y="16" font-size="12" fill="var(--ink-2)">Nota geral (0 a 100)</text>`;
  g += `<line x1="${X(lo)}" y1="${Y(fy(lo))}" x2="${X(hi)}" y2="${Y(fy(hi))}" stroke="var(--ink-3)" stroke-width="1.5" stroke-dasharray="5 5"/><text x="${X(lo) + 8}" y="${Y(fy(lo)) - 10}" font-size="12" fill="var(--ink-2)" stroke="var(--surface)" stroke-width="3" paint-order="stroke">nota esperada pelo preço</text>`;
  for (const p of order) {
    const c = S.cmp.includes(p.id), d = dim(p);
    g += `<g data-open="${p.id}" data-tip="${esc(p.name)}|${fPrice(price(p))} · nota ${p.score}|Custo-benefício ${fCB(p.cb)} pts" style="cursor:pointer" tabindex="0" role="button" aria-label="${esc(p.name)}, ${fPrice(price(p))}, nota ${p.score}">
      <circle cx="${X(price(p)).toFixed(1)}" cy="${Y(p.score).toFixed(1)}" r="12" fill="transparent"/>
      <circle cx="${X(price(p)).toFixed(1)}" cy="${Y(p.score).toFixed(1)}" r="${c ? 7 : 5}" fill="${d ? 'var(--dim)' : TIER_COLOR[p.tier]}" fill-opacity="${d ? .45 : 1}" stroke="${c ? 'var(--ink)' : 'var(--surface)'}" stroke-width="2"/></g>`;
  }
  const labeled = S.cmp.map(id => byId.get(id)).filter(p => price(p) != null).sort((a, b) => Y(a.score) - Y(b.score));
  let lastY = -99;
  for (const p of labeled) {
    const x = X(price(p)), right = x < W - (narrow ? 150 : 170); let y = Y(p.score) - 11; if (y - lastY < 14) y = lastY + 14; lastY = y;
    g += `<text x="${right ? x + 10 : x - 10}" y="${y}" text-anchor="${right ? 'start' : 'end'}" font-size="12.5" font-weight="600" fill="var(--ink)" stroke="var(--surface)" stroke-width="3" paint-order="stroke">${esc(p.name)}</text>`;
  }
  el.innerHTML = `<div class="view-head"><div><h2>Preço × nota</h2><p>Cada ponto é um aparelho. Acima da linha tracejada, a nota é maior do que o preço sugere; abaixo, menor. Os aparelhos da sua comparação aparecem com contorno e nome.</p></div>
    <label class="field"><span class="eyebrow">Destacar marca</span><select id="ch-brand"><option value="">Todas</option>${Object.keys(BRANDS).map(b => `<option${S.chBrand === b ? ' selected' : ''}>${b}</option>`).join('')}</select></label></div>
    <div class="chart-box"><div class="legend">${Object.entries(TIER).map(([k, t]) => `<span><span class="dot" style="background:${TIER_COLOR[k]}"></span>${t}</span>`).join('')}
      <span class="muted">${pts.length} de ${P.length} aparelhos têm preço ${S.base === 'br' ? 'no Brasil' : 'em dólar'}</span></div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Dispersão de preço por nota geral">${g}</svg></div>
    <p class="small muted" style="margin-top:10px">A mesma informação em tabela está no Catálogo, ordenando por custo-benefício.</p>`;
}

/* ---------- ficha completa ---------- */
function openDetail(id) {
  const p = byId.get(id); if (!p) return;
  const dlg = $('#dlg'), pc = proscons(p), tg = tags(p), sel = S.cmp.includes(p.id), bi = BRANDS[p.brand];
  const sim = P.filter(o => o.id !== p.id && o.tier === p.tier && !!o.fold === !!p.fold)
    .map(o => [o, price(p) != null && price(o) != null ? Math.abs(Math.log(price(o) / price(p))) : 1 + Math.abs(o.score - p.score) / 100]).sort((a, b) => a[1] - b[1]).slice(0, 4).map(x => x[0]);
  const dl = rows => `<dl>${rows.filter(r => r[1] != null && r[1] !== '').map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('')}</dl>`;
  const est = p.usd != null && priceBR(p) == null ? `<div class="note">Sem preço no Brasil. A conversão direta de ${fUSD(p.usd)} dá cerca de ${fBRL(p.usd * RATE)} com o dólar a R$ ${n(RATE, 2)}, sem imposto de importação nem frete, que costumam elevar bastante o valor final.</div>` : '';
  dlg.innerHTML = `<div class="dlg">
    <div class="dlg-head"><div>${phoneFit(p, 110, 150)}</div>
      <div><span class="eyebrow">${esc(p.brand)} · ${TIER[p.tier]}${p.fold ? ' · dobrável' : ''}</span><h2 id="dlg-title">${esc(p.name)}</h2>
        <div class="dlg-prices">
          <div>Menor preço atual no Brasil<b>${p.brl_now != null ? fBRL(p.brl_now) : '—'}</b></div><div>Lançamento no Brasil<b>${p.brl_launch != null ? fBRL(p.brl_launch) : '—'}</b></div>
          <div>Lançamento global<b>${p.usd != null ? fUSD(p.usd) : '—'}</b></div><div>Custo-benefício<b>${fCB(p.cb)}${p.cb != null ? ' pts' : ''}</b></div></div></div>
      <button type="button" class="dlg-close" data-close aria-label="Fechar">×</button></div>
    ${est}${p.br_note ? `<div class="note">${esc(p.br_note)}</div>` : ''}
    <p style="margin:0;max-width:75ch">${verdict(p)} ${p.cb != null ? `Custo-benefício: ${cbLabel(p.cb).toLowerCase()} para o preço.` : ''}</p>
    <div class="two">
      <div><h3 style="font-size:15px;margin-bottom:10px">Notas</h3><div class="scores">
        ${[['Geral', p.score], ...Object.entries(CAT).map(([k, t]) => [t, p.s[k]])].map(([t, v]) => `<div class="sc"><span>${t}</span><span class="track"><i style="width:${v}%"></i></span><span class="num">${v}</span>${qTag(v)}</div>`).join('')}</div>
        ${tg.length ? `<h3 style="font-size:15px;margin:16px 0 8px">Indicado para</h3><div class="tags">${tg.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}</div>
      <div><h3 style="font-size:15px;margin-bottom:8px">Pontos fortes</h3><ul class="pc pro">${pc.pro.map(x => `<li>${esc(x)}</li>`).join('') || '<li>Nenhum destaque claro na ficha</li>'}</ul>
        <h3 style="font-size:15px;margin:14px 0 8px">Pontos fracos</h3><ul class="pc con">${pc.con.map(x => `<li>${esc(x)}</li>`).join('') || '<li>Nenhuma fraqueza clara na ficha</li>'}</ul></div>
    </div>
    <div class="spec-list">
      <div><h4>Tela</h4>${dl([['Painel', `${n(p.disp.inch, 2)}" ${p.disp.type}`], ['Resolução', p.disp.res + (p.disp.ppi ? ` · ${p.disp.ppi} ppi` : '')], ['Atualização', p.disp.hz + ' Hz'], ['Pico declarado', p.disp.nits ? n(p.disp.nits) + ' nits' : null], ['Brilho medido', p.disp.nits_test ? n(p.disp.nits_test) + ' nits' : null], ['Proteção', p.disp.prot]])}</div>
      <div><h4>Desempenho</h4>${dl([['Chip', p.chip + (p.nm ? ` · ${p.nm} nm` : '')], ['AnTuTu 11', p.antutu ? n(p.antutu) : null], ['Geekbench 6', p.gb6s ? `${n(p.gb6s)} / ${n(p.gb6m)}` : null], ['RAM', p.ram.length ? p.ram.join(' / ') + ' GB' : null], ['Armazenamento', p.rom.length ? p.rom.map(g => g >= 1024 ? g / 1024 + ' TB' : g + ' GB').join(' / ') : null], ['Tipo', p.rom_type], ['microSD', yn(p.sd)]])}</div>
      <div><h4>Bateria</h4>${dl([['Capacidade', n(p.bat.mah) + ' mAh'], ['Autonomia medida', p.bat.life ? n(p.bat.life, 1) + ' h' : null], ['Carga com fio', p.bat.w ? p.bat.w + ' W' : null], ['30 minutos', p.bat.p30 ? p.bat.p30 + '%' : null], ['Até 100%', p.bat.full ? p.bat.full + ' min' : null], ['Sem fio', p.bat.wl ? p.bat.wl + ' W' : 'Não'], ['Carga reversa', yn(p.bat.rev)], ['Carregador na caixa', p.bat.charger == null ? null : yn(p.bat.charger)]])}</div>
      <div><h4>Câmera</h4>${dl([['Traseiras', p.cam.lenses.map(esc).join('<br>')], ['Sensor principal', p.cam.sensor], ['Zoom óptico', p.cam.zoom ? nz(p.cam.zoom) + 'x' : 'Não'], ['Vídeo', p.cam.video], ['Frontal', p.cam.selfie ? n(p.cam.selfie, 1) + ' MP' : null], ['DxOMark', p.cam.dxo]])}</div>
      <div><h4>Construção</h4>${dl([['Dimensões', `${n(p.body.h, 1)} × ${n(p.body.w, 1)} × ${n(p.body.t, 1)} mm`], ['Peso', n(p.body.g) + ' g'], ['Resistência', p.body.ip], ['Traseira', p.body.back ? matPT(p.body.back) : null], ['Moldura', p.body.frame ? matPT(p.body.frame) : null]])}</div>
      <div><h4>Software e conexões</h4>${dl([['Sistema', (p.os || '') + (p.ui ? ' · ' + p.ui : '')], ['Atualizações', p.os_years ? `${p.os_years} anos de sistema, ${p.sec_years || '?'} de segurança` : 'Não informado'], ['Rede', p.con.g5 ? '5G' : '4G'], ['Wi-Fi', p.con.wifi], ['Bluetooth', p.con.bt], ['NFC', p.con.nfc === 'region' ? 'Depende da região' : p.con.nfc == null ? null : yn(p.con.nfc)], ['eSIM', yn(p.con.esim)], ['Fone P2', yn(p.con.jack)]])}</div>
    </div>
    <div class="note"><b>${esc(p.brand)} no Brasil:</b> ${bi.br}. ${bi.forte} ${bi.fraco}</div>
    <div><h3 style="font-size:15px;margin-bottom:8px">Rivais diretos</h3><div class="similar">${sim.map(o => `<button type="button" class="chip" data-open="${o.id}">${esc(o.name)} <span class="n">${o.score}</span></button>`).join('')}</div></div>
    <div class="f-row" style="justify-content:space-between"><a href="${p.src}" target="_blank" rel="noopener" class="small">Ficha de origem no NanoReview</a>
      <button type="button" class="btn primary" data-dlgcmp="${p.id}"${!sel && S.cmp.length >= 4 ? ' disabled' : ''}>${sel ? 'Remover da comparação' : S.cmp.length >= 4 ? 'Comparação cheia (4)' : 'Adicionar à comparação'}</button></div>
  </div>`;
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
}

/* ---------- estado e eventos ---------- */
function renderTray() {
  $('#cmp-count').textContent = S.cmp.length;
  const t = $('#tray'); t.hidden = !S.cmp.length || S.tab === 'comparar';
  $('#tray-sum').textContent = S.cmp.length === 1 ? '1 aparelho marcado' : S.cmp.length + ' aparelhos marcados';
  $('#tray-items').innerHTML = S.cmp.map(id => `<span class="pill">${esc(byId.get(id).name)}<button type="button" data-rm="${id}" aria-label="Remover ${esc(byId.get(id).name)}">×</button></span>`).join('');
  $('#tray-go').disabled = S.cmp.length < 2;
  $('#tray-go').textContent = S.cmp.length < 2 ? 'Escolha mais 1' : `Comparar ${S.cmp.length}`;
}
const VIEWS = { catalogo: renderCatalog, comparar: renderCompare, rankings: renderRankings, marcas: renderBrands, grafico: renderChart };
function render() { VIEWS[S.tab](); renderTray(); }
function setTab(t, push) {
  if (!VIEWS[t]) t = 'catalogo';
  S.tab = t;
  document.querySelectorAll('[data-view]').forEach(v => { v.hidden = v.dataset.view !== t; });
  document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === t));
  if (push) { try { history.replaceState(null, '', '#' + t); } catch (e) { /* sem histórico */ } window.scrollTo(0, 0); }
  render();
}
function toggleCmp(id, on) {
  const i = S.cmp.indexOf(id);
  if (on === undefined) on = i < 0;
  if (on && i < 0 && S.cmp.length < 4) S.cmp.push(id); else if (!on && i >= 0) S.cmp.splice(i, 1);
  store.set('cmp', S.cmp);
}
function setBase(b) {
  S.base = b; S.band = -1; store.set('base', b);
  document.querySelectorAll('[data-base]').forEach(x => x.setAttribute('aria-pressed', x.dataset.base === b));
  computeCB(); render();
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-tab],[data-base],[data-open],[data-f],[data-rm],[data-preset],[data-rk],[data-rkp],[data-brand],[data-close],[data-dlgcmp],#tray-clear,#tray-go');
  if (!t) { if (e.target === $('#dlg')) $('#dlg').close(); return; }
  const d = t.dataset;
  if (d.tab) return setTab(d.tab, true);
  if (d.base) return setBase(d.base);
  if (d.open) return openDetail(d.open);
  if ('close' in d) return $('#dlg').close();
  if (d.dlgcmp) { toggleCmp(d.dlgcmp); render(); return openDetail(d.dlgcmp); }
  if (d.rm) { toggleCmp(d.rm, false); return render(); }
  if (d.preset) { S.cmp = PRESETS[+d.preset][1].filter(id => byId.has(id)); store.set('cmp', S.cmp); return render(); }
  if ('rk' in d) { S.rkTier = d.rk; return render(); }
  if ('rkp' in d) { S.rkPriced = !S.rkPriced; return render(); }
  if (d.brand) { S.brands = new Set([d.brand]); S.q = ''; S.tiers.clear(); S.feats.clear(); S.band = -1; return setTab('catalogo', true); }
  if (t.id === 'tray-clear') { S.cmp = []; store.set('cmp', S.cmp); return render(); }
  if (t.id === 'tray-go') return setTab('comparar', true);
  if (d.f) {
    const tog = (set, v) => set.has(v) ? set.delete(v) : set.add(v);
    if (d.f === 'brand') tog(S.brands, d.v); else if (d.f === 'tier') tog(S.tiers, d.v); else if (d.f === 'feat') tog(S.feats, d.v);
    else if (d.f === 'band') S.band = S.band === +d.v ? -1 : +d.v; else if (d.f === 'priced') S.onlyPriced = !S.onlyPriced;
    else if (d.f === 'clear') { S.q = ''; S.brands.clear(); S.tiers.clear(); S.feats.clear(); S.band = -1; S.onlyPriced = false; }
    return render();
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.cmp) { toggleCmp(t.dataset.cmp, t.checked); return render(); }
  if (t.id === 'f-sort') { S.sort = t.value; return render(); }
  if (t.id === 'cmp-add' && t.value) { toggleCmp(t.value, true); return render(); }
  if (t.id === 'br-metric') { S.brMetric = t.value; return render(); }
  if (t.id === 'ch-brand') { S.chBrand = t.value; return render(); }
});
let qT = 0;
document.addEventListener('input', e => { if (e.target.id === 'f-q') { S.q = e.target.value; clearTimeout(qT); qT = setTimeout(() => renderCatalog(true), 160); } });
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('g[data-open]')) { e.preventDefault(); openDetail(e.target.dataset.open); } });
const tip = $('#tip');
document.addEventListener('pointermove', e => {
  const t = e.target.closest && e.target.closest('[data-tip]');
  if (!t) { tip.hidden = true; return; }
  const parts = t.dataset.tip.split('|');
  tip.innerHTML = `<b>${esc(parts[0])}</b>${parts.slice(1).map(esc).join('<br>')}`; tip.hidden = false;
  const r = tip.getBoundingClientRect();
  tip.style.left = Math.max(8, Math.min(window.innerWidth - r.width - 8, e.clientX + 14)) + 'px';
  tip.style.top = (e.clientY + r.height + 24 > window.innerHeight ? e.clientY - r.height - 12 : e.clientY + 16) + 'px';
});
let wasNarrow = window.innerWidth < 640, rT = 0;
window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { const nw = window.innerWidth < 640; if (nw !== wasNarrow) { wasNarrow = nw; render(); } }, 200); });
document.addEventListener('pointerleave', () => { tip.hidden = true; });

/* ---------- início ---------- */
$('#subtitulo').textContent = `${P.length} aparelhos da linha atual de ${Object.keys(BRANDS).length} marcas, com preço no Brasil e em dólar, notas de 0 a 100 por categoria, leitura de pontos fortes e fracos e ficha técnica completa.`;
$('#rodape-data').textContent = `Preços coletados em ${D.meta.price_date.split('-').reverse().join('/')}. Conversões usam o dólar a R$ ${n(RATE, 2)}. Preços mudam todo dia: confirme na loja antes de comprar.`;
document.querySelectorAll('[data-base]').forEach(x => x.setAttribute('aria-pressed', x.dataset.base === S.base));
computeCB();
setTab((location.hash || '').slice(1) || 'catalogo', false);
})();
