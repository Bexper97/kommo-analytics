// Painel: busca /api/metrics e desenha os gráficos em SVG (sem bibliotecas externas).

const $ = (id) => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const tooltip = $('tooltip');
let lastData = null;

// ---------- formatação ----------
function fmtDuration(sec) {
  if (sec === null || sec === undefined) return '—';
  if (sec < 60) return `${sec} s`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d} d ${h % 24} h` : `${d} d`;
}
const fmtShort = (sec) => (sec < 3600 ? `${Math.round(sec / 60)}min` : sec < 86400 ? `${+(sec / 3600).toFixed(1)}h` : `${+(sec / 86400).toFixed(1)}d`);
const fmtPct = (v) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`);
const fmtInt = (v) => v.toLocaleString('pt-BR');
const fmtDateTime = (ts) => new Date(ts * 1000).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const fmtDay = (key) => { const [, m, d] = key.split('-'); return `${d}/${m}`; };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Escala "limpa" em unidades de tempo.
const STEPS = [60, 120, 300, 600, 900, 1800, 3600, 7200, 10800, 21600, 43200, 86400, 172800, 432000];
function timeTicks(max) {
  const step = STEPS.find((s) => max / s <= 5) || Math.ceil(max / 5 / 86400) * 86400;
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return { top, ticks };
}
function countTicks(max) {
  const raw = Math.max(1, max) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((k) => k * mag).find((s) => s >= raw);
  const top = Math.ceil(Math.max(1, max) / step) * step;
  const ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return { top, ticks };
}

// ---------- helpers SVG ----------
function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}
function svgFor(container, height) {
  container.innerHTML = '';
  const width = container.clientWidth || 600;
  const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, height });
  container.appendChild(svg);
  return { svg, width };
}
// Barra com ponta arredondada (4px) e base reta.
function barPath(x, y, w, h, horizontal) {
  const r = Math.min(4, horizontal ? h / 2 : w / 2, horizontal ? w : h);
  if (h <= 0 || w <= 0) return '';
  if (horizontal) return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}
function showTip(evt, html) {
  tooltip.innerHTML = html;
  tooltip.style.left = `${evt.pageX}px`;
  tooltip.style.top = `${evt.pageY}px`;
  tooltip.classList.add('show');
}
const hideTip = () => tooltip.classList.remove('show');

function yAxis(svg, ticks, scale, left, right, fmt) {
  for (const t of ticks) {
    const y = scale(t);
    el('line', { x1: left, x2: right, y1: y, y2: y, class: t === 0 ? 'baseline' : 'gridline' }, svg);
    el('text', { x: left - 6, y: y + 4, 'text-anchor': 'end' }, svg).textContent = fmt(t);
  }
}

