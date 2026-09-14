#!/usr/bin/env bash
# Cria UMA instância na Evolution API (um número de WhatsApp = uma instância).
#
# Uso:
#   ./create-instance.sh <nome-da-instancia>
#
# Exemplo:
#   ./create-instance.sh colaborador-joao

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

INSTANCE_NAME="${1:-}"

if [ -z "$INSTANCE_NAME" ]; then
  echo "Uso: $0 <nome-da-instancia>" >&2
  exit 1
fi

echo "Criando instância '$INSTANCE_NAME' na Evolution API..."

BODY=$(jq -n --arg name "$INSTANCE_NAME" '{
  instanceName: $name,
  qrcode: true,
  integration: "WHATSAPP-BAILEYS"
}')

RESPONSE=$(evolution_api POST "/instance/create" "$BODY")

echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

echo
echo "Instância criada. Para gerar o QR Code de pareamento, rode:"
echo "  ./get-qrcode.sh $INSTANCE_NAME"
