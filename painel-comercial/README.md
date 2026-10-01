# Painel Comercial — Kommo CRM (Cafaz)

Painel com os indicadores comerciais da conta `cafaz.kommo.com`, com filtro por período e por atendente.

## Indicadores

**Tempo até o primeiro contato** (campos de lead *Entrada lead* `2055640` e *Inicio do atendimento* `2055642`)
- Tempo médio, mediana, percentil 90 e % atendidos em até 5 min, 15 min e 1 h
- Evolução diária, distribuição por faixa e tempo por hora de entrada
- Tempo por atendente e atendimentos mais demorados

**Vendas** (funis Comercial CLT, Comercial PJ e B2B)
- Vendas ganhas, receita e **ticket médio** (campo Valor do lead; o painel mostra quantas vendas estão sem valor)
- Conversão: ganhos ÷ (ganhos + perdidos) fechados no período
- **Ranking de consultores**: vendas, receita, ticket, perdidas, conversão, tempo de 1º contato e oportunidades paradas
- **Ranking de fontes**: canal de entrada registrado pela Kommo, para leads de Pré-vendas e dos funis de venda
- **Motivos de perda**: campo personalizado "Motivo de perda" (o motivo nativo da Kommo é usado quando o campo está vazio)

**Para agir agora**
- **Leads sem contato**: entraram e estão há mais de 1 hora sem início de atendimento
- **Oportunidades paradas**: leads abertos nos funis de venda há mais de 2 dias na mesma etapa, sem contar o Follow-up automático

## Como funciona

```
Kommo ──webhook (na hora)──▶ servidor ──▶ banco Postgres ◀── painel (consulta em milissegundos)
  └────sincronização a cada 15 min──┘
```

1. **Carga inicial**: na primeira vez que o servidor sobe, ele copia todos os leads da Kommo para o banco (cerca de 30 mil, alguns minutos) e o histórico de etapas das oportunidades abertas.
2. **Webhook**: a Kommo avisa o servidor sempre que um lead é criado, muda de etapa, muda de responsável ou é editado. O servidor busca só aquele lead e atualiza o banco.
3. **Sincronização de segurança**: a cada 15 minutos o servidor pergunta à Kommo o que mudou desde a última vez. Se algum aviso do webhook se perder, ele é recuperado aqui.
4. **Painel**: lê só do banco, por isso abre na hora para qualquer período ou atendente.

Arquivos:
- `server.js`: servidor HTTP, rotas `/api/report`, `/webhook/kommo/<segredo>` e `/health`, e o agendamento da sincronização.
- `lib/kommo.js`: chamadas à API v4 da Kommo, com respeito ao limite de requisições.
- `lib/db.js`: tabelas e gravação no Postgres (criadas automaticamente).
- `lib/sync.js`: carga inicial, sincronização periódica e webhook.
- `lib/metrics.js` e `lib/report.js`: cálculo dos indicadores.
- `public/`: o painel (HTML, CSS e JS puros, gráficos em SVG).

## Como colocar no ar

### 1. Banco (Supabase)
1. Crie um projeto em supabase.com (ou use o que já existe).
2. Em **Project Settings → Database → Connection string → URI**, copie o endereço. Use a opção **Session pooler** se a hospedagem não tiver IPv6.
3. Esse endereço é o `DATABASE_URL`. As tabelas são criadas sozinhas na primeira execução.

### 2. Hospedagem
Qualquer serviço que rode Node.js 18+ continuamente serve (Render, Railway, Fly.io, uma VPS). Configure:
- Pasta raiz: `painel-comercial`
- Instalação: `npm install`
- Início: `npm start`
- Variáveis de ambiente: as do arquivo `.env.example`, com os valores reais

O serviço precisa ficar ligado o tempo todo para a sincronização e o webhook funcionarem (planos gratuitos que "dormem" não servem).

### 3. Webhook na Kommo
1. Na Kommo, vá em **Configurações → Integrações → Webhooks** e clique em **+ Adicionar webhook**.
2. Endereço: `https://SEU-ENDERECO/webhook/kommo/SEU_WEBHOOK_SECRET`
3. Marque os eventos de **Leads**: adicionado, editado, status alterado, responsável alterado e excluído.
4. Salve. Para conferir, abra `https://SEU-ENDERECO/health`.

## Rodar no computador

```bash
cd painel-comercial
cp .env.example .env   # preencha os valores
npm install
npm start              # http://localhost:3000
```

## Regras que podem ser ajustadas (variáveis de ambiente)

| Variável | Padrão | O que faz |
|---|---|---|
| `FUNIS_VENDA` | CLT, PJ, B2B | Funis de vendas, ticket, consultores e paradas |
| `FUNIS_FONTES` | Pré-vendas + funis de venda | Leads considerados no ranking de fontes |
| `ETAPAS_IGNORADAS_PARADAS` | Follow-up CLT e PJ | Etapas que não contam como parada |
| `DIAS_PARADA` | 2 | Dias na mesma etapa para contar como parada |
| `MINUTOS_SEM_CONTATO` | 60 | Prazo para o lead contar como sem contato |

Nunca faça commit do arquivo `.env`: ele já está no `.gitignore`.
