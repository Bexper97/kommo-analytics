# 📱 Guia: Sistema de Monitoramento de WhatsApp

Este guia explica como colocar no ar o sistema que centraliza as conversas de
WhatsApp de vários colaboradores, resume/sinaliza cada conversa via Claude API
e disponibiliza tudo num painel de leitura para o cliente.

Arquitetura (recapitulando): **Colaboradores (WhatsApp) → Evolution API → n8n
→ Supabase → Claude API → Dashboard do cliente** (`/monitoramento` neste
mesmo app Next.js).

---

## 0. Pré-requisitos (ação manual, fora do Claude Code)

- [ ] VPS contratado (mínimo 2 vCPU / 4GB RAM para ~20 instâncias)
- [ ] Acesso SSH ao VPS, com Docker e Docker Compose instalados
- [ ] Projeto novo criado no Supabase
- [ ] Chave de API da Anthropic (Claude API)
- [ ] Lista dos colaboradores com nome + telefone
- [ ] Celular de cada colaborador em mãos, no momento de escanear o QR Code

---

## 1. Subir a Evolution API + n8n no VPS

Os arquivos ficam em `infra/evolution/`.

```bash
# No VPS, dentro de uma cópia deste repositório:
cd infra/evolution
cp .env.example .env
nano .env   # preencha EVOLUTION_API_KEY, senhas, N8N_ENCRYPTION_KEY (openssl rand -hex 32), etc.

docker compose up -d
```

Isso sobe 4 containers: `evolution-api` (porta 8080), `evolution-postgres`,
`evolution-redis` e `n8n` (porta 5678). A Evolution API já é configurada para
enviar o webhook de mensagens diretamente para o n8n pela rede interna do
Docker (`http://n8n:5678/webhook/evolution-inbound`), sem precisar expor o
n8n publicamente.

Confira se subiu tudo:
```bash
docker compose ps
docker compose logs -f evolution-api
```

## 2. Criar uma instância por colaborador

```bash
cd infra/evolution/scripts
cp ../colaboradores.example.json ../colaboradores.json
nano ../colaboradores.json   # preencha nome/telefone/instancia de cada colaborador

./create-instances-batch.sh
```

Isso cria uma instância na Evolution API para cada colaborador do JSON (e,
se `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` já estiverem no `.env`,
cadastra cada um na tabela `colaboradores` para aparecerem com nome no
dashboard).

Para gerar o QR Code de pareamento de um colaborador específico:
```bash
./get-qrcode.sh colaborador-joao
```
Isso salva um PNG em `infra/evolution/qrcodes/colaborador-joao.png`. Abra a
imagem e peça para o colaborador escanear pelo WhatsApp dele
(⋮ → Aparelhos conectados → Conectar um aparelho). **Este passo de escanear é
manual e não pode ser automatizado.**

Verifique o status de conexão de todos a qualquer momento:
```bash
./list-instances.sh
```

## 3. Criar as tabelas no Supabase

No painel do Supabase, abra o **SQL Editor** e rode o conteúdo de
`supabase/setup-whatsapp-monitor.sql`. Isso cria as tabelas `colaboradores`,
`mensagens` e `resumos_alertas` com os índices necessários.

Anote a `service_role key` do projeto (Settings → API) — ela é usada pelo
n8n e pelo dashboard, nunca pelo navegador do cliente.

## 4. Importar os workflows no n8n

Acesse `http://SEU_IP:5678`, faça login com o usuário/senha definidos no
`.env`, e em **Workflows → Import from File** importe, um de cada vez:

1. `n8n/workflow-ingestao-mensagens.json` — recebe o webhook da Evolution API
   e grava cada mensagem na tabela `mensagens`.
2. `n8n/workflow-resumo-alertas.json` — roda a cada hora, agrupa as mensagens
   da última hora por conversa, chama a Claude API pedindo resumo + sinalização,
   e grava o resultado em `resumos_alertas`.

> Os workflows são um ponto de partida funcional, mas foram escritos à mão
> (não exportados de uma instância real do n8n) — confira cada nó ao importar,
> principalmente as versões dos nós HTTP Request/Code/Schedule Trigger, que
> mudam entre versões do n8n. Se algum nó reclamar de "unrecognized node
> type/version", basta recriá-lo manualmente seguindo a mesma lógica (os
> comentários deste guia e o código de `lib/claudeMonitor.ts` descrevem
> exatamente o que cada nó faz).

Depois de importar, **ative (Active)** os dois workflows.

Os workflows dependem de três variáveis de ambiente lidas via
`{{$env.NOME}}`, já configuradas no `docker-compose.yml` do n8n a partir do
`.env` da infra: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e
`ANTHROPIC_API_KEY`. Se você alterá-las depois, rode
`docker compose up -d n8n` novamente para recarregar.

### Testando

1. Mande uma mensagem de teste para um número conectado.
2. Confira no Supabase (Table Editor → `mensagens`) se ela apareceu.
3. Para não esperar 1 hora pela sinalização, use a rota manual do dashboard:
   ```bash
   curl -X POST https://SEU-DASHBOARD/api/monitoring/resumir \
     -H "Content-Type: application/json" \
     -d '{"instancia":"colaborador-joao","contato":"5511999999999","horas":2}'
   ```

## 5. Configurar o dashboard (este app Next.js)

Variáveis de ambiente novas, além das já existentes do Kommo/Gemini:

```bash
# .env.local
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=coloque-a-service-role-key
ANTHROPIC_API_KEY=coloque-sua-chave-da-anthropic

# Login do painel do cliente (senha única, restrita)
CLIENT_DASHBOARD_PASSWORD=escolha-uma-senha-forte
CLIENT_DASHBOARD_SECRET=gere-com-openssl-rand-hex-32
```

Rode `npm run dev` (ou faça o deploy normal) e acesse `/monitoramento`. Você
será redirecionado para `/monitoramento/login`; digite a senha definida em
`CLIENT_DASHBOARD_PASSWORD`.

- **Tela 1** (`/monitoramento`): cards por colaborador com conversas hoje,
  alertas em aberto, última atividade e status.
- Clique num colaborador para ver a lista de conversas (**Tela 1.5**,
  `/monitoramento/[instancia]`).
- Clique numa conversa para abrir o chat somente leitura, com banner de
  alerta no topo quando houver (**Tela 2**,
  `/monitoramento/[instancia]/[contato]`).

O painel é **somente leitura** por design — não existe nenhuma rota que
envie mensagens pelo WhatsApp a partir dele.

---

## Limitações conhecidas / próximos passos

- O workflow de resumo usa uma janela fixa de "última 1 hora" em vez de
  marcar quais mensagens já foram resumidas. Para conversas muito longas ou
  picos de tráfego, considere trocar por um watermark
  (`max(periodo_fim)` da própria `resumos_alertas`).
- "Status" do colaborador no dashboard hoje é inferido pela última mensagem
  (ativo se houve mensagem nas últimas 24h). Para refletir o status real de
  conexão do WhatsApp (conectado/desconectado), é possível consultar
  `GET /instance/connectionState/{instancia}` da Evolution API e cruzar com
  a tabela `colaboradores`.
- O login do painel do cliente é uma senha única compartilhada (adequado para
  o escopo atual). Se o cliente precisar de múltiplos usuários com senhas
  próprias, migre para Supabase Auth.

## Fora do escopo do Claude Code (responsabilidade manual)

- Contratar e pagar VPS, Supabase e chave de API
- Escanear o QR Code de cada instância com o celular de cada colaborador
- Alinhar com o cliente a transparência sobre o monitoramento dos números de
  trabalho
