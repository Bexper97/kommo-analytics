import axios from 'axios';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME;

if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !INSTANCE_NAME) {
    console.warn("Evolution API credentials are missing from environment variables.");
}

const evolutionClient = axios.create({
    baseURL: EVOLUTION_API_URL,
    headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
    },
});

export const sendWhatsAppMessage = async (number: string, text: string) => {
    try {
        // Format number: remove +, spaces, dashes. Ensure country code.
        const formattedNumber = number.replace(/\D/g, '');

        // Evolution API typically uses /message/sendText/{instance} or similar
        // Check documentation for exact endpoint. Assuming v1 style or similar.
        // Common pattern: POST /message/sendText/{instance}
        // Body: { number: "...", options: { delay: 1200, presence: "composing" }, textMessage: { text: "..." } }
        // OR simpler: { number: "...", text: "..." } depending on version.

        // Using a generic payload structure common in Evolution/Z-API wrappers
        // Adjust based on specific version installed.
        const payload = {
            number: formattedNumber,
            text: text,
            // delay: 1200
        };

        const response = await evolutionClient.post(`/message/sendText/${INSTANCE_NAME}`, payload);
        return response.data;
    } catch (error) {
        console.error("Error sending WhatsApp message:", error);
        throw error;
    }
};

export default evolutionClient;
