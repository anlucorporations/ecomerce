#!/usr/bin/env bash
# ============================================================================
# simple-deploy.sh — Despliegue rápido con `forge create` (Anvil, chainId 31337)
#
#  Despliega:
#   1. EuroTokenOptimized (stablecoin/sc/src/EuroTokenOptimized.sol)
#   2. Ecommerce          (sc-ecommerce/src/Ecommerce.sol) — constructor con la
#      dirección real de EuroTokenOptimized (NO usa MockEuroToken)
#
# Uso:
#   export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
#   export RPC_URL=http://127.0.0.1:8545        # opcional (default)
#   ./simple-deploy.sh
#
# El nodo debe arrancarse con límite de código ampliado:
#   anvil --code-size-limit 100000
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
CODE_SIZE_LIMIT=100000

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

for tool in forge cast curl; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo -e "${RED}❌ Error: '$tool' no está instalado. Instala Foundry (foundryup).${NC}" >&2
    exit 1
  fi
done

if [ -z "${PRIVATE_KEY:-}" ]; then
  echo -e "${RED}❌ Error: Environment variable PRIVATE_KEY is not set.${NC}" >&2
  echo -e "${YELLOW}💡 export PRIVATE_KEY=0x...${NC}" >&2
  exit 1
fi

echo -e "${BLUE}Starting simple deployment...${NC}"
echo ""

# --- Anvil check ---
if ! curl -s -m 3 -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  "$RPC_URL" > /dev/null 2>&1; then
  echo -e "${RED}❌ Anvil no está corriendo en $RPC_URL. Arranca con: anvil --code-size-limit ${CODE_SIZE_LIMIT}${NC}" >&2
  exit 1
fi

DEPLOYER="$(cast wallet address --private-key "$PRIVATE_KEY")"
echo -e "  RPC:      ${RPC_URL}"
echo -e "  Deployer: ${DEPLOYER}"
echo ""

# --- 1. Deploy EuroTokenOptimized ---
echo -e "${BLUE}1. Deploying EuroTokenOptimized...${NC}"
cd "${SCRIPT_DIR}/stablecoin/sc"

EURO_OUTPUT="$(forge create src/EuroTokenOptimized.sol:EuroTokenOptimized \
  --rpc-url "${RPC_URL}" \
  --private-key "${PRIVATE_KEY}" \
  --constructor-args "${DEPLOYER}" "${DEPLOYER}" 2>&1)"

EURO_TOKEN_ADDRESS="$(echo "$EURO_OUTPUT" | grep "Deployed to:" | awk '{print $3}')"
if [ -z "$EURO_TOKEN_ADDRESS" ]; then
  echo -e "${RED}❌ No se pudo extraer la dirección de EuroTokenOptimized${NC}" >&2
  echo "$EURO_OUTPUT" >&2
  exit 1
fi
echo -e "${GREEN}✅ EuroTokenOptimized: ${EURO_TOKEN_ADDRESS}${NC}"
echo ""

# --- 2. Deploy Ecommerce ---
echo -e "${BLUE}2. Deploying Ecommerce...${NC}"
cd "${SCRIPT_DIR}/sc-ecommerce"

MAIN_OUTPUT="$(forge create src/Ecommerce.sol:Ecommerce \
  --rpc-url "${RPC_URL}" \
  --private-key "${PRIVATE_KEY}" \
  --constructor-args "${EURO_TOKEN_ADDRESS}" \
  --code-size-limit "${CODE_SIZE_LIMIT}" 2>&1)"

ECOMMERCE_MAIN="$(echo "$MAIN_OUTPUT" | grep "Deployed to:" | awk '{print $3}')"
if [ -z "$ECOMMERCE_MAIN" ]; then
  echo -e "${RED}❌ No se pudo extraer la dirección de Ecommerce${NC}" >&2
  echo "$MAIN_OUTPUT" >&2
  exit 1
fi
echo -e "${GREEN}✅ Ecommerce: ${ECOMMERCE_MAIN}${NC}"
echo ""

# --- 3. Verificación ---
echo -e "${BLUE}3. Verificando Ecommerce.euroTokenAddress()...${NC}"
ON_CHAIN_TOKEN="$(cast call "${ECOMMERCE_MAIN}" "euroTokenAddress()(address)" --rpc-url "${RPC_URL}" 2>/dev/null || true)"
if [ -n "$ON_CHAIN_TOKEN" ] && [ "$(echo "$ON_CHAIN_TOKEN" | tr '[:upper:]' '[:lower:]')" = "$(echo "$EURO_TOKEN_ADDRESS" | tr '[:upper:]' '[:lower:]')" ]; then
  echo -e "${GREEN}✅ Verificación correcta${NC}"
else
  echo -e "${YELLOW}⚠️  No se pudo verificar euroTokenAddress() on-chain (¿está el nodo activo?)${NC}"
fi
echo ""

# --- 4. Escribir .env de ejemplo ---
echo -e "${BLUE}4. Escribiendo .env.deployed...${NC}"
cat > "${SCRIPT_DIR}/.env.deployed" <<EOF
# Generado por simple-deploy.sh el $(date)
NEXT_PUBLIC_RPC_URL=${RPC_URL}
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS=${ECOMMERCE_MAIN}
NEXT_PUBLIC_EURO_TOKEN_ADDRESS=${EURO_TOKEN_ADDRESS}
DEPLOYER_ADDRESS=${DEPLOYER}
EOF
echo -e "${GREEN}✅ Escrito ${SCRIPT_DIR}/.env.deployed${NC}"
echo ""

echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "Addresses:"
echo -e "  EcommerceMain:     ${ECOMMERCE_MAIN}"
echo -e "  EuroToken:         ${EURO_TOKEN_ADDRESS}"
