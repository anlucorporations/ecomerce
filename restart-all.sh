#!/bin/bash

set -e

echo "🔄 Reiniciando todo el sistema..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
RPC_URL="https://besu1.proyectos.codecrypto.academy"
KEYS_FILE="$HOME/.foundry/keys.json"

# Directorio base
BASE_DIR="/Users/joseviejo/2025/cc/gitlab/ecommerce"

# Verificar que jq está instalado
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ jq no está instalado${NC}"
    echo "Por favor instala jq: brew install jq"
    exit 1
fi

# Verificar que el archivo de keys existe
if [ ! -f "$KEYS_FILE" ]; then
    echo -e "${RED}❌ No se encuentra el archivo de keys: $KEYS_FILE${NC}"
    exit 1
fi

# Extraer la clave privada
echo -e "${YELLOW}📝 Extrayendo clave privada...${NC}"
PRIVATE_KEY=$(cat "$KEYS_FILE" | jq -r ".accounts[0].private_key")

if [ -z "$PRIVATE_KEY" ] || [ "$PRIVATE_KEY" == "null" ]; then
    echo -e "${RED}❌ No se pudo extraer la clave privada del archivo${NC}"
    exit 1
fi

# Extraer la dirección de la cuenta
ACCOUNT_ADDRESS=$(cat "$KEYS_FILE" | jq -r ".accounts[0].address")
echo -e "${GREEN}✓ Clave privada extraída${NC}"
echo -e "  Dirección: $ACCOUNT_ADDRESS"
echo ""

# Verificar conexión con la red
echo -e "${YELLOW}📡 Verificando conexión con Besu...${NC}"
if ! curl -s -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    "$RPC_URL" > /dev/null 2>&1; then
    echo -e "${RED}❌ No se puede conectar a $RPC_URL${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Conexión establecida${NC}"
echo ""

echo -e "${YELLOW}📦 Paso 1: Deteniendo aplicaciones...${NC}"

# Matar procesos en puertos específicos
for port in 6001 6002 6003 6004; do
    echo "Deteniendo aplicación en puerto $port..."
    lsof -ti:$port | xargs kill -9 2>/dev/null || echo "  No hay proceso en puerto $port"
done

echo -e "${YELLOW}📦 Paso 2: Limpiando builds anteriores...${NC}"
cd "$BASE_DIR/stablecoin/sc"
forge clean
cd "$BASE_DIR/sc-ecommerce"
forge clean

echo -e "${YELLOW}📦 Paso 3: Compilando contratos...${NC}"
cd "$BASE_DIR/stablecoin/sc"
forge build --silent
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error compilando contratos de Stablecoin${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Contratos de Stablecoin compilados${NC}"

cd "$BASE_DIR/sc-ecommerce"
forge build --silent
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error compilando contratos de Ecommerce${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Contratos de Ecommerce compilados${NC}"
echo ""

echo -e "${YELLOW}📦 Paso 4: Desplegando Stablecoin...${NC}"
cd "$BASE_DIR/stablecoin/sc"
DEPLOY_OUTPUT=$(forge script script/DeployEuroToken.s.sol:DeployEuroToken \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --private-key "$PRIVATE_KEY" \
  -vv 2>&1)

# Obtener la dirección del contrato desplegado buscando "EuroToken deployed at:"
EURO_TOKEN_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "EuroToken deployed at:" | grep -oE '0x[a-fA-F0-9]{40}')
if [ -z "$EURO_TOKEN_ADDRESS" ]; then
    echo -e "${RED}❌ No se pudo extraer la dirección de EuroToken${NC}"
    echo "Output completo:"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi
echo -e "${GREEN}✓ EuroToken desplegado${NC}"
echo "  Dirección: $EURO_TOKEN_ADDRESS"

echo -e "${YELLOW}📦 Paso 5: Desplegando Ecommerce...${NC}"
cd "$BASE_DIR/sc-ecommerce"
DEPLOY_OUTPUT=$(EURO_TOKEN_ADDRESS=$EURO_TOKEN_ADDRESS forge script script/DeployEcommerce.s.sol:DeployEcommerceScript \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --private-key "$PRIVATE_KEY" \
  -vv 2>&1)

# Obtener la dirección del contrato Ecommerce buscando "Ecommerce deployed at:"
ECOMMERCE_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "Ecommerce deployed at:" | grep -oE '0x[a-fA-F0-9]{40}')
if [ -z "$ECOMMERCE_ADDRESS" ]; then
    echo -e "${RED}❌ No se pudo extraer la dirección de Ecommerce${NC}"
    echo "Output completo:"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi
