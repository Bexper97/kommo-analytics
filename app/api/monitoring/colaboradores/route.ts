import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Retorna, para cada colaborador (instância), as métricas exibidas na
// Tela 1 do painel: conversas hoje, alertas abertos, última atividade e status.
// Toda a agregação é feita aqui em memória (mesmo padrão já usado em
// app/api/dashboard/route.ts para os dados do Kommo), pois o volume de
// mensagens de ~20 instâncias em uma janela de 30 dias é pequeno.

const JANELA_DIAS = 30;

async function fetchPaginated(table: string, isoFrom: string) {
    const all: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabaseAdmin
            .from(table)
            .select('*')
            .gte(table === 'mensagens' ? 'timestamp' : 'created_at', isoFrom)
            .range(from, from + pageSize - 1);

        if (error) throw error;

        all.push(...(data || []));

        if (!data || data.length < pageSize) {
            hasMore = false;
        } else {
            from += pageSize;
        }
    }

    return all;
}

export async function GET() {
    try {
        const desde = new Date(Date.now() - JANELA_DIAS * 24 * 60 * 60 * 1000).toISOString();
        const inicioHoje = new Date();
        inicioHoje.setHours(0, 0, 0, 0);

        const [{ data: colaboradores, error: colabError }, mensagens, alertas] = await Promise.all([
            supabaseAdmin.from('colaboradores').select('*'),
            fetchPaginated('mensagens', desde),
            fetchPaginated('resumos_alertas', desde),
        ]);

        if (colabError) throw colabError;

        const nomesPorInstancia = new Map<string, { nome: string; telefone: string | null; ativo: boolean }>();
        (colaboradores || []).forEach((c: any) => {
            nomesPorInstancia.set(c.instancia, { nome: c.nome, telefone: c.telefone, ativo: c.ativo });
        });

        // Garante que toda instância que já mandou mensagem apareça, mesmo
        // que ainda não tenha sido cadastrada na tabela `colaboradores`.
        const instancias = new Set<string>();
        nomesPorInstancia.forEach((_v, k) => instancias.add(k));
        mensagens.forEach((m: any) => instancias.add(m.instancia));

        const resultado = Array.from(instancias).map((instancia) => {
            const msgsInstancia = mensagens.filter((m: any) => m.instancia === instancia);
            const alertasInstancia = alertas.filter((a: any) => a.instancia === instancia);

            const contatosHoje = new Set(
                msgsInstancia.filter((m: any) => new Date(m.timestamp) >= inicioHoje).map((m: any) => m.contato)
            );

            const ultimaAtividade = msgsInstancia.reduce<string | null>((max, m: any) => {
                if (!max || new Date(m.timestamp) > new Date(max)) return m.timestamp;
                return max;
            }, null);

            const alertasAbertos = alertasInstancia.filter((a: any) => a.tipo_alerta).length;

            const horasDesdeUltimaAtividade = ultimaAtividade
                ? (Date.now() - new Date(ultimaAtividade).getTime()) / (1000 * 60 * 60)
                : Infinity;

            const cadastro = nomesPorInstancia.get(instancia);

            return {
                instancia,
                nome: cadastro?.nome || instancia,
                telefone: cadastro?.telefone || null,
                conversasHoje: contatosHoje.size,
                alertasAbertos,
                ultimaAtividade,
                status: horasDesdeUltimaAtividade <= 24 ? 'ativo' : 'inativo',
            };
        });

        resultado.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

        return NextResponse.json({ colaboradores: resultado });
    } catch (error) {
        console.error('Monitoring colaboradores API error:', error);
        return NextResponse.json({ error: 'Falha ao carregar colaboradores.' }, { status: 500 });
    }
}
