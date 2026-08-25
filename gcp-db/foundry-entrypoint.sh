#!/bin/sh
# Entrypoint del nodo Foundry Anvil para Cloud Run con ESTADO PERSISTENTE (GCS FUSE).
# - Limpia $PORT (Cloud Run lo pasa con saltos de línea)
# - Carga el estado previo desde el volumen GCS (si existe) y lo vuelca periódicamente
# - --code-size-limit 100000 (el bytecode de Ecommerce supera EIP-170)
set -e
PORT="$(printf '%s' "${PORT:-8545}" | tr -d '\r\n[:space:]')"
STATE="${STATE_PATH:-/data/anvil-state.json}"

ARGS="--host 0.0.0.0 --port $PORT --chain-id 31337 --code-size-limit 100000 --silent"
if [ -f "$STATE" ]; then
  echo "Loading Anvil state from $STATE ..."
  ARGS="$ARGS --load-state $STATE"
fi
ARGS="$ARGS --dump-state $STATE --state-interval 30"

echo "Starting Anvil node on port $PORT (state: $STATE)..."
exec anvil $ARGS
