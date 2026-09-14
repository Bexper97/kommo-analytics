import { AlertTriangle } from 'lucide-react';

const LABELS: Record<string, string> = {
    cliente_insatisfeito: 'Cliente insatisfeito',
    pergunta_sem_resposta: 'Pergunta sem resposta',
    promessa_fora_script: 'Promessa fora do script',
    demora_resposta: 'Demora na resposta',
    linguagem_inadequada: 'Linguagem inadequada',
};

export function alertaLabel(tipo: string | null | undefined) {
    if (!tipo) return null;
    return LABELS[tipo] || 'Ponto de atenção';
}

export default function AlertBadge({ tipoAlerta }: { tipoAlerta: string | null | undefined }) {
    if (!tipoAlerta) return null;

    return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
            <AlertTriangle size={12} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{alertaLabel(tipoAlerta)}</span>
        </div>
    );
}
