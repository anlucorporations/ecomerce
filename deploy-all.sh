#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

export PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  E-Commerce Blockchain - Full Deployment Script         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Anvil is running
if ! curl -s http://localhost:8545 > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Anvil is not running on localhost:8545${NC}"
    echo -e "${YELLOW}💡 Start Anvil in another terminal: anvil${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Anvil is running${NC}"
echo ""

# Default private key (Anvil account #0)
# PRIVATE_KEY="${PRIVATE_KEY:-$0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
RPC_URL="${RPC_URL:-http://localhost:8545}"

echo -e "${BLUE}📋 Configuration:${NC}"
echo -e "  RPC URL: ${RPC_URL}"
echo -e "  Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
echo ""

# ============================================================================
# 1. Deploy EuroToken
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📦 Step 1: Deploying EuroToken (EURT)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "${SCRIPT_DIR}/stablecoin/sc"

# Deploy EuroToken
DEPLOY_OUTPUT=$(forge script script/DeployEuroToken.s.sol:DeployEuroToken \
    --rpc-url ${RPC_URL} \
    --private-key ${PRIVATE_KEY} \
    --broadcast \
    2>&1)

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to deploy EuroToken${NC}"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

# Extract EuroToken address
EURO_TOKEN_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -o "EuroToken deployed at: 0x[a-fA-F0-9]\{40\}" | grep -o "0x[a-fA-F0-9]\{40\}" | head -1)

if [ -z "$EURO_TOKEN_ADDRESS" ]; then
    # Try alternative extraction
    EURO_TOKEN_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -o "Contract Address: 0x[a-fA-F0-9]\{40\}" | grep -o "0x[a-fA-F0-9]\{40\}" | head -1)
fi

if [ -z "$EURO_TOKEN_ADDRESS" ]; then
    echo -e "${RED}❌ Failed to extract EuroToken address${NC}"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo -e "${GREEN}✅ EuroToken deployed successfully${NC}"
echo -e "   Address: ${GREEN}${EURO_TOKEN_ADDRESS}${NC}"
echo ""

