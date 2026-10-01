// Gera dados fictícios no mesmo formato da API da Kommo, para testar o painel sem acesso à conta.

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function buildDemoData({ from, to, entryFieldId, firstContactFieldId, now = Math.floor(Date.now() / 1000) }) {
  const rand = seeded(42);
  const users = [
    { id: 101, name: 'Ana Souza', speed: 0.6 },
    { id: 102, name: 'Bruno Lima', speed: 1 },
    { id: 103, name: 'Carla Mendes', speed: 1.6 },
    { id: 104, name: 'Diego Rocha', speed: 2.5 },
  ];
  const pipelines = [
    { id: 1, name: 'Vendas' },
    { id: 2, name: 'Pós-venda' },
  ];

  const leads = [];
  let id = 50000;
  for (let day = from; day < to; day += 86400) {
    const perDay = 15 + Math.floor(rand() * 20);
    for (let i = 0; i < perDay; i++) {
      // Concentra as entradas em horário comercial (BRT = UTC-3), com algumas fora dele.
      const hourBrt = rand() < 0.8 ? 8 + Math.floor(rand() * 11) : Math.floor(rand() * 24);
      const entry = day - (day % 86400) + (hourBrt + 3) * 3600 + Math.floor(rand() * 3600);
      if (entry > now) continue;
      const user = users[Math.floor(rand() * users.length)];
      const offHours = hourBrt < 8 || hourBrt >= 19;
      const base = offHours ? 6 * 3600 + rand() * 8 * 3600 : -Math.log(1 - rand()) * 12 * 60;
      const delta = Math.round(base * user.speed);
      const first = entry + delta;
      const answered = first < now && rand() > 0.05;

      const fields = [{ field_id: entryFieldId, values: [{ value: entry }] }];
      if (answered) fields.push({ field_id: firstContactFieldId, values: [{ value: first }] });
      leads.push({
        id: id++,
        name: `Lead #${id}`,
        responsible_user_id: user.id,
        pipeline_id: rand() < 0.8 ? 1 : 2,
        created_at: entry,
        custom_fields_values: fields,
      });
    }
  }
  return { leads, users: users.map(({ id, name }) => ({ id, name })), pipelines };
}

module.exports = { buildDemoData };
