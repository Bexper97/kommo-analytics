// Cliente mínimo da API v4 da Kommo (sem dependências, usa fetch nativo do Node 18+).

const PAGE_LIMIT = 250; // máximo permitido pela Kommo por página
const MAX_RETRIES = 5;

function createKommoClient({ baseUrl, token }) {
  if (!baseUrl || !token) {
    throw new Error('Defina KOMMO_BASE_URL e KOMMO_TOKEN no arquivo .env');
  }
  const root = baseUrl.replace(/\/+$/, '');

  async function get(path, params = {}) {
    const url = new URL(root + path);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }

    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      // A Kommo limita a ~7 req/s; em 429 espera e tenta de novo.
      if (res.status === 429 && attempt < MAX_RETRIES) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      if (res.status === 204) return null; // página vazia
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Kommo ${res.status} em ${url.pathname}: ${body.slice(0, 300)}`);
      }
      return res.json();
    }
  }

  // Busca todos os leads atualizados a partir de `from` (unix, segundos).
  async function getLeadsUpdatedSince(from) {
    const leads = [];
    for (let page = 1; ; page++) {
      const data = await get('/api/v4/leads', {
        limit: PAGE_LIMIT,
        page,
        'filter[updated_at][from]': from,
      });
      const batch = data?._embedded?.leads ?? [];
      leads.push(...batch);
      if (batch.length < PAGE_LIMIT || !data?._links?.next) break;
      await sleep(150);
    }
    return leads;
  }

  async function getUsers() {
    const users = [];
    for (let page = 1; ; page++) {
      const data = await get('/api/v4/users', { limit: PAGE_LIMIT, page });
      const batch = data?._embedded?.users ?? [];
      users.push(...batch);
      if (batch.length < PAGE_LIMIT || !data?._links?.next) break;
    }
    return users;
  }

  async function getPipelines() {
    const data = await get('/api/v4/leads/pipelines');
    return data?._embedded?.pipelines ?? [];
  }

  async function getCustomField(fieldId) {
    return get(`/api/v4/leads/custom_fields/${fieldId}`);
  }

  return { get, getLeadsUpdatedSince, getUsers, getPipelines, getCustomField };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { createKommoClient };
