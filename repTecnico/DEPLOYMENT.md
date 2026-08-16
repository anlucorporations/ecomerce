# Deployment Guide

## Prerequisites

- Node.js 18+
- Foundry (forge, anvil)
- MetaMask or another EIP-1193 wallet

## 1. Deploy Smart Contracts

### Start local blockchain

```bash
# In terminal 1
cd stablecoin/sc
anvil
```

### Deploy EuroToken

```bash
# In terminal 2
cd stablecoin/sc
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast --private-key <ANVIL_PRIVATE_KEY>
```

Save the `EuroToken` address.

### Deploy E-commerce contracts

```bash
cd ../../sc-ecommerce
export EURO_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

This will output all contract addresses. Save them for the next step.

## 2. Configure Web Applications

### Web Admin

```bash
cd web-admin
cp .env.example .env.local
```

Edit `.env.local` and add all contract addresses from deployment.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Web Customer

```bash
cd web-customer
cp .env.example .env.local
```

Edit `.env.local` and add all contract addresses.

```bash
npm install
npm run dev -- -p 3001
```

Open [http://localhost:3001](http://localhost:3001)

## 3. Initial Setup

### Register a Company (Web Admin)

1. Connect wallet (use Anvil account #0 as owner)
2. Go to "Companies"
3. Register a new company with Anvil account #1

### Add Products (Web Admin - as company)

1. Connect wallet (use Anvil account #1 - the company account)
2. Go to "Products"
3. Add products with prices in EURT (6 decimals: 1000000 = 1 EURT)

### Buy and Use EURT (Web Customer)

1. Connect wallet (use any Anvil account)
2. Go to "Wallet"
3. Request EURT (for testing, mint directly via Foundry)
4. Browse products and add to cart
5. Checkout and pay with EURT

## Testing Workflow

```bash
# Mint EURT for testing
cd stablecoin/sc
cast send <EURO_TOKEN_ADDRESS> "mint(address,uint256)" <USER_ADDRESS> 1000000000 --rpc-url http://localhost:8545 --private-key <OWNER_PRIVATE_KEY>
```

## Run Tests

```bash
cd sc-ecommerce
forge test
```

## Wallet Detection

The app uses `mipd` to detect EIP-1193 wallets:
- MetaMask
- Coinbase Wallet
- WalletConnect
- Any EIP-1193 compatible wallet

If multiple wallets are available, the user can choose which one to connect.

## Production Deployment

For production deployment:

1. Deploy contracts to desired network (Sepolia, Mainnet, etc.)
2. Update RPC URLs and chain IDs in `.env`
3. Integrate real Stripe for EURT purchases
4. Set up IPFS/Pinata for product images
5. Deploy frontends to Vercel/Netlify

## Architecture

- **sc-ecommerce**: Main e-commerce smart contracts
- **stablecoin**: EURT token (ERC20)
- **web-admin**: Admin panel for managing companies/products
- **web-customer**: Customer-facing store

See [README.md](README.md) for detailed specifications and [ARCHITECTURE.md](ARCHITECTURE.md) for system diagrams.
