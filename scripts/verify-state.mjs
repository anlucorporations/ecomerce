// Runtime verification after clean deterministic deploy + seed
import { ethers } from '../web-customer/node_modules/ethers/lib.esm/index.js';

const RPC = 'http://127.0.0.1:8545';
const ECOMMERCE = '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';
const EURT = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

const provider = new ethers.JsonRpcProvider(RPC);
const ecom = new ethers.Contract(ECOMMERCE, [
  'function euroTokenAddress() view returns (address)',
  'function getAllProducts() view returns (tuple(uint256 productId, uint256 companyId, string name, string description, uint256 price, string ipfsImageHash, uint256 stock, bool isActive)[])',
  'function getAllCompanies() view returns (tuple(uint256 companyId, address companyAddress, string name, string description, uint8 businessType, bool isActive, uint256 registrationDate)[])',
  'function getEntityType(address) view returns (uint8)',
  'function isKYCVerified(address) view returns (bool)',
  'function getInvoiceCount() view returns (uint256)',
], provider);
const token = new ethers.Contract(EURT, ['function balanceOf(address) view returns (uint256)', 'function name() view returns (string)', 'function symbol() view returns (string)', 'function decimals() view returns (uint8)', 'function totalSupply() view returns (uint256)'], provider);

console.log('=== ESTADO ON-CHAIN VERIFICADO ===');
console.log('euroTokenAddress() del Ecommerce:', await ecom.euroTokenAddress());
console.log('Token EURT:', await token.name(), '|', await token.symbol(), '| decimals:', Number(await token.decimals()));
console.log('Total supply EURT:', (Number(await token.totalSupply()) / 1e6).toFixed(2));

const companies = await ecom.getAllCompanies();
console.log('\nEMPRESAS:', companies.length);
for (const c of companies) console.log(`  #${c.companyId} ${c.name} type=${Number(c.businessType)} active=${c.isActive} addr=${c.companyAddress}`);

const products = await ecom.getAllProducts();
console.log('\nPRODUCTOS:', products.length);
for (const p of products.filter(p => p.isActive)) console.log(`  #${p.productId} [emp#${p.companyId}] "${p.name}" €${(Number(p.price)/1e6).toFixed(2)} stock=${p.stock}`);

const customers = ['0x90F79bf6EB2c4f870365E785982E1f101E93b906', '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65'];
console.log('\nCLIENTES:');
for (const c of customers) console.log(`  ${c} entityType=${Number(await ecom.getEntityType(c))} KYC=${await ecom.isKYCVerified(c)} EURT=€${(Number(await token.balanceOf(c))/1e6).toFixed(2)}`);

console.log('\nFACTURAS totales:', Number(await ecom.getInvoiceCount()));
process.exit(0);
