import { CheckCircle, AlertCircle, ListTodo } from 'lucide-react';

interface TaskMetrics {
    total: number;
    completed: number;
    overdue: number;
}

export default function TaskWidget({ metrics }: { metrics: TaskMetrics }) {
    if (!metrics) return null;

    const completionRate = metrics.total > 0 ? (metrics.completed / metrics.total) * 100 : 0;

    return (
        <div className="glass-card p-6 relative overflow-hidden group">
            <h2 className="mb-6 text-xl font-bold text-white flex items-center gap-2">
                <ListTodo className="text-[#8858F1]" size={20} />
                Gestão de Tarefas
            </h2>

            <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Ativas</span>
                    <span className="text-lg font-black text-white">{metrics.total}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#B9F32E]/10 border border-[#B9F32E]/20">
                    <div className="flex items-center gap-2">
                        <CheckCircle size={14} className="text-[#B9F32E]" />
                        <span className="text-xs font-bold text-[#B9F32E] uppercase tracking-wider">Concluídas</span>
                    </div>
                    <span className="text-lg font-black text-white">{metrics.completed}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2">
                        <AlertCircle size={14} className="text-red-400" />
                        <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Atrasadas</span>
                    </div>
                    <span className="text-lg font-black text-white">{metrics.overdue}</span>
                </div>

                {/* Progress bar */}
                <div className="pt-4">
                    <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                        <span>Taxa de Conclusão</span>
                        <span className="text-[#B9F32E]">{completionRate.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-[#8858F1] to-[#B9F32E] transition-all duration-1000"
                            style={{ width: `${completionRate}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
