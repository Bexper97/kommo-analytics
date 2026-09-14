#!/usr/bin/env bash
# Cria uma instância na Evolution API para CADA colaborador listado em
# colaboradores.json, e (opcionalmente) registra cada um na tabela
# `colaboradores` do Supabase para aparecerem com nome no dashboard.
#
# Uso:
#   cp colaboradores.example.json colaboradores.json   # edite com os dados reais
#   ./create-instances-batch.sh [caminho-do-json]
#
# Depois de rodar, gere o QR Code de cada um com:
#   ./get-qrcode.sh <instancia>

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

COLABORADORES_FILE="${1:-$INFRA_DIR/colaboradores.json}"

if [ ! -f "$COLABORADORES_FILE" ]; then
  echo "Arquivo não encontrado: $COLABORADORES_FILE" >&2
  echo "Copie colaboradores.example.json para colaboradores.json e preencha com os dados reais." >&2
  exit 1
fi

upsert_supabase() {
  # Registra o colaborador no Supabase, se as credenciais estiverem definidas no .env.
  # Falha aqui NÃO interrompe a criação das instâncias (é apenas conveniência
  # para o dashboard mostrar nomes em vez de IDs de instância).
  local instancia="$1" nome="$2" telefone="$3"

  if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
    return 0
  fi

  local body
  body=$(jq -n --arg i "$instancia" --arg n "$nome" --arg t "$telefone" \
    '{instancia: $i, nome: $n, telefone: $t, ativo: true}')

  curl -sS -X POST "${SUPABASE_URL%/}/rest/v1/colaboradores" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates,return=minimal" \
    -d "$body" >/dev/null || echo "  Aviso: falha ao registrar '$instancia' no Supabase (verifique SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)." >&2
}

TOTAL=$(jq 'length' "$COLABORADORES_FILE")
echo "Encontrados $TOTAL colaboradores em $COLABORADORES_FILE"
echo

jq -c '.[]' "$COLABORADORES_FILE" | while read -r ITEM; do
  INSTANCIA=$(echo "$ITEM" | jq -r '.instancia')
  NOME=$(echo "$ITEM" | jq -r '.nome')
  TELEFONE=$(echo "$ITEM" | jq -r '.telefone')

  echo "=== $NOME ($INSTANCIA) ==="

  BODY=$(jq -n --arg name "$INSTANCIA" '{
    instanceName: $name,
    qrcode: true,
    integration: "WHATSAPP-BAILEYS"
  }')

  RESPONSE=$(evolution_api POST "/instance/create" "$BODY")
  echo "$RESPONSE" | jq -c '{instance: (.instance.instanceName // .instanceName // "?"), status: (.instance.status // .status // "?")}' 2>/dev/null || echo "$RESPONSE"

  upsert_supabase "$INSTANCIA" "$NOME" "$TELEFONE"
  echo
done

echo "Concluído. Gere o QR Code de cada instância com:"
echo "  ./get-qrcode.sh <instancia>"
