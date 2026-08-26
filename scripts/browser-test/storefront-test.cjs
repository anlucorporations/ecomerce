// BARLO-VENTAS storefront functional test (Playwright + mocked EIP-1193 wallet)
// Usage: node storefront-test.cjs <baseUrl> <account> <label> [mode: as-is|fixed]
// The mock wallet delegates JSON-RPC (eth_call, eth_sendTransaction, ...) to the real Anvil node
// at http://127.0.0.1:8545, so the purchase executes REAL on-chain transactions.
const { chromium } = require('C:/Users/lucci/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');

const [baseUrl, account, label, mode = 'as-is'] = process.argv.slice(2);
if (!baseUrl || !account || !label) {
  console.error('Usage: node storefront-test.cjs <baseUrl> <account> <label> [mode]');
  process.exit(1);
}

const OUT = `artifacts/browser-test/${label}`;
const fs = require('fs');
fs.mkdirSync(OUT, { recursive: true });

const RPC = 'http://127.0.0.1:8545';
const FAKE_SIG = '0x' + 'ab'.repeat(65);

const results = {
  label, baseUrl, account, mode,
  alerts: [],
  consoleErrors: [],
  consoleWarnings: [],
  requestFailures: [],
  httpErrors: [],
  steps: {},
  walletCalls: {},
};

