
import { useState } from 'react';
import axios from 'axios';
import { MessageSquare, ThumbsUp, Clock, AlertTriangle, Sparkles, BrainCircuit } from 'lucide-react';

interface AnalysisResult {
    tone: string;
    customer_satisfaction: number;
    avg_response_time: string;
    waiting_time: string;
    critical_issues: string[];
    tips: string[];
    error?: string;
}

export default function TalkAnalysisWidget({ userId }: { userId: number | null }) {
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(false);

    const handleAnalyze = async () => {
        setLoading(true);
        setAnalysis(null);
        try {
            const res = await axios.post('/api/analysis', { userId });
            setAnalysis(res.data);
        } catch (error) {
            console.error(error);
            setAnalysis({ error: "Falha ao analisar conversas." } as any);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#B9F32E]/5 rounded-full blur-3xl -mr-16 -mt-16"></div>

            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#8858F1]/20">
                        <BrainCircuit className="text-[#8858F1]" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Análise de IA</h2>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Qualidade do Atendimento</p>
                    </div>
                </div>

                {!analysis && !loading && (
                    <button
                        onClick={handleAnalyze}
                        className="flex items-center gap-2 px-4 py-2 bg-[#8858F1] text-white rounded-xl hover:bg-[#7246d6] transition-all text-sm font-bold shadow-lg shadow-[#8858F1]/20"
                    >
                        <Sparkles size={16} />
                        Analisar
                    </button>
                )}
            </div>

            {loading && (
                <div className="py-12 text-center relative z-10">
                    <div className="inline-block relative">
                        <div className="w-12 h-12 border-4 border-[#B9F32E]/20 border-t-[#B9F32E] rounded-full animate-spin"></div>
                        <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#B9F32E] animate-pulse" size={16} />
                    </div>
                    <p className="mt-4 text-sm text-gray-400 font-medium">Escaneando conversas no Kommo...</p>
                </div>
            )}

            {analysis && analysis.error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm flex items-center justify-between">
                    <span>{analysis.error}</span>
                    <button onClick={handleAnalyze} className="font-bold underline">Repetir</button>
                </div>
            )}

            {analysis && !analysis.error && (
                <div className="space-y-6 relative z-10">
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 border-b-[#B9F32E]/30">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Satisfação</p>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-2xl font-black text-white">{analysis.customer_satisfaction}</span>
                                <span className="text-sm text-gray-500">/10</span>
                            </div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 border-b-[#8858F1]/30">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Tom de Voz</p>
                            <span className="text-sm font-black text-[#8858F1] uppercase">{analysis.tone}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                            <Clock size={16} className="text-gray-500" />
                            <div>
                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Resposta Média</p>
                                <p className="text-sm font-bold text-white">{analysis.avg_response_time}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                            <AlertTriangle size={16} className="text-yellow-500" />
                            <div>
                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Espera Máx.</p>
                                <p className="text-sm font-bold text-white">{analysis.waiting_time}</p>
                            </div>
                        </div>
                    </div>

                    {analysis.critical_issues?.length > 0 && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                            <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <AlertTriangle size={14} /> Focar Atenção
                            </p>
                            <ul className="space-y-2">
                                {analysis.critical_issues.map((issue, i) => (
                                    <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                                        <div className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0"></div>
                                        {issue}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {analysis.tips?.length > 0 && (
                        <div className="p-4 bg-[#B9F32E]/5 border border-[#B9F32E]/10 rounded-2xl">
                            <p className="text-xs font-black text-[#B9F32E] uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Sparkles size={14} /> Recomendação IA
                            </p>
                            <div className="space-y-3">
                                {analysis.tips.map((tip, i) => (
                                    <div key={i} className="text-xs text-gray-300 leading-relaxed italic">
                                        "{tip}"
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="text-center pt-2">
                        <button onClick={handleAnalyze} className="text-[10px] font-bold text-[#8858F1] hover:text-[#B9F32E] uppercase tracking-widest transition-colors">
                            Refazer Escaneamento
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
