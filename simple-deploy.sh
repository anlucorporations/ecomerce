#!/bin/bash

# Simple deployment script using forge create instead of forge script
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RPC_URL="http://localhost:8545"
PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
DEPLOYER="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Starting simple deployment...${NC}"
echo ""

# Check Anvil
if ! nc -z localhost 8545 2>/dev/null; then
    echo -e "${RED}❌ Anvil not running. Start with: anvil${NC}"
    exit 1
fi

cd "${SCRIPT_DIR}/sc-ecommerce"

# 1. Deploy EuroToken (using MockEuroToken for testing)
echo -e "${BLUE}1. Deploying EuroToken...${NC}"
EURO_OUTPUT=$(forge create --rpc-url ${RPC_URL} \
    --private-key ${PRIVATE_KEY} \
    test/mocks/MockEuroToken.sol:MockEuroToken 2>&1)

EURO_TOKEN_ADDRESS=$(echo "$EURO_OUTPUT" | grep "Deployed to:" | awk '{print $3}')
echo -e "${GREEN}✅ EuroToken: ${EURO_TOKEN_ADDRESS}${NC}"

# 2. Deploy EcommerceMain
echo -e "${BLUE}2. Deploying EcommerceMain...${NC}"
MAIN_OUTPUT=$(forge create --rpc-url ${RPC_URL} \
    --private-key ${PRIVATE_KEY} \
    src/EcommerceMain.sol:EcommerceMain \
    --constructor-args ${EURO_TOKEN_ADDRESS} 2>&1)

ECOMMERCE_MAIN=$(echo "$MAIN_OUTPUT" | grep "Deployed to:" | awk '{print $3}')
echo -e "${GREEN}✅ EcommerceMain: ${ECOMMERCE_MAIN}${NC}"

# 3. Get sub-contract addresses
echo -e "${BLUE}3. Getting sub-contract addresses...${NC}"
COMPANY_REGISTRY=$(cast call ${ECOMMERCE_MAIN} "companyRegistry()(address)" --rpc-url ${RPC_URL})
PRODUCT_CATALOG=$(cast call ${ECOMMERCE_MAIN} "productCatalog()(address)" --rpc-url ${RPC_URL})
CUSTOMER_REGISTRY=$(cast call ${ECOMMERCE_MAIN} "customerRegistry()(address)" --rpc-url ${RPC_URL})
SHOPPING_CART=$(cast call ${ECOMMERCE_MAIN} "shoppingCart()(address)" --rpc-url ${RPC_URL})
INVOICE_SYSTEM=$(cast call ${ECOMMERCE_MAIN} "invoiceSystem()(address)" --rpc-url ${RPC_URL})
PAYMENT_GATEWAY=$(cast call ${ECOMMERCE_MAIN} "paymentGateway()(address)" --rpc-url ${RPC_URL})

echo -e "${GREEN}✅ CompanyRegistry: ${COMPANY_REGISTRY}${NC}"
echo -e "${GREEN}✅ ProductCatalog: ${PRODUCT_CATALOG}${NC}"
echo -e "${GREEN}✅ CustomerRegistry: ${CUSTOMER_REGISTRY}${NC}"
echo -e "${GREEN}✅ ShoppingCart: ${SHOPPING_CART}${NC}"
echo -e "${GREEN}✅ InvoiceSystem: ${INVOICE_SYSTEM}${NC}"
echo -e "${GREEN}✅ PaymentGateway: ${PAYMENT_GATEWAY}${NC}"

# 4. Transfer ownership
echo -e "${BLUE}4. Transferring ownership to deployer...${NC}"
cast send ${ECOMMERCE_MAIN} \
  "transferAllOwnership(address)" \
  ${DEPLOYER} \
  --rpc-url ${RPC_URL} \
  --private-key ${PRIVATE_KEY} \
  > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Ownership transferred${NC}"
else
    echo -e "${RED}❌ Ownership transfer failed${NC}"
fi

# 5. Update .env files
echo -e "${BLUE}5. Updating .env files...${NC}"

cat > "${SCRIPT_DIR}/web-admin/.env.local" << EOF
# Network Configuration
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://localhost:8545

# Contract Addresses
NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS=${ECOMMERCE_MAIN}
NEXT_PUBLIC_COMPANY_REGISTRY_ADDRESS=${COMPANY_REGISTRY}
NEXT_PUBLIC_PRODUCT_CATALOG_ADDRESS=${PRODUCT_CATALOG}
NEXT_PUBLIC_CUSTOMER_REGISTRY_ADDRESS=${CUSTOMER_REGISTRY}
NEXT_PUBLIC_SHOPPING_CART_ADDRESS=${SHOPPING_CART}
NEXT_PUBLIC_INVOICE_SYSTEM_ADDRESS=${INVOICE_SYSTEM}
NEXT_PUBLIC_PAYMENT_GATEWAY_ADDRESS=${PAYMENT_GATEWAY}
NEXT_PUBLIC_EURO_TOKEN_ADDRESS=${EURO_TOKEN_ADDRESS}

# Optional: IPFS/Pinata for product images
NEXT_PUBLIC_PINATA_JWT=
EOF

cp "${SCRIPT_DIR}/web-admin/.env.local" "${SCRIPT_DIR}/web-customer/.env.local"

echo -e "${GREEN}✅ Updated .env.local files${NC}"
echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo -e "Addresses:"
echo -e "  EcommerceMain:     ${ECOMMERCE_MAIN}"
echo -e "  CompanyRegistry:   ${COMPANY_REGISTRY}"
echo -e "  EuroToken:         ${EURO_TOKEN_ADDRESS}"
