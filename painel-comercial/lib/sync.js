// Sincronização Kommo -> banco: carga inicial, atualização periódica e webhook.

const { readTimestamp } = require('./metrics');

function createSync({ kommo, db, config, log = console.log }) {
  let running = null; // evita duas sincronizações ao mesmo tempo

  function toRow(lead) {
    const lossField = (lead.custom_fields_values || []).find((f) => f.field_id === config.lossReasonFieldId);
    return {
      id: lead.id,
      name: lead.name,
      price: lead.price || 0,
      pipeline_id: lead.pipeline_id,
      status_id: lead.status_id,
      responsible_user_id: lead.responsible_user_id,
      source_id: lead.source_id ?? lead._embedded?.source?.id ?? null,
      source_name: lead._embedded?.source?.name ?? null,
      // O campo personalizado "Motivo de perda" é o mais usado pela equipe; o motivo nativo fica de reserva.
      loss_reason: lossField?.values?.[0]?.value ?? lead._embedded?.loss_reason?.[0]?.name ?? null,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      closed_at: lead.closed_at,
      entry_at: readTimestamp(lead, config.entryFieldId),
      first_contact_at: readTimestamp(lead, config.firstContactFieldId),
      is_deleted: Boolean(lead.is_deleted),
    };
  }

  async function syncReference() {
    const [users, pipelines] = await Promise.all([kommo.getUsers(), kommo.getPipelines()]);
    await db.upsertUsers(users);
    await db.upsertStatuses(pipelines);
  }

  async function syncLeads(updatedFrom) {
    let count = 0;
    await kommo.eachLeadsPage({ updatedFrom }, async (batch) => {
      await db.upsertLeads(batch.map(toRow));
      count += batch.length;
      if (!updatedFrom && count % 5000 < 250) log(`  ${count} leads gravados...`);
    });
    return count;
  }

  // Na carga inicial, busca o histórico de etapas só das oportunidades abertas dos funis
  // de venda (é o que o indicador "oportunidades paradas" precisa).
  async function backfillStageHistory() {
    const { rows } = await db.query(
      `select id from leads where not is_deleted and pipeline_id = any($1) and status_id not in (142, 143)`,
      [config.salesPipelineIds],
    );
    const ids = rows.map((r) => Number(r.id));
    for (let i = 0; i < ids.length; i += 10) {
      await kommo.eachStatusEventsPage({ leadIds: ids.slice(i, i + 10) }, (events) => db.applyStatusEvents(events));
    }
    return ids.length;
  }

  async function fullSync() {
    const startedAt = Math.floor(Date.now() / 1000);
    log('Carga inicial: usuários e funis...');
    await syncReference();
    log('Carga inicial: leads (pode levar alguns minutos)...');
    const total = await syncLeads();
    log(`Carga inicial: ${total} leads. Buscando histórico de etapas...`);
    const open = await backfillStageHistory();
    log(`Carga inicial: histórico de ${open} oportunidades abertas.`);
    await db.setState('last_leads_sync', startedAt);
    await db.setState('last_events_sync', startedAt);
    await db.setState('full_sync_done', startedAt);
    await db.setState('last_sync_finished', Math.floor(Date.now() / 1000));
  }

  async function incrementalSync() {
    const startedAt = Math.floor(Date.now() / 1000);
    const lastLeads = Number(await db.getState('last_leads_sync')) || startedAt - 86400;
    const lastEvents = Number(await db.getState('last_events_sync')) || startedAt - 86400;
    const lastRef = Number(await db.getState('last_reference_sync')) || 0;

    if (startedAt - lastRef > 3600) {
      await syncReference();
      await db.setState('last_reference_sync', startedAt);
    }
    // 5 minutos de sobreposição para não perder nada que mudou durante a última sincronização.
    const leads = await syncLeads(lastLeads - 300);
    let events = 0;
    await kommo.eachStatusEventsPage({ createdFrom: lastEvents - 300 }, async (batch) => {
      events += batch.length;
      await db.applyStatusEvents(batch);
    });
    await db.setState('last_leads_sync', startedAt);
    await db.setState('last_events_sync', startedAt);
    await db.setState('last_sync_finished', Math.floor(Date.now() / 1000));
    return { leads, events };
  }

  function exclusive(fn) {
    return async (...args) => {
      while (running) await running.catch(() => {});
      running = fn(...args);
      try { return await running; } finally { running = null; }
    };
  }

  // Webhook: a Kommo avisa quais leads mudaram; buscamos só esses.
  async function syncLeadIds(ids, deletedIds = []) {
    if (deletedIds.length) await db.markDeleted(deletedIds);
    if (!ids.length) return 0;
    const leads = await kommo.getLeadsByIds(ids);
    await db.upsertLeads(leads.map(toRow));
    // Etapa mudou agora: busca o evento exato para esses leads.
    for (let i = 0; i < ids.length; i += 10) {
      await kommo.eachStatusEventsPage({ leadIds: ids.slice(i, i + 10), createdFrom: Math.floor(Date.now() / 1000) - 3600 }, (events) => db.applyStatusEvents(events));
    }
    await db.setState('last_webhook', Math.floor(Date.now() / 1000));
    return leads.length;
  }

  return {
    fullSync: exclusive(fullSync),
    incrementalSync: exclusive(incrementalSync),
    syncLeadIds: exclusive(syncLeadIds),
    toRow,
  };
}

// Lê o corpo de um webhook da Kommo (form-urlencoded: leads[status][0][id]=123 ...).
function parseWebhook(body) {
  const params = new URLSearchParams(body);
  const changed = new Set();
  const deleted = new Set();
  for (const [key, value] of params) {
    const m = key.match(/^leads\[(\w+)\]\[\d+\]\[id\]$/);
    if (!m) continue;
    const id = Number(value);
    if (!id) continue;
    if (m[1] === 'delete') deleted.add(id);
    else changed.add(id);
  }
  return { changed: [...changed].filter((id) => !deleted.has(id)), deleted: [...deleted] };
}

module.exports = { createSync, parseWebhook };
