-- COPIE E COLE ESTE CÓDIGO NO 'SQL EDITOR' DO SUPABASE
-- Schema do Sistema de Monitoramento de WhatsApp.
-- Independente das tabelas `leads`/`tasks` do Kommo (setup-supabase.sql).

-- 1. Tabela de colaboradores (para exibir nome/telefone no dashboard
--    em vez do nome técnico da instância). Preenchida pelo script
--    infra/evolution/scripts/create-instances-batch.sh ou manualmente.
CREATE TABLE IF NOT EXISTS colaboradores (
    instancia TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    telefone TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Histórico bruto de mensagens (gravado pelo workflow de ingestão do n8n
--    a cada mensagem recebida/enviada via webhook da Evolution API).
CREATE TABLE IF NOT EXISTS mensagens (
    id BIGSERIAL PRIMARY KEY,
    instancia TEXT NOT NULL,
    contato TEXT NOT NULL,
    contato_nome TEXT,
    direcao TEXT NOT NULL CHECK (direcao IN ('enviada', 'recebida')),
    conteudo TEXT NOT NULL,
    tipo_mensagem TEXT NOT NULL DEFAULT 'texto',
    message_id TEXT UNIQUE,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Resumos e alertas gerados periodicamente pela Claude API
--    (workflow agendado do n8n).
CREATE TABLE IF NOT EXISTS resumos_alertas (
    id BIGSERIAL PRIMARY KEY,
    instancia TEXT NOT NULL,
    contato TEXT NOT NULL,
    resumo TEXT NOT NULL,
    -- NULL = conversa normal. Quando preenchido, um destes valores:
    -- 'cliente_insatisfeito', 'pergunta_sem_resposta', 'promessa_fora_script',
    -- 'demora_resposta', 'linguagem_inadequada'
    tipo_alerta TEXT,
    trecho_relevante TEXT,
    periodo_inicio TIMESTAMPTZ,
    periodo_fim TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Índices por instancia, contato e timestamp/created_at
CREATE INDEX IF NOT EXISTS idx_mensagens_instancia ON mensagens(instancia);
CREATE INDEX IF NOT EXISTS idx_mensagens_contato ON mensagens(contato);
CREATE INDEX IF NOT EXISTS idx_mensagens_timestamp ON mensagens(timestamp);
CREATE INDEX IF NOT EXISTS idx_mensagens_instancia_contato ON mensagens(instancia, contato, timestamp);

CREATE INDEX IF NOT EXISTS idx_resumos_instancia ON resumos_alertas(instancia);
CREATE INDEX IF NOT EXISTS idx_resumos_contato ON resumos_alertas(contato);
CREATE INDEX IF NOT EXISTS idx_resumos_created_at ON resumos_alertas(created_at);
CREATE INDEX IF NOT EXISTS idx_resumos_instancia_contato ON resumos_alertas(instancia, contato, created_at);
CREATE INDEX IF NOT EXISTS idx_resumos_alerta_aberto ON resumos_alertas(tipo_alerta) WHERE tipo_alerta IS NOT NULL;

-- 5. Segurança: o painel do cliente e o n8n acessam via chaves diferentes.
--    O n8n usa a service_role key (bypassa RLS). Se algum dia a tabela for
--    exposta a uma anon key (ex: chamada direta do browser), habilite RLS
--    e crie policies antes disso. Por padrão, com RLS desabilitado e sem
--    expor a anon key para estas tabelas no client, o acesso já fica restrito
--    ao backend (rotas /api/monitoring/* do dashboard, que usam a service role).
