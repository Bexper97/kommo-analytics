import { NextResponse } from 'next/server';
import { getPipelines, getUsers } from '@/lib/kommo';
import { supabase } from '@/lib/supabase';
import { calculateMetrics } from '@/lib/analytics';
import { generateStrategicInsights } from '@/lib/gemini';

let cachedInsights: any = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        // Parse filters
        const pipelineId = searchParams.get('pipeline_id') ? Number(searchParams.get('pipeline_id')) : undefined;
        const userId = searchParams.get('user_id') ? Number(searchParams.get('user_id')) : undefined;

        // Dates (expects timestamp in milliseconds)
        const dateFrom = searchParams.get('date_from') ? Number(searchParams.get('date_from')) / 1000 : undefined;
        const dateTo = searchParams.get('date_to') ? Number(searchParams.get('date_to')) / 1000 : undefined;
        const dateType = searchParams.get('date_type') || 'created_at'; // 'created_at' or 'closed_at'

        console.log("Fetching dashboard data from SUPABASE with filters:", { pipelineId, userId, dateFrom, dateTo });

        // Helper function for Supabase querying
        // Helper function for Supabase querying with pagination to bypass the 1000-row limit
        const getLeadsFromDB = async (dFrom?: number, dTo?: number) => {
            const allLeads: any[] = [];
            let from = 0;
            const pageSize = 1000;
            let hasMore = true;

            while (hasMore) {
                let query = supabase.from('leads').select('*').range(from, from + pageSize - 1);

                if (pipelineId) query = query.eq('pipeline_id', pipelineId);
                if (userId) query = query.eq('responsible_user_id', userId);
                if (dFrom) query = query.gte(dateType, dFrom);
                if (dTo) query = query.lte(dateType, dTo);

                const { data, error } = await query;
                if (error) throw error;

                allLeads.push(...(data || []));

                if (!data || data.length < pageSize) {
                    hasMore = false;
                } else {
                    from += pageSize;
                }
            }
            return allLeads;
        };

        const getTasksFromDB = async (dFrom?: number, dTo?: number) => {
            const allTasks: any[] = [];
            let from = 0;
            const pageSize = 1000;
            let hasMore = true;

            while (hasMore) {
                let query = supabase.from('tasks').select('*').range(from, from + pageSize - 1);
                if (userId) query = query.eq('responsible_user_id', userId);
                if (dFrom) query = query.gte('updated_at', dFrom); // Usamos updated_at ou complete_till conforme necessidade
                if (dTo) query = query.lte('updated_at', dTo);

                const { data, error } = await query;
                if (error) throw error;

                allTasks.push(...(data || []));

                if (!data || data.length < pageSize) {
                    hasMore = false;
                } else {
                    from += pageSize;
                }
            }
            return allTasks;
        };

        // Fetch pipelines and users from Kommo (or could be from DB too)
        const [pipelines, users] = await Promise.all([
            getPipelines(),
            getUsers()
        ]);

        // Calculate previous period metrics
        let previousPeriodMetrics: any = null;
        if (dateFrom && dateTo) {
            const duration = dateTo - dateFrom;
            const prevDateTo = dateFrom;
            const prevDateFrom = prevDateTo - duration;

            console.log("Fetching previous period data from Supabase...");
            const prevLeads = await getLeadsFromDB(prevDateFrom, prevDateTo);
            previousPeriodMetrics = calculateMetrics(prevLeads, pipelines);
        }

        // Fetch CURRENT period data
        const [leads, tasks] = await Promise.all([
            getLeadsFromDB(dateFrom, dateTo),
            getTasksFromDB(dateFrom, dateTo)
        ]);

        // Adicional: Buscar informações dos leads vinculados às tarefas (para saber o funil/pipeline)
        const taskLeadIds = Array.from(new Set(tasks.map((t: any) => t.element_id).filter(id => id)));
        let taskLeads: any[] = [];
        if (taskLeadIds.length > 0) {
            const { data: tLeads } = await supabase.from('leads').select('id, name, pipeline_id').in('id', taskLeadIds);
            taskLeads = tLeads || [];
        }

        console.log(`Fetched ${leads.length} leads and ${tasks.length} tasks from Supabase.`);

        const metrics: any = calculateMetrics(leads, pipelines);

        const calculateChange = (current: number, previous: number) => {
            if (!previous) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        // Add comparisons
        if (previousPeriodMetrics) {
            metrics.comparisons = {
                totalLeads: calculateChange(metrics.totalLeads, previousPeriodMetrics.totalLeads),
                wonValue: calculateChange(metrics.wonValue, previousPeriodMetrics.wonValue),
                conversionRate: calculateChange(metrics.conversionRate, previousPeriodMetrics.conversionRate),
                avgDealValue: calculateChange(metrics.avgDealValue, previousPeriodMetrics.avgDealValue)
            };
        }

        // Calculate Sales by User (Ranking)
        const wonStatusId = 142;
        const wonLeads = leads.filter((l: any) => l.status_id === wonStatusId);

        const salesByUser = users.map((u: any) => {
            const userWonLeads = wonLeads.filter((l: any) => l.responsible_user_id === u.id);
            const totalSales = userWonLeads.reduce((sum: number, l: any) => sum + (Number(l.price) || 0), 0);
            const leadsCount = userWonLeads.length;

            return {
                userId: u.id,
                name: u.name,
                totalSales,
                leadsCount,
                avgTicket: leadsCount > 0 ? totalSales / leadsCount : 0
            };
        })
            .filter((u: any) => u.totalSales > 0)
            .sort((a: any, b: any) => b.totalSales - a.totalSales);

        // Geographic Analysis
        const locationMap = new Map<string, { city?: string; state?: string; sales: number; count: number }>();
        wonLeads.forEach((lead: any) => {
            const city = lead.city || 'Não informado';
            const state = lead.state || 'Não informado';
            const key = `${city}|${state}`;
            const existing = locationMap.get(key) || { city, state, sales: 0, count: 0 };
            existing.sales += Number(lead.price) || 0;
            existing.count += 1;
            locationMap.set(key, existing);
        });

        const salesByRegion = Array.from(locationMap.values())
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 10);

        // User Activity
        const userActivity = users.map((u: any) => {
            const userLeads = leads.filter((l: any) => l.responsible_user_id === u.id);
            const userTasks = tasks.filter((t: any) => t.responsible_user_id === u.id);

            const timestamps = [
                ...userLeads.map((l: any) => l.created_at),
                ...userTasks.map((t: any) => t.created_at),
                ...userTasks.map((t: any) => t.updated_at)
            ].filter(t => t >= (dateFrom || 0) && t <= (dateTo || Infinity)).sort((a, b) => a - b);

            if (timestamps.length < 2) return { userId: u.id, name: u.name, hours: 0, firstAction: null, lastAction: null };

            const first = timestamps[0];
            const last = timestamps[timestamps.length - 1];
            const hours = ((last - first) / 3600).toFixed(1);

            return {
                userId: u.id,
                name: u.name,
                hours: Number(hours),
                firstAction: new Date(first * 1000).toISOString(),
                lastAction: new Date(last * 1000).toISOString(),
                actionCount: timestamps.length
            };
        }).filter((u: any) => u.actionCount > 0);

        // Task metrics
        const taskMetrics = {
            total: tasks.length,
            completed: tasks.filter((t: any) => t.is_completed).length,
            overdue: tasks.filter((t: any) => !t.is_completed && new Date(t.complete_till * 1000) < new Date()).length
        };

        // Fetch Customer LTV Intelligence from the View
        const { data: customerLTV, error: ltvError } = await supabase
            .from('view_customer_ltv')
            .select('*')
            .limit(1000);

        if (ltvError) {
            console.error("Error fetching LTV intelligence:", ltvError);
        }

        // AI Insights
        const now = Date.now();
        let insights;
        if (cachedInsights && (now - lastFetchTime < CACHE_DURATION)) {
            insights = cachedInsights;
        } else {
            insights = await generateStrategicInsights({ ...metrics, taskMetrics });
            if (Array.isArray(insights) && insights.length > 0) {
                cachedInsights = insights;
                lastFetchTime = now;
            }
        }

        return NextResponse.json({
            metrics,
            taskMetrics,
            userActivity,
            salesByUser,
            salesByRegion,
            customerLTV: customerLTV || [],
            pipelines,
            users,
            insights,
            leads,
            tasks,
            taskLeads, // Novos dados para o módulo de tarefas
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Dashboard API Error:", error);
        return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
    }
}

