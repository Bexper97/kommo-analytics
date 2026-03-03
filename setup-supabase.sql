-- COPIE E COLE ESTE CÓDIGO NO 'SQL EDITOR' DO SUPABASE

-- 1. Tabela de Leads
CREATE TABLE IF NOT EXISTS leads (
    id BIGINT PRIMARY KEY,
    name TEXT,
    price NUMERIC DEFAULT 0,
    status_id INTEGER,
    pipeline_id INTEGER,
    responsible_user_id INTEGER,
    created_at BIGINT,
    updated_at BIGINT,
    closed_at BIGINT,
    city TEXT DEFAULT 'Não informado',
    state TEXT DEFAULT 'Não informado',
    custom_fields JSONB DEFAULT '[]'::jsonb
);

-- 2. Tabela de Tasks (Tarefas)
CREATE TABLE IF NOT EXISTS tasks (
    id BIGINT PRIMARY KEY,
    element_id BIGINT,
    element_type INTEGER,
    complete_till BIGINT,
    is_completed BOOLEAN DEFAULT false,
    task_type_id INTEGER,
    text TEXT,
    responsible_user_id INTEGER,
    created_at BIGINT,
    updated_at BIGINT
);

-- 3. Índices para busca ultra-rápida
CREATE INDEX IF NOT EXISTS idx_leads_pipeline ON leads(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_leads_user ON leads(responsible_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(responsible_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status_id);
