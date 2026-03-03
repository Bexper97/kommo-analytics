import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
} else {
    console.warn("GEMINI_API_KEY is missing.");
}

export const generateStrategicInsights = async (metrics: any) => {
    if (!model) return "AI Configuration Missing. Please check GEMINI_API_KEY.";

    const prompt = `
    You are a senior business intelligence analyst.
    Analyze the following CRM metrics for a sales team:
    ${JSON.stringify(metrics, null, 2)}
    
    Provide 3 concise, high-impact strategic recommendations to improve performance.
    Format the output as a JSON array of strings. 
    Example: ["Focus on follow-ups...", "Increase lead volume..."]
    Do not include markdown formatting like \`\`\`json. Just the raw JSON.
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        // Clean up if markdown is present
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (error: any) {
        console.error("Error generating insights:", error);
        if (error.message?.includes("429") || error.message?.includes("Quota")) {
            return ["AI usage limit reached. Please try again later."];
        }
        return ["Error generating AI insights. Check logs for details."];
    }
};


export const generateWhatsAppReport = async (metrics: any) => {
    if (!model) return "AI Configuration Missing.";

    const prompt = `
      Create a short, professional WhatsApp status report for the business owner based on these metrics:
      ${JSON.stringify(metrics, null, 2)}
      
      The tone should be professional but motivating.
      Include:
      - Total Leads
      - Won Deals Value
      - Key Action Item
      
      Use emojis. Keep it under 100 words.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating report:", error);
        return "Error generating report.";
    }
};

export const generateConversationAnalysis = async (conversations: any[]) => {
    if (!model) return null;

    if (conversations.length === 0) return { error: "No conversations found to analyze." };

    // Limit conversation size to avoid token limits
    const conversationSample = JSON.stringify(conversations.slice(0, 15), null, 2);

    const prompt = `
    You are a Customer Service Quality Assurance Auditor.
    Analyze the following conversation logs (notes) from a CRM:
    ${conversationSample}
    
    Provide a JSON object with the following analysis:
    {
      "tone": "Brief description of the overall tone (e.g., Professional, Aggressive, Helpful)",
      "customer_satisfaction": "Score from 1-10",
      "avg_response_time": "Estimate in minutes/hours based on timestamps (if unavailable, estimate based on flow)",
      "waiting_time": "Longest time the customer waited for a reply",
      "critical_issues": ["List of any critical problems identified"],
      "tips": ["Specific tips for the agent to improve"]
    }
    
    Return ONLY raw JSON. No markdown.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (error: any) {
        console.error("Error analyzing conversations:", error);
        if (error.message?.includes("429") || error.message?.includes("Quota")) {
            return { error: "AI usage limit reached. Please try again later." };
        }
        return { error: "Failed to analyze conversations." };
    }
};
