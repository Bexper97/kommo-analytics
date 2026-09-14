#!/usr/bin/env bash
# Funções e variáveis compartilhadas pelos scripts desta pasta.
# Não execute este arquivo diretamente — ele é carregado pelos outros scripts.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$INFRA_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "Arquivo $ENV_FILE não encontrado. Copie .env.example para .env e preencha antes de continuar." >&2
  exit 1
fi

: "${EVOLUTION_SERVER_URL:?Defina EVOLUTION_SERVER_URL no .env}"
: "${EVOLUTION_API_KEY:?Defina EVOLUTION_API_KEY no .env}"

for bin in curl jq; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "Este script depende de '$bin', que não foi encontrado no PATH." >&2
    exit 1
  fi
done

evolution_api() {
  # Uso: evolution_api METHOD PATH [BODY_JSON]
  local method="$1"
  local path="$2"
  local body="${3:-}"

  if [ -n "$body" ]; then
    curl -sS -X "$method" \
      "${EVOLUTION_SERVER_URL%/}${path}" \
      -H "apikey: ${EVOLUTION_API_KEY}" \
      -H "Content-Type: application/json" \
      -d "$body"
  else
    curl -sS -X "$method" \
      "${EVOLUTION_SERVER_URL%/}${path}" \
      -H "apikey: ${EVOLUTION_API_KEY}"
  fi
}
