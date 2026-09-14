'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import AlertBadge from '@/components/monitoring/AlertBadge';

interface Conversa {
    contato: string;
    contatoNome: string | null;
    ultimaMensagem: string | null;
    ultimoTimestamp: string | null;
    totalMensagens: number;
    tipoAlerta?: string | null;
}

export default function ConversasDoColaboradorPage() {
    const params = useParams<{ instancia: string }>();
    const router = useRouter();
    const instancia = decodeURIComponent(params.instancia);

    const [conversas, setConversas] = useState<Conversa[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/monitoring/conversas?instancia=${encodeURIComponent(instancia)}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.error) throw new Error(data.error);
                setConversas(data.conversas || []);
            })
            .catch(() => setError('Não foi possível carregar as conversas.'))
            .finally(() => setLoading(false));
    }, [instancia]);

    return (
        <div className="min-h-screen bg-[#14082F] text-white p-4 md:p-8">
            <header className="mb-8 flex items-center gap-4">
                <button
                    onClick={() => router.push('/monitoramento')}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-xl md:text-2xl font-black italic tracking-tight">{instancia}</h1>
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Conversas dos últimos 60 dias</p>
                </div>
            </header>

            {loading ? (
                <div className="flex h-64 items-center justify-center text-[#B9F32E] animate-pulse">Carregando...</div>
            ) : error ? (
                <div className="flex h-64 items-center justify-center text-red-400">{error}</div>
            ) : conversas.length === 0 ? (
                <div className="p-20 text-center glass-card border-dashed border-white/10 opacity-60">
                    <MessageCircle className="mx-auto text-gray-600 mb-4" size={40} />
                    <p className="text-gray-400 font-bold text-sm">Nenhuma conversa encontrada.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {conversas.map((c) => (
                        <button
                            key={c.contato}
                            onClick={() =>
                                router.push(
                                    `/monitoramento/${encodeURIComponent(instancia)}/${encodeURIComponent(c.contato)}`
                                )
                            }
                            className="w-full glass-card p-4 flex items-center justify-between gap-4 text-left border border-white/5 hover:border-[#B9F32E]/30 transition-all"
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-11 h-11 flex-shrink-0 rounded-xl bg-gradient-to-br from-[#8858F1] to-[#341F71] flex items-center justify-center font-black text-white">
                                    {(c.contatoNome || c.contato).charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-white text-sm truncate">{c.contatoNome || c.contato}</p>
                                    <p className="text-xs text-gray-500 truncate">{c.ultimaMensagem}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                {c.tipoAlerta && <AlertBadge tipoAlerta={c.tipoAlerta} />}
                                <span className="text-[10px] text-gray-500 font-bold">
                                    {c.ultimoTimestamp
                                        ? new Date(c.ultimoTimestamp).toLocaleString('pt-BR', {
                                              day: '2-digit',
                                              month: '2-digit',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                          })
                                        : ''}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
