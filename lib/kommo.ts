import axios, { AxiosInstance } from 'axios';

const KOMMO_BASE_URL = process.env.KOMMO_BASE_URL;
const KOMMO_TOKEN = process.env.KOMMO_LONG_LIVED_TOKEN;

if (!KOMMO_BASE_URL || !KOMMO_TOKEN) {
    console.warn("Kommo API credentials are missing from environment variables.");
}

const kommoClient: AxiosInstance = axios.create({
    baseURL: KOMMO_BASE_URL,
    headers: {
        'Authorization': `Bearer ${KOMMO_TOKEN}`,
        'Content-Type': 'application/json',
    },
});

// Simple rate limiter handling (Kommo limit is usually 7 requests/second)
kommoClient.interceptors.response.use(
    response => response,
    async error => {
        if (error.response && error.response.status === 429) {
            console.log('Rate limited by Kommo. Waiting 1 second...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            return kommoClient.request(error.config);
        }
        return Promise.reject(error);
    }
);


interface GetLeadsOptions {
    limit?: number;
    page?: number;
    query?: string;
    filter?: {
        pipeline_id?: number;
        responsible_user_id?: number | number[];
        created_at?: { from: number; to: number };
        closed_at?: { from: number; to: number };
    };
}

export const getLeads = async (options: GetLeadsOptions = {}) => {
    const { limit = 50, page = 1, query, filter } = options;
    try {
        const response = await kommoClient.get('/api/v4/leads', {
            params: {
                limit,
                page,
                query,
                filter,
                with: 'contacts'
            }
        });
        return response.data._embedded?.leads || [];
    } catch (error) {
        console.error("Error fetching leads:", error);
        return [];
    }
};

/**
 * Fetches ALL leads using automatic pagination
 * This function will iterate through all pages until all leads are retrieved
 */
export const getAllLeads = async (options: Omit<GetLeadsOptions, 'limit' | 'page'> = {}) => {
    const { query, filter } = options;
    const allLeads: any[] = [];
    let currentPage = 1;
    const pageSize = 250; // Maximum allowed by Kommo API
    let hasMorePages = true;

    console.log('🔄 Starting to fetch all leads with pagination...');

    try {
        while (hasMorePages) {
            const response = await kommoClient.get('/api/v4/leads', {
                params: {
                    limit: pageSize,
                    page: currentPage,
                    query,
                    filter,
                    with: 'contacts'
                }
            });

            const leads = response.data._embedded?.leads || [];
            allLeads.push(...leads);

            console.log(`📄 Page ${currentPage}: Fetched ${leads.length} leads (Total so far: ${allLeads.length})`);

            // Check if there are more pages
            // Kommo returns fewer leads than the limit when we reach the last page
            if (leads.length < pageSize) {
                hasMorePages = false;
            } else {
                currentPage++;
                // Small delay to respect rate limits (7 requests/second)
                await new Promise(resolve => setTimeout(resolve, 150));
            }
        }

        console.log(`✅ Finished! Total leads fetched: ${allLeads.length}`);
        return allLeads;
    } catch (error) {
        console.error("Error fetching all leads:", error);
        return allLeads; // Return what we have so far
    }
};

export const getUsers = async () => {
    try {
        const response = await kommoClient.get('/api/v4/users', {
            params: { with: 'role' } // Kommo API often includes groups when role/with is specified, or we might need a separate call
        });
        const users = response.data._embedded?.users || [];
        // Filtra apenas usuários ativos
        return users.filter((u: any) => u.rights?.is_active === true);
    } catch (error) {
        console.error("Error fetching users:", error);
        return [];
    }
};

export const getPipelines = async () => {
    try {
        const response = await kommoClient.get('/api/v4/leads/pipelines');
        return response.data._embedded?.pipelines || [];
    } catch (error) {
        console.error("Error fetching pipelines:", error);
        return [];
    }
};


export const getTasks = async (limit: number = 50, page: number = 1, filter?: {
    responsible_user_id?: number | number[];
    is_completed?: boolean;
    updated_at?: { from: number; to: number };
}) => {
    try {
        const response = await kommoClient.get('/api/v4/tasks', {
            params: { limit, page, filter }
        });
        return response.data._embedded?.tasks || [];
    } catch (error) {
        console.error("Error fetching tasks:", error);
        return [];
    }
};

/**
 * Fetches ALL tasks using automatic pagination
 */
export const getAllTasks = async (filter?: {
    responsible_user_id?: number | number[];
    is_completed?: boolean;
    updated_at?: { from: number; to: number };
}) => {
    const allTasks: any[] = [];
    let currentPage = 1;
    const pageSize = 250;
    let hasMorePages = true;

    console.log('🔄 Starting to fetch all tasks with pagination...');

    try {
        while (hasMorePages) {
            const response = await kommoClient.get('/api/v4/tasks', {
                params: {
                    limit: pageSize,
                    page: currentPage,
                    filter
                }
            });

            const tasks = response.data._embedded?.tasks || [];
            allTasks.push(...tasks);

            console.log(`📄 Page ${currentPage}: Fetched ${tasks.length} tasks (Total so far: ${allTasks.length})`);

            if (tasks.length < pageSize) {
                hasMorePages = false;
            } else {
                currentPage++;
                await new Promise(resolve => setTimeout(resolve, 150));
            }
        }

        console.log(`✅ Finished! Total tasks fetched: ${allTasks.length}`);
        return allTasks;
    } catch (error) {
        console.error("Error fetching all tasks:", error);
        return allTasks;
    }
};


export const getLeadNotes = async (leadId: number) => {
    try {
        const response = await kommoClient.get(`/api/v4/leads/${leadId}/notes`);
        return response.data._embedded?.notes || [];
    } catch (error) {
        console.error(`Error fetching notes for lead ${leadId}:`, error);
        return [];
    }
};

export default kommoClient;