echo -e "${GREEN}✓ Ecommerce desplegado${NC}"
echo "  Dirección: $ECOMMERCE_ADDRESS"

echo -e "${YELLOW}📦 Paso 6: Actualizando variables de entorno...${NC}"

# Actualizar .env.local en compra-stableboin
cat > "$BASE_DIR/stablecoin/compra-stableboin/.env.local" <<EOF
NEXT_PUBLIC_EUROTOKEN_CONTRACT_ADDRESS=$EURO_TOKEN_ADDRESS
NEXT_PUBLIC_RPC_URL=$RPC_URL
OWNER_PRIVATE_KEY=$PRIVATE_KEY
EOF
echo "  Actualizado compra-stableboin/.env.local"

# Actualizar .env.local en pasarela-de-pago
cat > "$BASE_DIR/stablecoin/pasarela-de-pago/.env.local" <<EOF
NEXT_PUBLIC_EUROTOKEN_CONTRACT_ADDRESS=$EURO_TOKEN_ADDRESS
NEXT_PUBLIC_ECOMMERCE_CONTRACT_ADDRESS=$ECOMMERCE_ADDRESS
NEXT_PUBLIC_RPC_URL=$RPC_URL
EOF
echo "  Actualizado pasarela-de-pago/.env.local"

# Actualizar .env.local en web-admin
cat > "$BASE_DIR/web-admin/.env.local" <<EOF
NEXT_PUBLIC_ECOMMERCE_CONTRACT_ADDRESS=$ECOMMERCE_ADDRESS
NEXT_PUBLIC_EUROTOKEN_CONTRACT_ADDRESS=$EURO_TOKEN_ADDRESS
NEXT_PUBLIC_RPC_URL=$RPC_URL
NEXT_PUBLIC_CHAIN_ID=81234
EOF
echo "  Actualizado web-admin/.env.local"

# Actualizar .env.local en web-customer
cat > "$BASE_DIR/web-customer/.env.local" <<EOF
NEXT_PUBLIC_ECOMMERCE_CONTRACT_ADDRESS=$ECOMMERCE_ADDRESS
NEXT_PUBLIC_EUROTOKEN_CONTRACT_ADDRESS=$EURO_TOKEN_ADDRESS
NEXT_PUBLIC_RPC_URL=$RPC_URL
NEXT_PUBLIC_CHAIN_ID=81234
EOF
echo "  Actualizado web-customer/.env.local"

echo -e "${YELLOW}📦 Paso 7: Iniciando aplicaciones...${NC}"

# Iniciar compra-stableboin en puerto 6001
echo "Iniciando compra-stableboin (puerto 6001)..."
cd "$BASE_DIR/stablecoin/compra-stableboin"
PORT=6001 npm run dev > /dev/null 2>&1 &
echo "  compra-stableboin iniciado"

# Iniciar pasarela-de-pago en puerto 6002
echo "Iniciando pasarela-de-pago (puerto 6002)..."
cd "$BASE_DIR/stablecoin/pasarela-de-pago"
PORT=6002 npm run dev > /dev/null 2>&1 &
echo "  pasarela-de-pago iniciado"

# Iniciar web-admin en puerto 6003
echo "Iniciando web-admin (puerto 6003)..."
cd "$BASE_DIR/web-admin"
PORT=6003 npm run dev > /dev/null 2>&1 &
echo "  web-admin iniciado"

# Iniciar web-customer en puerto 6004
echo "Iniciando web-customer (puerto 6004)..."
cd "$BASE_DIR/web-customer"
PORT=6004 npm run dev > /dev/null 2>&1 &
echo "  web-customer iniciado"

sleep 5

echo ""
echo -e "${GREEN}✅ Sistema reiniciado exitosamente!${NC}"
echo ""
echo "📋 Resumen:"
echo "  - Red: $RPC_URL"
echo "  - Cuenta: $ACCOUNT_ADDRESS"
echo "  - EuroToken: $EURO_TOKEN_ADDRESS"
echo "  - Ecommerce: $ECOMMERCE_ADDRESS"
echo ""
echo "  - Compra Stablecoin: http://localhost:6001"
echo "  - Pasarela de Pago: http://localhost:6002"
echo "  - Web Admin: http://localhost:6003"
echo "  - Web Customer: http://localhost:6004"
echo ""
echo -e "${YELLOW}💡 Tip: Espera unos segundos para que las aplicaciones estén completamente listas${NC}"
