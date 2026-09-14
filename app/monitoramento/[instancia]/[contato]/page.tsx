'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle, Eye } from 'lucide-react';
import ChatBubble from '@/components/monitoring/ChatBubble';
import { alertaLabel } from '@/components/monitoring/AlertBadge';

interface Mensagem {
    id: number;
    direcao: 'enviada' | 'recebida';
    conteudo: string;
    tipo_mensagem: string;
    timestamp: string;
}

interface ResumoRecente {
    resumo: string;
    tipo_alerta: string | null;
    trecho_relevante: string | null;
    created_at: string;
}

export default function ConversaPage() {
    const params = useParams<{ instancia: string; contato: string }>();
    const router = useRouter();
    const instancia = decodeURIComponent(params.instancia);
    const contato = decodeURIComponent(params.contato);

    const [mensagens, setMensagens] = useState<Mensagem[]>([]);
    const [resumoRecente, setResumoRecente] = useState<ResumoRecente | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/monitoring/mensagens?instancia=${encodeURIComponent(instancia)}&contato=${encodeURIComponent(contato)}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.error) throw new Error(data.error);
                setMensagens(data.mensagens || []);
                setResumoRecente(data.resumoRecente || null);
            })
            .catch(() => setError('Não foi possível carregar a conversa.'))
            .finally(() => setLoading(false));
    }, [instancia, contato]);

    const temAlerta = Boolean(resumoRecente?.tipo_alerta);

    return (
        <div className="min-h-screen bg-[#14082F] text-white flex flex-col">
            <header className="p-4 md:p-6 border-b border-white/5 flex items-center gap-4 flex-shrink-0">
                <button
                    onClick={() => router.push(`/monitoramento/${encodeURIComponent(instancia)}`)}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-lg font-black tracking-tight">{contato}</h1>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold flex items-center gap-1.5">
                        <Eye size={11} /> {instancia} · somente leitura
                    </p>
                </div>
            </header>

            {temAlerta && resumoRecente && (
                <div className="mx-4 md:mx-6 mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex-shrink-0">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="text-red-400" size={16} />
                        <span className="text-xs font-black uppercase tracking-wider text-red-400">
                            {alertaLabel(resumoRecente.tipo_alerta)}
                        </span>
                    </div>
                    <p className="text-sm text-gray-200 mb-2">{resumoRecente.resumo}</p>
                    {resumoRecente.trecho_relevante && (
                        <p className="text-xs text-gray-400 italic border-l-2 border-red-500/40 pl-3">
                            &ldquo;{resumoRecente.trecho_relevante}&rdquo;
                        </p>
                    )}
                </div>
            )}

            {!temAlerta && resumoRecente && (
                <div className="mx-4 md:mx-6 mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 flex-shrink-0">
                    <p className="text-xs text-gray-400">
                        <span className="font-bold text-[#B9F32E]">Resumo:</span> {resumoRecente.resumo}
                    </p>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {loading ? (
                    <div className="flex h-full items-center justify-center text-[#B9F32E] animate-pulse">Carregando...</div>
                ) : error ? (
                    <div className="flex h-full items-center justify-center text-red-400">{error}</div>
                ) : mensagens.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-gray-500 text-sm">
                        Nenhuma mensagem encontrada para esta conversa.
                    </div>
                ) : (
                    <div className="max-w-2xl mx-auto">
                        {mensagens.map((m) => (
                            <ChatBubble key={m.id} mensagem={m} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
