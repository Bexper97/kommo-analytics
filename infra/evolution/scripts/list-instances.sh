#!/usr/bin/env bash
# Lista todas as instâncias e seu status de conexão (open/close/connecting).
#
# Uso:
#   ./list-instances.sh

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

RESPONSE=$(evolution_api GET "/instance/fetchInstances")

if ! echo "$RESPONSE" | jq -r '.[] | "\(.name // .instanceName)\t\(.connectionStatus // .status // "desconhecido")"' 2>/dev/null | column -t -s $'\t' -N "INSTANCIA,STATUS"; then
  echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
fi
