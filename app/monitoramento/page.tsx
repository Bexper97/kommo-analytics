'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, AlertTriangle, Clock, LogOut, ShieldCheck } from 'lucide-react';

interface Colaborador {
    instancia: string;
    nome: string;
    telefone: string | null;
    conversasHoje: number;
    alertasAbertos: number;
    ultimaAtividade: string | null;
    status: 'ativo' | 'inativo';
}

function formatarUltimaAtividade(iso: string | null) {
    if (!iso) return 'Sem atividade registrada';
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) return 'Agora mesmo';
    if (diffMin < 60) return `Há ${diffMin} min`;
    const diffHoras = Math.round(diffMin / 60);
    if (diffHoras < 24) return `Há ${diffHoras}h`;
    const diffDias = Math.round(diffHoras / 24);
    return `Há ${diffDias} dia(s)`;
}

export default function MonitoramentoPage() {
    const router = useRouter();
    const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/monitoring/colaboradores')
            .then((res) => res.json())
            .then((data) => {
                if (data.error) throw new Error(data.error);
                setColaboradores(data.colaboradores || []);
            })
            .catch(() => setError('Não foi possível carregar os colaboradores.'))
            .finally(() => setLoading(false));
    }, []);

    const handleLogout = async () => {
        await fetch('/api/monitoring/auth', { method: 'DELETE' });
        router.replace('/monitoramento/login');
        router.refresh();
    };

    const totalAlertas = colaboradores.reduce((sum, c) => sum + c.alertasAbertos, 0);

    return (
        <div className="min-h-screen bg-[#14082F] text-white p-4 md:p-8">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8858F1] to-[#C9B1FD] flex items-center justify-center shadow-lg">
                        <ShieldCheck className="text-white" size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter">
                            Monitoramento <span className="text-[#B9F32E]">WhatsApp</span>
                        </h1>
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">
                            {colaboradores.length} colaborador(es) · {totalAlertas} alerta(s) em aberto
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-xs font-bold text-gray-300 hover:bg-white/10 transition-all self-start md:self-auto"
                >
                    <LogOut size={14} />
                    Sair
                </button>
            </header>

            {loading ? (
                <div className="flex h-64 items-center justify-center text-[#B9F32E] animate-pulse">Carregando...</div>
            ) : error ? (
                <div className="flex h-64 items-center justify-center text-red-400">{error}</div>
            ) : colaboradores.length === 0 ? (
                <div className="p-20 text-center glass-card border-dashed border-white/10 opacity-60">
                    <MessageCircle className="mx-auto text-gray-600 mb-4" size={40} />
                    <p className="text-gray-400 font-bold text-sm">Nenhum colaborador com mensagens ainda.</p>
                    <p className="text-gray-500 text-xs mt-1">
                        Assim que as instâncias forem conectadas e começarem a trocar mensagens, elas aparecem aqui.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {colaboradores.map((c) => (
                        <button
                            key={c.instancia}
                            onClick={() => router.push(`/monitoramento/${encodeURIComponent(c.instancia)}`)}
                            className="glass-card p-6 text-left border border-white/5 hover:border-[#B9F32E]/30 transition-all duration-300"
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8858F1] to-[#341F71] flex items-center justify-center text-lg font-black text-white shadow-lg">
                                        {c.nome.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-base tracking-tight">{c.nome}</h3>
                                        {c.telefone && <p className="text-xs text-gray-500">{c.telefone}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span
                                        className={`w-2 h-2 rounded-full ${
                                            c.status === 'ativo' ? 'bg-[#B9F32E] animate-pulse' : 'bg-gray-600'
                                        }`}
                                    />
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                        {c.status}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="rounded-xl bg-white/5 p-3">
                                    <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                                        <MessageCircle size={12} />
                                        <span className="text-[10px] font-bold uppercase">Conversas hoje</span>
                                    </div>
                                    <p className="text-xl font-black text-white">{c.conversasHoje}</p>
                                </div>
                                <div className="rounded-xl bg-white/5 p-3">
                                    <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                                        <AlertTriangle size={12} />
                                        <span className="text-[10px] font-bold uppercase">Alertas</span>
                                    </div>
                                    <p className={`text-xl font-black ${c.alertasAbertos > 0 ? 'text-red-400' : 'text-white'}`}>
                                        {c.alertasAbertos}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 text-gray-500 pt-3 border-t border-white/5">
                                <Clock size={12} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">
                                    {formatarUltimaAtividade(c.ultimaAtividade)}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
