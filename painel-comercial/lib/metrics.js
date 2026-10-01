// Calcula o tempo até o primeiro contato a partir dos campos personalizados do lead.

const SLA_TARGETS_MIN = [5, 15, 60]; // faixas de "atendido em até X minutos"
const BUCKETS = [
  { label: 'até 5 min', max: 5 * 60 },
  { label: '5–15 min', max: 15 * 60 },
  { label: '15–30 min', max: 30 * 60 },
  { label: '30–60 min', max: 60 * 60 },
  { label: '1–4 h', max: 4 * 3600 },
  { label: '4–24 h', max: 24 * 3600 },
  { label: 'mais de 24 h', max: Infinity },
];

// Lê um campo de data/hora do lead. A Kommo devolve unix (segundos) em campos
// date_time, mas aceitamos também texto ISO ou "dd/mm/aaaa hh:mm" por segurança.
function readTimestamp(lead, fieldId) {
  const field = (lead.custom_fields_values || []).find((f) => f.field_id === fieldId);
  const raw = field?.values?.[0]?.value;
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw === 'number') return raw > 1e12 ? Math.floor(raw / 1000) : raw;
  const str = String(raw).trim();
  if (/^\d+$/.test(str)) return readTimestamp({ custom_fields_values: [{ field_id: fieldId, values: [{ value: Number(str) }] }] }, fieldId);
  const br = str.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (br) {
    const [, d, m, y, hh = '00', mm = '00', ss = '00'] = br;
    return Math.floor(new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}-03:00`).getTime() / 1000);
  }
  const parsed = Date.parse(str);
  return Number.isNaN(parsed) ? null : Math.floor(parsed / 1000);
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo));
}

function summarize(seconds) {
  const sorted = [...seconds].sort((a, b) => a - b);
  const n = sorted.length;
  return {
    count: n,
    avg: n ? Math.round(sorted.reduce((s, v) => s + v, 0) / n) : null,
    median: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
  };
}

// `leads`: linhas do banco com entry_at / first_contact_at (unix, segundos).
// `userName` e `pipelineName`: Map id -> nome.
function computeMetrics({ leads, userName, pipelineName, from, to, timeZone, kommoBaseUrl, noContactSeconds = 3600, now = Math.floor(Date.now() / 1000) }) {

  const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const hourFmt = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' });

  const attended = []; // { lead, entry, first, delta }
  const waiting = []; // leads com entrada, sem início de atendimento
  let missingEntry = 0;
  let invalid = 0; // início anterior à entrada

  for (const lead of leads) {
    const entry = lead.entry_at;
    if (entry === null || entry === undefined) { missingEntry++; continue; }
    if (entry < from || entry > to) continue;
    const first = lead.first_contact_at ?? null;
    if (first === null) { waiting.push({ lead, entry }); continue; }
    const delta = first - entry;
    if (delta < 0) { invalid++; continue; }
    attended.push({ lead, entry, first, delta });
  }

  const deltas = attended.map((a) => a.delta);
  const overall = summarize(deltas);
  const totalWithEntry = attended.length + waiting.length;

  const sla = SLA_TARGETS_MIN.map((min) => ({
    minutes: min,
    count: deltas.filter((d) => d <= min * 60).length,
    pct: deltas.length ? deltas.filter((d) => d <= min * 60).length / deltas.length : null,
  }));

  const distribution = BUCKETS.map((b, i) => {
    const min = i === 0 ? -1 : BUCKETS[i - 1].max;
    return { label: b.label, count: deltas.filter((d) => d > min && d <= b.max).length };
  });

  const groupBy = (keyFn, labelFn) => {
    const groups = new Map();
    for (const a of attended) {
      const key = keyFn(a);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(a.delta);
    }
    const waitingByKey = new Map();
    for (const w of waiting) {
      const key = keyFn(w);
      waitingByKey.set(key, (waitingByKey.get(key) || 0) + 1);
    }
    const keys = new Set([...groups.keys(), ...waitingByKey.keys()]);
    return [...keys].map((key) => ({
      key,
      label: labelFn(key),
      ...summarize(groups.get(key) || []),
      waiting: waitingByKey.get(key) || 0,
    }));
  };

  const byUser = groupBy(
    (a) => a.lead.responsible_user_id,
    (id) => userName.get(id) || `Usuário ${id}`,
  ).sort((a, b) => (a.avg ?? Infinity) - (b.avg ?? Infinity));

  const byPipeline = groupBy(
    (a) => a.lead.pipeline_id,
    (id) => pipelineName.get(id) || `Funil ${id}`,
  ).sort((a, b) => b.count - a.count);

  // Série diária contínua (dias sem leads aparecem com null).
  const dailyMap = new Map(groupBy((a) => dayFmt.format(new Date(a.entry * 1000)), (k) => k).map((d) => [d.key, d]));
  const daily = [];
  for (let t = from; t <= to; t += 86400) {
    const key = dayFmt.format(new Date(t * 1000));
    if (daily.length && daily[daily.length - 1].key === key) continue;
    daily.push(dailyMap.get(key) || { key, label: key, count: 0, avg: null, median: null, p90: null, waiting: 0 });
  }

  const hourMap = new Map(groupBy((a) => Number(hourFmt.format(new Date(a.entry * 1000))), (h) => h).map((h) => [h.key, h]));
  const byHour = Array.from({ length: 24 }, (_, h) => hourMap.get(h) || { key: h, label: h, count: 0, avg: null, median: null, p90: null, waiting: 0 });

  const leadUrl = (id) => (kommoBaseUrl ? `${kommoBaseUrl.replace(/\/+$/, '')}/leads/detail/${id}` : null);

  // "Sem contato": passou do prazo (padrão 1 h) e ninguém iniciou o atendimento.
  const noContact = waiting.filter((w) => now - w.entry > noContactSeconds);
  const waitingList = noContact
    .map((w) => ({
      id: w.lead.id,
      name: w.lead.name,
      user: userName.get(w.lead.responsible_user_id) || `Usuário ${w.lead.responsible_user_id}`,
      pipeline: pipelineName.get(w.lead.pipeline_id) || `Funil ${w.lead.pipeline_id}`,
      entry: w.entry,
      waitingFor: Math.max(0, now - w.entry),
      url: leadUrl(w.lead.id),
    }))
    .sort((a, b) => b.waitingFor - a.waitingFor)
    .slice(0, 100);

  const slowest = [...attended]
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 20)
    .map((a) => ({
      id: a.lead.id,
      name: a.lead.name,
      user: userName.get(a.lead.responsible_user_id) || `Usuário ${a.lead.responsible_user_id}`,
      entry: a.entry,
      first: a.first,
      delta: a.delta,
      url: leadUrl(a.lead.id),
    }));

  return {
    period: { from, to, timeZone },
    totals: {
      leadsFetched: leads.length,
      withEntry: totalWithEntry,
      attended: attended.length,
      waiting: waiting.length,
      noContact: noContact.length,
      noContactMinutes: Math.round(noContactSeconds / 60),
      missingEntry,
      invalid,
      attendedPct: totalWithEntry ? attended.length / totalWithEntry : null,
    },
    overall,
    sla,
    distribution,
    byUser,
    byPipeline,
    daily,
    byHour,
    waitingList,
    slowest,
  };
}

module.exports = { computeMetrics, readTimestamp, percentile };
