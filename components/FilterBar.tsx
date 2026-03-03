
interface FilterProps {
    users: any[];
    selectedUserId: number | null;
    onSelectUser: (id: number | null) => void;

    dateFrom: string;
    onDateFromChange: (date: string) => void;

    dateTo: string;
    onDateToChange: (date: string) => void;

    dateType: 'created_at' | 'closed_at';
    onDateTypeChange: (type: 'created_at' | 'closed_at') => void;
}

export default function FilterBar({
    users,
    selectedUserId,
    onSelectUser,
    dateFrom,
    onDateFromChange,
    dateTo,
    onDateToChange,
    dateType,
    onDateTypeChange
}: FilterProps) {
    return (
        <div className="flex flex-col md:flex-row flex-wrap gap-6 items-start md:items-center">
            <div className="flex flex-col gap-1 w-full md:w-auto">
                <label className="text-[10px] font-bold text-[#8858F1] uppercase tracking-widest">Atendente</label>
                <select
                    className="bg-[#14082F]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-[#8858F1] focus:border-transparent outline-none w-full md:min-w-[200px]"
                    value={selectedUserId || ''}
                    onChange={(e) => onSelectUser(e.target.value ? Number(e.target.value) : null)}
                >
                    <option value="" className="bg-[#14082F]">Todos os Atendentes</option>
                    {users?.map((user: any) => (
                        <option key={user.id} value={user.id} className="bg-[#14082F]">{user.name}</option>
                    ))}
                </select>
            </div>

            <div className="h-10 w-px bg-white/5 hidden md:block"></div>

            <div className="flex flex-col gap-1 w-full md:w-auto">
                <label className="text-[10px] font-bold text-[#8858F1] uppercase tracking-widest">Tipo de Data</label>
                <select
                    className="bg-[#14082F]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-[#8858F1] focus:border-transparent outline-none w-full"
                    value={dateType}
                    onChange={(e: any) => onDateTypeChange(e.target.value)}
                >
                    <option value="created_at" className="bg-[#14082F]">Data de Criação</option>
                    <option value="closed_at" className="bg-[#14082F]">Data de Fechamento</option>
                </select>
            </div>

            <div className="flex flex-col gap-1 w-full md:w-auto">
                <label className="text-[10px] font-bold text-[#8858F1] uppercase tracking-widest">Período</label>
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        className="bg-[#14082F]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-[#8858F1] focus:border-transparent outline-none flex-1 md:flex-none"
                        value={dateFrom}
                        onChange={(e) => onDateFromChange(e.target.value)}
                    />
                    <span className="text-gray-500 text-[10px] font-bold uppercase">até</span>
                    <input
                        type="date"
                        className="bg-[#14082F]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-[#8858F1] focus:border-transparent outline-none flex-1 md:flex-none"
                        value={dateTo}
                        onChange={(e) => onDateToChange(e.target.value)}
                    />
                </div>
            </div>

            <button
                onClick={() => {
                    onSelectUser(null);
                    onDateFromChange('');
                    onDateToChange('');
                }}
                className="w-full md:w-auto md:ml-auto px-4 py-2 text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-widest hover:bg-red-400/10 rounded-lg transition-all"
            >
                Limpar Filtros
            </button>
        </div>
    );
}
