import { createClient } from '@supabase/supabase-js';

// Cliente Supabase para uso EXCLUSIVO em rotas de servidor (app/api/**).
// Usa a service_role key (bypassa RLS) para ler/escrever as tabelas do
// monitoramento de WhatsApp (mensagens, resumos_alertas, colaboradores).
// Nunca importe este arquivo em um componente 'use client'.

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.warn('Supabase service role credentials missing (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey || '', {
    auth: { persistSession: false },
});
