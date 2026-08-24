#!/bin/sh
# Entrypoint del nodo Foundry Anvil para Cloud Run.
# - Lee $PORT de Cloud Run limpiándolo de saltos de línea (bug del entrypoint anterior)
# - Arranca anvil con --code-size-limit 100000 (el bytecode de Ecommerce supera EIP-170)
set -e
PORT="${PORT:-8545}"
PORT="$(printf '%s' "$PORT" | tr -d '\r\n[:space:]')"
echo "Starting Anvil node on port $PORT with preloaded state..."
exec anvil --host 0.0.0.0 --port "$PORT" --chain-id 31337 --code-size-limit 100000 --silent
