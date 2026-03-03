
import { useState, useMemo } from 'react';
import {
    ClipboardList,
    AlertCircle,
    Clock,
    CheckCircle2,
    Search,
    User as UserIcon,
    Filter,
    Calendar,
    ArrowUpRight,
    Trophy
} from 'lucide-react';

interface Task {
    id: number;
    element_id: number;
    text: string;
    complete_till: number;
    is_completed: boolean;
    responsible_user_id: number;
    pipeline_id?: number;
    responsible_name?: string;
    lead_name?: string;
}

interface User {
    id: number;
    name: string;
    _embedded?: {
        groups?: { name: string }[];
    }
}

interface TasksModuleProps {
    tasks: Task[];
    users: User[];
    pipelines: { id: number; name: string }[];
}

export default function TasksModule({ tasks, users, pipelines }: TasksModuleProps) {
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState<number | 'all'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'overdue' | 'today' | 'upcoming' | 'completed'>('all');

    // Filter users by "Seção de Vendas" as requested
    const commercialUserIds = useMemo(() => {
        return users
            .filter(u => {
                // Check if user belongs to "Seção de Vendas"
                const groups = u._embedded?.groups || [];
                return groups.some(g => g.name.toLowerCase().includes('seção de vendas') || g.name.toLowerCase().includes('vendas'));
            })
            .map(u => u.id);
    }, [users]);

    // Filter pipelines by name as requested
    const targetPipelineNames = [
        "comercial - CRM",
        "carteira loja",
        "CRM site",
        "Carteira site"
    ];

    const targetPipelineIds = useMemo(() => {
        return pipelines
            .filter(p => targetPipelineNames.some(name => p.name.toLowerCase().includes(name.toLowerCase())))
            .map(p => p.id);
    }, [pipelines]);

    const filteredTasks = useMemo(() => {
        const now = Math.floor(Date.now() / 1000);
        const todayEnd = now + (24 * 60 * 60) - (now % (24 * 60 * 60));

        return tasks.filter(task => {
            // 1. Filter by Time (Commercial Team Only)
            if (commercialUserIds.length > 0 && !commercialUserIds.includes(task.responsible_user_id)) return false;

            // 2. Filter by Pipeline
            if (task.pipeline_id && targetPipelineIds.length > 0) {
                if (!targetPipelineIds.includes(task.pipeline_id)) return false;
            }

            // 3. Filter by User (manual selection)
            if (selectedUser !== 'all' && task.responsible_user_id !== selectedUser) return false;

            // 4. Search
            const matchesSearch = task.text.toLowerCase().includes(search.toLowerCase()) ||
                task.lead_name?.toLowerCase().includes(search.toLowerCase());
            if (!matchesSearch) return false;

            // 5. Status Filter
            if (filterStatus === 'overdue') {
                return !task.is_completed && task.complete_till < now;
            }
            if (filterStatus === 'today') {
                return !task.is_completed && task.complete_till >= now && task.complete_till <= todayEnd;
            }
            if (filterStatus === 'upcoming') {
                return !task.is_completed && task.complete_till > todayEnd;
            }
            if (filterStatus === 'completed') {
                return task.is_completed;
            }

            return true;
        });
    }, [tasks, targetPipelineIds, commercialUserIds, selectedUser, search, filterStatus]);

    const stats = useMemo(() => {
        const now = Math.floor(Date.now() / 1000);
        const todayEnd = now + (24 * 60 * 60) - (now % (24 * 60 * 60));

        // Helper to check if task belongs to commercial team and target pipelines
        const isTarget = (t: Task) => (commercialUserIds.includes(t.responsible_user_id)) && (t.pipeline_id ? targetPipelineIds.includes(t.pipeline_id) : true);

        const overdue = tasks.filter(t => !t.is_completed && t.complete_till < now && isTarget(t)).length;
        const today = tasks.filter(t => !t.is_completed && t.complete_till >= now && t.complete_till <= todayEnd && isTarget(t)).length;
        const upcoming = tasks.filter(t => !t.is_completed && t.complete_till > todayEnd && isTarget(t)).length;
        const completed = tasks.filter(t => t.is_completed && isTarget(t)).length;

        return { overdue, today, upcoming, completed };
    }, [tasks, targetPipelineIds, commercialUserIds]);

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button
                    onClick={() => setFilterStatus('overdue')}
                    className={`glass-card p-4 flex items-center justify-between border-l-4 transition-all ${filterStatus === 'overdue' ? 'border-[#ff4d4d] bg-[#ff4d4d]/10' : 'border-[#ff4d4d]/50 hover:bg-white/5'}`}
                >
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Atrasadas</p>
                        <p className="text-2xl font-black text-white italic">{stats.overdue}</p>
                    </div>
                    <AlertCircle className="text-[#ff4d4d]" size={24} />
                </button>

                <button
                    onClick={() => setFilterStatus('today')}
                    className={`glass-card p-4 flex items-center justify-between border-l-4 transition-all ${filterStatus === 'today' ? 'border-[#B9F32E] bg-[#B9F32E]/10' : 'border-[#B9F32E]/50 hover:bg-white/5'}`}
                >
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Para Hoje</p>
                        <p className="text-2xl font-black text-white italic">{stats.today}</p>
                    </div>
                    <Clock className="text-[#B9F32E]" size={24} />
                </button>

                <button
                    onClick={() => setFilterStatus('upcoming')}
                    className={`glass-card p-4 flex items-center justify-between border-l-4 transition-all ${filterStatus === 'upcoming' ? 'border-[#8858F1] bg-[#8858F1]/10' : 'border-[#8858F1]/50 hover:bg-white/5'}`}
                >
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Futuras</p>
                        <p className="text-2xl font-black text-white italic">{stats.upcoming}</p>
                    </div>
                    <Calendar className="text-[#8858F1]" size={24} />
                </button>

                <button
                    onClick={() => setFilterStatus('completed')}
                    className={`glass-card p-4 flex items-center justify-between border-l-4 transition-all ${filterStatus === 'completed' ? 'border-[#2E8BF3] bg-[#2E8BF3]/10' : 'border-[#2E8BF3]/50 hover:bg-white/5'}`}
                >
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Concluídas</p>
                        <p className="text-2xl font-black text-white italic">{stats.completed}</p>
                    </div>
                    <Trophy className="text-[#2E8BF3]" size={24} />
                </button>
            </div>

            {/* Filters */}
            <div className="glass-card p-4 flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar tarefas ou clientes..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#B9F32E] transition-all"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <UserIcon size={16} className="text-gray-400" />
                    <select
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        className="bg-[#14082F] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#B9F32E] cursor-pointer"
                    >
                        <option value="all">Vendedores (Time Comercial)</option>
                        {users.filter(u => commercialUserIds.includes(u.id)).map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={() => {
                        setFilterStatus('all');
                        setSearch('');
                        setSelectedUser('all');
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400"
                    title="Limpar Filtros"
                >
                    <Filter size={18} />
                </button>
            </div>

            {/* Task List */}
            <div className="space-y-3">
                {filteredTasks.length > 0 ? (
                    filteredTasks.map(task => {
                        const isOverdue = !task.is_completed && task.complete_till < Math.floor(Date.now() / 1000);
                        const isToday = !task.is_completed && !isOverdue && task.complete_till < (Math.floor(Date.now() / 1000) + 86400);

                        return (
                            <div
                                key={task.id}
                                className="glass-card p-4 hover:border-white/20 transition-all group"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${task.is_completed ? 'bg-blue-500/20 text-blue-400' :
                                                    isOverdue ? 'bg-red-500/20 text-red-500' :
                                                        isToday ? 'bg-[#B9F32E]/20 text-[#B9F32E]' :
                                                            'bg-[#8858F1]/20 text-[#8858F1]'
                                                }`}>
                                                {task.is_completed ? 'Concluída' : isOverdue ? 'Atrasada' : isToday ? 'Para Hoje' : 'Agendada'}
                                            </span>
                                            <span className="text-xs text-gray-500 font-bold">
                                                {new Date(task.complete_till * 1000).toLocaleString('pt-BR')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-white font-medium mb-2">{task.text || 'Sem descrição'}</p>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase">
                                                <UserIcon size={12} className="text-[#8858F1]" />
                                                {task.responsible_name || 'Desconhecido'}
                                            </div>
                                            {task.lead_name && (
                                                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase">
                                                    <ClipboardList size={12} className="text-[#B9F32E]" />
                                                    {task.lead_name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <a
                                        href={`https://adala1.kommo.com/leads/detail/${task.element_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 rounded-lg bg-white/5 text-gray-500 hover:text-[#B9F32E] transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <ArrowUpRight size={18} />
                                    </a>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="p-12 text-center glass-card border-dashed border-white/10">
                        <CheckCircle2 className="mx-auto text-gray-600 mb-3 opacity-30" size={40} />
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Nenhuma tarefa encontrada</p>
                    </div>
                )}
            </div>
        </div>
    );
}
