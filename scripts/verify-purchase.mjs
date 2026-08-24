// Post-purchase on-chain verification
import { ethers } from '../web-customer/node_modules/ethers/lib.esm/index.js';

const RPC = 'http://127.0.0.1:8545';
const ECOMMERCE = '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';
const EURT = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';
const BUYER = '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65';

const provider = new ethers.JsonRpcProvider(RPC);
const ecom = new ethers.Contract(ECOMMERCE, [
  'function getCustomerInvoices(address customer) view returns (tuple(uint256 invoiceId, uint256 companyId, address customerAddress, uint256 totalAmount, uint256 timestamp, bool isPaid, string paymentTxHash, uint8 status, string trackingNumber, uint256 shippedTimestamp, uint256 deliveredTimestamp)[])',
  'function getCart(address) view returns (tuple(uint256 productId, uint256 quantity, uint256 unitPrice)[])',
], provider);
const token = new ethers.Contract(EURT, [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address, address) view returns (uint256)',
], provider);

console.log('=== POST-COMPRA (Cuenta #4 = comprador) ===');
const eurt = await token.balanceOf(BUYER);
console.log('EURT balance comprador : €' + (Number(eurt) / 1e6).toFixed(2) + ' (antes: 1000.00)');
const allow = await token.allowance(BUYER, ECOMMERCE);
console.log('Allowance EURT -> Escrow:', allow === ethers.MaxUint256 ? 'MaxUint256 (ilimitado)' : (Number(allow) / 1e6).toFixed(2));

const invoices = await ecom.getCustomerInvoices(BUYER);
console.log('\nFacturas del comprador:', invoices.length);
for (const inv of invoices) {
  console.log(`  #${inv.invoiceId} empresa#${inv.companyId} total=€${(Number(inv.totalAmount) / 1e6).toFixed(2)} pagada=${inv.isPaid} status=${inv.status} tx=${inv.paymentTxHash}`);
}

// Escrow: EURT held by the Ecommerce contract
const escrowEurt = await token.balanceOf(ECOMMERCE);
console.log('\nEURT en custodia Escrow (contrato Ecommerce): €' + (Number(escrowEurt) / 1e6).toFixed(2));

// Cart should be empty after purchase
const cart = await ecom.getCart(BUYER);
console.log('Carrito on-chain del comprador:', cart.length, 'item(s)');

// Vendors (should NOT have received funds yet - escrow still held)
const vendor2 = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
const vendor3 = '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720';
console.log('\nSaldo EURT empresa #2 (Moda): €' + (Number(await token.balanceOf(vendor2)) / 1e6).toFixed(2));
console.log('Saldo EURT empresa #3 (ANLU): €' + (Number(await token.balanceOf(vendor3)) / 1e6).toFixed(2));
process.exit(0);
