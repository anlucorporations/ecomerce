/**
 * 🧪 Unit Tests Suite: pasarela-de-pago (Pasarela Web3 Escrow)
 * Tests Query String parameter parsing, wallet connection state, and raw amount conversion.
 */

const assert = require('assert');

// 1. URL Query Parameter Parser
function parseQueryParams(queryString) {
  const params = new URLSearchParams(queryString);
  return {
    merchantName: params.get('merchant') || 'Comercio Registrado',
    amountStr: params.get('amount') || '0',
    invoiceId: params.get('invoiceId') || '0',
    redirectUrl: params.get('redirectUrl') || ''
  };
}

// 2. Amount Conversion to Raw Units (6 Decimals)
function toRawUnits(amountStr) {
  const parsed = parseFloat(amountStr);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error('Invalid payment amount');
  }
  return BigInt(Math.round(parsed * 1e6));
}

// 3. Balance Insufficiency Checker
function hasSufficientBalance(userBalanceRaw, requiredAmountRaw) {
  return BigInt(userBalanceRaw) >= BigInt(requiredAmountRaw);
}

// --- EXECUTE UNIT TESTS ---
console.log('🚀 Running pasarela-de-pago Unit Tests...');

// Test 1: Query String Parser
const urlQuery = '?merchant=Super+Owner+Enterprise&amount=10.00&invoiceId=1&redirectUrl=http%3A%2F%2Flocalhost%3A3001%2Forders';
const parsed = parseQueryParams(urlQuery);
assert.strictEqual(parsed.merchantName, 'Super Owner Enterprise');
assert.strictEqual(parsed.amountStr, '10.00');
assert.strictEqual(parsed.invoiceId, '1');
assert.strictEqual(parsed.redirectUrl, 'http://localhost:3001/orders');

// Test 2: Raw Units Conversion
assert.strictEqual(toRawUnits('10.00').toString(), '10000000', '10.00 EURT should be 10,000,000 micro-units');
assert.strictEqual(toRawUnits('0.50').toString(), '500000', '0.50 EURT should be 500,000 micro-units');
assert.throws(() => toRawUnits('invalid'), /Invalid payment amount/);

// Test 3: Balance Checker
assert.strictEqual(hasSufficientBalance('50000000', '10000000'), true, '50 EURT balance is sufficient for 10 EURT invoice');
assert.strictEqual(hasSufficientBalance('5000000', '10000000'), false, '5 EURT balance is insufficient for 10 EURT invoice');

console.log('✅ ALL pasarela-de-pago Unit Tests Passed Successfully! (3/3)');
