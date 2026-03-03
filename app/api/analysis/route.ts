
import { NextResponse } from 'next/server';
import { getLeads, getLeadNotes } from '@/lib/kommo';
import { generateConversationAnalysis } from '@/lib/gemini';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId } = body;

        console.log(`Starting conversation analysis for User ID: ${userId || 'ALL'}`);

        // 1. Fetch recent leads (limit to 5 for deep analysis to save tokens/time)
        const filter = userId ? { responsible_user_id: userId } : undefined;
        // getLeads expects an object now: { limit, filter }
        const leads = await getLeads({ limit: 5, filter });

        if (!leads || leads.length === 0) {
            return NextResponse.json({ error: "No leads found for analysis." });
        }

        // 2. Fetch notes for these leads
        let allNotes: any[] = [];

        // Process in parallel but limit concurrency if needed (using Promise.all here for speed)
        const notesPromises = leads.map(async (lead: any) => {
            const notes = await getLeadNotes(lead.id);
            // Filter only text notes or known types
            return notes.map((n: any) => ({
                lead_id: lead.id,
                lead_name: lead.name,
                text: n.text,
                created_at: n.created_at,
                author_id: n.responsible_user_id
            }));
        });

        const results = await Promise.all(notesPromises);
        allNotes = results.flat();

        if (allNotes.length === 0) {
            return NextResponse.json({ error: "No conversation history found in the selected leads." });
        }

        console.log(`Analying ${allNotes.length} notes...`);

        // 3. Send to Gemini
        const analysis = await generateConversationAnalysis(allNotes);

        return NextResponse.json(analysis);

    } catch (error) {
        console.error("Analysis Error:", error);
        return NextResponse.json({ error: "Failed to perform analysis." }, { status: 500 });
    }
}
