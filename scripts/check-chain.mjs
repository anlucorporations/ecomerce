// Quick on-chain state inspection for BARLO-VENTAS local test (Anvil :8545) - defensive
import { ethers } from '../web-customer/node_modules/ethers/lib.esm/index.js';

const RPC = 'http://127.0.0.1:8545';
const ECOMMERCE = '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';
const EURT = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const TEST_ACCOUNT = '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720';

const provider = new ethers.JsonRpcProvider(RPC);

console.log('=== NODO ===');
const chainId = await provider.getNetwork();
console.log('chainId:', chainId.chainId);
const block = await provider.getBlockNumber();
console.log('block  :', block);
const accounts = await provider.send('eth_accounts', []);
console.log('anvil accounts:', accounts.length);
for (const a of accounts.slice(0, 10)) console.log('  ', a, 'ETH:', ethers.formatEther(await provider.getBalance(a)));

console.log('\n=== CODIGO DE CONTRATOS ===');
for (const [name, addr] of [['ECOMMERCE', ECOMMERCE], ['EURT', EURT]]) {
  const code = await provider.getCode(addr);
  console.log(`  ${name} ${addr} -> ${code === '0x' ? 'SIN CODIGO' : code.length + ' bytes'}`);
}

// Try to find contracts deployed: scan recent blocks for ContractCreated logs is heavy; instead check if getCode at any known alt addresses
const alt = {
  'EuroToken (posible deploy nuevo)': null,
};
void alt;

// Balance checks with safe eth_call
async function tryCall(addr, data) {
  try {
    const res = await provider.send('eth_call', [{ to: addr, data }]);
    return res;
  } catch (e) {
    return 'REVERT: ' + (e.shortMessage || e.message);
  }
}

console.log('\n=== SALDOS (raw eth_call) ===');
const balData = '0x70a08231000000000000000000000000' + TEST_ACCOUNT.slice(2).toLowerCase();
console.log('  EURT.balanceOf(cuenta#9):', await tryCall(EURT, balData));
console.log('  ECOMMERCE code check done above');

// If ECOMMERCE has code, try ABI calls
const ecomCode = await provider.getCode(ECOMMERCE);
if (ecomCode !== '0x') {
  const ecom = new ethers.Contract(ECOMMERCE, [
    'function getAllProducts() view returns (tuple(uint256 productId, uint256 companyId, string name, string description, uint256 price, string ipfsImageHash, uint256 stock, bool isActive)[])',
    'function getAllCompanies() view returns (tuple(uint256 companyId, address companyAddress, string name, string description, uint8 businessType, bool isActive, uint256 registrationDate)[])',
    'function isCustomerRegistered(address) view returns (bool)',
    'function getEntityType(address) view returns (uint8)',
    'function isKYCVerified(address) view returns (bool)',
    'function euroTokenAddress() view returns (address)',
  ], provider);
  try { console.log('\neuroTokenAddress():', await ecom.euroTokenAddress()); } catch (e) { console.log('euroTokenAddress ERROR:', e.shortMessage || e.message); }
  try { console.log('isCustomerRegistered(#9):', await ecom.isCustomerRegistered(TEST_ACCOUNT)); } catch (e) { console.log('ERROR:', e.shortMessage || e.message); }
  try { console.log('getEntityType(#9):', Number(await ecom.getEntityType(TEST_ACCOUNT))); } catch (e) { console.log('ERROR:', e.shortMessage || e.message); }
  try { console.log('isKYCVerified(#9):', await ecom.isKYCVerified(TEST_ACCOUNT)); } catch (e) { console.log('ERROR:', e.shortMessage || e.message); }
  try {
    const products = await ecom.getAllProducts();
    console.log('\nPRODUCTOS:', products.length);
    for (const p of products) console.log(`  ID#${p.productId} [emp#${p.companyId}] "${p.name}" €${(Number(p.price) / 1e6).toFixed(2)} stock=${p.stock} active=${p.isActive}`);
  } catch (e) { console.log('getAllProducts ERROR:', e.shortMessage || e.message); }
  try {
    const companies = await ecom.getAllCompanies();
    console.log('\nEMPRESAS:', companies.length);
    for (const c of companies) console.log(`  ID#${c.companyId} "${c.name}" type=${Number(c.businessType)} active=${c.isActive} addr=${c.companyAddress}`);
  } catch (e) { console.log('getAllCompanies ERROR:', e.shortMessage || e.message); }
}
process.exit(0);
