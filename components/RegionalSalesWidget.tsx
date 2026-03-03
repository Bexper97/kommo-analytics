
import { MapPin, TrendingUp } from 'lucide-react';

interface RegionSales {
    city?: string;
    state?: string;
    sales: number;
    count: number;
}

export default function RegionalSalesWidget({ salesByRegion }: { salesByRegion: RegionSales[] }) {
    if (!salesByRegion || salesByRegion.length === 0) {
        return (
            <div className="glass-card p-6">
                <h2 className="mb-4 text-xl font-semibold text-white flex items-center gap-2">
                    <MapPin className="text-[#8858F1]" />
                    Vendas por Estado
                </h2>
                <p className="text-gray-400 text-sm italic">
                    Nenhum dado de localização disponível.
                </p>
            </div>
        );
    }

    const maxSales = Math.max(...salesByRegion.map(r => r.sales));

    return (
        <div className="glass-card p-6">
            <h2 className="mb-6 text-xl font-semibold text-white flex items-center gap-2 uppercase tracking-tighter">
                <MapPin className="text-[#8858F1]" />
                Vendas por Estado
            </h2>
            <div className="space-y-4">
                {salesByRegion.map((region, index) => {
                    const percentage = (region.sales / maxSales) * 100;
                    return (
                        <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[#B9F32E]"></div>
                                    <span className="font-bold text-gray-200">
                                        {region.state || 'Não informado'}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-[#B9F32E]">
                                        R$ {region.sales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold">{region.count} vendas</p>
                                </div>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-[#8858F1] to-[#B9F32E] h-1.5 rounded-full transition-all duration-700"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
