# 🚀 GUIA MESTRE: Rastreamento de Anúncios (Click-to-WhatsApp) no Kommo CRM

Este guia detalha o passo a passo técnico para garantir que os dados de **UTM (Origem, Campanha, Anúncio)** e o **ID do Anúncio** cheguem ao Kommo CRM sem erros, permitindo a análise de ROI no seu Dashboard.

---

## 🛑 O Problema Comum
Muitos gestores de tráfego acreditam que anúncios de WhatsApp não precisam de "Parâmetros de URL". Sem esses parâmetros, a Meta não envia os dados (objeto `referral`) para o Kommo, e os campos de "Informação Rastreada" ficam vazios.

---

## 🛠 Passo 1: Configuração no Gerenciador de Anúncios (Meta Ads)

Você deve configurar cada anúncio para que ele carregue sua própria "identidade" digital.

1. Acesse o **Gerenciador de Anúncios**.
2. Vá até o nível de **Anúncio** (o terceiro nível da campanha).
3. Role a página até o final, na seção **Rastreamento**.
4. Encontre o campo **Parâmetros de URL**.
5. Cole exatamente o seguinte código de rastreamento:

```text
utm_source=meta&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{ad.id}}
```

### O que isso faz?
*   `{{campaign.name}}`: A Meta substitui automaticamente pelo nome da sua campanha.
*   `{{ad.name}}`: A Meta substitui pelo nome do anúncio (Ex: "Video_Depoimento_01").
*   `{{ad.id}}`: O ID único do anúncio (essencial para o Dashboard puxar a imagem do anúncio).

---

## 🤖 Passo 2: Configuração no Kommo CRM (Salesbot)

Mesmo configurando o Passo 1, às vezes o Kommo recebe os dados mas não "escreve" nos campos do lead. Para garantir 100% de sucesso, usaremos o **Salesbot**.

1. Vá em **Configurações -> Ferramentas de Comunicação -> Salesbot**.
2. Crie um novo robô e dê o nome de **"Rastreador de WhatsApp"**.
3. Defina o gatilho como: **"Quando uma nova conversa é iniciada"**.
4. Adicione um passo do tipo **"Código"** ou **"Definir Campo"**.
5. Use as variáveis de sistema para mapear os dados para os campos de UTM:
    *   Mapeie `utm_source` para o campo `utm_source` do Kommo.
    *   Mapeie `utm_campaign` para o campo `utm_campaign`.
    *   Mapeie o `ID do Anúncio` (referral) para um campo personalizado chamado `ad_id`.

---

## 🔗 Passo 3: Vinculando a página de forma oficial

No Kommo, siga este caminho:
1. Vá em **Entrada de Leads** (Pipeline Principal).
2. No botão de **Configurar** (canto superior direito), clique em **Fontes de Leads**.
3. Certifique-se de que a **Integração do Facebook Ads** está conectada à página correta.
4. O número de WhatsApp deve estar verificado como **WABA (WhatsApp Business API)**. WhatsApps "normais" conectados via QR Code têm uma chance 80% maior de falha no rastreamento de anúncios.

---

## 💎 Dica de Ouro para o Dashboard
No seu Dashboard, nós usaremos o campo `utm_term` (onde salvamos o `{{ad.id}}`) para consultar a API da Meta e trazer a **miniatura do vídeo** e o **valor gasto** especificamente naquele anúncio.

**Resultado final:** Seu dashboard mostrará qual vídeo gerou mais lucro real, e não apenas cliques.

---
*Elaborado por Antigravity AI - Especialista em Dados e CRM.*
