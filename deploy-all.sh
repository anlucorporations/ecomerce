#!/usr/bin/env bash
# ============================================================================
# deploy-all.sh — Despliegue completo sobre Anvil (chainId 31337)
#
#  1. EuroTokenOptimized  (stablecoin/sc, script DeployEuroTokenOptimized.s.sol)
#  2. Ecommerce           (sc-ecommerce,  script DeployEcommerce.s.sol)
#     — recibe EURO_TOKEN_ADDRESS explícito (no despliega MockEuroToken)
#  3. Escribe .env.deployed de ejemplo con las direcciones reales
#
# Uso:
#   export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
#   export RPC_URL=http://127.0.0.1:8545        # opcional (default)
#   ./deploy-all.sh
#
# IMPORTANTE: el runtime de Ecommerce supera el límite EIP-170 (24576 bytes),
# por lo que el nodo DEBE arrancarse con límite ampliado:
#   anvil --code-size-limit 100000
# ============================================================================
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Requisitos --------------------------------------------------------------
for tool in forge cast curl; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo -e "${RED}❌ Error: '$tool' no está instalado. Instala Foundry (foundryup).${NC}" >&2
    exit 1
  fi
done

if [ -z "${PRIVATE_KEY:-}" ]; then
  echo -e "${RED}❌ Error: Environment variable PRIVATE_KEY is not set.${NC}" >&2
  echo -e "${YELLOW}💡 Set your deployer private key: export PRIVATE_KEY=0x...${NC}" >&2
  exit 1
fi

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  E-Commerce Blockchain - Full Deployment Script         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# --- Anvil check ------------------------------------------------------------
if ! curl -s -m 3 -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  "$RPC_URL" > /dev/null 2>&1; then
  echo -e "${RED}❌ Error: no hay nodo respondiendo en $RPC_URL${NC}" >&2
  echo -e "${YELLOW}💡 Arranca Anvil con límite de código ampliado:${NC}"
  echo -e "${YELLOW}   anvil --code-size-limit 100000${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Nodo disponible en $RPC_URL${NC}"
echo -e "${YELLOW}⚠️  El contrato Ecommerce supera 24576 bytes (EIP-170). Si el deploy"
echo -e "   falla con 'max code size exceeded', reinicia Anvil con:"
echo -e "   anvil --code-size-limit 100000${NC}"
echo ""

DEPLOYER_ADDRESS="$(cast wallet address --private-key "$PRIVATE_KEY")"
echo -e "${BLUE}📋 Configuration:${NC}"
echo -e "  RPC URL:    ${RPC_URL}"
echo -e "  Deployer:   ${DEPLOYER_ADDRESS}"
echo ""

# --- Helper: extraer dirección del output de forge --------------------------
# Busca "Deployed to:", "Contract Address:" o el console.log "X deployed at:"
extract_address() {
  local output="$1"
  local name="$2"
  local addr
  addr="$(echo "$output" | grep -oE "${name} deployed at: 0x[a-fA-F0-9]{40}" | grep -oE "0x[a-fA-F0-9]{40}" | head -1)"
  if [ -z "$addr" ]; then
    addr="$(echo "$output" | grep -oE "Deployed to: 0x[a-fA-F0-9]{40}" | grep -oE "0x[a-fA-F0-9]{40}" | head -1)"
  fi
  if [ -z "$addr" ]; then
    addr="$(echo "$output" | grep -oE "Contract Address: 0x[a-fA-F0-9]{40}" | grep -oE "0x[a-fA-F0-9]{40}" | head -1)"
  fi
  echo "$addr"
}

# ============================================================================
# 1. Deploy EuroTokenOptimized
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📦 Step 1: Deploying EuroTokenOptimized (EURT)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd "${SCRIPT_DIR}/stablecoin/sc"

EURO_DEPLOY_OUTPUT="$(forge script script/DeployEuroTokenOptimized.s.sol:DeployEuroTokenOptimized \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast 2>&1)"

EURO_TOKEN_ADDRESS="$(extract_address "$EURO_DEPLOY_OUTPUT" "EuroTokenOptimized")"
if [ -z "$EURO_TOKEN_ADDRESS" ]; then
  echo -e "${RED}❌ No se pudo extraer la dirección de EuroTokenOptimized del output de forge${NC}" >&2
  echo "$EURO_DEPLOY_OUTPUT" >&2
  exit 1
