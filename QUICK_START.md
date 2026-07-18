# Quick Start Guide

## Prerequisites

- Node.js 18+
- Foundry installed (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- MetaMask or another Web3 wallet

## 🚀 One-Command Deployment

### 1. Start Anvil (Terminal 1)

```bash
anvil
```

Keep this running in the background.

### 2. Deploy Everything (Terminal 2)

```bash
./deploy-all.sh
```

This script will:
- ✅ Deploy EuroToken (EURT) stablecoin
- ✅ Deploy all E-Commerce contracts
- ✅ Extract all contract addresses
- ✅ Update `.env.local` files in web-admin and web-customer
- ✅ Update `DEPLOYED_ADDRESSES.md` documentation

**Output:**
```
╔══════════════════════════════════════════════════════════╗
║  E-Commerce Blockchain - Full Deployment Script         ║
╚══════════════════════════════════════════════════════════╝

✅ Anvil is running

📦 Step 1: Deploying EuroToken (EURT)
✅ EuroToken deployed successfully
   Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3

📦 Step 2: Deploying E-Commerce Contracts
✅ E-Commerce contracts deployed successfully

📍 Contract Addresses:
  EcommerceMain:     0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
  CompanyRegistry:   0xCafac3dD18aC6c6e92c921884f9E4176737C052c
  ...
```

### 3. Start Web Applications

**Web Admin (Terminal 3):**
```bash
cd web-admin
npm install  # First time only
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Web Customer (Terminal 4):**
```bash
cd web-customer
npm install  # First time only
npm run dev -- -p 3001
```

Open [http://localhost:3001](http://localhost:3001)

### 4. Setup MetaMask

1. **Add Localhost Network:**
   - Network Name: `Localhost 8545`
   - RPC URL: `http://localhost:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

2. **Import Test Accounts:**

   Use private keys from Anvil (found in `DEPLOYED_ADDRESSES.md`):

   - **Account #0 (Owner/Admin)**:
     ```
     0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
     ```

   - **Account #1 (Company)**:
     ```
     0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
     ```

   - **Account #2 (Customer)**:
     ```
     0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
     ```

### 5. Mint Test EURT

Give customers some EURT tokens to test:

```bash
# Get EURO_TOKEN_ADDRESS from DEPLOYED_ADDRESSES.md
cast send <EURO_TOKEN_ADDRESS> "mint(address,uint256)" \
  0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC \
  1000000000 \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

This mints 1000 EURT (1000000000 = 1000 * 10^6 decimals) to the customer account.

## 🧪 Testing the System

### As Admin (Account #0)

1. Connect wallet in **web-admin**
2. Go to "Companies"
3. Register a new company:
   - Address: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` (Account #1)
   - Name: "Tech Store"
   - Description: "Electronics"

### As Company (Account #1)

1. Switch to Account #1 in MetaMask
2. Go to "Products" in **web-admin**
3. Add products:
   - Name: "Laptop"
   - Price: `1000000000` (1000 EURT)
   - Stock: `10`
   - (Leave IPFS hash empty for now)

### As Customer (Account #2)

1. Switch to Account #2 in MetaMask
2. Open **web-customer** ([localhost:3001](http://localhost:3001))
3. Browse products
4. Add to cart
5. Checkout (approve EURT spending, then pay)

## 🔧 Custom Configuration

### Deploy with Custom RPC/Private Key

```bash
PRIVATE_KEY=0x... RPC_URL=http://localhost:8545 ./deploy-all.sh
```

### Manual Deployment

If you prefer to deploy manually:

```bash
# Deploy EuroToken
cd stablecoin/sc
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

# Deploy E-Commerce (set EURO_TOKEN_ADDRESS first)
cd ../../sc-ecommerce
export EURO_TOKEN_ADDRESS=0x...
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
```

## 📚 Additional Resources

- [README.md](README.md) - Complete system specification
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture diagrams
- [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed deployment guide
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues and solutions
- [DEPLOYED_ADDRESSES.md](DEPLOYED_ADDRESSES.md) - Contract addresses (auto-generated)

## 🔄 Reset & Redeploy

If you need to start fresh:

```bash
# Stop Anvil (Ctrl+C)
# Restart Anvil
anvil

# Redeploy everything
./deploy-all.sh
```

## 💡 Tips

- **Keep Anvil running**: Closing Anvil loses all state
- **Save private keys securely**: Never commit them to git
- **Use different accounts**: Admin, Company, and Customer for testing
- **Check balances**: Use `cast call` to verify EURT balances
- **Monitor transactions**: Anvil logs all transactions in real-time

## ⚡ Quick Commands

```bash
# Check EURT balance
cast call $EURO_TOKEN_ADDRESS "balanceOf(address)" $USER_ADDRESS --rpc-url http://localhost:8545

# Check company owner
cast call $COMPANY_REGISTRY "owner()" --rpc-url http://localhost:8545

# Get product info
cast call $PRODUCT_CATALOG "getProduct(uint256)" 1 --rpc-url http://localhost:8545

# Run contract tests
cd sc-ecommerce && forge test -vv
```

Happy building! 🚀
