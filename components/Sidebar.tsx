import {
    LayoutDashboard,
    Target,
    FileBarChart,
    Settings,
    ShieldCheck,
    Users,
} from 'lucide-react';

type Pipeline = {
    id: number;
    name: string;
    _embedded?: {
        status: { id: number; name: string }[];
    };
};

interface SidebarProps {
    pipelines: Pipeline[];
    selectedPipelineId: number | null;
    onSelectPipeline: (id: number | null) => void;
    activeTab: 'dashboard' | 'traffic' | 'reports' | 'customers';
    onTabChange: (tab: 'dashboard' | 'traffic' | 'reports' | 'customers') => void;
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ pipelines, selectedPipelineId, onSelectPipeline, activeTab, onTabChange, isOpen, onClose }: SidebarProps) {
    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
                    onClick={onClose}
                />
            )}

            <aside className={`w-64 sidebar-gradient border-r border-white/5 flex-shrink-0 flex flex-col h-full fixed left-0 top-0 overflow-y-auto z-50 transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                <div className="p-8 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-[#B9F32E] flex items-center justify-center shadow-[0_0_15px_rgba(185,243,46,0.3)]">
                                <div className="w-4 h-4 bg-[#14082F] rounded-sm transform rotate-45"></div>
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tighter italic">
                                bexper
                            </h2>
                        </div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#8858F1] font-bold">Data Intelligence</p>
                    </div>
                    <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white p-2">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <nav className="p-4 space-y-6 flex-grow">
                    {/* Dashboards Section */}
                    <div>
                        <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">
                            Principal
                        </p>
                        <div className="space-y-1">
                            <button
                                onClick={() => { onTabChange('dashboard'); onSelectPipeline(null); onClose(); }}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-3 ${activeTab === 'dashboard' && selectedPipelineId === null
                                    ? 'bg-[#8858F1] text-white shadow-lg shadow-[#8858F1]/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <LayoutDashboard size={18} />
                                Visão Geral
                            </button>

                            <button
                                onClick={() => { onTabChange('traffic'); onClose(); }}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-3 ${activeTab === 'traffic'
                                    ? 'bg-[#8858F1] text-white shadow-lg shadow-[#8858F1]/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Target size={18} />
                                Tráfego & ROI
                            </button>

                            <button
                                onClick={() => { onTabChange('customers'); onClose(); }}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-3 ${activeTab === 'customers'
                                    ? 'bg-[#8858F1] text-white shadow-lg shadow-[#8858F1]/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Users size={18} />
                                Clientes
                            </button>

                            <button
                                onClick={() => { onTabChange('reports'); onClose(); }}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-3 ${activeTab === 'reports'
                                    ? 'bg-[#8858F1] text-white shadow-lg shadow-[#8858F1]/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <FileBarChart size={18} />
                                Relatórios
                            </button>
                        </div>
                    </div>

                    {/* Funnels Section */}
                    <div>
                        <div className="flex items-center justify-between px-4 mb-4">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Funis Kommo
                            </p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">{pipelines?.length || 0}</span>
                        </div>
                        <div className="space-y-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {pipelines?.map((pipeline) => (
                                <button
                                    key={pipeline.id}
                                    onClick={() => { onTabChange('dashboard'); onSelectPipeline(pipeline.id); onClose(); }}
                                    className={`w-full text-left px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 group flex items-center gap-3 ${selectedPipelineId === pipeline.id && activeTab === 'dashboard'
                                        ? 'bg-[#341F71] text-[#B9F32E] border border-[#8858F1]/30'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full transition-all ${selectedPipelineId === pipeline.id && activeTab === 'dashboard' ? 'bg-[#B9F32E] scale-125' : 'bg-gray-700 group-hover:bg-gray-400'}`}></div>
                                    {pipeline.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Utils Section */}
                    <div>
                        <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">
                            Sistema
                        </p>
                        <div className="space-y-1">
                            <button
                                className="w-full text-left px-4 py-3 rounded-xl text-sm font-bold text-gray-500 cursor-not-allowed flex items-center gap-3 opacity-50"
                            >
                                <Settings size={18} />
                                Ajustes
                            </button>
                        </div>
                    </div>
                </nav>

                <div className="p-6 border-t border-white/5 bg-[#14082F]/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8858F1] to-[#C9B1FD] flex items-center justify-center shadow-lg">
                            <ShieldCheck className="text-white" size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white tracking-tight">Gabriel B.</p>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#B9F32E] animate-pulse"></span>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Admin</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
