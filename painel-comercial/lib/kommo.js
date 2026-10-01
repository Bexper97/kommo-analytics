// Cliente mínimo da API v4 da Kommo (usa fetch nativo do Node 18+).

const PAGE_LIMIT = 250; // máximo permitido pela Kommo por página
const MAX_RETRIES = 5;
const MIN_INTERVAL_MS = 160; // a Kommo aceita ~7 requisições por segundo

function createKommoClient({ baseUrl, token }) {
  if (!baseUrl || !token) {
    throw new Error('Defina KOMMO_BASE_URL e KOMMO_TOKEN no arquivo .env');
  }
  const root = baseUrl.replace(/\/+$/, '');
  let lastRequestAt = 0;

  async function get(path, params = {}) {
    const url = new URL(root + path);
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) value.forEach((v) => url.searchParams.append(key, String(v)));
      else url.searchParams.set(key, String(value));
    }

    for (let attempt = 0; ; attempt++) {
      const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
      if (wait > 0) await sleep(wait);
      lastRequestAt = Date.now();

      let res;
      try {
        res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      } catch (err) {
        if (attempt < MAX_RETRIES) { await sleep(1000 * (attempt + 1)); continue; }
        throw err;
      }
      if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
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

  // Percorre todas as páginas de uma listagem, entregando cada página a `onPage`.
  async function paginate(path, params, key, onPage) {
    for (let page = 1; ; page++) {
      const data = await get(path, { ...params, limit: PAGE_LIMIT, page });
      const batch = data?._embedded?.[key] ?? [];
      if (batch.length) await onPage(batch);
      if (batch.length < PAGE_LIMIT || !data?._links?.next) break;
    }
  }

  const LEAD_WITH = 'source,loss_reason';

  // Leads atualizados desde `from` (unix). Sem `from`, percorre a base inteira.
  function eachLeadsPage({ updatedFrom } = {}, onPage) {
    return paginate('/api/v4/leads', {
      with: LEAD_WITH,
      'filter[updated_at][from]': updatedFrom,
      'order[updated_at]': 'asc',
    }, 'leads', onPage);
  }

  async function getLeadsByIds(ids) {
    const leads = [];
    for (let i = 0; i < ids.length; i += 50) {
      const data = await get('/api/v4/leads', { with: LEAD_WITH, limit: PAGE_LIMIT, 'filter[id][]': ids.slice(i, i + 50) });
      leads.push(...(data?._embedded?.leads ?? []));
    }
    return leads;
  }

  // Eventos de mudança de etapa. Filtra por data ou por até 10 leads por vez.
  function eachStatusEventsPage({ createdFrom, leadIds } = {}, onPage) {
    return paginate('/api/v4/events', {
      'filter[type]': 'lead_status_changed',
      'filter[entity]': 'lead',
      'filter[created_at][from]': createdFrom,
      'filter[entity_id][]': leadIds,
    }, 'events', onPage);
  }

  async function getAll(path, key) {
    const items = [];
    await paginate(path, {}, key, (batch) => { items.push(...batch); });
    return items;
  }

  return {
    get,
    eachLeadsPage,
    getLeadsByIds,
    eachStatusEventsPage,
    getUsers: () => getAll('/api/v4/users', 'users'),
    getPipelines: async () => (await get('/api/v4/leads/pipelines'))?._embedded?.pipelines ?? [],
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { createKommoClient };
