// Monta todos os indicadores do painel a partir do banco.

const { computeMetrics } = require('./metrics');

const WON = 142;
const LOST = 143;

function cleanReason(text) {
  if (!text) return 'Sem motivo informado';
  return String(text).replace(/^\[[A-Z][\]}]\s*/i, '').trim() || 'Sem motivo informado';
}

async function buildReport({ db, config, from, to, userId, now = Math.floor(Date.now() / 1000) }) {
  const userFilter = userId ? ' and responsible_user_id = $USER' : '';
  // Monta a consulta trocando $USER pelo próximo parâmetro posicional.
  const q = (sql, params) => {
    const all = [...params];
    if (userId) all.push(userId);
    return db.query(sql.replace('$USER', `$${all.length}`), all);
  };

  const [{ rows: users }, { rows: statuses }] = await Promise.all([
    db.query('select id, name, is_active from users'),
    db.query('select id, pipeline_id, pipeline_name, name from statuses'),
  ]);
  const userName = new Map(users.map((u) => [u.id, u.name]));
  const pipelineName = new Map(statuses.map((s) => [s.pipeline_id, s.pipeline_name]));
  const statusName = new Map(statuses.map((s) => [`${s.pipeline_id}:${s.id}`, s.name]));
  const nameOf = (id) => userName.get(id) || `Usuário ${id}`;
  const leadUrl = (id) => `${config.kommoBaseUrl.replace(/\/+$/, '')}/leads/detail/${id}`;

  // ---------- tempo até o primeiro contato ----------
  const { rows: entryRows } = await q(
    `select id, name, responsible_user_id, pipeline_id, entry_at, first_contact_at
     from leads where not is_deleted and entry_at between $1 and $2${userFilter}`,
    [from, to],
  );
  const firstContact = computeMetrics({
    leads: entryRows, userName, pipelineName, from, to,
    timeZone: config.timeZone, kommoBaseUrl: config.kommoBaseUrl,
    noContactSeconds: config.noContactMinutes * 60, now,
  });

  // ---------- vendas (ganhos e perdidos fechados no período) ----------
  const { rows: closed } = await q(
    `select id, name, price, pipeline_id, status_id, responsible_user_id, loss_reason, closed_at
     from leads
     where not is_deleted and pipeline_id = any($1) and status_id in (${WON}, ${LOST})
       and closed_at between $2 and $3${userFilter}`,
    [config.salesPipelineIds, from, to],
  );
  const won = closed.filter((l) => l.status_id === WON);
  const lost = closed.filter((l) => l.status_id === LOST);
  const withValue = won.filter((l) => l.price > 0);
  const revenue = won.reduce((s, l) => s + l.price, 0);
  const sales = {
    won: won.length,
    lost: lost.length,
    revenue,
    avgTicket: withValue.length ? revenue / withValue.length : null,
    wonWithValue: withValue.length,
    conversion: won.length + lost.length ? won.length / (won.length + lost.length) : null,
  };

  // ---------- oportunidades paradas (situação atual, não depende do período) ----------
  const stalledCutoff = now - config.stalledDays * 86400;
  const { rows: stalledRows } = await q(
    `select id, name, price, pipeline_id, status_id, responsible_user_id,
            coalesce(stage_since, created_at) as since
     from leads
     where not is_deleted and pipeline_id = any($1)
       and status_id not in (${WON}, ${LOST}) and status_id <> all($2)
       and coalesce(stage_since, created_at) < $3${userFilter}
     order by since asc`,
    [config.salesPipelineIds, config.stalledExcludedStatusIds, stalledCutoff],
  );
  const stalled = {
    days: config.stalledDays,
    total: stalledRows.length,
    byStage: groupCount(stalledRows, (l) => `${pipelineName.get(l.pipeline_id) || l.pipeline_id} › ${statusName.get(`${l.pipeline_id}:${l.status_id}`) || l.status_id}`),
    list: stalledRows.slice(0, 200).map((l) => ({
      id: l.id,
      name: l.name,
      user: nameOf(l.responsible_user_id),
      pipeline: pipelineName.get(l.pipeline_id) || `Funil ${l.pipeline_id}`,
      stage: statusName.get(`${l.pipeline_id}:${l.status_id}`) || `Etapa ${l.status_id}`,
      since: l.since,
      stoppedFor: now - l.since,
      price: l.price,
      url: leadUrl(l.id),
    })),
  };

  // ---------- ranking de consultores ----------
  const consultants = new Map();
  const consultant = (id) => {
    if (!consultants.has(id)) consultants.set(id, { id, name: nameOf(id), won: 0, lost: 0, revenue: 0, withValue: 0, stalled: 0 });
    return consultants.get(id);
  };
  for (const l of won) {
    const c = consultant(l.responsible_user_id);
    c.won++; c.revenue += l.price; if (l.price > 0) c.withValue++;
  }
  for (const l of lost) consultant(l.responsible_user_id).lost++;
  for (const l of stalledRows) consultant(l.responsible_user_id).stalled++;
  const firstByUser = new Map(firstContact.byUser.map((u) => [u.key, u]));
  const ranking = [...consultants.values()]
    .map((c) => ({
      ...c,
      avgTicket: c.withValue ? c.revenue / c.withValue : null,
      conversion: c.won + c.lost ? c.won / (c.won + c.lost) : null,
      firstContactAvg: firstByUser.get(c.id)?.avg ?? null,
    }))
    .sort((a, b) => b.won - a.won || b.revenue - a.revenue || a.lost - b.lost);

  // ---------- ranking de fontes (canal registrado pela Kommo) ----------
  const { rows: sourceRows } = await q(
    `select coalesce(source_name, 'Sem canal registrado') as source,
            count(*)::int as leads,
            count(*) filter (where status_id = ${WON} and pipeline_id = any($2))::int as won,
            count(*) filter (where status_id in (${WON}, ${LOST}) and pipeline_id = any($2))::int as closed,
            coalesce(sum(price) filter (where status_id = ${WON} and pipeline_id = any($2)), 0) as revenue
     from leads
     where not is_deleted and pipeline_id = any($1) and created_at between $3 and $4${userFilter}
     group by 1 order by leads desc`,
    [config.sourcePipelineIds, config.salesPipelineIds, from, to],
  );
  const sources = sourceRows.map((s) => ({ ...s, conversion: s.leads ? s.won / s.leads : null }));

  // ---------- motivos de perda ----------
  const lossReasons = groupCount(lost, (l) => cleanReason(l.loss_reason));

  // ---------- lista de atendentes para o filtro ----------
  const { rows: filterUsers } = await db.query(
    `select distinct u.id, u.name from users u
     join leads l on l.responsible_user_id = u.id
     where u.is_active and not l.is_deleted
       and (l.pipeline_id = any($1) or l.entry_at is not null)
     order by u.name`,
    [config.salesPipelineIds],
  );

  const lastSync = Number(await db.getState('last_sync_finished')) || null;
  const lastWebhook = Number(await db.getState('last_webhook')) || null;

  return {
    period: { from, to, timeZone: config.timeZone },
    userId: userId || null,
    users: filterUsers,
    firstContact,
    sales,
    ranking,
    sources,
    lossReasons,
    stalled,
    salesPipelines: config.salesPipelineIds.map((id) => pipelineName.get(id) || String(id)),
    lastSync,
    lastWebhook,
    generatedAt: now,
  };
}

function groupCount(rows, keyFn) {
  const map = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    map.set(k, (map.get(k) || 0) + 1);
  }
  const total = rows.length;
  return [...map.entries()]
    .map(([label, count]) => ({ label, count, pct: total ? count / total : 0 }))
    .sort((a, b) => b.count - a.count);
}

module.exports = { buildReport };
