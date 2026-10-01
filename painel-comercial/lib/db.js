// Banco Postgres (funciona com Supabase, Neon, Render etc. via DATABASE_URL).

const { Pool, types } = require('pg');

// bigint e numeric chegam como texto por padrão; aqui todos cabem com folga em Number.
types.setTypeParser(20, Number);
types.setTypeParser(1700, parseFloat);

function createDb(connectionString) {
  if (!connectionString) throw new Error('Defina DATABASE_URL no arquivo .env');
  const local = /localhost|127\.0\.0\.1/.test(connectionString);
  const pool = new Pool({
    connectionString,
    ssl: local || /sslmode=disable/.test(connectionString) ? false : { rejectUnauthorized: false },
    max: 5,
  });

  async function migrate() {
    await pool.query(`
      create table if not exists users (
        id bigint primary key,
        name text not null,
        is_active boolean not null default true
      );
      create table if not exists statuses (
        id bigint not null,
        pipeline_id bigint not null,
        pipeline_name text not null,
        name text not null,
        sort int not null default 0,
        primary key (pipeline_id, id)
      );
      create table if not exists leads (
        id bigint primary key,
        name text,
        price numeric not null default 0,
        pipeline_id bigint,
        status_id bigint,
        responsible_user_id bigint,
        source_id bigint,
        source_name text,
        loss_reason text,
        created_at bigint,
        updated_at bigint,
        closed_at bigint,
        entry_at bigint,
        first_contact_at bigint,
        stage_since bigint,
        stage_exact boolean not null default false,
        is_deleted boolean not null default false
      );
      create index if not exists leads_entry_idx on leads (entry_at) where entry_at is not null;
      create index if not exists leads_closed_idx on leads (pipeline_id, status_id, closed_at);
      create index if not exists leads_created_idx on leads (pipeline_id, created_at);
      create table if not exists sync_state (
        key text primary key,
        value text not null
      );
    `);
  }

  async function getState(key) {
    const { rows } = await pool.query('select value from sync_state where key = $1', [key]);
    return rows[0]?.value ?? null;
  }

  async function setState(key, value) {
    await pool.query(
      `insert into sync_state (key, value) values ($1, $2)
       on conflict (key) do update set value = excluded.value`,
      [key, String(value)],
    );
  }

  async function upsertUsers(users) {
    for (const u of users) {
      await pool.query(
        `insert into users (id, name, is_active) values ($1, $2, $3)
         on conflict (id) do update set name = excluded.name, is_active = excluded.is_active`,
        [u.id, u.name, u.rights?.is_active !== false],
      );
    }
  }

  async function upsertStatuses(pipelines) {
    for (const p of pipelines) {
      for (const s of p._embedded?.statuses ?? []) {
        await pool.query(
          `insert into statuses (id, pipeline_id, pipeline_name, name, sort) values ($1, $2, $3, $4, $5)
           on conflict (pipeline_id, id) do update set pipeline_name = excluded.pipeline_name, name = excluded.name, sort = excluded.sort`,
          [s.id, p.id, p.name, s.name, s.sort ?? 0],
        );
      }
    }
  }

  // Grava leads já convertidos em linhas. Quando a etapa muda, `stage_since` passa a ser a
  // hora da atualização; o histórico de eventos depois corrige para a hora exata.
  async function upsertLeads(rows) {
    if (!rows.length) return;
    const cols = ['id', 'name', 'price', 'pipeline_id', 'status_id', 'responsible_user_id', 'source_id', 'source_name',
      'loss_reason', 'created_at', 'updated_at', 'closed_at', 'entry_at', 'first_contact_at', 'is_deleted'];
    const values = [];
    const tuples = rows.map((r, i) => {
      cols.forEach((c) => values.push(r[c] ?? (c === 'is_deleted' ? false : null)));
      return `(${cols.map((_, j) => `$${i * cols.length + j + 1}`).join(',')})`;
    });
    await pool.query(
      `insert into leads (${cols.join(',')}) values ${tuples.join(',')}
       on conflict (id) do update set
         ${cols.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`).join(', ')},
         stage_since = case
           when leads.status_id is distinct from excluded.status_id or leads.pipeline_id is distinct from excluded.pipeline_id
             then excluded.updated_at
           else leads.stage_since end,
         stage_exact = case
           when leads.status_id is distinct from excluded.status_id or leads.pipeline_id is distinct from excluded.pipeline_id
             then false
           else leads.stage_exact end
       where excluded.updated_at >= coalesce(leads.updated_at, 0)`,
      values,
    );
  }

  // Aplica eventos de mudança de etapa: guarda a hora exata mais recente em que o lead
  // entrou na etapa em que está agora (substitui a estimativa feita no upsert).
  async function applyStatusEvents(events) {
    for (const e of events) {
      const after = e.value_after?.[0]?.lead_status;
      if (!after) continue;
      await pool.query(
        `update leads set stage_since = $1, stage_exact = true
         where id = $2 and status_id = $3 and pipeline_id = $4
           and (not stage_exact or stage_since is null or stage_since < $1)`,
        [e.created_at, e.entity_id, after.id, after.pipeline_id],
      );
    }
  }

  async function markDeleted(ids) {
    if (ids.length) await pool.query('update leads set is_deleted = true where id = any($1)', [ids]);
  }

  return { pool, query: (text, params) => pool.query(text, params), migrate, getState, setState, upsertUsers, upsertStatuses, upsertLeads, applyStatusEvents, markDeleted };
}

module.exports = { createDb };
