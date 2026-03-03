
'use client';
// Build trigger: 2026-03-03T17:25:00Z

import { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LayoutDashboard, Send, TrendingUp, Users, Target, FileBarChart } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import FilterBar from '@/components/FilterBar';
import TaskWidget from '@/components/TaskWidget';
import TalkAnalysisWidget from '@/components/TalkAnalysisWidget';
import UserActivityWidget from '@/components/UserActivityWidget';
import SalesRankingWidget from '@/components/SalesRankingWidget';
import RegionalSalesWidget from '@/components/RegionalSalesWidget';
import AdsPerformanceWidget from '@/components/AdsPerformanceWidget';
import LTVIntelligenceWidget from '@/components/LTVIntelligenceWidget';
import CustomersModule from '@/components/CustomersModule';
import ReportsModule from '@/components/ReportsModule';

export default function Dashboard() {
    // Data State
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [sendingReport, setSendingReport] = useState(false);

    // Filter State
    const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

    // Default dates: last 30 days
    const [dateFrom, setDateFrom] = useState<string>(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [dateTo, setDateTo] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [dateType, setDateType] = useState<'created_at' | 'closed_at'>('created_at');

    // Navigation State
    const [activeTab, setActiveTab] = useState<'dashboard' | 'traffic' | 'reports' | 'customers'>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params: any = {
                date_type: dateType,
            };

            if (selectedPipelineId) params.pipeline_id = selectedPipelineId;
            if (selectedUserId) params.user_id = selectedUserId;
            if (dateFrom) params.date_from = new Date(dateFrom).getTime();
            if (dateTo) params.date_to = new Date(dateTo).getTime() + 86399000; // End of day

            const res = await axios.get('/api/dashboard', { params });
            setData(res.data);
        } catch (error) {
            console.error("Error loading dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    // Re-fetch when filters change
    useEffect(() => {
        if (activeTab === 'dashboard' || activeTab === 'reports' || activeTab === 'customers') {
            fetchData();
        }
    }, [selectedPipelineId, selectedUserId, dateFrom, dateTo, dateType, activeTab]);

    const sendReport = async () => {
        const phone = prompt("Enter phone number for the report (e.g. 5511999999999):");
        if (!phone) return;

        setSendingReport(true);
        try {
            await axios.post('/api/reports/send', { phoneNumber: phone });
            alert("Report sent successfully!");
        } catch (error) {
            alert("Failed to send report.");
            console.error(error);
        } finally {
            setSendingReport(false);
        }
    };

    // Derived UI states
    const metrics = data?.metrics;
    const insights = data?.insights;
    const pipelines = data?.pipelines || [];
    const users = data?.users || [];
    const taskMetrics = data?.taskMetrics;
    const salesByUser = data?.salesByUser || [];
    const salesByRegion = data?.salesByRegion || [];

    return (
        <div className="flex min-h-screen bg-[#14082F] text-white">
            {/* Sidebar */}
            <Sidebar
                pipelines={pipelines}
                selectedPipelineId={selectedPipelineId}
                onSelectPipeline={setSelectedPipelineId}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* Main Content */}
            <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-0' : 'ml-0 md:ml-64'} p-4 md:p-8`}>
                {activeTab === 'dashboard' ? (
                    <>
                        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setIsSidebarOpen(true)}
                                    className="md:hidden p-2 bg-white/5 rounded-lg border border-white/10 text-white"
                                >
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                </button>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#8858F1] to-[#B9F32E] bg-clip-text text-transparent">
                                        Bexper Analytics
                                    </h1>
                                    <p className="text-xs md:text-sm text-gray-400">Inteligência estratégica em tempo real para seu CRM</p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={async () => {
                                        if (!confirm("Deseja iniciar a sincronização completa? Isso pode levar alguns segundos.")) return;
                                        try {
                                            const btn = document.activeElement as HTMLButtonElement;
                                            btn.disabled = true;
                                            btn.innerText = "Sincronizando...";
                                            await axios.post('/api/sync');
                                            alert("Sincronização concluída com sucesso!");
                                            fetchData();
                                        } catch (e) {
                                            alert("Erro ao sincronizar dados.");
                                        } finally {
                                            location.reload();
                                        }
                                    }}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-[#341F71] border border-[#8858F1]/30 px-6 py-3 text-sm font-bold text-white hover:bg-[#8858F1] transition-all"
                                >
                                    <TrendingUp size={18} className="text-[#B9F32E]" />
                                    Sincronizar Kommo
                                </button>

                                <button
                                    onClick={sendReport}
                                    disabled={sendingReport || !selectedUserId}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-[#B9F32E] px-6 py-3 text-sm text-[#14082F] font-black hover:bg-[#a3d628] disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(185,243,46,0.15)]"
                                >
                                    <Send size={18} />
                                    {sendingReport ? "Enviando..." : "RELATÓRIO WHATSAPP"}
                                </button>
                            </div>
                        </header>

                        {/* Filters */}
                        <div className="glass-card mb-8 p-4">
                            <FilterBar
                                users={users}
                                selectedUserId={selectedUserId}
                                onSelectUser={setSelectedUserId}
                                dateFrom={dateFrom}
                                onDateFromChange={setDateFrom}
                                dateTo={dateTo}
                                onDateToChange={setDateTo}
                                dateType={dateType}
                                onDateTypeChange={setDateType}
                            />
                        </div>

                        {loading ? (
                            <div className="flex h-64 items-center justify-center text-[#B9F32E] animate-pulse">
                                <TrendingUp size={48} className="mr-4" />
                                Carregando Inteligência de Dados...
                            </div>
                        ) : !data ? (
                            <div className="flex h-64 items-center justify-center text-red-400">Falha ao carregar dados.</div>
                        ) : (
                            <>
                                {/* KPI Cards */}
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-4 mb-8">
                                    <MetricCard
                                        title="Total de Leads"
                                        value={metrics.totalLeads}
                                        icon={<Users className="text-[#8858F1]" />}
                                        comparison={metrics.comparisons?.totalLeads}
                                    />
                                    <MetricCard
                                        title="Faturamento Total"
                                        value={`R$ ${metrics.wonValue.toLocaleString()}`}
                                        icon={<TrendingUp className="text-[#B9F32E]" />}
                                        comparison={metrics.comparisons?.wonValue}
                                    />
                                    <MetricCard
                                        title="Taxa de Conversão"
                                        value={`${metrics.conversionRate}%`}
                                        icon={<LayoutDashboard className="text-[#C9B1FD]" />}
                                        comparison={metrics.comparisons?.conversionRate}
                                    />
                                    <MetricCard
                                        title="Ticket Médio"
                                        value={`R$ ${metrics.avgDealValue.toLocaleString()}`}
                                        icon={<TrendingUp className="text-[#B9F32E]" />}
                                        comparison={metrics.comparisons?.avgDealValue}
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                                    {/* Main Chart Column */}
                                    <div className="lg:col-span-2 space-y-8">
                                        <div className="glass-card p-6">
                                            <h2 className="mb-6 text-xl font-semibold text-white flex items-center gap-2">
                                                <div className="w-1 h-6 bg-[#B9F32E] rounded-full"></div>
                                                Performance do Funil
                                            </h2>
                                            <div className="h-80 w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={metrics.leadsByStage}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                        <XAxis
                                                            dataKey="name"
                                                            stroke="#A0AEC0"
                                                            fontSize={10}
                                                            tickLine={false}
                                                            axisLine={false}
                                                            tick={{ fill: '#A0AEC0', fontWeight: 'bold' }}
                                                        />
                                                        <YAxis
                                                            stroke="#A0AEC0"
                                                            fontSize={10}
                                                            tickLine={false}
                                                            axisLine={false}
                                                            tick={{ fill: '#A0AEC0', fontWeight: 'bold' }}
                                                        />
                                                        <Tooltip
                                                            cursor={{ fill: 'rgba(136, 88, 241, 0.1)' }}
                                                            contentStyle={{
                                                                backgroundColor: '#14082F',
                                                                borderColor: 'rgba(185, 243, 46, 0.3)',
                                                                borderRadius: '16px',
                                                                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                                                borderWidth: '1px'
                                                            }}
                                                            itemStyle={{ color: '#B9F32E', fontSize: '12px', fontWeight: 'bold' }}
                                                            labelStyle={{ color: '#fff', marginBottom: '4px', fontWeight: 'black', fontSize: '14px' }}
                                                        />
                                                        <Legend verticalAlign="top" height={36} />
                                                        <Bar
                                                            dataKey="count"
                                                            fill="#8858F1"
                                                            name="Qtd Leads"
                                                            radius={[6, 6, 0, 0]}
                                                            activeBar={{ fill: '#B9F32E', stroke: '#B9F32E', strokeWidth: 2 }}
                                                        />
                                                        <Bar
                                                            dataKey="value"
                                                            fill="#B9F32E"
                                                            name="Valor (R$)"
                                                            radius={[6, 6, 0, 0]}
                                                            activeBar={{ fill: '#fff', stroke: '#B9F32E', strokeWidth: 2 }}
                                                        />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: AI & Tasks */}
                                    <div className="space-y-8">
                                        <TaskWidget metrics={taskMetrics} />

                                        <SalesRankingWidget salesByUser={salesByUser} />

                                        <RegionalSalesWidget salesByRegion={salesByRegion} />

                                        <TalkAnalysisWidget userId={selectedUserId} />

                                        {/* AI Insights Panel */}
                                        <div className="glass-card p-6 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#8858F1]/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                            <div className="flex items-center gap-2 mb-6">
                                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#8858F1] to-[#C9B1FD] flex items-center justify-center shadow-lg">
                                                    <span className="text-white font-bold">AI</span>
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-white">Insights Bexper</h2>
                                                    <p className="text-xs text-[#B9F32E] font-medium">Análise em tempo real</p>
                                                </div>
                                            </div>
                                            <div className="space-y-4 relative z-10">
                                                {insights && insights.length > 0 ? (
                                                    insights.map((insight: string, idx: number) => (
                                                        <div key={idx} className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-gray-200 hover:bg-white/10 transition-colors">
                                                            <p className="leading-relaxed">{insight}</p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-gray-400 italic">Processando insights...</p>
                                                )}
                                            </div>
                                            <div className="mt-6 border-t border-white/10 pt-4 flex items-center justify-between">
                                                <p className="text-[10px] uppercase tracking-widest text-[#8858F1] font-bold">Gemini 2.0 Engine</p>
                                                <div className="h-2 w-2 rounded-full bg-[#B9F32E] animate-ping"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                ) : activeTab === 'customers' ? (
                    <CustomersModule customers={data?.customerLTV} />
                ) : activeTab === 'traffic' ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <header>
                            <h1 className="text-4xl font-black text-white italic tracking-tighter">
                                TRÁFEGO <span className="text-[#B9F32E]">& ROI</span>
                            </h1>
                            <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Análise de Performance de Anúncios</p>
                        </header>

                        <AdsPerformanceWidget />

                        <div className="glass-card p-12 text-center overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#8858F1]/10 to-transparent"></div>
                            <Target className="mx-auto text-[#8858F1] mb-4 opacity-50 relative z-10" size={48} />
                            <h3 className="text-xl font-bold text-white mb-2 relative z-10">Aguardando Integração de APIs</h3>
                            <p className="text-gray-500 max-w-md mx-auto relative z-10">Conecte suas contas do Meta Ads e Google Ads para visualizar o ROI real e a atribuição de vendas por criativo.</p>
                        </div>
                    </div>
                ) : activeTab === 'reports' ? (
                    <ReportsModule data={data} />
                ) : (
                    <div className="flex h-[60vh] items-center justify-center flex-col gap-4 animate-in zoom-in duration-300">
                        <div className="p-4 rounded-full bg-white/5 border border-white/10">
                            <FileBarChart className="text-gray-600" size={48} />
                        </div>
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Módulo em Desenvolvimento</p>
                        <h2 className="text-white text-2xl font-black italic">CONFIGURAÇÕES</h2>
                    </div>
                )}
            </div>
        </div>
    );
}

function MetricCard({ title, value, icon, comparison }: { title: string, value: string | number, icon: any, comparison?: number }) {
    return (
        <div className="glass-card p-6 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{title}</span>
                <div className="p-2 rounded-lg bg-white/5 group-hover:bg-[#8858F1]/20 transition-colors">
                    {icon}
                </div>
            </div>
            <p className="text-3xl font-bold text-white mb-2">{value}</p>
            {comparison !== undefined && (
                <div className={`text-xs font-bold flex items-center ${comparison >= 0 ? 'text-[#B9F32E]' : 'text-red-400'}`}>
                    <span className="flex items-center gap-1">
                        {comparison >= 0 ? '↑' : '↓'}
                        {Math.abs(comparison).toFixed(1)}%
                    </span>
                    <span className="ml-2 text-gray-500 font-normal">vs anterior</span>
                </div>
            )}
            <div className={`absolute bottom-0 left-0 h-1 w-full ${comparison !== undefined && comparison >= 0 ? 'bg-[#B9F32E]/30' : 'bg-[#8858F1]/20'}`}></div>
        </div>
    );
}
