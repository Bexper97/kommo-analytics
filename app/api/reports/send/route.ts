import { NextResponse } from 'next/server';
import { getLeads, getPipelines } from '@/lib/kommo';
import { calculateMetrics } from '@/lib/analytics';
import { generateWhatsAppReport } from '@/lib/gemini';
import { sendWhatsAppMessage } from '@/lib/evolution';

export async function POST(request: Request) {
    try {
        const { phoneNumber } = await request.json();

        if (!phoneNumber) {
            return NextResponse.json({ error: "Phone number required" }, { status: 400 });
        }

        // 1. Get Data
        const leads = await getLeads({ limit: 100 });
        const pipelines = await getPipelines();
        const metrics = calculateMetrics(leads, pipelines);

        // 2. Generate Report Text with AI
        const reportText = await generateWhatsAppReport(metrics);

        // 3. Send via Evolution API
        const result = await sendWhatsAppMessage(phoneNumber, reportText);

        return NextResponse.json({ success: true, result });
    } catch (error) {
        console.error("Report API Error:", error);
        return NextResponse.json({ error: "Failed to send report" }, { status: 500 });
    }
}
