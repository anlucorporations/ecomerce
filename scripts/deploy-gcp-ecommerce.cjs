// Deploy Ecommerce en la cadena GCP (Anvil Cloud Run) usando ethers + Bearer token
// Uso: node scripts/deploy-gcp-ecommerce.cjs [--reset]
const { ethers } = require('C:/Users/lucci/MasterCodeCripto/GitLab/ecomerce-deepseek/web-admin/node_modules/ethers');
const { execSync } = require('child_process');
const fs = require('fs');

const RPC = 'https://mcc-foundry-anvil-1095249147821.europe-west1.run.app';
const CHAIN = 31337;
const DEPLOYER_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // cuenta #0 Anvil
const TOKEN_ADDR = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

(async () => {
  const tok = execSync('gcloud auth print-identity-token', { encoding: 'utf8' }).trim();
  const provider = new ethers.JsonRpcProvider(RPC, CHAIN, { fetchOptions: { headers: { Authorization: 'Bearer ' + tok } } });
  const wallet = new ethers.Wallet(DEPLOYER_KEY, provider);

  const tokenArt = JSON.parse(fs.readFileSync('stablecoin/sc/out/EuroTokenOptimized.sol/EuroTokenOptimized.json', 'utf8'));
  const ecomArt = JSON.parse(fs.readFileSync('sc-ecommerce/out/Ecommerce.sol/Ecommerce.json', 'utf8'));

  // 1. EuroToken (si no existe en la cadena)
  let tokenCode = await provider.getCode(TOKEN_ADDR);
  if (tokenCode === '0x') {
    console.log('Desplegando EuroTokenOptimized...');
    const iface = new ethers.Interface(tokenArt.abi);
    const data = tokenArt.bytecode.object + iface.encodeDeploy(['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266']).slice(2);
    const tx = await wallet.sendTransaction({ data, gasLimit: 6000000 });
    const r = await tx.wait();
    console.log('  Token deploy tx:', tx.hash, 'status', r.status);
  } else {
    console.log('EuroToken ya existe en', TOKEN_ADDR);
  }

  // 2. Ecommerce con EURO_TOKEN_ADDRESS
  console.log('Desplegando Ecommerce (euroToken=' + TOKEN_ADDR + ')...');
  const iface = new ethers.Interface(ecomArt.abi);
  const data = ecomArt.bytecode.object + iface.encodeDeploy([TOKEN_ADDR]).slice(2);
  try {
    const tx = await wallet.sendTransaction({ data, gasLimit: 8000000 });
    const r = await tx.wait();
    const receipt = await provider.getTransactionReceipt(tx.hash);
    console.log('  Ecommerce deploy tx:', tx.hash, 'status', r.status);
    console.log('  Ecommerce address:', receipt.contractAddress);
    // verificar
    const code = await provider.getCode(receipt.contractAddress);
    console.log('  code len:', code.length);
    const ec = new ethers.Contract(receipt.contractAddress, ['function euroTokenAddress() view returns (address)'], provider);
    console.log('  euroTokenAddress():', await ec.euroTokenAddress());
  } catch (e) {
    console.error('  DEPLOY FALLÓ:', e.reason || e.shortMessage || e.message.slice(0, 200));
    process.exit(1);
  }
})().catch((e) => { console.error('ERR:', e.message.slice(0, 300)); process.exit(1); });
