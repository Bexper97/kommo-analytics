import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Mensagens de UMA conversa (instancia + contato), somente leitura,
// mais o resumo/alerta mais recente para exibir no banner do topo.

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const instancia = searchParams.get('instancia');
        const contato = searchParams.get('contato');

        if (!instancia || !contato) {
            return NextResponse.json({ error: 'Parâmetros "instancia" e "contato" são obrigatórios.' }, { status: 400 });
        }

        const [{ data: mensagens, error: msgError }, { data: alertas, error: alertError }] = await Promise.all([
            supabaseAdmin
                .from('mensagens')
                .select('*')
                .eq('instancia', instancia)
                .eq('contato', contato)
                .order('timestamp', { ascending: true })
                .limit(500),
            supabaseAdmin
                .from('resumos_alertas')
                .select('*')
                .eq('instancia', instancia)
                .eq('contato', contato)
                .order('created_at', { ascending: false })
                .limit(1),
        ]);

        if (msgError) throw msgError;
        if (alertError) throw alertError;

        return NextResponse.json({
            instancia,
            contato,
            mensagens: mensagens || [],
            resumoRecente: alertas?.[0] || null,
        });
    } catch (error) {
        console.error('Monitoring mensagens API error:', error);
        return NextResponse.json({ error: 'Falha ao carregar mensagens.' }, { status: 500 });
    }
}
