// Painel: busca /api/report e desenha os gráficos em SVG (sem bibliotecas externas).

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


const fmtMoney = (v) => (v === null || v === undefined ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: v >= 1000 ? 0 : 2 }));
const fmtMoneyShort = (v) => (v >= 1e6 ? `R$ ${(v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi` : v >= 1e4 ? `R$ ${(v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil` : fmtMoney(v));
const fmtDays = (sec) => { const d = Math.floor(sec / 86400); return d >= 1 ? `${d} ${d === 1 ? 'dia' : 'dias'}` : fmtDuration(sec); };

// Barras horizontais genéricas: rótulo à esquerda, valor na ponta.
function hBars(container, rows, { value, fmt, tip, onLabelClick, max: maxRows = 12 }) {
  const data = rows.filter((r) => value(r) > 0).slice(0, maxRows);
  if (!data.length) { container.innerHTML = '<p class="hint">Nenhum registro no período.</p>'; return; }
  const rowH = 30, labelW = Math.min(190, container.clientWidth * 0.4), padR = 96;
  const { svg, width } = svgFor(container, data.length * rowH + 4);
  const max = Math.max(...data.map(value));
  const scale = (v) => (v / max) * (width - labelW - padR);
  data.forEach((r, i) => {
    const yTop = 2 + i * rowH, bh = 16;
    const label = r.label.length > 26 ? `${r.label.slice(0, 25)}…` : r.label;
    const t = el('text', { x: labelW - 10, y: yTop + rowH / 2 + 4, 'text-anchor': 'end', class: onLabelClick ? 'val link' : 'val' }, svg);
    t.textContent = label;
    el('path', { d: barPath(labelW, yTop + (rowH - bh) / 2, Math.max(2, scale(value(r))), bh, true), fill: 'var(--series-1)' }, svg);
    el('text', { x: labelW + scale(value(r)) + 8, y: yTop + rowH / 2 + 4, class: 'val' }, svg).textContent = fmt(r);
    const hit = el('rect', { x: 0, y: yTop, width, height: rowH, fill: 'transparent', style: onLabelClick ? 'cursor:pointer' : '' }, svg);
    hit.addEventListener('mousemove', (evt) => showTip(evt, tip(r)));
    hit.addEventListener('mouseleave', hideTip);
    if (onLabelClick) hit.addEventListener('click', () => onLabelClick(r));
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
function stalledStatus(sec, days) {
  const cls = sec >= days * 2 * 86400 ? 'critical' : 'warning';
  return `<span class="status ${cls}">${fmtDays(sec)}</span>`;
}
const userButton = (id, name) => `<button class="linklike" data-user="${id}">${esc(name)}</button>`;

// ---------- render ----------
function render(data) {
  lastData = data;
  const fc = data.firstContact;
  const t = fc.totals;
  const filtered = data.userId ? (data.users.find((u) => u.id === data.userId)?.name || 'atendente') : null;

  // Cabeçalho e filtro de atendente
  const sel = $('user');
  const current = String(data.userId || '');
  sel.innerHTML = '<option value="">Todos os atendentes</option>' + data.users.map((u) => `<option value="${u.id}">${esc(u.name)}</option>`).join('');
  sel.value = current;
  const syncTxt = data.lastSync ? `atualizado às ${new Date(data.lastSync * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'aguardando primeira sincronização';
  $('sync-info').textContent = `Kommo CRM · ${syncTxt}${filtered ? ` · filtrado por ${filtered}` : ''}`;
  if (data.syncStatus?.phase === 'carga inicial') {
    $('notice').innerHTML = '<div class="notice">Carga inicial em andamento: os números ainda podem estar incompletos.</div>';
  }

  // 1. Primeiro contato
  $('kpi-avg').textContent = fmtDuration(fc.overall.avg);
  $('kpi-avg-sub').textContent = `${fmtInt(t.attended)} leads atendidos de ${fmtInt(t.withEntry)} que entraram no período`;
  $('kpi-median').textContent = fmtDuration(fc.overall.median);
  $('kpi-p90').textContent = fmtDuration(fc.overall.p90);
  const sla15 = fc.sla.find((s) => s.minutes === 15);
  $('kpi-sla').textContent = fmtPct(sla15?.pct);
  $('kpi-sla-sub').textContent = fc.sla.map((s) => `${s.minutes < 60 ? `${s.minutes} min` : `${s.minutes / 60} h`}: ${fmtPct(s.pct)}`).join(' · ');
  const limit = t.noContactMinutes >= 60 ? `${t.noContactMinutes / 60} h` : `${t.noContactMinutes} min`;
  $('kpi-nocontact-label').textContent = `Sem contato há mais de ${limit}`;
  $('kpi-nocontact').textContent = fmtInt(t.noContact);
  $('kpi-nocontact-sub').textContent = `${fmtInt(t.waiting - t.noContact)} aguardando dentro do prazo`;

  lineChart($('chart-daily'), fc.daily);
  table($('table-daily'), [['Dia'], ['Atendidos', 1], ['Média', 1], ['Mediana', 1], ['P90', 1], ['Aguardando', 1]],
    fc.daily.map((d) => [fmtDay(d.key), d.count, fmtDuration(d.avg), fmtDuration(d.median), fmtDuration(d.p90), d.waiting]));
  columnChart($('chart-dist'), fc.distribution, {
    valueKey: 'count', fmtValue: fmtInt, fmtAxis: fmtInt, ticksFn: countTicks,
    label: (r) => r.label.replace(' min', '').replace('mais de ', '>'),
    tip: (r) => `<b>${r.label}</b><br>${fmtInt(r.count)} leads (${fmtPct(t.attended ? r.count / t.attended : null)})`,
  });
  columnChart($('chart-hour'), fc.byHour, {
    valueKey: 'avg', fmtValue: fmtShort, fmtAxis: fmtShort, ticksFn: (m) => timeTicks(Math.max(60, m)),
    label: (r) => `${r.key}h`,
    tip: (r) => `<b>Entrada entre ${r.key}h e ${r.key}h59</b><br>Média: ${fmtDuration(r.avg)}<br>Mediana: ${fmtDuration(r.median)}<br>${r.count} atendidos`,
  });
  hBars($('chart-user'), fc.byUser.filter((u) => u.avg !== null), {
    value: (u) => u.avg, fmt: (u) => fmtDuration(u.avg),
    tip: (u) => `<b>${esc(u.label)}</b><br>Média: ${fmtDuration(u.avg)}<br>Mediana: ${fmtDuration(u.median)}<br>${u.count} atendidos · ${u.waiting} aguardando`,
    onLabelClick: (u) => setUser(u.key),
  });
  table($('table-user'), [['Atendente'], ['Atendidos', 1], ['Média', 1], ['Mediana', 1], ['P90', 1], ['Aguardando', 1]],
    fc.byUser.map((u) => [userButton(u.key, u.label), u.count, fmtDuration(u.avg), fmtDuration(u.median), fmtDuration(u.p90), u.waiting]));
  table($('table-slowest'), [['Lead'], ['Atendente'], ['Entrada'], ['Tempo', 1]],
    fc.slowest.map((l) => [leadLink(l), esc(l.user), fmtDateTime(l.entry), slaStatus(l.delta)]));

  // 2. Vendas
  const s = data.sales;
  $('sales-pipelines').textContent = data.salesPipelines.join(' · ');
  $('kpi-won').textContent = fmtInt(s.won);
  $('kpi-won-sub').textContent = `${fmtInt(s.lost)} perdidas no período`;
  $('kpi-revenue').textContent = fmtMoneyShort(s.revenue);
  $('kpi-ticket').textContent = fmtMoney(s.avgTicket);
  $('kpi-ticket-sub').innerHTML = s.won
    ? `${s.wonWithValue} de ${s.won} vendas com valor${s.wonWithValue < s.won ? ' <span class="status warning">preencher</span>' : ''}`
    : 'sem vendas no período';
  $('kpi-conv').textContent = fmtPct(s.conversion);
  $('kpi-stalled').textContent = fmtInt(data.stalled.total);
  $('kpi-stalled-sub').textContent = `há mais de ${data.stalled.days} dias na mesma etapa`;

  hBars($('chart-ranking'), data.ranking.map((c) => ({ ...c, label: c.name })), {
    value: (c) => c.won, fmt: (c) => `${c.won} · ${fmtMoneyShort(c.revenue)}`,
    tip: (c) => `<b>${esc(c.name)}</b><br>${c.won} vendas · ${fmtMoney(c.revenue)}<br>Ticket médio: ${fmtMoney(c.avgTicket)}<br>Conversão: ${fmtPct(c.conversion)}`,
    onLabelClick: (c) => setUser(c.id), max: 15,
  });
  table($('table-ranking'), [['Consultor'], ['Vendas', 1], ['Receita', 1], ['Ticket médio', 1], ['Perdidas', 1], ['Conversão', 1], ['1º contato (média)', 1], ['Paradas', 1]],
    data.ranking.map((c) => [userButton(c.id, c.name), c.won, fmtMoney(c.revenue), fmtMoney(c.avgTicket), c.lost, fmtPct(c.conversion), fmtDuration(c.firstContactAvg), c.stalled]));

  hBars($('chart-sources'), data.sources.map((x) => ({ ...x, label: x.source })), {
    value: (x) => x.leads, fmt: (x) => `${fmtInt(x.leads)} · ${x.won} vendas`,
    tip: (x) => `<b>${esc(x.source)}</b><br>${fmtInt(x.leads)} leads · ${x.won} vendas<br>Conversão: ${fmtPct(x.conversion)}<br>Receita: ${fmtMoney(x.revenue)}`,
  });
  table($('table-sources'), [['Canal'], ['Leads', 1], ['Vendas', 1], ['Conversão', 1], ['Receita', 1]],
    data.sources.map((x) => [esc(x.source), fmtInt(x.leads), x.won, fmtPct(x.conversion), fmtMoney(x.revenue)]));

  $('loss-hint').textContent = `${fmtInt(s.lost)} leads perdidos no período`;
  hBars($('chart-loss'), data.lossReasons, {
    value: (r) => r.count, fmt: (r) => `${r.count} · ${fmtPct(r.pct)}`,
    tip: (r) => `<b>${esc(r.label)}</b><br>${r.count} perdas (${fmtPct(r.pct)})`,
  });

  // 3. Para agir agora
  $('nocontact-title').textContent = `Leads sem contato há mais de ${limit} (${fmtInt(t.noContact)})`;
  $('nocontact-hint').textContent = 'Entraram no período e ainda não têm início de atendimento';
  table($('table-nocontact'), [['Lead'], ['Atendente'], ['Entrada'], ['Esperando há', 1]],
    fc.waitingList.map((l) => [leadLink(l), esc(l.user), fmtDateTime(l.entry), slaStatus(l.waitingFor)]));

  $('stalled-title').textContent = `Oportunidades paradas (${fmtInt(data.stalled.total)})`;
  $('stalled-hint').textContent = `Mais de ${data.stalled.days} dias na mesma etapa, sem contar o Follow-up automático. Situação de agora.`;
  table($('table-stalled'), [['Lead'], ['Consultor'], ['Etapa'], ['Parada há', 1]],
    data.stalled.list.map((l) => [leadLink(l), esc(l.user), `${esc(l.pipeline)} › ${esc(l.stage)}`, stalledStatus(l.stoppedFor, data.stalled.days)]));
}

// ---------- filtros ----------
const isoDay = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
function setPreset(days) {
  const to = new Date();
  const from = new Date(); from.setDate(from.getDate() - (days - 1));
  $('from').value = isoDay(from);
  $('to').value = isoDay(to);
  document.querySelectorAll('.seg button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.days) === days)));
}
function setUser(id) {
  $('user').value = String(id || '');
  load();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function load() {
  const content = $('content');
  content.classList.add('loading');
  $('notice').innerHTML = '';
  try {
    const qs = new URLSearchParams({ from: $('from').value, to: $('to').value });
    if ($('user').value) qs.set('user', $('user').value);
    const res = await fetch(`/api/report?${qs}`);
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
$('user').addEventListener('change', load);
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-user]');
  if (btn) setUser(btn.dataset.user);
});
let resizeTimer;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => lastData && render(lastData), 150); });
// Atualiza sozinho a cada 5 minutos para acompanhar a sincronização.
setInterval(() => { if (!document.hidden) load(); }, 5 * 60 * 1000);

setPreset(30);
load();