const walletInit = (acct, rpc) => {
  const listeners = {};
  const chainId = '0x7a69';
  return `
  (() => {
    const acct = '${acct}';
    const rpc = '${rpc}';
    const fakeSig = '${FAKE_SIG}';
    const listeners = {};
    let seq = 1;
    const callCounts = {};
    const provider = {
      isMetaMask: true,
      isConnected: () => true,
      selectedAddress: acct,
      chainId: '${chainId}',
      networkVersion: '31337',
      request: async ({ method, params = [] }) => {
        callCounts[method] = (callCounts[method] || 0) + 1;
        window.__walletCalls = callCounts;
        switch (method) {
          case 'eth_requestAccounts':
          case 'eth_accounts':
            return [acct];
          case 'eth_chainId':
            return '${chainId}';
          case 'net_version':
            return '31337';
          case 'personal_sign':
          case 'eth_sign':
          case 'eth_signTypedData':
          case 'eth_signTypedData_v1':
          case 'eth_signTypedData_v3':
          case 'eth_signTypedData_v4':
            return fakeSig;
          case 'wallet_switchEthereumChain': {
            const c = (params[0] || {}).chainId;
            if (c === '${chainId}') return null;
            const err = new Error('Unrecognized chain ID ' + c);
            err.code = 4902;
            throw err;
          }
          case 'wallet_addEthereumChain':
          case 'wallet_watchAsset':
            return null;
          default: {
            const res = await fetch(rpc, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ jsonrpc: '2.0', method, params, id: seq++ }),
            });
            const json = await res.json();
            if (json.error) {
              const e = new Error(json.error.message);
              e.code = json.error.code;
              throw e;
            }
            return json.result;
          }
        }
      },
      on: (event, handler) => { (listeners[event] = listeners[event] || []).push(handler); },
      removeListener: (event, handler) => {
        const arr = listeners[event] || [];
        const i = arr.indexOf(handler);
        if (i >= 0) arr.splice(i, 1);
      },
      removeAllListeners: () => {},
      emit: (event, ...args) => { (listeners[event] || []).forEach((h) => h(...args)); },
    };
    Object.defineProperty(window, 'ethereum', { value: provider, writable: false });
    // EIP-6963 announcement for mipd-based detection
    const announce = () => {
      window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
        detail: Object.freeze({
          info: Object.freeze({ uuid: '11111111-1111-1111-1111-111111111111', name: 'Mock MetaMask', icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>', rdns: 'io.mock.metamask' }),
          provider,
        }),
      }));
    };
    announce();
    window.addEventListener('eip6963:requestProvider', announce);
  })();
  `;
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'es-ES',
  });
  await context.addInitScript(walletInit(account, RPC));
  const page = await context.newPage();

  // --- Observers ---
  page.on('dialog', async (d) => {
    results.alerts.push(d.message());
    try { await d.accept(); } catch { /* dialog already dismissed */ }
  });
  page.on('console', (msg) => {
    const t = msg.type();
    if (t === 'error') results.consoleErrors.push(msg.text());
    else if (t === 'warning') results.consoleWarnings.push(msg.text());
  });
  page.on('pageerror', (err) => results.consoleErrors.push('PAGEERROR: ' + err.message));
  page.on('requestfailed', (req) => results.requestFailures.push(`${req.method()} ${req.url()} -> ${req.failure()?.errorText}`));
  page.on('response', (res) => {
    if (res.status() >= 400) results.httpErrors.push(`${res.status()} ${res.url()}`);
  });

  const shot = async (name) => {
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
    console.log(`  [shot] ${name}.png`);
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  try {
    // 1. HOME / CATALOG
    console.log('STEP 1: load home');
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('text=/Productos Mostrados|Tu carrito está vacío/', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);
    results.steps.homeTitle = await page.title();
    results.steps.productCountText = await page.locator('text=/Productos Mostrados/').first().textContent().catch(() => null);
    await shot('01-home');

    // 2. PRODUCTS LIST
    console.log('STEP 2: /products');
    await page.goto(baseUrl + '/products', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    await shot('02-products');

    // 3. PRODUCT DETAIL
    console.log('STEP 3: /products/10 (Gafas de Sol €75, empresa #2)');
    await page.goto(baseUrl + '/products/10', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);
    await shot('03-product-detail');

    // 4. CONNECT WALLET
    console.log('STEP 4: connect wallet');
    const connectBtn = page.locator('button:has-text("Conectar Billetera Web3")').first();
    if (await connectBtn.isVisible().catch(() => false)) {
      await connectBtn.click();
      await page.waitForTimeout(3000);
    }
    results.steps.connected = await page.locator(`text=/0x${account.slice(2, 6)}/`).first().isVisible().catch(() => false);
    results.steps.headerText = (await page.locator('header').textContent().catch(() => '')).slice(0, 400);
    await shot('04-wallet-connected');

    // 5. ADD TO CART (2 products, 2 companies)
    console.log('STEP 5: add products to cart (ID 10 y 11)');
    for (const [pid, pname] of [[10, 'Gafas de Sol'], [11, 'Soporte basico']]) {
      await page.goto(baseUrl + `/products/${pid}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      try {
        await page.waitForSelector('button:has-text("Adjuntar al Carrito")', { timeout: 30000 });
      } catch {
        results.steps[`add_${pid}`] = 'button NOT FOUND';
        continue;
      }
      await page.locator('button:has-text("Adjuntar al Carrito")').first().click();
      await page.waitForTimeout(2500); // personal_sign + alert
      results.steps[`add_${pid}`] = 'added';
    }

    // 6. CART
    console.log('STEP 6: /cart');
    await page.goto(baseUrl + '/cart', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000);
    results.steps.cartHasItems = (await page.locator('h3', { hasText: 'Gafas de Sol' }).count().catch(() => 0)) > 0;
    results.steps.balanceWidgetText = (await page.locator('text=/Disponible en Wallet/').first().textContent().catch(() => null));
    const balTxt = await page.locator('div', { hasText: 'Disponible en Wallet' }).first().textContent().catch(() => '');
    results.steps.balanceArea = balTxt.replace(/\s+/g, ' ').trim().slice(0, 300);
    const payBtn = page.locator('button:has-text("Pagar Factura en Pasarela Web3")').first();
    results.steps.payButtonDisabled = await payBtn.isDisabled().catch(() => null);
    results.steps.payButtonVisible = await payBtn.isVisible().catch(() => false);
    await shot('05-cart');

    // 7. CHECKOUT ATTEMPT
    if (mode === 'fixed') {
      console.log('STEP 7: checkout (fixed mode)');
      const payBtn2 = page.locator('button:has-text("Pagar Factura en Pasarela Web3")').first();
      if (await payBtn2.isEnabled().catch(() => false)) {
        const alertBefore = results.alerts.length;
        await payBtn2.click();
        // Wait for either a success dialog or a redirect to /orders
        for (let i = 0; i < 40; i++) {
          await page.waitForTimeout(1000);
          if (results.alerts.length > alertBefore) break;
          if (page.url().includes('/orders')) break;
        }
        await page.waitForTimeout(2000);
        results.steps.checkoutStarted = true;
        results.steps.checkoutAlerts = results.alerts.slice(alertBefore);
      } else {
        results.steps.checkoutStarted = false;
        results.steps.payDisabledReason = (await page.locator('text=/Saldo Insuficiente|Requiere Recarga/').first().textContent().catch(() => null));
      }
      await shot('06-after-checkout');
      // Orders page (redirect target)
      if (page.url().includes('/orders')) {
        await page.waitForTimeout(3000);
        await shot('07-orders');
        results.steps.ordersUrl = page.url();
        results.steps.ordersText = (await page.locator('body').textContent().catch(() => '')).replace(/\s+/g, ' ').slice(0, 600);
      } else {
        results.steps.finalUrl = page.url();
      }
    } else {
      console.log('STEP 7: checkout button state (as-is mode) — verify disabled');
      const payBtn3 = page.locator('button:has-text("Pagar Factura en Pasarela Web3")').first();
      results.steps.payDisabledAgain = await payBtn3.isDisabled().catch(() => null);
      results.steps.warningText = (await page.locator('text=/Saldo Insuficiente|Requiere Recarga/').first().textContent().catch(() => null));
    }

    // 8. Wallet call statistics
    results.steps.walletCalls = await page.evaluate(() => window.__walletCalls || {}).catch(() => ({}));
  } catch (err) {
    results.fatalError = err.message;
    await page.screenshot({ path: `${OUT}/99-fatal.png` }).catch(() => {});
  } finally {
    await browser.close();
  }

  // Summary
  const summary = {
    ...results,
    consoleErrors: [...new Set(results.consoleErrors)].slice(0, 30),
    consoleWarnings: [...new Set(results.consoleWarnings)].slice(0, 20),
    requestFailures: [...new Set(results.requestFailures)].slice(0, 20),
    httpErrors: [...new Set(results.httpErrors)].slice(0, 20),
    alerts: results.alerts.slice(0, 20),
  };
  fs.writeFileSync(`${OUT}/result.json`, JSON.stringify(summary, null, 2));
  console.log('\n=== RESULT SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
})();
