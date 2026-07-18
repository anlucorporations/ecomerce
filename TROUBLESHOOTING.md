# Troubleshooting Guide

## JSON Import Issues with Next.js

### Problem
Error when importing JSON ABI files directly in components:
```
Module not found: Can't resolve '.../abis/CompanyRegistry.json'
```

### Solution
We've created a centralized `abis.ts` file that exports all ABIs:

**web-admin/src/lib/contracts/abis.ts**
```typescript
import CompanyRegistryABI from './abis/CompanyRegistry.json';
// ... other imports

export const ABIS = {
  companyRegistry: CompanyRegistryABI,
  // ... other ABIs
} as const;
```

Then import from this file instead of JSON directly:
```typescript
import { ABIS, type ContractName } from '../lib/contracts/abis';
```

### Configuration Updates

**next.config.ts** - Added webpack config:
```typescript
webpack: (config) => {
  config.resolve.fallback = { fs: false, net: false, tls: false };
  config.externals.push('pino-pretty', 'lokijs', 'encoding');
  return config;
}
```

**tsconfig.json** - Added JSON files to includes:
```json
"include": [..., "src/lib/contracts/abis/**/*.json"]
```

### After Making Changes

Always clear Next.js cache:
```bash
rm -rf .next
npm run dev
```

## Common Errors

### 1. "Network not supported"
**Cause**: Missing contract address for the chain ID
**Fix**: Add the contract addresses to `.env.local`:
```bash
NEXT_PUBLIC_COMPANY_REGISTRY_ADDRESS=0x...
```

### 2. "Only owner" error in smart contracts
**Cause**: Trying to call admin functions from non-owner account
**Fix**: Make sure you're connected with the deployer account (Anvil account #0)

### 3. Wallet not detected
**Cause**: No EIP-1193 wallet installed
**Fix**: Install MetaMask or another Web3 wallet extension

### 4. Transaction fails with "Insufficient funds"
**Cause**: Not enough ETH for gas or not enough EURT for payment
**Fix**:
- Use an Anvil account with ETH
- Mint EURT tokens for testing:
```bash
cast send <EURO_TOKEN_ADDRESS> "mint(address,uint256)" <USER_ADDRESS> 1000000000 \
  --rpc-url http://localhost:8545 \
  --private-key <OWNER_PRIVATE_KEY>
```

### 5. "Product not active" when adding to cart
**Cause**: Product was deactivated or doesn't exist
**Fix**: Check product status in web-admin

### 6. ethers.js errors
**Cause**: Version mismatch or incorrect provider
**Fix**: Make sure you're using ethers v6:
```bash
npm install ethers@6
```

### 7. CORS errors with localhost
**Cause**: Anvil not configured correctly
**Fix**: Start Anvil with proper host:
```bash
anvil --host 0.0.0.0
```

## Development Tips

### Hot Reload Issues
If changes aren't reflecting:
1. Stop the dev server
2. Delete `.next` folder
3. Restart: `npm run dev`

### Debugging Transactions
Use Foundry's `cast` to inspect:
```bash
# Check transaction
cast tx <TX_HASH> --rpc-url http://localhost:8545

# Check contract storage
cast storage <CONTRACT_ADDRESS> <SLOT> --rpc-url http://localhost:8545

# Call view function
cast call <CONTRACT_ADDRESS> "getCompany(uint256)" 1 --rpc-url http://localhost:8545
```

### Console Logging
Add to contract interactions:
```typescript
const tx = await contract.someFunction();
console.log('Transaction sent:', tx.hash);
const receipt = await tx.wait();
console.log('Transaction confirmed:', receipt);
```

### Wallet Connection Issues
Check browser console for mipd errors:
```typescript
// In browser console
window.ethereum // Should exist if wallet installed
```

## Reset Everything

If things get really messed up:

```bash
# Kill Anvil
pkill anvil

# Clear Next.js caches
cd web-admin && rm -rf .next node_modules/.cache
cd ../web-customer && rm -rf .next node_modules/.cache

# Restart Anvil
anvil

# Re-deploy contracts
cd sc-ecommerce
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

# Update .env.local with new addresses

# Restart apps
cd web-admin && npm run dev
cd web-customer && npm run dev -- -p 3001
```

## Getting Help

1. Check [DEPLOYMENT.md](DEPLOYMENT.md) for setup instructions
2. Check [DEPLOYED_ADDRESSES.md](DEPLOYED_ADDRESSES.md) for contract addresses
3. Check [README.md](README.md) for system overview
4. Check smart contract tests for usage examples:
   ```bash
   cd sc-ecommerce
   forge test -vvv
   ```
