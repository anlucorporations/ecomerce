#!/bin/sh
PORT_TO_USE="${PORT:-8545}"
echo "Starting Anvil node on port $PORT_TO_USE with preloaded state..."
exec anvil --host 0.0.0.0 --port "$PORT_TO_USE" --chain-id 31337 --code-size-limit 100000 --gas-limit 100000000 --block-base-fee-per-gas 0 --load-state /app/anvil_state.json
