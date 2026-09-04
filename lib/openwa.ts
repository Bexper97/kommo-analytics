import axios from 'axios';

const OPENWA_API_URL = process.env.OPENWA_API_URL;
const OPENWA_API_KEY = process.env.OPENWA_API_KEY;
const SESSION_ID = process.env.OPENWA_SESSION_ID;

if (!OPENWA_API_URL || !OPENWA_API_KEY || !SESSION_ID) {
    console.warn("OpenWA credentials are missing from environment variables.");
}

const openwaClient = axios.create({
    baseURL: OPENWA_API_URL,
    headers: {
        'X-API-Key': OPENWA_API_KEY,
        'Content-Type': 'application/json',
    },
});

export const sendWhatsAppMessage = async (number: string, text: string) => {
    try {
        // OpenWA expects a WhatsApp chatId (digits + "@c.us" for a direct chat).
        const chatId = `${number.replace(/\D/g, '')}@c.us`;

        const response = await openwaClient.post(
            `/sessions/${SESSION_ID}/messages/send-text`,
            { chatId, text }
        );
        return response.data;
    } catch (error) {
        console.error("Error sending WhatsApp message via OpenWA:", error);
        throw error;
    }
};

export default openwaClient;