# ============================================================================
# 2. Deploy E-Commerce Contracts
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📦 Step 2: Deploying E-Commerce Contracts${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "${SCRIPT_DIR}/sc-ecommerce"

# Deploy E-Commerce contracts with EuroToken address
export EURO_TOKEN_ADDRESS
ECOMMERCE_OUTPUT=$(forge script script/Deploy.s.sol:DeployScript \
    --rpc-url ${RPC_URL} \
    --broadcast \
    2>&1)

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to deploy E-Commerce contracts${NC}"
    echo "$ECOMMERCE_OUTPUT"
    exit 1
fi

# Extract contract addresses
ECOMMERCE_MAIN=$(echo "$ECOMMERCE_OUTPUT" | grep "EcommerceMain deployed at:" | grep -o "0x[a-fA-F0-9]\{40\}")
COMPANY_REGISTRY=$(echo "$ECOMMERCE_OUTPUT" | grep "CompanyRegistry:" | grep -o "0x[a-fA-F0-9]\{40\}")
PRODUCT_CATALOG=$(echo "$ECOMMERCE_OUTPUT" | grep "ProductCatalog:" | grep -o "0x[a-fA-F0-9]\{40\}")
CUSTOMER_REGISTRY=$(echo "$ECOMMERCE_OUTPUT" | grep "CustomerRegistry:" | grep -o "0x[a-fA-F0-9]\{40\}")
SHOPPING_CART=$(echo "$ECOMMERCE_OUTPUT" | grep "ShoppingCart:" | grep -o "0x[a-fA-F0-9]\{40\}")
INVOICE_SYSTEM=$(echo "$ECOMMERCE_OUTPUT" | grep "InvoiceSystem:" | grep -o "0x[a-fA-F0-9]\{40\}")
PAYMENT_GATEWAY=$(echo "$ECOMMERCE_OUTPUT" | grep "PaymentGateway:" | grep -o "0x[a-fA-F0-9]\{40\}")

echo -e "${GREEN}✅ E-Commerce contracts deployed successfully${NC}"
echo ""
echo -e "${YELLOW}📍 Contract Addresses:${NC}"
echo -e "  EcommerceMain:     ${GREEN}${ECOMMERCE_MAIN}${NC}"
echo -e "  CompanyRegistry:   ${GREEN}${COMPANY_REGISTRY}${NC}"
echo -e "  ProductCatalog:    ${GREEN}${PRODUCT_CATALOG}${NC}"
echo -e "  CustomerRegistry:  ${GREEN}${CUSTOMER_REGISTRY}${NC}"
echo -e "  ShoppingCart:      ${GREEN}${SHOPPING_CART}${NC}"
echo -e "  InvoiceSystem:     ${GREEN}${INVOICE_SYSTEM}${NC}"
echo -e "  PaymentGateway:    ${GREEN}${PAYMENT_GATEWAY}${NC}"
echo -e "  EuroToken:         ${GREEN}${EURO_TOKEN_ADDRESS}${NC}"
echo ""

# ============================================================================
# 3. Transfer Ownership
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔑 Step 3: Transferring Ownership${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Transfer ownership of CompanyRegistry from EcommerceMain to deployer
echo -e "Transferring CompanyRegistry ownership to ${DEPLOYER}..."
cast send ${ECOMMERCE_MAIN} \
  "transferAllOwnership(address)" \
  ${DEPLOYER} \
  --rpc-url ${RPC_URL} \
  --private-key ${PRIVATE_KEY} \
  > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to transfer ownership${NC}"
    echo -e "${YELLOW}⚠️  You'll need to call EcommerceMain.transferAllOwnership() manually${NC}"
else
    echo -e "${GREEN}✅ Ownership transferred successfully${NC}"
fi
echo ""

# ============================================================================
# 4. Update .env files
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📝 Step 4: Updating .env files${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Function to create/update .env file
update_env_file() {
    local ENV_FILE=$1
    local APP_NAME=$2

    cat > "$ENV_FILE" << EOF
# Network Configuration
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://localhost:8545

# Contract Addresses (Auto-generated by deploy-all.sh)
# Deployed on: $(date)
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

    if [ "$APP_NAME" = "web-customer" ]; then
        cat >> "$ENV_FILE" << EOF

# Stripe (for buying EURT tokens)
# Get your keys from https://dashboard.stripe.com/test/apikeys
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
EOF
    fi

    echo -e "${GREEN}✅ Updated ${ENV_FILE}${NC}"
}

# Update web-admin .env.local
update_env_file "${SCRIPT_DIR}/web-admin/.env.local" "web-admin"

# Update web-customer .env.local
update_env_file "${SCRIPT_DIR}/web-customer/.env.local" "web-customer"

echo ""

# ============================================================================
# 5. Update DEPLOYED_ADDRESSES.md
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📄 Step 5: Updating documentation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cat > "${SCRIPT_DIR}/DEPLOYED_ADDRESSES.md" << EOF
# Deployed Contract Addresses

**Last Deployment:** $(date)

## Network: Localhost (Anvil)
**Chain ID:** 31337
**RPC URL:** http://localhost:8545

## E-Commerce Contracts

### Main Contract
- **EcommerceMain**: \`${ECOMMERCE_MAIN}\`

### Core Contracts
- **CompanyRegistry**: \`${COMPANY_REGISTRY}\`
- **ProductCatalog**: \`${PRODUCT_CATALOG}\`
- **CustomerRegistry**: \`${CUSTOMER_REGISTRY}\`
- **ShoppingCart**: \`${SHOPPING_CART}\`
- **InvoiceSystem**: \`${INVOICE_SYSTEM}\`
- **PaymentGateway**: \`${PAYMENT_GATEWAY}\`

### Token Contract
- **EuroToken (EURT)**: \`${EURO_TOKEN_ADDRESS}\`

## Quick Verification

\`\`\`bash
# Check EcommerceMain owner
cast call ${ECOMMERCE_MAIN} "owner()" --rpc-url http://localhost:8545

# Check EuroToken balance
cast call ${EURO_TOKEN_ADDRESS} "balanceOf(address)" 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url http://localhost:8545
\`\`\`

## Mint Test EURT

\`\`\`bash
# Mint 1000 EURT to customer account
cast send ${EURO_TOKEN_ADDRESS} "mint(address,uint256)" \\
  0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC 1000000000 \\
  --rpc-url http://localhost:8545 \\
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
\`\`\`

## Default Anvil Accounts

**Account #0 (Owner):**
- Address: \`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266\`
- Private Key: \`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80\`

**Account #1 (Company):**
- Address: \`0x70997970C51812dc3A010C7d01b50e0d17dc79C8\`
- Private Key: \`0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d\`

**Account #2 (Customer):**
- Address: \`0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC\`
- Private Key: \`0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a\`
EOF

echo -e "${GREEN}✅ Updated DEPLOYED_ADDRESSES.md${NC}"
echo ""

# ============================================================================
# 5. Summary
# ============================================================================
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🎉 Deployment Completed Successfully!                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo -e "  ${GREEN}1.${NC} Start Web Admin:"
echo -e "     ${BLUE}cd web-admin && npm run dev${NC}"
echo ""
echo -e "  ${GREEN}2.${NC} Start Web Customer:"
echo -e "     ${BLUE}cd web-customer && npm run dev -- -p 3001${NC}"
echo ""
echo -e "  ${GREEN}3.${NC} Mint test EURT for testing:"
echo -e "     ${BLUE}cast send ${EURO_TOKEN_ADDRESS} \"mint(address,uint256)\" \\${NC}"
echo -e "     ${BLUE}  0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC 1000000000 \\${NC}"
echo -e "     ${BLUE}  --rpc-url http://localhost:8545 \\${NC}"
echo -e "     ${BLUE}  --private-key ${PRIVATE_KEY}${NC}"
echo ""
echo -e "  ${GREEN}4.${NC} Import accounts to MetaMask:"
echo -e "     - Network: Localhost 8545"
echo -e "     - Chain ID: 31337"
echo -e "     - Use private keys from DEPLOYED_ADDRESSES.md"
echo ""
echo -e "${GREEN}✨ Happy coding!${NC}"
echo ""
