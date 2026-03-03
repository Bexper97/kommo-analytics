import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, DollarSign, Target, MousePointer2 } from 'lucide-react';

interface AdsData {
    campaignName: string;
    investment: number;
    sales: number;
    leads: number;
}

const mockAdsData: AdsData[] = [
    { campaignName: 'Meta: Captação Fev', investment: 1200, sales: 4500, leads: 85 },
    { campaignName: 'Google: Pesquisa CRM', investment: 800, sales: 3200, leads: 42 },
    { campaignName: 'Meta: Remarketing', investment: 500, sales: 1800, leads: 30 },
];

export default function AdsPerformanceWidget() {
    const totalInvestment = mockAdsData.reduce((acc, curr) => acc + curr.investment, 0);
    const totalSales = mockAdsData.reduce((acc, curr) => acc + curr.sales, 0);
    const roas = totalSales / totalInvestment;

    return (
        <div className="glass-card p-6 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#B9F32E]/20">
                        <Target className="text-[#B9F32E]" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Performance de Ads</h2>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold text-amber-500">Apenas Mockup - Aguardando APIs</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-1 bg-[#B9F32E]/10 rounded-full border border-[#B9F32E]/20">
                    <span className="text-[10px] font-black text-[#B9F32E]">ROAS: {roas.toFixed(1)}x</span>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <DollarSign size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Investimento</span>
                    </div>
                    <p className="text-lg font-black text-white">R$ {totalInvestment.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 text-[#B9F32E] mb-1">
                        <TrendingUp size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Retorno</span>
                    </div>
                    <p className="text-lg font-black text-white">R$ {totalSales.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 text-blue-400 mb-1">
                        <MousePointer2 size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">CPL Médio</span>
                    </div>
                    <p className="text-lg font-black text-white">R$ {(totalInvestment / 157).toFixed(2)}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 text-purple-400 mb-1">
                        <Target size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Custo por Venda</span>
                    </div>
                    <p className="text-lg font-black text-white">R$ {(totalInvestment / 12).toFixed(2)}</p>
                </div>
            </div>

            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockAdsData} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="campaignName"
                            type="category"
                            stroke="#A0AEC0"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            width={100}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#14082F',
                                borderColor: 'rgba(185, 243, 46, 0.3)',
                                borderRadius: '16px',
                                borderWidth: '1px'
                            }}
                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Legend iconType="circle" />
                        <Bar dataKey="investment" name="Investimento (R$)" fill="#8858F1" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="sales" name="Vendas (R$)" fill="#B9F32E" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
