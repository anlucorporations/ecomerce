#!/usr/bin/env bash
# ============================================================================
# restart-all.sh — Reinicia las 4 apps locales contra Anvil (chainId 31337)
#
#  (Antigua versión Besu/81234 con rutas de otra máquina y jq: eliminada)
#
#  Puertos:
#    web-admin               -> 3000
#    web-customer            -> 3001
#    stablecoin/pasarela-de-pago   -> 3002
#    stablecoin/compra-stablecoin  -> 3003
#
#  Requiere: anvil corriendo en http://127.0.0.1:8545
#            (arrancado con: anvil --code-size-limit 100000)
#            y los contratos desplegados (./deploy-all.sh o ./simple-deploy.sh)
# ============================================================================
set -euo pipefail

echo "🔄 Reiniciando apps locales (Anvil 31337)..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
LOG_DIR="${SCRIPT_DIR}/logs"

for tool in curl; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo -e "${RED}❌ Error: '$tool' no está instalado.${NC}" >&2
    exit 1
  fi
done

# Verificar Anvil local
echo -e "${YELLOW}📡 Verificando Anvil en $RPC_URL...${NC}"
if ! curl -s -m 3 -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  "$RPC_URL" > /dev/null 2>&1; then
  echo -e "${RED}❌ No hay nodo en $RPC_URL. Arranca Anvil:${NC}"
  echo -e "${RED}   anvil --code-size-limit 100000${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Anvil disponible${NC}"
echo ""

# --- Paso 1: Detener procesos en los puertos 3000-3003 ---
echo -e "${YELLOW}📦 Paso 1: Deteniendo apps en puertos 3000-3003...${NC}"
for port in 3000 3001 3002 3003; do
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti:"$port" | xargs -r kill -9 2>/dev/null || true
  elif command -v fuser >/dev/null 2>&1; then
    fuser -k "$port"/tcp 2>/dev/null || true
  else
    echo -e "${YELLOW}  ⚠️  Ni lsof ni fuser disponibles; no se pudo liberar el puerto $port${NC}"
  fi
  echo "  Puerto $port liberado"
done

# --- Paso 2: Verificar .env.deployed ---
echo -e "${YELLOW}📦 Paso 2: Verificando direcciones de contratos...${NC}"
if [ ! -f "${SCRIPT_DIR}/.env.deployed" ]; then
  echo -e "${YELLOW}⚠️  No existe ${SCRIPT_DIR}/.env.deployed. Ejecuta primero:${NC}"
  echo -e "${YELLOW}   ./deploy-all.sh   (o ./simple-deploy.sh)${NC}"
  echo -e "${YELLOW}   y copia .env.deployed a cada app como .env.local${NC}"
else
  echo -e "${GREEN}✓ .env.deployed encontrado (usa: cp .env.deployed <app>/.env.local)${NC}"
fi

mkdir -p "$LOG_DIR"

# --- Paso 3: Iniciar las 4 apps ---
echo -e "${YELLOW}📦 Paso 3: Iniciando apps...${NC}"

start_app() {
  local name="$1"
  local dir="$2"
  local port="$3"
  echo "Iniciando $name (puerto $port)..."
  (cd "$dir" && PORT="$port" nohup npx next dev --turbopack -p "$port" > "$LOG_DIR/$name.log" 2>&1 &)
  echo "  $name iniciado — log: $LOG_DIR/$name.log"
}

start_app "web-admin"             "${SCRIPT_DIR}/web-admin"             3000
start_app "web-customer"          "${SCRIPT_DIR}/web-customer"          3001
start_app "pasarela-de-pago"      "${SCRIPT_DIR}/stablecoin/pasarela-de-pago" 3002
start_app "compra-stablecoin"     "${SCRIPT_DIR}/stablecoin/compra-stablecoin" 3003

echo ""
echo -e "${GREEN}✅ Apps reiniciadas! Espera unos segundos a que estén listas.${NC}"
echo ""
echo "📋 Resumen:"
echo "  - Red: $RPC_URL (Anvil, chainId 31337)"
echo "  - Web Admin:        http://localhost:3000"
echo "  - Web Customer:     http://localhost:3001"
echo "  - Pasarela de Pago: http://localhost:3002"
echo "  - Compra Stablecoin: http://localhost:3003"
echo ""
echo -e "${YELLOW}💡 Tip: revisa los logs en ${LOG_DIR}/${NC}"