// ---------- gráficos ----------
function lineChart(container, rows) {
  const H = 260, pad = { l: 52, r: 16, t: 12, b: 28 };
  const { svg, width } = svgFor(container, H);
  const max = Math.max(60, ...rows.flatMap((r) => [r.avg || 0, r.median || 0]));
  const { top, ticks } = timeTicks(max);
  const x = (i) => pad.l + (rows.length === 1 ? (width - pad.l - pad.r) / 2 : (i * (width - pad.l - pad.r)) / (rows.length - 1));
  const y = (v) => H - pad.b - (v / top) * (H - pad.t - pad.b);
  yAxis(svg, ticks, y, pad.l, width - pad.r, fmtShort);

  const labelEvery = Math.ceil(rows.length / Math.max(2, Math.floor((width - pad.l) / 56)));
  rows.forEach((r, i) => {
    if (i % labelEvery === 0) el('text', { x: x(i), y: H - 8, 'text-anchor': 'middle' }, svg).textContent = fmtDay(r.key);
  });

  const series = [['avg', 'var(--series-1)'], ['median', 'var(--series-2)']];
  for (const [key, color] of series) {
    let d = '';
    rows.forEach((r, i) => {
      if (r[key] === null) { d += ' '; return; }
      d += `${d.endsWith(' ') || !d ? 'M' : 'L'}${x(i)},${y(r[key])}`;
    });
    el('path', { d: d.replace(/\s+/g, ''), fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
    if (rows.length <= 45) {
      rows.forEach((r, i) => { if (r[key] !== null) el('circle', { cx: x(i), cy: y(r[key]), r: 3, fill: color, stroke: 'var(--surface-1)', 'stroke-width': 2 }, svg); });
    }
  }

  // Crosshair + tooltip
  const cross = el('line', { y1: pad.t, y2: H - pad.b, stroke: 'var(--text-muted)', 'stroke-width': 1, opacity: 0 }, svg);
  const hit = el('rect', { x: pad.l, y: pad.t, width: width - pad.l - pad.r, height: H - pad.t - pad.b, fill: 'transparent' }, svg);
  hit.addEventListener('mousemove', (evt) => {
    const box = svg.getBoundingClientRect();
    const px = ((evt.clientX - box.left) / box.width) * width;
    const i = Math.max(0, Math.min(rows.length - 1, Math.round(((px - pad.l) / (width - pad.l - pad.r)) * (rows.length - 1))));
    const r = rows[i];
    cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('opacity', 0.6);
    showTip(evt, `<b>${fmtDay(r.key)}</b><br>Média: ${fmtDuration(r.avg)}<br>Mediana: ${fmtDuration(r.median)}<br>${r.count} atendidos · ${r.waiting} aguardando`);
  });
  hit.addEventListener('mouseleave', () => { cross.setAttribute('opacity', 0); hideTip(); });
}

function columnChart(container, rows, { valueKey, fmtValue, fmtAxis, ticksFn, tip, label }) {
  const H = 240, pad = { l: 48, r: 8, t: 20, b: 28 };
  const { svg, width } = svgFor(container, H);
  const max = Math.max(...rows.map((r) => r[valueKey] || 0));
  const { top, ticks } = ticksFn(max);
  const y = (v) => H - pad.b - (v / top) * (H - pad.t - pad.b);
  yAxis(svg, ticks, y, pad.l, width - pad.r, fmtAxis);
  const slot = (width - pad.l - pad.r) / rows.length;
  const bw = Math.min(24, slot - 2);
  const labelEvery = Math.ceil(rows.length / Math.max(2, Math.floor((width - pad.l) / 44)));
  rows.forEach((r, i) => {
    const cx = pad.l + slot * i + slot / 2;
    const v = r[valueKey];
    if (v) el('path', { d: barPath(cx - bw / 2, y(v), bw, y(0) - y(v), false), fill: 'var(--series-1)' }, svg);
    if (i % labelEvery === 0) el('text', { x: cx, y: H - 8, 'text-anchor': 'middle' }, svg).textContent = label(r);
    if (rows.length <= 8 && v) el('text', { x: cx, y: y(v) - 6, 'text-anchor': 'middle', class: 'val' }, svg).textContent = fmtValue(v);
    const hit = el('rect', { x: cx - slot / 2, y: pad.t, width: slot, height: H - pad.t - pad.b, fill: 'transparent' }, svg);
    hit.addEventListener('mousemove', (evt) => showTip(evt, tip(r)));
    hit.addEventListener('mouseleave', hideTip);
  });
}

function userBars(container, rows) {
  const rowsWithData = rows.filter((r) => r.avg !== null);
  const rowH = 32, labelW = Math.min(170, container.clientWidth * 0.35), pad = { t: 4, r: 90 };
  const H = Math.max(rowH, rowsWithData.length * rowH) + pad.t;
  const { svg, width } = svgFor(container, H);
  const max = Math.max(60, ...rowsWithData.map((r) => r.avg));
  const scale = (v) => (v / max) * (width - labelW - pad.r);
  rowsWithData.forEach((r, i) => {
    const yTop = pad.t + i * rowH;
    const bh = 18;
    el('text', { x: labelW - 10, y: yTop + rowH / 2 + 4, 'text-anchor': 'end', class: 'val' }, svg).textContent = r.label.length > 22 ? `${r.label.slice(0, 21)}…` : r.label;
    el('path', { d: barPath(labelW, yTop + (rowH - bh) / 2, Math.max(2, scale(r.avg)), bh, true), fill: 'var(--series-1)' }, svg);
    el('text', { x: labelW + scale(r.avg) + 8, y: yTop + rowH / 2 + 4, class: 'val' }, svg).textContent = fmtDuration(r.avg);
    const hit = el('rect', { x: 0, y: yTop, width, height: rowH, fill: 'transparent' }, svg);
    hit.addEventListener('mousemove', (evt) => showTip(evt, `<b>${esc(r.label)}</b><br>Média: ${fmtDuration(r.avg)}<br>Mediana: ${fmtDuration(r.median)}<br>${r.count} atendidos · ${r.waiting} aguardando`));
    hit.addEventListener('mouseleave', hideTip);
  });
}

// ---------- tabelas ----------
function table(container, headers, rows) {
  if (!rows.length) { container.innerHTML = '<p class="hint">Nenhum registro no período.</p>'; return; }
  const th = headers.map(([label, num]) => `<th class="${num ? 'num' : ''}">${label}</th>`).join('');
  const body = rows.map((cells) => `<tr>${cells.map((c, i) => `<td class="${headers[i][1] ? 'num' : ''}">${c}</td>`).join('')}</tr>`).join('');
  container.innerHTML = `<table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`;
}
const leadLink = (l) => (l.url ? `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.name || `#${l.id}`)}</a>` : esc(l.name || `#${l.id}`));
function slaStatus(sec) {
  if (sec <= 15 * 60) return `<span class="status good">${fmtDuration(sec)}</span>`;
  if (sec <= 60 * 60) return `<span class="status warning">${fmtDuration(sec)}</span>`;
  return `<span class="status critical">${fmtDuration(sec)}</span>`;
}

// ---------- render ----------
function render(data) {
  lastData = data;
  $('demo-badge').hidden = !data.demo;
  const t = data.totals;

  $('kpi-avg').textContent = fmtDuration(data.overall.avg);
  $('kpi-avg-sub').textContent = `${fmtInt(t.attended)} leads atendidos no período`;
  $('kpi-median').textContent = fmtDuration(data.overall.median);
  $('kpi-p90').textContent = fmtDuration(data.overall.p90);
  const sla15 = data.sla.find((s) => s.minutes === 15);
  $('kpi-sla').textContent = fmtPct(sla15?.pct);
  $('kpi-sla-sub').textContent = data.sla.map((s) => `${s.minutes < 60 ? `${s.minutes} min` : `${s.minutes / 60} h`}: ${fmtPct(s.pct)}`).join(' · ');
  $('kpi-waiting').textContent = fmtInt(t.waiting);
  $('kpi-waiting-sub').textContent = `${fmtPct(t.withEntry ? t.waiting / t.withEntry : null)} dos leads que entraram`;

  lineChart($('chart-daily'), data.daily);
  table($('table-daily'), [['Dia'], ['Atendidos', 1], ['Média', 1], ['Mediana', 1], ['P90', 1], ['Aguardando', 1]],
    data.daily.map((d) => [fmtDay(d.key), d.count, fmtDuration(d.avg), fmtDuration(d.median), fmtDuration(d.p90), d.waiting]));

  columnChart($('chart-dist'), data.distribution, {
    valueKey: 'count', fmtValue: fmtInt, fmtAxis: fmtInt, ticksFn: countTicks,
    label: (r) => r.label.replace(' min', '').replace('mais de ', '>'),
    tip: (r) => `<b>${r.label}</b><br>${fmtInt(r.count)} leads (${fmtPct(t.attended ? r.count / t.attended : null)})`,
  });
  columnChart($('chart-hour'), data.byHour, {
    valueKey: 'avg', fmtValue: fmtShort, fmtAxis: fmtShort, ticksFn: (m) => timeTicks(Math.max(60, m)),
    label: (r) => `${r.key}h`,
    tip: (r) => `<b>Entrada entre ${r.key}h e ${r.key}h59</b><br>Média: ${fmtDuration(r.avg)}<br>Mediana: ${fmtDuration(r.median)}<br>${r.count} atendidos`,
  });

  userBars($('chart-user'), data.byUser);
  table($('table-user'), [['Responsável'], ['Atendidos', 1], ['Média', 1], ['Mediana', 1], ['P90', 1], ['Aguardando', 1]],
    data.byUser.map((u) => [esc(u.label), u.count, fmtDuration(u.avg), fmtDuration(u.median), fmtDuration(u.p90), u.waiting]));
  table($('table-pipeline'), [['Funil'], ['Atendidos', 1], ['Média', 1], ['Mediana', 1], ['Aguardando', 1]],
    data.byPipeline.map((p) => [esc(p.label), p.count, fmtDuration(p.avg), fmtDuration(p.median), p.waiting]));
  table($('table-quality'), [['Situação'], ['Leads', 1]], [
    ['Leads analisados (atualizados no período)', fmtInt(t.leadsFetched)],
    ['Com “Entrada do lead” no período', fmtInt(t.withEntry)],
    ['Com início de atendimento (usados na média)', fmtInt(t.attended)],
    ['Analisados sem “Entrada do lead” preenchida', fmtInt(t.missingEntry)],
    ['Início antes da entrada (ignorados)', fmtInt(t.invalid)],
  ]);
  table($('table-waiting'), [['Lead'], ['Responsável'], ['Entrada'], ['Esperando há', 1]],
    data.waitingList.map((l) => [leadLink(l), esc(l.user), fmtDateTime(l.entry), slaStatus(l.waitingFor)]));
  table($('table-slowest'), [['Lead'], ['Responsável'], ['Entrada'], ['Tempo', 1]],
    data.slowest.map((l) => [leadLink(l), esc(l.user), fmtDateTime(l.entry), slaStatus(l.delta)]));
}

// ---------- período ----------
const isoDay = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
function setPreset(days) {
  const to = new Date();
  const from = new Date(); from.setDate(from.getDate() - (days - 1));
  $('from').value = isoDay(from);
  $('to').value = isoDay(to);
  document.querySelectorAll('.seg button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.days) === days)));
}

async function load(refresh = false) {
  const content = $('content');
  content.classList.add('loading');
  $('notice').innerHTML = '';
  try {
    const qs = new URLSearchParams({ from: $('from').value, to: $('to').value });
    if (refresh) qs.set('refresh', '1');
    const res = await fetch(`/api/metrics?${qs}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    render(data);
  } catch (err) {
    $('notice').innerHTML = `<div class="notice error">Não foi possível carregar os dados: ${esc(err.message)}</div>`;
  } finally {
    content.classList.remove('loading');
  }
}

document.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => { setPreset(Number(b.dataset.days)); load(); }));
['from', 'to'].forEach((id) => $(id).addEventListener('change', () => {
  document.querySelectorAll('.seg button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  load();
}));
$('refresh').addEventListener('click', () => load(true));
let resizeTimer;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => lastData && render(lastData), 150); });

setPreset(30);
load();
