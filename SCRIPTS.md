# Deployment Scripts Documentation

This project includes automated scripts to simplify deployment and testing.

## 📜 Available Scripts

### 1. `deploy-all.sh` - Full Deployment

Deploys all smart contracts and configures the web applications automatically.

**Usage:**
```bash
./deploy-all.sh
```

**What it does:**
1. ✅ Checks if Anvil is running
2. ✅ Deploys EuroToken (EURT) from `stablecoin/sc`
3. ✅ Deploys E-Commerce contracts from `sc-ecommerce`
4. ✅ Extracts all contract addresses from deployment logs
5. ✅ Creates/updates `.env.local` files in web-admin and web-customer
6. ✅ Updates `DEPLOYED_ADDRESSES.md` with new addresses
7. ✅ Provides next steps and useful commands

**Environment Variables:**
```bash
# Optional - defaults shown
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
RPC_URL=http://localhost:8545

# Usage with custom values
PRIVATE_KEY=0x... RPC_URL=http://localhost:9545 ./deploy-all.sh
```

**Output Example:**
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

📝 Step 3: Updating .env files
✅ Updated web-admin/.env.local
✅ Updated web-customer/.env.local

📄 Step 4: Updating documentation
✅ Updated DEPLOYED_ADDRESSES.md

🎉 Deployment Completed Successfully!
```

**Requirements:**
- Anvil must be running on `http://localhost:8545`
- Foundry installed (`forge` command available)
- Sufficient balance in deployer account

**Troubleshooting:**
```bash
# If deployment fails, check:
curl http://localhost:8545  # Anvil running?
forge --version             # Foundry installed?
```

---

### 2. `test-deployment.sh` - Verify Deployment

Tests that the deployment was successful and contracts are accessible.

**Usage:**
```bash
./test-deployment.sh
```

**What it does:**
1. ✅ Checks if `.env.local` files exist
2. ✅ Extracts contract addresses from config
3. ✅ Calls view functions to verify contracts are deployed
4. ✅ Verifies owner addresses are correct
5. ✅ Checks documentation files exist

**Output Example:**
```
🧪 Testing Deployment...

📋 Testing Contract Addresses:
  EuroToken: 0x5FbDB2315678afecb367f032d93F642f64180aa3
  CompanyRegistry: 0xCafac3dD18aC6c6e92c921884f9E4176737C052c
  EcommerceMain: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

Test 1: Checking EuroToken...
  ✅ EuroToken is deployed correctly
Test 2: Checking CompanyRegistry owner...
  ✅ CompanyRegistry owner is correct
Test 3: Checking EcommerceMain owner...
  ✅ EcommerceMain owner is correct
Test 4: Checking .env files...
  ✅ Both .env.local files exist
Test 5: Checking documentation...
  ✅ DEPLOYED_ADDRESSES.md exists

🎉 Deployment verification complete!
```

**Requirements:**
- Must run after `deploy-all.sh`
- Anvil must still be running
- `cast` command from Foundry available

---

## 🔄 Complete Workflow

### Initial Setup

```bash
# Terminal 1: Start Anvil
anvil

# Terminal 2: Deploy everything
./deploy-all.sh

# Verify deployment
./test-deployment.sh

# Terminal 3: Start web-admin
cd web-admin
npm install  # First time only
npm run dev

# Terminal 4: Start web-customer
cd web-customer
npm install  # First time only
npm run dev -- -p 3001
```

### Reset & Redeploy

```bash
# Stop Anvil (Ctrl+C in Terminal 1)
# Restart Anvil
anvil

# Redeploy (Terminal 2)
./deploy-all.sh
```

---

## 🛠️ Script Internals

### Address Extraction

The scripts use `grep` and regex to extract contract addresses from deployment logs:

```bash
# Example extraction
EURO_TOKEN=$(echo "$OUTPUT" | grep "EuroToken deployed at:" | grep -o "0x[a-fA-F0-9]\{40\}")
```

