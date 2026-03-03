
import { useState } from 'react';
import {
    FileBarChart,
    ClipboardList,
    Users,
    PieChart,
    Download
} from 'lucide-react';
import TasksModule from './TasksModule';
import CustomersModule from './CustomersModule';

interface ReportsModuleProps {
    data: any;
}

export default function ReportsModule({ data }: ReportsModuleProps) {
    const [activeSubTab, setActiveSubTab] = useState<'tasks' | 'customers'>('tasks');

    // Enrich tasks with pipeline and lead info
    const enrichedTasks = (data?.tasks || []).map((task: any) => {
        // Busca o lead tanto na lista filtrada quanto na lista específica de leads de tarefas
        const lead = (data?.taskLeads || []).find((l: any) => l.id === task.element_id) ||
            (data?.leads || []).find((l: any) => l.id === task.element_id);
        const user = (data?.users || []).find((u: any) => u.id === task.responsible_user_id);

        return {
            ...task,
            pipeline_id: lead?.pipeline_id,
            lead_name: lead?.name,
            responsible_name: user?.name
        };
    });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
                        Centro de <span className="text-[#B9F32E]">Relatórios</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Análise granular de produtividade e vendas</p>
                </div>

                <div className="flex bg-[#14082F]/60 p-1.5 rounded-2xl border border-white/10 shadow-xl self-start md:self-auto">
                    <button
                        onClick={() => setActiveSubTab('tasks')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeSubTab === 'tasks'
                            ? 'bg-[#8858F1] text-white shadow-lg'
                            : 'text-gray-500 hover:text-white'
                            }`}
                    >
                        <ClipboardList size={16} />
                        Tarefas
                    </button>
                    <button
                        onClick={() => setActiveSubTab('customers')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeSubTab === 'customers'
                            ? 'bg-[#8858F1] text-white shadow-lg'
                            : 'text-gray-500 hover:text-white'
                            }`}
                    >
                        <Users size={16} />
                        Clientes
                    </button>
                </div>
            </header>

            <div className="min-h-[60vh]">
                {activeSubTab === 'tasks' ? (
                    <TasksModule
                        tasks={enrichedTasks}
                        users={data?.users || []}
                        pipelines={data?.pipelines || []}
                    />
                ) : (
                    <CustomersModule
                        customers={data?.customerLTV || []}
                    />
                )}
            </div>

            {/* Footer / Export (Placeholder) */}
            <div className="flex justify-end gap-3 pb-10">
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-gray-400 text-xs font-bold hover:bg-white/5 transition-all">
                    <PieChart size={14} />
                    Ver Estatísticas
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-all">
                    <Download size={14} />
                    Exportar PDF
                </button>
            </div>
        </div>
    );
}
