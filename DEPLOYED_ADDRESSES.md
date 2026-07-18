# Deployed Contract Addresses

**Last Deployment:** Tue Oct 14 18:44:31 CEST 2025

## Network: Localhost (Anvil)
**Chain ID:** 31337
**RPC URL:** http://localhost:8545

## E-Commerce Contracts

### Main Contract
- **EcommerceMain**: `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853`

### Core Contracts
- **CompanyRegistry**: `0x9bd03768a7DCc129555dE410FF8E85528A4F88b5`
- **ProductCatalog**: `0x440C0fCDC317D69606eabc35C0F676D1a8251Ee1`
- **CustomerRegistry**: `0x80E2E2367C5E9D070Ae2d6d50bF0cdF6360a7151`
- **ShoppingCart**: `0x0433d874a28147DB0b330C000fcC50C0f0BaF425`
- **InvoiceSystem**: `0xF908e307066dA7a10B7A0353200e9ae39351744f`
- **PaymentGateway**: `0x16E7D0bf530D2A8da712c2D9f0494d16889AE0Fc`

### Token Contract
- **EuroToken (EURT)**: `0x0165878A594ca255338adfa4d48449f69242Eb8F`

## Quick Verification

```bash
# Check EcommerceMain owner
cast call 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853 "owner()" --rpc-url http://localhost:8545

# Check EuroToken balance
cast call 0x0165878A594ca255338adfa4d48449f69242Eb8F "balanceOf(address)" 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url http://localhost:8545
```

## Mint Test EURT

```bash
# Mint 1000 EURT to customer account
cast send 0x0165878A594ca255338adfa4d48449f69242Eb8F "mint(address,uint256)" \
  0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC 1000000000 \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

## Default Anvil Accounts

**Account #0 (Owner):**
- Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

**Account #1 (Company):**
- Address: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- Private Key: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`

**Account #2 (Customer):**
- Address: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
- Private Key: `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`