### .env File Generation

Scripts generate `.env.local` files with this structure:

```bash
cat > web-admin/.env.local << EOF
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_EURO_TOKEN_ADDRESS=${EURO_TOKEN}
# ... more addresses
EOF
```

### Documentation Update

Markdown files are generated with contract addresses and useful commands:

```bash
cat > DEPLOYED_ADDRESSES.md << EOF
# Deployed Contract Addresses
**Last Deployment:** $(date)
## E-Commerce Contracts
- **EuroToken**: \`${EURO_TOKEN}\`
EOF
```

---

## 📋 Manual Deployment (Without Scripts)

If you prefer manual control:

### 1. Deploy EuroToken

```bash
cd stablecoin/sc
forge script script/Deploy.s.sol \
    --rpc-url http://localhost:8545 \
    --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
    --broadcast
```

Copy the deployed address, then:

### 2. Deploy E-Commerce

```bash
cd ../../sc-ecommerce
export EURO_TOKEN_ADDRESS=<address_from_step_1>
forge script script/Deploy.s.sol \
    --rpc-url http://localhost:8545 \
    --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
    --broadcast
```

### 3. Update .env Files

Manually edit:
- `web-admin/.env.local`
- `web-customer/.env.local`

Add all contract addresses from the deployment output.

---

## 🔍 Debugging Scripts

### Enable Verbose Output

```bash
# Add at top of script
set -x  # Print commands as they execute
set -e  # Exit on first error
```

### Check Intermediate Values

```bash
# In deploy-all.sh, add after extraction:
echo "DEBUG: EURO_TOKEN=$EURO_TOKEN"
echo "DEBUG: COMPANY_REGISTRY=$COMPANY_REGISTRY"
```

### Test Individual Steps

```bash
# Test only EuroToken deployment
cd stablecoin/sc
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

# Test address extraction
OUTPUT="EuroToken deployed at: 0x5FbDB2315678afecb367f032d93F642f64180aa3"
echo $OUTPUT | grep -o "0x[a-fA-F0-9]\{40\}"
```

---

## 🚨 Common Issues

### "Anvil is not running"
**Solution:** Start Anvil in another terminal:
```bash
anvil
```

### "Failed to extract address"
**Solution:** Check deployment logs for actual format:
```bash
cd stablecoin/sc
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast | tee output.log
cat output.log
```

### Permission denied
**Solution:** Make scripts executable:
```bash
chmod +x deploy-all.sh test-deployment.sh
```

### "EURO_TOKEN_ADDRESS not set"
**Solution:** The script sets this automatically, but if deploying manually:
```bash
export EURO_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

---

## 📦 Files Modified by Scripts

### Created/Updated:
- `web-admin/.env.local`
- `web-customer/.env.local`
- `DEPLOYED_ADDRESSES.md`

### Read by Scripts:
- `stablecoin/sc/script/Deploy.s.sol`
- `sc-ecommerce/script/Deploy.s.sol`

### Never Modified:
- `.env.example` files (templates)
- Source code files
- Git-tracked configuration

---

## 🎯 Best Practices

1. **Always test after deployment:**
   ```bash
   ./deploy-all.sh && ./test-deployment.sh
   ```

2. **Keep Anvil running:**
   - Don't close the Anvil terminal
   - State is lost when Anvil stops

3. **Version control:**
   - `.env.local` files are gitignored
   - Commit `.env.example` as templates

4. **Multiple environments:**
   ```bash
   # Development
   ./deploy-all.sh

   # Testnet (manual)
   PRIVATE_KEY=$TESTNET_KEY RPC_URL=https://sepolia.infura.io/v3/... ./deploy-all.sh
   ```

5. **Backup addresses:**
   - `DEPLOYED_ADDRESSES.md` is auto-generated
   - Copy to safe location before redeploying

---

## 🔗 Related Documentation

- [QUICK_START.md](QUICK_START.md) - Getting started guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed deployment instructions
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common problems and solutions
