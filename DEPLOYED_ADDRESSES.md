# Deployed Contract Addresses

**Last Deployment:** 2026-08-10

## Network: Localhost (Anvil)
**Chain ID:** 31337
**RPC URL:** http://localhost:8545

## E-Commerce Contracts

### Main Contract
- **Ecommerce**: `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707`

### Token Contract
- **EuroToken (EURT)**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`

## Quick Verification

```bash
# Check Ecommerce owner
cast call 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707 "owner()" --rpc-url http://localhost:8545

# Check EuroToken balance
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 "balanceOf(address)" 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url http://localhost:8545
```

## Mint Test EURT

```bash
# Mint 1000 EURT to customer account
cast send 0x5FbDB2315678afecb367f032d93F642f64180aa3 "mint(address,uint256)" \
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
