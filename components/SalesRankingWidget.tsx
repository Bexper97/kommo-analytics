
import { TrendingUp, User, Award } from 'lucide-react';

interface SalesByUser {
    userId: number;
    name: string;
    totalSales: number;
    leadsCount: number;
    avgTicket: number;
}

export default function SalesRankingWidget({ salesByUser }: { salesByUser: SalesByUser[] }) {
    return (
        <div className="glass-card p-6">
            <h2 className="mb-6 text-xl font-semibold text-white flex items-center gap-2 uppercase tracking-tighter">
                <Award className="text-[#B9F32E]" />
                Ranking de Vendas
            </h2>

            {!salesByUser || salesByUser.length === 0 ? (
                <p className="text-gray-400 text-sm italic">
                    Nenhuma venda fechada no período selecionado.
                </p>
            ) : (
                <div className="space-y-3">
                    {salesByUser.map((seller, index) => (
                        <div
                            key={seller.userId}
                            className={`flex items-center justify-between p-4 rounded-xl transition-all border ${index === 0
                                ? 'bg-gradient-to-r from-[#8858F1]/20 to-[#B9F32E]/10 border-[#8858F1]/30 shadow-[0_0_15px_rgba(136,88,241,0.1)]'
                                : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-lg font-black text-sm shadow-lg ${index === 0 ? 'bg-[#B9F32E] text-[#14082F]' :
                                    index === 1 ? 'bg-gray-400 text-white' :
                                        index === 2 ? 'bg-[#8858F1] text-white' :
                                            'bg-white/10 text-gray-400 border border-white/10'
                                    }`}>
                                    {index + 1}
                                </div>
                                <div className="space-y-0.5">
                                    <p className="font-bold text-gray-100">{seller.name}</p>
                                    <p className="text-[10px] text-gray-500 uppercase font-black">{seller.leadsCount} vendas concluídas</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-black text-[#B9F32E] text-lg">
                                    R$ {seller.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-[10px] text-[#8858F1] font-bold uppercase">
                                    Ticket Médio: R$ {seller.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
