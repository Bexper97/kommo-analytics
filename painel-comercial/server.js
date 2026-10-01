// Servidor do Painel Comercial (Kommo).
// O token da Kommo e o banco ficam só no servidor; o navegador recebe apenas os indicadores.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createKommoClient } = require('./lib/kommo');
const { createDb } = require('./lib/db');
const { createSync, parseWebhook } = require('./lib/sync');
const { buildReport } = require('./lib/report');

loadEnv(path.join(__dirname, '.env'));

const ids = (value, fallback) => (value || fallback).split(',').map((s) => Number(s.trim())).filter(Boolean);

const config = {
  port: Number(process.env.PORT || 3000),
  kommoBaseUrl: process.env.KOMMO_BASE_URL,
  entryFieldId: Number(process.env.KOMMO_FIELD_ENTRADA || 2055640),
  firstContactFieldId: Number(process.env.KOMMO_FIELD_INICIO_ATENDIMENTO || 2055642),
  lossReasonFieldId: Number(process.env.KOMMO_FIELD_MOTIVO_PERDA || 1802622),
  // Comercial CLT, Comercial PJ e B2B
  salesPipelineIds: ids(process.env.FUNIS_VENDA, '13459779,13459783,14391607'),
  // Funis cujos leads entram no ranking de fontes: Pré-vendas + funis de venda
  sourcePipelineIds: ids(process.env.FUNIS_FONTES, '13460403,13459779,13459783,14391607'),
  // Etapas automáticas que não contam como "parada": Follow-up (CLT e PJ)
  stalledExcludedStatusIds: ids(process.env.ETAPAS_IGNORADAS_PARADAS, '103830191,103830231'),
  stalledDays: Number(process.env.DIAS_PARADA || 2),
  noContactMinutes: Number(process.env.MINUTOS_SEM_CONTATO || 60),
  syncMinutes: Number(process.env.SYNC_MINUTES || 15),
  webhookSecret: process.env.WEBHOOK_SECRET || '',
  timeZone: process.env.TIME_ZONE || 'America/Sao_Paulo',
  tzOffset: process.env.TZ_OFFSET || '-03:00',
};

const kommo = createKommoClient({ baseUrl: config.kommoBaseUrl, token: process.env.KOMMO_TOKEN });
const db = createDb(process.env.DATABASE_URL);
const sync = createSync({ kommo, db, config });
const status = { phase: 'iniciando', error: null };

async function getReport(searchParams) {
  const fromDate = searchParams.get('from');
  const toDate = searchParams.get('to');
  const from = Math.floor(new Date(`${fromDate}T00:00:00${config.tzOffset}`).getTime() / 1000);
  const to = Math.floor(new Date(`${toDate}T23:59:59${config.tzOffset}`).getTime() / 1000);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) {
    throw Object.assign(new Error('Período inválido'), { status: 400 });
  }
  const userId = Number(searchParams.get('user')) || null;
  const report = await buildReport({ db, config, from, to, userId });
  return { ...report, syncStatus: status };
}

const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname === '/api/report' && req.method === 'GET') {
      return sendJson(res, 200, await getReport(url.searchParams));
    }
    if (url.pathname.startsWith('/webhook/kommo')) {
      return handleWebhook(req, res, url);
    }
    if (url.pathname === '/health') {
      return sendJson(res, 200, { ok: true, ...status });
    }
    const file = STATIC[url.pathname];
    if (file && req.method === 'GET') {
      return send(res, 200, fs.readFileSync(path.join(__dirname, 'public', file[0])), file[1]);
    }
    send(res, 404, 'Não encontrado', 'text/plain; charset=utf-8');
  } catch (err) {
    console.error(err);
    sendJson(res, err.status || 500, { error: err.message });
  }
});

// A Kommo chama POST /webhook/kommo/<WEBHOOK_SECRET> quando leads mudam.
// Respondemos na hora e processamos em seguida, agrupando avisos que chegam juntos.
const pending = { changed: new Set(), deleted: new Set(), timer: null };

function handleWebhook(req, res, url) {
  const secret = url.pathname.split('/')[3] || '';
  if (!config.webhookSecret || secret !== config.webhookSecret) {
    return send(res, 403, 'Proibido', 'text/plain; charset=utf-8');
  }
  if (req.method !== 'POST') return send(res, 405, 'Use POST', 'text/plain; charset=utf-8');
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 2e6) req.destroy();
  });
  req.on('end', () => {
    send(res, 200, 'ok', 'text/plain; charset=utf-8');
    const { changed, deleted } = parseWebhook(body);
    changed.forEach((id) => pending.changed.add(id));
    deleted.forEach((id) => pending.deleted.add(id));
    clearTimeout(pending.timer);
    pending.timer = setTimeout(flushWebhook, 3000);
  });
}

async function flushWebhook() {
  const changed = [...pending.changed];
  const deleted = [...pending.deleted];
  pending.changed.clear();
  pending.deleted.clear();
  if (!changed.length && !deleted.length) return;
  try {
    const n = await sync.syncLeadIds(changed, deleted);
    console.log(`Webhook: ${n} leads atualizados, ${deleted.length} excluídos`);
  } catch (err) {
    console.error('Erro no webhook (a sincronização periódica cobre):', err.message);
  }
}

async function startSync() {
  await db.migrate();
  if (!(await db.getState('full_sync_done'))) {
    status.phase = 'carga inicial';
    await sync.fullSync();
  }
  status.phase = 'sincronizado';
  const tick = async () => {
    try {
      const r = await sync.incrementalSync();
      status.phase = 'sincronizado';
      status.error = null;
      console.log(`Sincronização: ${r.leads} leads, ${r.events} mudanças de etapa`);
    } catch (err) {
      status.error = err.message;
      console.error('Erro na sincronização:', err.message);
    }
  };
  await tick();
  setInterval(tick, config.syncMinutes * 60 * 1000);
}

server.listen(config.port, () => {
  console.log(`Painel em http://localhost:${config.port}`);
  startSync().catch((err) => {
    status.phase = 'erro';
    status.error = err.message;
    console.error('Falha ao iniciar a sincronização:', err);
  });
});

function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function sendJson(res, code, data) {
  send(res, code, JSON.stringify(data), 'application/json; charset=utf-8');
}

// Leitor simples de .env (KEY=valor por linha), sem sobrescrever variáveis já definidas.
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
