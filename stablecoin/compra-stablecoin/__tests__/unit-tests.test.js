/**
 * 🧪 Unit Tests Suite: compra-stablecoin (Adquisición Stripe FIAT)
 * Tests checkout API route payload validation and Stripe amount micro-units conversion.
 */

const assert = require('assert');

// 1. Checkout Payload Validation
function validateCheckoutPayload(body) {
  if (!body || typeof body !== 'object') return { isValid: false, error: 'Empty request body' };
  if (!body.userAddress || typeof body.userAddress !== 'string' || !body.userAddress.startsWith('0x')) {
    return { isValid: false, error: 'Invalid user Web3 address' };
  }
  const amountNum = parseFloat(body.amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return { isValid: false, error: 'Amount must be greater than zero' };
  }
  return { isValid: true, amountNum };
}

// 2. Stripe Cents Conversion
function toStripeCents(amountEur) {
  return Math.round(parseFloat(amountEur) * 100);
}

// --- EXECUTE UNIT TESTS ---
console.log('🚀 Running compra-stablecoin Unit Tests...');

// Test 1: Valid Checkout Payload
const validPayload = { userAddress: '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720', amount: '50.00' };
const res1 = validateCheckoutPayload(validPayload);
assert.strictEqual(res1.isValid, true);
assert.strictEqual(res1.amountNum, 50.0);

// Test 2: Invalid Web3 Address Payload
const invalidAddrPayload = { userAddress: 'invalid-address', amount: '50.00' };
const res2 = validateCheckoutPayload(invalidAddrPayload);
assert.strictEqual(res2.isValid, false);
assert.strictEqual(res2.error, 'Invalid user Web3 address');

// Test 3: Invalid Amount Payload
const invalidAmountPayload = { userAddress: '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720', amount: '-10' };
const res3 = validateCheckoutPayload(invalidAmountPayload);
assert.strictEqual(res3.isValid, false);
assert.strictEqual(res3.error, 'Amount must be greater than zero');

// Test 4: Stripe Cents Conversion
assert.strictEqual(toStripeCents(50.0), 5000, '50 EUR should convert to 5000 cents for Stripe API');
assert.strictEqual(toStripeCents(10.5), 1050, '10.5 EUR should convert to 1050 cents for Stripe API');

console.log('✅ ALL compra-stablecoin Unit Tests Passed Successfully! (4/4)');
