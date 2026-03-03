// Types
interface Lead {
    id: number;
    price: number;
    status_id: number;
    created_at: number;
    pipeline_id: number;
}

interface Pipeline {
    id: number;
    name: string;
    _embedded: {
        statuses: {
            id: number;
            name: string;
            type?: number;
        }[];
    };
}

export interface DashboardMetrics {
    totalLeads: number;
    totalValue: number;
    wonValue: number;
    conversionRate: number; // percentage
    avgDealValue: number;
    leadsByStage: { name: string; count: number; value: number }[];
}

export function calculateMetrics(leads: Lead[], pipelines: Pipeline[]): DashboardMetrics {
    const totalLeads = leads.length;
    let totalValue = 0;
    let wonValue = 0;
    let wonCount = 0;
    let lostCount = 0;

    // Helper map for status names
    const statusMap = new Map<number, string>();
    pipelines.forEach(p => {
        p._embedded.statuses.forEach(s => {
            statusMap.set(s.id, s.name);
        });
    });

    // Grouping
    const stageCounts = new Map<string, { count: number; value: number }>();

    leads.forEach(lead => {
        totalValue += lead.price || 0;

        // Kommo standard: 142 = Won, 143 = Lost. 
        // Note: These IDs might change per account, but valid for default. 
        // Ideally, we check status type from pipeline config.

        if (lead.status_id === 142) {
            wonValue += lead.price || 0;
            wonCount++;
        } else if (lead.status_id === 143) {
            lostCount++;
        }

        const stageName = statusMap.get(lead.status_id) || `Stage ${lead.status_id}`;

        const current = stageCounts.get(stageName) || { count: 0, value: 0 };
        stageCounts.set(stageName, {
            count: current.count + 1,
            value: current.value + (lead.price || 0)
        });
    });

    const finishedDeals = wonCount + lostCount;
    const conversionRate = finishedDeals > 0 ? (wonCount / finishedDeals) * 100 : 0;
    const avgDealValue = wonCount > 0 ? wonValue / wonCount : 0;

    const leadsByStage = Array.from(stageCounts.entries()).map(([name, data]) => ({
        name,
        count: data.count,
        value: data.value
    }));

    return {
        totalLeads,
        totalValue,
        wonValue,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        avgDealValue: parseFloat(avgDealValue.toFixed(2)),
        leadsByStage
    };
}
