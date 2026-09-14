// Resumo e sinalização de conversas de WhatsApp via Claude API (Anthropic).
//
// Esta é a fonte da verdade do prompt: o workflow agendado do n8n
// (n8n/workflow-resumo-alertas.json) implementa a MESMA lógica em JavaScript
// puro dentro de um nó Code, porque o n8n roda de forma independente do
// Next.js. Se você mudar o prompt aqui, replique a mudança lá também.
//
// Este arquivo é usado pela rota app/api/monitoring/resumir/route.ts,
// útil para gerar/testar um resumo manualmente sem esperar o agendamento
// horário do n8n.

export interface MensagemParaResumo {
    direcao: 'enviada' | 'recebida';
    conteudo: string;
    timestamp: string;
}

export interface ResultadoResumo {
    resumo: string;
    alerta: boolean;
    tipo_alerta:
        | 'cliente_insatisfeito'
        | 'pergunta_sem_resposta'
        | 'promessa_fora_script'
        | 'demora_resposta'
        | 'linguagem_inadequada'
        | null;
    trecho_relevante: string | null;
}

const TIPOS_ALERTA = [
    'cliente_insatisfeito',
    'pergunta_sem_resposta',
    'promessa_fora_script',
    'demora_resposta',
    'linguagem_inadequada',
] as const;

export const CLAUDE_MONITOR_SYSTEM_PROMPT = `Você é um auditor de qualidade de atendimento via WhatsApp. Responda SOMENTE com um JSON válido, sem markdown, exatamente no formato: {"resumo": string, "alerta": boolean, "tipo_alerta": string|null, "trecho_relevante": string|null}.

Marque alerta=true quando detectar qualquer um destes casos na conversa:
- cliente insatisfeito
- pergunta do cliente sem resposta do colaborador
- promessa feita fora do script/autorização (descontos, prazos, condições não padrão)
- demora excessiva de resposta do colaborador
- linguagem inadequada ou rude

tipo_alerta deve ser um dos valores: "cliente_insatisfeito", "pergunta_sem_resposta", "promessa_fora_script", "demora_resposta", "linguagem_inadequada". Use null quando alerta=false.
trecho_relevante deve citar o trecho da conversa que motivou o alerta, ou null se não houver alerta.`;

export function montarPromptUsuario(params: {
    instancia: string;
    contatoNome?: string | null;
    contato: string;
    periodoInicio: string;
    periodoFim: string;
    mensagens: MensagemParaResumo[];
}): string {
    const transcricao = params.mensagens
        .map((m) => `[${m.timestamp}] ${m.direcao === 'enviada' ? 'Colaborador' : 'Cliente'}: ${m.conteudo}`)
        .join('\n');

    return `Conversa entre o colaborador da instância "${params.instancia}" e o contato "${
        params.contatoNome || params.contato
    }" (período de ${params.periodoInicio} a ${params.periodoFim}):\n\n${transcricao}`;
}

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-5';

export async function gerarResumoConversa(params: {
    instancia: string;
    contato: string;
    contatoNome?: string | null;
    periodoInicio: string;
    periodoFim: string;
    mensagens: MensagemParaResumo[];
}): Promise<ResultadoResumo> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY não configurada.');
    }

    if (params.mensagens.length === 0) {
        return { resumo: 'Sem mensagens no período.', alerta: false, tipo_alerta: null, trecho_relevante: null };
    }

    const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            model: CLAUDE_MODEL,
            max_tokens: 1024,
            system: CLAUDE_MONITOR_SYSTEM_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: montarPromptUsuario({
                        instancia: params.instancia,
                        contato: params.contato,
                        contatoNome: params.contatoNome,
                        periodoInicio: params.periodoInicio,
                        periodoFim: params.periodoFim,
                        mensagens: params.mensagens,
                    }),
                },
            ],
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Claude API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const rawText: string = data?.content?.[0]?.text || '';
    const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsed: any;
    try {
        parsed = JSON.parse(cleanText);
    } catch {
        return {
            resumo: 'Falha ao interpretar a resposta da IA.',
            alerta: false,
            tipo_alerta: null,
            trecho_relevante: null,
        };
    }

    const tipoAlerta = parsed.alerta && TIPOS_ALERTA.includes(parsed.tipo_alerta) ? parsed.tipo_alerta : null;

    return {
        resumo: String(parsed.resumo || ''),
        alerta: Boolean(parsed.alerta),
        tipo_alerta: parsed.alerta ? tipoAlerta || 'cliente_insatisfeito' : null,
        trecho_relevante: parsed.trecho_relevante || null,
    };
}
