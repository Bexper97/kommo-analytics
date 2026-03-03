import { ExternalLink, Crown, Gem, User, MousePointer2 } from 'lucide-react';

interface CustomerLTV {
    customer_name: string;
    contact_id: number;
    compras_total: number;
    compras_2025: number;
    nivel_atual: string;
    ltv_total: number;
    total_cards_ganhos: number;
    last_lead_id: number;
}

export default function LTVIntelligenceWidget({ customers }: { customers: CustomerLTV[] }) {
    const getLevelBadge = (level: string) => {
        const lowerLevel = level?.toLowerCase() || '';
        if (lowerLevel.includes('vip')) {
            return <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">
                <Crown size={10} />
                <span className="text-[10px] font-black uppercase">VIP</span>
            </div>;
        }
        if (lowerLevel.includes('prata') || lowerLevel.includes('silver')) {
            return <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-300/20 text-slate-300 border border-slate-300/30">
                <Gem size={10} />
                <span className="text-[10px] font-black uppercase">PRATA</span>
            </div>;
        }
        return <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <User size={10} />
            <span className="text-[10px] font-black uppercase">PLATINUM</span>
        </div>;
    };

    return (
        <div className="glass-card p-6 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#8858F1]/20">
                        <Crown className="text-[#8858F1]" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white uppercase italic tracking-tighter">Inteligência LTV</h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Recorrência e Fidelidade</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                    <span className="text-[10px] font-black text-white">{customers?.length || 0} Segmentados</span>
                </div>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {!customers || customers.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-gray-500 text-sm italic">Nenhum cliente com recorrência identificado no banco.</p>
                    </div>
                ) : (
                    customers.map((customer, idx) => (
                        <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-[#8858F1]/30 hover:bg-white/10 transition-all group/item">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#341F71] to-[#14082F] flex items-center justify-center border border-white/10">
                                        <span className="text-white font-black text-sm">{customer.customer_name?.charAt(0) || 'C'}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-white group-hover/item:text-[#B9F32E] transition-colors">{customer.customer_name}</p>
                                        <div className="mt-1 flex items-center gap-2">
                                            {getLevelBadge(customer.nivel_atual)}
                                            <span className="text-[10px] text-gray-500 font-bold">Total: {customer.compras_total} compras</span>
                                        </div>
                                    </div>
                                </div>

                                <a
                                    href={`https://adala1.kommo.com/leads/detail/${customer.last_lead_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg bg-white/5 text-gray-500 hover:text-white hover:bg-[#8858F1] transition-all"
                                    title="Ver no Kommo"
                                >
                                    <ExternalLink size={14} />
                                </a>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/5">
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Faturamento (LTV)</p>
                                    <p className="text-base font-black text-[#B9F32E]">
                                        R$ {customer.ltv_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Compras 2025</p>
                                    <p className="text-base font-black text-white">
                                        {customer.compras_2025 || 0} <span className="text-[10px] text-gray-500">unids</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MousePointer2 size={12} className="text-[#8858F1]" />
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Clique no link para abrir o Kommo</span>
                </div>
                <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-[#B9F32E]"></div>
                    <div className="w-1 h-1 rounded-full bg-[#8858F1]"></div>
                </div>
            </div>
        </div>
    );
}
