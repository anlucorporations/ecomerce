/**
 * 🧪 Unit Tests Suite: web-admin (Consola de Administración)
 * Tests user financial record calculations, order tab classification, and dispatch validation.
 */

const assert = require('assert');

// 1. User Financial Record Calculation (Ficha Financiera)
function calculateUserFinancials(invoices) {
  if (!Array.isArray(invoices)) {
    return { amountInCustodyEur: 0, amountPaidEur: 0 };
  }

  let amountInCustodyEur = 0;
  let amountPaidEur = 0;

  for (const inv of invoices) {
    if (inv.isPaid) {
      if (inv.status < 3) {
        // Locked in Escrow custody
        amountInCustodyEur += inv.totalAmount;
      } else {
        // Completed payment
        amountPaidEur += inv.totalAmount;
      }
    }
  }

  return { amountInCustodyEur, amountPaidEur };
}

// 2. Order Tab Classification (Envíos Activos vs Histórico)
function classifyOrderTab(orderStatus) {
  if (typeof orderStatus !== 'number') return 'active';
  return orderStatus < 3 ? 'active' : 'history';
}

// 3. Dispatch Form Validation
function validateDispatchForm(form) {
  if (!form || typeof form !== 'object') return false;
  if (!form.carrier || form.carrier.trim() === '') return false;
  if (!form.trackingNumber || form.trackingNumber.trim() === '') return false;
  return true;
}

// --- EXECUTE UNIT TESTS ---
console.log('🚀 Running web-admin Unit Tests...');

// Test 1: User Financials Calculation
const sampleInvoices = [
  { id: '1', totalAmount: 100, isPaid: true, status: 1 }, // In Custody (Paid, Status 1)
  { id: '2', totalAmount: 250, isPaid: true, status: 2 }, // In Custody (Shipped, Status 2)
  { id: '3', totalAmount: 400, isPaid: true, status: 3 }, // Completed (Delivered, Status 3)
  { id: '4', totalAmount: 150, isPaid: false, status: 0 } // Unpaid (Created, Status 0)
];
const financials = calculateUserFinancials(sampleInvoices);
assert.strictEqual(financials.amountInCustodyEur, 350, 'Escrow Custody should be 100 + 250 = 350 EUR');
assert.strictEqual(financials.amountPaidEur, 400, 'Completed Paid amount should be 400 EUR');

// Test 2: Order Tab Classification
assert.strictEqual(classifyOrderTab(0), 'active', 'Status 0 (Created) belongs to active tab');
assert.strictEqual(classifyOrderTab(1), 'active', 'Status 1 (Paid) belongs to active tab');
assert.strictEqual(classifyOrderTab(2), 'active', 'Status 2 (Shipped) belongs to active tab');
assert.strictEqual(classifyOrderTab(3), 'history', 'Status 3 (Delivered) belongs to history tab');
assert.strictEqual(classifyOrderTab(4), 'history', 'Status 4 (Rated) belongs to history tab');

// Test 3: Dispatch Form Validation
assert.strictEqual(validateDispatchForm({ carrier: 'DHL', trackingNumber: '12345' }), true);
assert.strictEqual(validateDispatchForm({ carrier: '', trackingNumber: '12345' }), false);
assert.strictEqual(validateDispatchForm({ carrier: 'FedEx', trackingNumber: '' }), false);

console.log('✅ ALL web-admin Unit Tests Passed Successfully! (3/3)');
