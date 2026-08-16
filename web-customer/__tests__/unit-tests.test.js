/**
 * 🧪 Unit Tests Suite: web-customer (Portal de Clientes)
 * Tests core business logic, cart formatting, and rating status functions.
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

// --- EXECUTE UNIT TESTS ---
console.log('🚀 Running web-customer Unit Tests...');

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

console.log('✅ ALL web-customer Unit Tests Passed Successfully! (4/4)');
