#!/bin/bash

# Test script to verify deployment worked correctly

echo "🧪 Testing Deployment..."
echo ""

# Source the addresses
if [ ! -f "web-admin/.env.local" ]; then
    echo "❌ Error: web-admin/.env.local not found"
    echo "   Run ./deploy-all.sh first"
    exit 1
fi

# Extract addresses from .env.local
EURO_TOKEN=$(grep NEXT_PUBLIC_EURO_TOKEN_ADDRESS web-admin/.env.local | cut -d'=' -f2)
COMPANY_REGISTRY=$(grep NEXT_PUBLIC_COMPANY_REGISTRY_ADDRESS web-admin/.env.local | cut -d'=' -f2)
ECOMMERCE_MAIN=$(grep NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS web-admin/.env.local | cut -d'=' -f2)

echo "📋 Testing Contract Addresses:"
echo "  EuroToken: ${EURO_TOKEN}"
echo "  CompanyRegistry: ${COMPANY_REGISTRY}"
echo "  EcommerceMain: ${ECOMMERCE_MAIN}"
echo ""

# Test 1: Check EuroToken exists
echo "Test 1: Checking EuroToken..."
NAME=$(cast call ${EURO_TOKEN} "name()(string)" --rpc-url http://localhost:8545 2>&1)
if [[ $NAME == *"EuroToken"* ]]; then
    echo "  ✅ EuroToken is deployed correctly"
else
    echo "  ❌ EuroToken check failed"
    echo "     Response: $NAME"
fi

# Test 2: Check CompanyRegistry owner
echo "Test 2: Checking CompanyRegistry owner..."
OWNER=$(cast call ${COMPANY_REGISTRY} "owner()(address)" --rpc-url http://localhost:8545 2>&1)
if [[ $OWNER == *"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"* ]]; then
    echo "  ✅ CompanyRegistry owner is correct"
else
    echo "  ❌ CompanyRegistry owner check failed"
    echo "     Owner: $OWNER"
fi

# Test 3: Check EcommerceMain owner
echo "Test 3: Checking EcommerceMain owner..."
MAIN_OWNER=$(cast call ${ECOMMERCE_MAIN} "owner()(address)" --rpc-url http://localhost:8545 2>&1)
if [[ $MAIN_OWNER == *"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"* ]]; then
    echo "  ✅ EcommerceMain owner is correct"
else
    echo "  ❌ EcommerceMain owner check failed"
    echo "     Owner: $MAIN_OWNER"
fi

# Test 4: Check .env files exist
echo "Test 4: Checking .env files..."
if [ -f "web-admin/.env.local" ] && [ -f "web-customer/.env.local" ]; then
    echo "  ✅ Both .env.local files exist"
else
    echo "  ❌ Missing .env.local files"
fi

# Test 5: Check DEPLOYED_ADDRESSES.md
echo "Test 5: Checking documentation..."
if [ -f "DEPLOYED_ADDRESSES.md" ]; then
    echo "  ✅ DEPLOYED_ADDRESSES.md exists"
else
    echo "  ❌ DEPLOYED_ADDRESSES.md not found"
fi

echo ""
echo "🎉 Deployment verification complete!"
echo ""
echo "Next steps:"
echo "  1. cd web-admin && npm run dev"
echo "  2. cd web-customer && npm run dev -- -p 3001"
echo ""
