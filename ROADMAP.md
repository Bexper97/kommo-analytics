# 🗺️ Roadmap Bexper Analytics SaaS

Este documento serve para acompanhar o progresso do desenvolvimento do seu SaaS.

## 🟢 Fase 1: Fundação & Branding (Em Progresso)
- [x] Configuração Supabase (Performance 30k+ leads)
- [x] Identidade Visual Bexper (Cores, Glassmorphism)
- [x] Sincronização Kommo -> Supabase
- [ ] Refinamento Mobile (Responsividade da grade)
- [ ] Sidebar Dinâmica (Navegação por abas)

## 🎯 Fase 2: Inteligência de Anúncios (Prioridade Atual)
- [ ] Teste de Atribuição WABA (Campos personalizados no Kommo)
- [ ] Captura de UTMs via WABA Referral
- [ ] Integração com CAPI do Facebook
- [ ] Automação de preenchimento via Salesbot

## 🚀 Fase 3: Expansão de Canais
- [ ] Aba Google Ads (Investimento e Conversão)
- [ ] Aba Meta Ads (Performance de Criativos)
- [ ] Cruzamento de ROI: Investimento Ads vs Vendas Kommo

## 🏦 Fase 4: Estrutura SaaS (Revenda)
- [ ] Sistema de Login (Supabase Auth)
- [ ] Arquitetura Multi-Tenant (Isolamento de dados por cliente)
- [ ] Tela de Configuração de Chaves API para Clientes
- [ ] Integração de Pagamento (Stripe/Asaas)

## 📱 Fase 5: Monitoramento de WhatsApp (Colaboradores)
- [x] Infra Evolution API + n8n (docker-compose, scripts de instância/QR Code)
- [x] Schema Supabase (`mensagens`, `resumos_alertas`, `colaboradores`)
- [x] Workflows n8n de ingestão e resumo/alerta via Claude API
- [x] Painel somente leitura em `/monitoramento` (lista + chat + alertas)
- [ ] Conectar as instâncias reais dos colaboradores (QR Code manual)
- [ ] Ajustar watermark do resumo horário (hoje usa janela fixa de 1h)

---
*Atualizado em: 18/02/2026*
