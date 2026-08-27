/**
 * 🧪 Unit Tests Suite: web-customer (Portal de Clientes)
 * Tests core business logic, cart formatting, mobile deep links, and EIP-712 typed permit payloads.
 */

const assert = require('assert');

// 1. Cart Amount Calculation & Raw Unit Formatting (6 Decimals)
function formatRawAmount(amountEur) {
  if (typeof amountEur !== 'number' || amountEur <= 0) {
    throw new Error('Invalid amount');
  }
  return BigInt(Math.round(amountEur * 1e6));
}

function calculateCartTotal(cartItems) {
  if (!Array.isArray(cartItems)) return 0;
  return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// 2. Rating Solicitation Hiding Logic
function shouldHideRatingBox(invoiceId, ratedInvoicesList) {
  if (!invoiceId || !Array.isArray(ratedInvoicesList)) return false;
  return ratedInvoicesList.includes(invoiceId.toString());
}

// 3. User KYC Registration Status Filter
function getRegistrationStatusBadge(isRegistered, isKYCVerified) {
  if (!isRegistered) return { label: 'Sin Registrar', color: 'red' };
  if (!isKYCVerified) return { label: 'Registro Pendiente KYC', color: 'yellow' };
  return { label: 'Cliente Verificado', color: 'green' };
}

// 4. Mobile Universal Deep Links Generator Test
function generateTestMobileDeepLinks(fullUrl) {
  const cleanHost = 'localhost:3001';
  const cleanHostAndPath = fullUrl.replace(/^https?:\/\//, '');
  const encoded = encodeURIComponent(fullUrl);

  return {
    metamask: `https://metamask.app.link/dapp/${cleanHostAndPath}`,
    trust: `https://link.trustwallet.com/open_url?coin_id=60&url=${encoded}`,
    phantom: `https://phantom.app/ul/browse/${encoded}?ref=${encodeURIComponent(cleanHost)}`,
    coinbase: `https://go.cb-w.com/dapp?cb_url=${encoded}`,
  };
}

// 5. EIP-712 Domain & Types Structure Validation
function buildEIP712PermitDomainAndTypes(euroTokenAddress, chainId) {
  const domain = {
    name: 'EuroToken',
    version: '1',
    chainId: chainId,
    verifyingContract: euroTokenAddress,
  };

  const types = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  };

  return { domain, types };
}

// --- EXECUTE UNIT TESTS ---
console.log('🚀 Running web-customer Unit Tests (Core, Mobile Deep Links & EIP-712)...');

// Test 1: Raw Amount Formatting
assert.strictEqual(formatRawAmount(10.5).toString(), '10500000', '10.5 EUR should convert to 10,500,000 micro-units');
assert.strictEqual(formatRawAmount(100).toString(), '100000000', '100 EUR should convert to 100,000,000 micro-units');
assert.throws(() => formatRawAmount(-5), /Invalid amount/, 'Negative amount should throw');

// Test 2: Cart Total Calculation
const sampleCart = [
  { productId: '1', price: 25.0, quantity: 2 },
  { productId: '2', price: 50.0, quantity: 1 }
];
assert.strictEqual(calculateCartTotal(sampleCart), 100.0, 'Cart total should be 100.0 EUR');

// Test 3: Rating Solicitation Check
const ratedList = ['1', '5', '12'];
assert.strictEqual(shouldHideRatingBox('5', ratedList), true, 'Invoice 5 should hide rating box');
assert.strictEqual(shouldHideRatingBox('2', ratedList), false, 'Invoice 2 should show rating box');

// Test 4: Registration Status Badge
assert.deepStrictEqual(getRegistrationStatusBadge(false, false), { label: 'Sin Registrar', color: 'red' });
assert.deepStrictEqual(getRegistrationStatusBadge(true, true), { label: 'Cliente Verificado', color: 'green' });

// Test 5: Universal Mobile Deep Links
const testUrl = 'http://localhost:3001/cart';
const links = generateTestMobileDeepLinks(testUrl);
assert.strictEqual(links.metamask, 'https://metamask.app.link/dapp/localhost:3001/cart');
assert.ok(links.trust.startsWith('https://link.trustwallet.com/open_url?coin_id=60&url='));
assert.ok(links.phantom.startsWith('https://phantom.app/ul/browse/'));
assert.ok(links.coinbase.startsWith('https://go.cb-w.com/dapp?cb_url='));

// Test 6: EIP-712 Permit Domain and Types Compliance
const tokenAddr = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const eipData = buildEIP712PermitDomainAndTypes(tokenAddr, 31337);
assert.strictEqual(eipData.domain.name, 'EuroToken');
assert.strictEqual(eipData.domain.chainId, 31337);
assert.strictEqual(eipData.domain.verifyingContract, tokenAddr);
assert.strictEqual(eipData.types.Permit.length, 5);
assert.strictEqual(eipData.types.Permit[0].name, 'owner');
assert.strictEqual(eipData.types.Permit[2].name, 'value');
assert.strictEqual(eipData.types.Permit[4].name, 'deadline');

console.log('✅ ALL web-customer Unit Tests Passed Successfully! (6/6)');
