#!/usr/bin/env bash
# ============================================================================
# test-deployment.sh — Verifica el despliegue local (Anvil, chainId 31337)
#
#  Usa las variables REALES:
#    NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS  (contrato Ecommerce)
#    NEXT_PUBLIC_EURO_TOKEN_ADDRESS      (contrato EuroTokenOptimized)
#
#  Fuentes de las direcciones (en orden): variables de entorno > .env.deployed
#  > web-admin/.env.local. Usa `cast call` y, si cast no existe, `curl eth_call`.
#
#  Uso:
#    ./test-deployment.sh
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# --- Resolver variable: entorno > .env.deployed > web-admin/.env.local -------
get_var() {
  local name="$1"
  local val=""
  if [ -n "${!name:-}" ]; then
    echo "${!name}"
    return
  fi
  for src in "${SCRIPT_DIR}/.env.deployed" "${SCRIPT_DIR}/web-admin/.env.local"; do
    if [ -f "$src" ]; then
      val="$(grep -E "^${name}=" "$src" | tail -1 | cut -d= -f2- | tr -d '\r' | xargs)"
      if [ -n "$val" ]; then
        echo "$val"
        return
      fi
    fi
  done
  echo ""
}

# --- Selectores precomputados (4 bytes) para el fallback con curl ------------
SEL_EURO_TOKEN_ADDRESS="0x05fd066a"   # euroTokenAddress()
SEL_GET_ENTITY_TYPE="0x402bfbec"      # getEntityType(address)
SEL_NAME="0x06fdde03"                 # name()

# --- eth_call vía curl (fallback sin cast) -----------------------------------
eth_call() {
  local to="$1"
  local data="$2"
  curl -s -m 5 -X POST -H "Content-Type: application/json" \
    --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_call\",\"params\":[{\"to\":\"${to}\",\"data\":\"${data}\"},\"latest\"],\"id\":1}" \
    "$RPC_URL"
}

# --- Llamada de solo lectura: cast si existe, si no curl ----------------------
call_contract() {
  local to="$1"
  local sig="$2"
  local data="$3"
  if command -v cast >/dev/null 2>&1; then
    cast call "$to" "$sig" --rpc-url "$RPC_URL" 2>/dev/null || echo ""
  else
    eth_call "$to" "$data"
  fi
}

# Normaliza una dirección (quita "0x" y ceros a la izquierda del word de 32 bytes)
normalize_addr() {
  local v="${1#0x}"
  v="${v#"${v%%[!0]*}"}"
  echo "0x${v}"
}

echo -e "${BLUE}🧪 Testing Deployment...${NC}"
echo ""

# --- Nodo ---------------------------------------------------------------
if ! curl -s -m 3 -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  "$RPC_URL" > /dev/null 2>&1; then
  echo -e "${RED}❌ No hay nodo en $RPC_URL. Arranca Anvil: anvil --code-size-limit 100000${NC}" >&2
  exit 1
fi
echo -e "${GREEN}✅ Nodo disponible en $RPC_URL${NC}"
echo ""

# --- Resolver direcciones -------------------------------------------------
EURO_TOKEN="$(get_var NEXT_PUBLIC_EURO_TOKEN_ADDRESS)"
ECOMMERCE_MAIN="$(get_var NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS)"
DEPLOYER="$(get_var DEPLOYER_ADDRESS)"

if [ -z "$EURO_TOKEN" ] || [ -z "$ECOMMERCE_MAIN" ]; then
  echo -e "${RED}❌ No se encontraron NEXT_PUBLIC_EURO_TOKEN_ADDRESS / NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS.${NC}" >&2
  echo -e "${YELLOW}💡 Ejecuta primero ./deploy-all.sh (genera .env.deployed).${NC}" >&2
  exit 1
fi
if [ -z "$DEPLOYER" ]; then
  DEPLOYER="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" # Anvil account #0 (deployer)
fi

echo -e "📋 Direcciones bajo prueba:"
echo -e "  EuroToken:   ${EURO_TOKEN}"
echo -e "  Ecommerce:   ${ECOMMERCE_MAIN}"
echo -e "  Deployer:    ${DEPLOYER}"
echo ""

FAIL=0

# --- Test 1: EuroToken.name() ---
echo -e "Test 1: EuroToken name()..."
NAME_OUT="$(call_contract "$EURO_TOKEN" "name()(string)" "$SEL_NAME")"
if echo "$NAME_OUT" | grep -qi "EuroToken"; then
  echo -e "  ${GREEN}✅ EuroToken desplegado correctamente (${NAME_OUT})${NC}"
else
  echo -e "  ${RED}❌ EuroToken check falló. Respuesta: ${NAME_OUT}${NC}"
  FAIL=1
fi

# --- Test 2: Ecommerce.euroTokenAddress() == EuroToken ---
echo -e "Test 2: Ecommerce.euroTokenAddress()..."
TOKEN_OUT="$(call_contract "$ECOMMERCE_MAIN" "euroTokenAddress()(address)" "$SEL_EURO_TOKEN_ADDRESS")"
TOKEN_NORM="$(normalize_addr "$TOKEN_OUT" | tr '[:upper:]' '[:lower:]')"
if [ -n "$TOKEN_NORM" ] && [ "$TOKEN_NORM" = "$(echo "$EURO_TOKEN" | tr '[:upper:]' '[:lower:]')" ]; then
  echo -e "  ${GREEN}✅ euroTokenAddress() coincide (${TOKEN_OUT})${NC}"
else
  echo -e "  ${RED}❌ euroTokenAddress() no coincide. Esperado ${EURO_TOKEN}, obtenido: ${TOKEN_OUT}${NC}"
  FAIL=1
fi

# --- Test 3: getEntityType(deployer) != 0 (owner registrado) ---
echo -e "Test 3: getEntityType(deployer)..."
# Calldata: selector(4 bytes) + address izquierda-padding a 32 bytes
DATA="0x${SEL_GET_ENTITY_TYPE#0x}$(printf '%064s' "${DEPLOYER#0x}" | tr ' ' '0')"
TYPE_OUT="$(call_contract "$ECOMMERCE_MAIN" "getEntityType(address)(uint8)" "$DATA")"
TYPE_NORM="$(normalize_addr "$TYPE_OUT")"
if [ -n "$TYPE_NORM" ] && [ "$TYPE_NORM" != "0x0" ] && [ "$TYPE_OUT" != "0" ]; then
  echo -e "  ${GREEN}✅ getEntityType(deployer) = ${TYPE_OUT} (registrado)${NC}"
else
  echo -e "  ${RED}❌ getEntityType(deployer) no es 0. Obtenido: ${TYPE_OUT}${NC}"
  FAIL=1
fi

# --- Test 4: Archivos .env ---
echo -e "Test 4: Archivos de entorno..."
if [ -f "${SCRIPT_DIR}/.env.deployed" ] || { [ -f "${SCRIPT_DIR}/web-admin/.env.local" ] && [ -f "${SCRIPT_DIR}/web-customer/.env.local" ]; }; then
  echo -e "  ${GREEN}✅ Archivos .env presentes${NC}"
else
  echo -e "  ${YELLOW}⚠️  Faltan .env.deployed o web-admin/web-customer .env.local (usar: cp .env.deployed <app>/.env.local)${NC}"
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}🎉 Deployment verification complete! Todos los checks pasaron.${NC}"
else
  echo -e "${RED}❌ Hubo fallos en la verificación. Revisa el despliegue (./deploy-all.sh).${NC}"
  exit 1
fi
