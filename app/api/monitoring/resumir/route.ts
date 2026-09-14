import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { gerarResumoConversa } from '@/lib/claudeMonitor';

// Gera manualmente um resumo/alerta para uma conversa específica, útil para
// testar o prompt sem esperar o workflow agendado do n8n rodar.
// POST { instancia, contato, horas?: number }

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const instancia = String(body?.instancia || '');
        const contato = String(body?.contato || '');
        const horas = Number(body?.horas) || 24;

        if (!instancia || !contato) {
            return NextResponse.json({ error: 'Campos "instancia" e "contato" são obrigatórios.' }, { status: 400 });
        }

        const desde = new Date(Date.now() - horas * 60 * 60 * 1000).toISOString();

        const { data: mensagens, error } = await supabaseAdmin
            .from('mensagens')
            .select('*')
            .eq('instancia', instancia)
            .eq('contato', contato)
            .gte('timestamp', desde)
            .order('timestamp', { ascending: true });

        if (error) throw error;

        if (!mensagens || mensagens.length === 0) {
            return NextResponse.json({ error: 'Nenhuma mensagem encontrada no período.' }, { status: 404 });
        }

        const resultado = await gerarResumoConversa({
            instancia,
            contato,
            contatoNome: mensagens[0].contato_nome,
            periodoInicio: mensagens[0].timestamp,
            periodoFim: mensagens[mensagens.length - 1].timestamp,
            mensagens: mensagens.map((m: any) => ({
                direcao: m.direcao,
                conteudo: m.conteudo,
                timestamp: m.timestamp,
            })),
        });

        const { error: insertError } = await supabaseAdmin.from('resumos_alertas').insert({
            instancia,
            contato,
            resumo: resultado.resumo,
            tipo_alerta: resultado.tipo_alerta,
            trecho_relevante: resultado.trecho_relevante,
            periodo_inicio: mensagens[0].timestamp,
            periodo_fim: mensagens[mensagens.length - 1].timestamp,
        });

        if (insertError) throw insertError;

        return NextResponse.json({ ok: true, resultado });
    } catch (error) {
        console.error('Monitoring resumir API error:', error);
        return NextResponse.json({ error: 'Falha ao gerar resumo.' }, { status: 500 });
    }
}
