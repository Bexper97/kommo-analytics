// Servidor do painel "Tempo até o primeiro contato".
// O token da Kommo fica só no servidor; o navegador recebe apenas as métricas calculadas.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createKommoClient } = require('./lib/kommo');
const { computeMetrics } = require('./lib/metrics');
const { buildDemoData } = require('./lib/demo');

loadEnv(path.join(__dirname, '.env'));

const PORT = Number(process.env.PORT || 3000);
const DEMO = process.env.DEMO === '1';
const ENTRY_FIELD_ID = Number(process.env.KOMMO_FIELD_ENTRADA || 2055640);
const FIRST_CONTACT_FIELD_ID = Number(process.env.KOMMO_FIELD_INICIO_ATENDIMENTO || 2055642);
const TIME_ZONE = process.env.TIME_ZONE || 'America/Sao_Paulo';
const TZ_OFFSET = process.env.TZ_OFFSET || '-03:00';
const CACHE_TTL_MS = Number(process.env.CACHE_MINUTES || 5) * 60 * 1000;
const KOMMO_BASE_URL = process.env.KOMMO_BASE_URL;

const kommo = DEMO ? null : createKommoClient({ baseUrl: KOMMO_BASE_URL, token: process.env.KOMMO_TOKEN });
const cache = new Map();
let referenceData = null; // usuários e funis mudam pouco; recarregados junto com o cache

async function loadData(from, to) {
  if (DEMO) {
    return buildDemoData({ from, to, entryFieldId: ENTRY_FIELD_ID, firstContactFieldId: FIRST_CONTACT_FIELD_ID });
  }
  if (!referenceData || Date.now() - referenceData.at > CACHE_TTL_MS) {
    const [users, pipelines] = await Promise.all([kommo.getUsers(), kommo.getPipelines()]);
    referenceData = { users, pipelines, at: Date.now() };
  }
  // A "Entrada do lead" costuma ser preenchida na criação; buscamos com 2 dias de folga
  // antes do período e depois filtramos pelo valor exato do campo.
  const leads = await kommo.getLeadsCreatedBetween(from - 2 * 86400, to);
  return { leads, users: referenceData.users, pipelines: referenceData.pipelines };
}

async function getMetrics(fromDate, toDate, refresh) {
  const from = Math.floor(new Date(`${fromDate}T00:00:00${TZ_OFFSET}`).getTime() / 1000);
  const to = Math.floor(new Date(`${toDate}T23:59:59${TZ_OFFSET}`).getTime() / 1000);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) {
    throw Object.assign(new Error('Período inválido'), { status: 400 });
  }
  if (to - from > 366 * 86400) {
    throw Object.assign(new Error('Período máximo: 1 ano'), { status: 400 });
  }

  const key = `${from}-${to}`;
  const hit = cache.get(key);
  if (!refresh && hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const { leads, users, pipelines } = await loadData(from, to);
  const data = {
    ...computeMetrics({
      leads, users, pipelines,
      entryFieldId: ENTRY_FIELD_ID,
      firstContactFieldId: FIRST_CONTACT_FIELD_ID,
      from, to,
      timeZone: TIME_ZONE,
      kommoBaseUrl: DEMO ? null : KOMMO_BASE_URL,
    }),
    demo: DEMO,
    generatedAt: Math.floor(Date.now() / 1000),
  };
  cache.set(key, { data, at: Date.now() });
  return data;
}

const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname === '/api/metrics') {
      const data = await getMetrics(url.searchParams.get('from'), url.searchParams.get('to'), url.searchParams.get('refresh') === '1');
      return send(res, 200, JSON.stringify(data), 'application/json; charset=utf-8');
    }
    const file = STATIC[url.pathname];
    if (file) {
      return send(res, 200, fs.readFileSync(path.join(__dirname, 'public', file[0])), file[1]);
    }
    send(res, 404, 'Não encontrado', 'text/plain; charset=utf-8');
  } catch (err) {
    console.error(err);
    send(res, err.status || 500, JSON.stringify({ error: err.message }), 'application/json; charset=utf-8');
  }
});

server.listen(PORT, () => {
  console.log(`Painel em http://localhost:${PORT}${DEMO ? ' (modo demonstração)' : ''}`);
});

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

// Leitor simples de .env (KEY=valor por linha), sem sobrescrever variáveis já definidas.
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
