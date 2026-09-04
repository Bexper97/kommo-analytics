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

## 4. Self-hosted WhatsApp with OpenWA (alternative to Evolution API)

"WhatsApp Reports" can send messages through either **Evolution API** or **[OpenWA](https://github.com/rmyndharis/OpenWA)**, a self-hosted, open-source WhatsApp gateway. OpenWA is a separate service — run it next to this project, not inside this repo:

1. Clone and start it (in a separate folder, next to `kommo-analytics`):
   ```bash
   git clone https://github.com/rmyndharis/OpenWA.git
   cd OpenWA
   cp .env.minimal .env
   docker compose up -d
   ```
   This runs OpenWA on SQLite with no extra services. Dashboard: http://localhost:2785, Swagger: http://localhost:2785/api/docs. For a production-grade stack (Postgres/Redis/MinIO, hardened container), use `docker compose --profile full up -d` instead — see the [OpenWA README](https://github.com/rmyndharis/OpenWA#-quick-start) for all profiles and its `docker-compose.dev.yml` fast-iteration setup.
2. In the OpenWA dashboard, create an API key and a session, then scan the QR code to link a WhatsApp number.
3. Back in `kommo-analytics`, set in `.env.local` (see `.env.example`):
   ```bash
   WHATSAPP_PROVIDER=openwa
   OPENWA_API_URL=http://localhost:2785/api
   OPENWA_API_KEY=<the key you created>
   OPENWA_SESSION_ID=<the session name you created>
   ```

Leave `WHATSAPP_PROVIDER` unset (or `evolution`) to keep using Evolution API instead.

> OpenWA connects to WhatsApp via unofficial, reverse-engineered clients. Read its README's "Before you connect a number" section before linking a real number.
