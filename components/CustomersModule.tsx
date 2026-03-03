import { ExternalLink, Crown, Gem, User, Calendar, TrendingUp, Search } from 'lucide-react';
import { useState } from 'react';

interface CustomerLTV {
    customer_name: string;
    contact_id: number;
    compras_2026: number;
    nivel_2026: string;
    valor_2026: number;
    ltv_total_historico: number;
    last_lead_id: number;
}

export default function CustomersModule({ customers }: { customers: CustomerLTV[] }) {
    const [search, setSearch] = useState('');
    const [filterLevel, setFilterLevel] = useState('todos');
    const [sortBy, setSortBy] = useState<'valor' | 'compras'>('valor');

    const getLevelBadge = (level: string) => {
        const lowerLevel = (level || 'Platinum').toLowerCase();
        if (lowerLevel.includes('vip')) {
            return <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">
                <Crown size={12} />
                <span className="text-[10px] font-bold uppercase tracking-wider">VIP</span>
            </div>;
        }
        if (lowerLevel.includes('prata') || lowerLevel.includes('silver')) {
            return <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-300/20 text-slate-300 border border-slate-300/30">
                <Gem size={12} />
                <span className="text-[10px] font-bold uppercase tracking-wider">PRATA</span>
            </div>;
        }
        return <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <User size={12} />
            <span className="text-[10px] font-bold uppercase tracking-wider">PLATINUM</span>
        </div>;
    };

    const filteredCustomers = (customers || [])
        .filter(c => {
            const name = (c.customer_name || '').toLowerCase();
            const matchesSearch = name.includes(search.toLowerCase());
            const level = (c.nivel_2026 || '').toLowerCase();
            const matchesLevel = filterLevel === 'todos' || level.includes(filterLevel.toLowerCase());

            // Garantia: Apenas leads com compras em 2026
            return matchesSearch && matchesLevel && c.compras_2026 > 0;
        })
        .sort((a, b) => {
            if (sortBy === 'valor') return (b.valor_2026 || 0) - (a.valor_2026 || 0);
            return (b.compras_2026 || 0) - (a.compras_2026 || 0);
        });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
                        Vendas <span className="text-[#B9F32E]">Ganhos 2026</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Dados exclusivos do ano calendário atual</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 bg-[#14082F]/90 p-4 rounded-3xl border border-white/10 shadow-2xl">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Pesquisar..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#B9F32E] transition-all w-40"
                        />
                    </div>

                    <div className="relative">
                        <select
                            value={filterLevel}
                            onChange={(e) => setFilterLevel(e.target.value)}
                            className="bg-[#341F71] text-white border border-[#8858F1]/40 rounded-2xl px-4 py-2 pr-10 text-xs font-black focus:outline-none focus:ring-2 focus:ring-[#B9F32E]/30 appearance-none cursor-pointer"
                            style={{ backgroundColor: '#341F71', color: 'white' }}
                        >
                            <option value="todos" style={{ backgroundColor: '#14082F' }}>Todos Níveis</option>
                            <option value="vip" style={{ backgroundColor: '#14082F' }}>VIP</option>
                            <option value="prata" style={{ backgroundColor: '#14082F' }}>Prata</option>
                            <option value="platinum" style={{ backgroundColor: '#14082F' }}>Platinum</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#B9F32E]">
                            <TrendingUp size={14} />
                        </div>
                    </div>

                    <button
                        onClick={() => setSortBy(sortBy === 'valor' ? 'compras' : 'valor')}
                        className="px-4 py-2 rounded-2xl bg-[#B9F32E] text-[#14082F] text-[10px] font-black uppercase hover:brightness-110 transition-all shadow-lg"
                    >
                        {sortBy === 'valor' ? 'Top Valor' : 'Top Compras'}
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredCustomers.map((customer, idx) => (
                    <div key={idx} className="glass-card p-6 border border-white/5 hover:border-[#B9F32E]/30 transition-all duration-300">
                        <div className="flex items-start justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8858F1] to-[#341F71] flex items-center justify-center text-xl font-black text-white shadow-lg">
                                    {customer.customer_name?.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg tracking-tight line-clamp-1">{customer.customer_name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="w-2 h-2 rounded-full bg-[#B9F32E]"></div>
                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Ano 2026</span>
                                    </div>
                                </div>
                            </div>
                            <a
                                href={`https://adala1.kommo.com/leads/detail/${customer.last_lead_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-[#B9F32E] border border-white/5 transition-all"
                            >
                                <ExternalLink size={18} />
                            </a>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                {getLevelBadge(customer.nivel_2026)}
                                <div className="text-right">
                                    <span className="text-[9px] text-gray-600 font-bold uppercase block mb-1">Total Pedidos</span>
                                    <span className="text-white font-black text-xl italic">{customer.compras_2026}</span>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5">
                                <span className="text-[10px] text-[#8858F1] font-black uppercase tracking-[0.2em] block mb-2 text-center">Faturamento Real 2026</span>
                                <div className="text-4xl font-black text-white text-center leading-none tracking-tighter">
                                    <span className="text-sm font-medium text-gray-600 mr-2">R$</span>
                                    {customer.valor_2026?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredCustomers.length === 0 && (
                <div className="p-20 text-center glass-card border-dashed border-white/10 opacity-40">
                    <Search className="mx-auto text-gray-600 mb-4" size={40} />
                    <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Sem resultados para 2026</p>
                </div>
            )}
        </div>
    );
}
