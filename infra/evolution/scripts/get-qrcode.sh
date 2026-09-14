#!/usr/bin/env bash
# Gera e salva o QR Code de pareamento de uma instância como arquivo PNG.
# O escaneamento em si (WhatsApp do celular do colaborador > Aparelhos
# conectados > Conectar um aparelho) é manual e continua sendo
# responsabilidade humana — este script só automatiza a GERAÇÃO da imagem.
#
# Uso:
#   ./get-qrcode.sh <nome-da-instancia> [pasta-de-saida]

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

INSTANCE_NAME="${1:-}"
OUT_DIR="${2:-$INFRA_DIR/qrcodes}"

if [ -z "$INSTANCE_NAME" ]; then
  echo "Uso: $0 <nome-da-instancia> [pasta-de-saida]" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

echo "Solicitando QR Code para '$INSTANCE_NAME'..."
RESPONSE=$(evolution_api GET "/instance/connect/${INSTANCE_NAME}")

BASE64_QR=$(echo "$RESPONSE" | jq -r '.base64 // .qrcode.base64 // empty')

if [ -z "$BASE64_QR" ]; then
  echo "Não foi possível extrair o QR Code da resposta abaixo (a instância já pode estar conectada):" >&2
  echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
  exit 1
fi

OUT_FILE="$OUT_DIR/${INSTANCE_NAME}.png"

# O campo costuma vir como data URL "data:image/png;base64,...."
echo "$BASE64_QR" | sed 's/^data:image\/png;base64,//' | base64 -d > "$OUT_FILE"

echo "QR Code salvo em: $OUT_FILE"
echo "Abra a imagem e escaneie com o WhatsApp do colaborador (Aparelhos conectados > Conectar um aparelho)."