fi

echo -e "${GREEN}✅ EuroTokenOptimized desplegado en ${EURO_TOKEN_ADDRESS}${NC}"
echo ""

# ============================================================================
# 2. Deploy Ecommerce (con EURO_TOKEN_ADDRESS explícito)
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📦 Step 2: Deploying Ecommerce${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd "${SCRIPT_DIR}/sc-ecommerce"

# El script DeployEcommerce.s.sol lee PRIVATE_KEY y EURO_TOKEN_ADDRESS del entorno
export PRIVATE_KEY
export EURO_TOKEN_ADDRESS

ECOMMERCE_DEPLOY_OUTPUT="$(forge script script/DeployEcommerce.s.sol:DeployEcommerceScript \
  --rpc-url "$RPC_URL" \
  --broadcast 2>&1)"

ECOMMERCE_ADDRESS="$(extract_address "$ECOMMERCE_DEPLOY_OUTPUT" "Ecommerce")"
if [ -z "$ECOMMERCE_ADDRESS" ]; then
  echo -e "${RED}❌ No se pudo extraer la dirección de Ecommerce del output de forge${NC}" >&2
  echo "$ECOMMERCE_DEPLOY_OUTPUT" >&2
  exit 1
fi

echo -e "${GREEN}✅ Ecommerce desplegado en ${ECOMMERCE_ADDRESS}${NC}"
echo ""

# ============================================================================
# 3. Verificación rápida
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔎 Step 3: Verificación rápida${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ON_CHAIN_TOKEN="$(cast call "$ECOMMERCE_ADDRESS" "euroTokenAddress()(address)" --rpc-url "$RPC_URL" 2>/dev/null || true)"
if [ -n "$ON_CHAIN_TOKEN" ] && [ "$(echo "$ON_CHAIN_TOKEN" | tr '[:upper:]' '[:lower:]')" = "$(echo "$EURO_TOKEN_ADDRESS" | tr '[:upper:]' '[:lower:]')" ]; then
  echo -e "${GREEN}✅ Ecommerce.euroTokenAddress() coincide con EuroTokenOptimized${NC}"
else
  echo -e "${YELLOW}⚠️  No se pudo verificar euroTokenAddress() on-chain (¿está el nodo activo?)${NC}"
fi
echo ""

# ============================================================================
# 4. Escribir .env de ejemplo
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📝 Step 4: Escribiendo .env.deployed${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cat > "${SCRIPT_DIR}/.env.deployed" <<EOF
# Generado por deploy-all.sh el $(date)
# Copia estas variables a cada app (web-admin, web-customer,
# stablecoin/pasarela-de-pago, stablecoin/compra-stablecoin) como .env.local
NEXT_PUBLIC_RPC_URL=${RPC_URL}
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS=${ECOMMERCE_ADDRESS}
NEXT_PUBLIC_EURO_TOKEN_ADDRESS=${EURO_TOKEN_ADDRESS}

# Cuenta deployer (Anvil account #0) — owner de los contratos
DEPLOYER_ADDRESS=${DEPLOYER_ADDRESS}
EOF

echo -e "${GREEN}✅ Escrito ${SCRIPT_DIR}/.env.deployed${NC}"
echo ""

# ============================================================================
# 5. Summary
# ============================================================================
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🎉 Deployment Completed Successfully!                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}EuroTokenOptimized:${NC} ${EURO_TOKEN_ADDRESS}"
echo -e "  ${GREEN}Ecommerce:${NC}          ${ECOMMERCE_ADDRESS}"
echo ""
echo -e "${YELLOW}📋 Siguientes pasos:${NC}"
echo -e "  1. Copia .env.deployed a cada app:"
echo -e "     ${BLUE}cp .env.deployed web-admin/.env.local${NC}"
echo -e "     ${BLUE}cp .env.deployed web-customer/.env.local${NC}"
echo -e "     ${BLUE}cp .env.deployed stablecoin/pasarela-de-pago/.env.local${NC}"
echo -e "     ${BLUE}cp .env.deployed stablecoin/compra-stablecoin/.env.local${NC}"
echo -e "  2. Arranca las apps (o usa ./restart-all.sh)"
echo ""
echo -e "${GREEN}✨ Happy coding!${NC}"
