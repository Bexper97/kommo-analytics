import { NextResponse } from 'next/server';
import { getAllLeads, getAllTasks } from '@/lib/kommo';
import { supabase } from '@/lib/supabase';

export async function POST() {
    try {
        console.log('🚀 Iniciando sincronização completa Kommo -> Supabase...');

        // 1. Buscar leads do Kommo
        const leads = await getAllLeads();
        console.log(`📥 Recebidos ${leads.length} leads do Kommo.`);

        // 2. Processar leads para o formato do Supabase
        const processedLeads = leads.map((lead: any) => {
            let city = 'Não informado';
            let state = 'Não informado';
            let contactId = lead._embedded?.contacts?.[0]?.id || null;

            let qtdTotal = 0;
            let qtd2025 = 0;
            let nivel2026 = null;
            let nivel2025 = null;

            if (lead.custom_fields_values) {
                const cityField = lead.custom_fields_values.find((f: any) =>
                    f.field_name?.toLowerCase().includes('cidade') ||
                    f.field_name?.toLowerCase().includes('city')
                );
                const stateField = lead.custom_fields_values.find((f: any) =>
                    f.field_name?.toLowerCase().includes('estado') ||
                    f.field_name?.toLowerCase().includes('state') ||
                    f.field_name?.toLowerCase().includes('uf')
                );

                if (cityField?.values?.[0]?.value) city = cityField.values[0].value;
                if (stateField?.values?.[0]?.value) state = stateField.values[0].value;

                // Extração específica para Inteligência de Recorrência
                const fQtdTotal = lead.custom_fields_values.find((f: any) => f.field_id === 2972674);
                const fQtd2025 = lead.custom_fields_values.find((f: any) => f.field_id === 2973481);
                const fNivel2026 = lead.custom_fields_values.find((f: any) => f.field_id === 2973597);
                const fNivel2025 = lead.custom_fields_values.find((f: any) => f.field_id === 2973583);

                if (fQtdTotal?.values?.[0]?.value) qtdTotal = Number(fQtdTotal.values[0].value);
                if (fQtd2025?.values?.[0]?.value) qtd2025 = Number(fQtd2025.values[0].value);
                if (fNivel2026?.values?.[0]?.value) nivel2026 = fNivel2026.values[0].value;
                if (fNivel2025?.values?.[0]?.value) nivel2025 = fNivel2025.values[0].value;
            }

            return {
                id: lead.id,
                name: lead.name,
                price: lead.price || 0,
                status_id: lead.status_id,
                pipeline_id: lead.pipeline_id,
                responsible_user_id: lead.responsible_user_id,
                created_at: lead.created_at,
                updated_at: lead.updated_at,
                closed_at: lead.closed_at,
                city,
                state,
                contact_id: contactId,
                qtd_compras_total: qtdTotal,
                qtd_compras_2025: qtd2025,
                nivel_2026: nivel2026,
                nivel_2025: nivel2025,
                custom_fields: lead.custom_fields_values || []
            };
        });

        // 3. Upsert leads no Supabase (em lotes de 500 para evitar erros)
        const leadBatches = [];
        for (let i = 0; i < processedLeads.length; i += 500) {
            leadBatches.push(processedLeads.slice(i, i + 500));
        }

        for (const batch of leadBatches) {
            const { error } = await supabase.from('leads').upsert(batch, { onConflict: 'id' });
            if (error) throw error;
        }
        console.log('✅ Leads sincronizados com sucesso.');

        // 4. Buscar e processar tarefas
        const tasks = await getAllTasks();
        const processedTasks = tasks.map((task: any) => ({
            id: task.id,
            element_id: task.element_id,
            element_type: task.element_type,
            complete_till: task.complete_till,
            is_completed: task.is_completed,
            task_type_id: task.task_type_id,
            text: task.text,
            responsible_user_id: task.responsible_user_id,
            created_at: task.created_at,
            updated_at: task.updated_at
        }));

        // 5. Upsert tarefas no Supabase
        const taskBatches = [];
        for (let i = 0; i < processedTasks.length; i += 500) {
            taskBatches.push(processedTasks.slice(i, i + 500));
        }

        for (const batch of taskBatches) {
            const { error } = await supabase.from('tasks').upsert(batch, { onConflict: 'id' });
            if (error) throw error;
        }
        console.log('✅ Tarefas sincronizadas com sucesso.');

        return NextResponse.json({
            success: true,
            leads_synced: processedLeads.length,
            tasks_synced: processedTasks.length
        });

    } catch (error: any) {
        console.error('❌ Erro na sincronização:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
