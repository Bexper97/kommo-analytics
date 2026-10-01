# Tempo até o primeiro contato — Kommo CRM

Painel que mede quanto tempo os leads esperam entre a **entrada no CRM** e o **início do atendimento**, usando dois campos personalizados de lead:

| Campo | ID |
|---|---|
| Entrada do lead (data e hora) | `2055640` |
| Início do atendimento (data e hora) | `2055642` |

**Tempo de primeiro contato = Início do atendimento − Entrada do lead**

## O que o painel mostra

- **Tempo médio** até o primeiro contato (número principal), mais **mediana** e **percentil 90**
- **% atendidos em até 5 min / 15 min / 1 h**
- **Leads aguardando**: têm entrada, mas ainda não têm início de atendimento
- **Evolução diária** da média e da mediana
- **Distribuição** por faixas (até 5 min, 5–15 min … mais de 24 h)
- **Tempo médio por hora de entrada**, para ver onde estão os gargalos (madrugada, almoço, fim do dia)
- **Ranking por responsável** e **por funil**
- Listas dos **leads aguardando** e dos **atendimentos mais demorados**, com link para o lead na Kommo
- **Qualidade dos dados**: leads sem o campo de entrada e registros com início antes da entrada (esses ficam fora da média)

## Como rodar

Requisito: Node.js 18 ou superior. Não há dependências para instalar.

```bash
cd tempo-primeiro-contato
cp .env.example .env      # preencha KOMMO_TOKEN
npm start                 # abre em http://localhost:3000
```

Para testar sem a Kommo, use dados fictícios:

```bash
npm run demo
```

## Como funciona

- `server.js`: servidor HTTP. O token fica **só no servidor**; o navegador recebe apenas as métricas.
- `lib/kommo.js`: chamadas à API v4 (`/api/v4/leads`, `/users`, `/leads/pipelines`), com paginação de 250 e nova tentativa em caso de limite de requisições (429).
- `lib/metrics.js`: cruza os dois campos e calcula as métricas.
- `public/`: painel em HTML, CSS e JS puros, com gráficos em SVG.

Os leads são buscados pela data de criação, com 2 dias de folga antes do período, e depois filtrados pelo valor do campo **Entrada do lead**. O resultado fica em cache por 5 minutos (`CACHE_MINUTES`); o botão **Atualizar** força uma nova busca.

## Observações

- A média é sensível a leads que chegam fora do expediente. Por isso o painel também mostra a mediana e o gráfico por hora de entrada. Um próximo passo possível é calcular o tempo **só em horário comercial**.
- Nunca faça commit do arquivo `.env`: ele já está no `.gitignore`.
