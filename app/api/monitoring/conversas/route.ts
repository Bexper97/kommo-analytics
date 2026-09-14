import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Lista os contatos (conversas) de um colaborador, com prévia da última
// mensagem e o alerta mais recente (se houver).

const JANELA_DIAS = 60;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const instancia = searchParams.get('instancia');

        if (!instancia) {
            return NextResponse.json({ error: 'Parâmetro "instancia" é obrigatório.' }, { status: 400 });
        }

        const desde = new Date(Date.now() - JANELA_DIAS * 24 * 60 * 60 * 1000).toISOString();

        const [{ data: mensagens, error: msgError }, { data: alertas, error: alertError }] = await Promise.all([
            supabaseAdmin
                .from('mensagens')
                .select('*')
                .eq('instancia', instancia)
                .gte('timestamp', desde)
                .order('timestamp', { ascending: true }),
            supabaseAdmin
                .from('resumos_alertas')
                .select('*')
                .eq('instancia', instancia)
                .gte('created_at', desde)
                .order('created_at', { ascending: false }),
        ]);

        if (msgError) throw msgError;
        if (alertError) throw alertError;

        const porContato = new Map<string, any>();

        (mensagens || []).forEach((m: any) => {
            const atual = porContato.get(m.contato) || {
                contato: m.contato,
                contatoNome: null,
                ultimaMensagem: null,
                ultimoTimestamp: null,
                totalMensagens: 0,
            };
            atual.totalMensagens += 1;
            atual.ultimaMensagem = m.conteudo;
            atual.ultimoTimestamp = m.timestamp;
            if (m.contato_nome) atual.contatoNome = m.contato_nome;
            porContato.set(m.contato, atual);
        });

        (alertas || []).forEach((a: any) => {
            const atual = porContato.get(a.contato);
            if (!atual) return;
            if (!atual.tipoAlerta && a.tipo_alerta) {
                atual.tipoAlerta = a.tipo_alerta;
            }
        });

        const conversas = Array.from(porContato.values()).sort(
            (a, b) => new Date(b.ultimoTimestamp).getTime() - new Date(a.ultimoTimestamp).getTime()
        );

        return NextResponse.json({ instancia, conversas });
    } catch (error) {
        console.error('Monitoring conversas API error:', error);
        return NextResponse.json({ error: 'Falha ao carregar conversas.' }, { status: 500 });
    }
}
