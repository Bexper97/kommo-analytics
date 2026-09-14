# Kommo Analytics Dashboard Setup

This is a Next.js application that integrates Kommo CRM, Gemini AI, and Evolution API (WhatsApp) to provide strategic insights.

## 1. Installation

Since the project files are already created, you just need to install the dependencies.

1. Open your terminal in this folder (`kommo-analytics`).
2. Run the following command:
   ```bash
   npm install
   ```

## 2. Configuration

Open the `.env.local` file in the root directory and fill in your API keys:

- **KOMMO_BASE_URL**: Your Kommo subdomain (e.g., `https://myshop.kommo.com`).
- **KOMMO_LONG_LIVED_TOKEN**: Generate this in Kommo Settings > Integrations.
- **EVOLUTION_API_KEY**: Your Evolution API key.
- **GEMINI_API_KEY**: Your Google Gemini API Key (get it from AI Studio).

For the WhatsApp monitoring panel (`/monitoramento`), also set
**SUPABASE_URL**, **SUPABASE_SERVICE_ROLE_KEY**, **ANTHROPIC_API_KEY**,
**CLIENT_DASHBOARD_PASSWORD** and **CLIENT_DASHBOARD_SECRET** — see
[`docs/GUIA_MONITORAMENTO_WHATSAPP.md`](docs/GUIA_MONITORAMENTO_WHATSAPP.md).

## 3. Running the App

To start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features
- **Dashboard**: View real-time leads, conversion rates, and pipeline value.
- **AI Insights**: Gemini analyzes your data and gives 3 text tips in the dashboard.
- **WhatsApp Reports**: Click the "Send WhatsApp Report" button to send a summary to any number.
- **Monitoramento de WhatsApp** (`/monitoramento`): painel somente leitura para
  o cliente acompanhar as conversas de WhatsApp de vários colaboradores, com
  resumo e sinalização automática via Claude API. Veja o guia completo em
  [`docs/GUIA_MONITORAMENTO_WHATSAPP.md`](docs/GUIA_MONITORAMENTO_WHATSAPP.md).
