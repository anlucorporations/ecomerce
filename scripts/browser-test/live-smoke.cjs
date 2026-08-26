// Live smoke test: web-customer (3001) and web-admin (3000) against freshly deployed state
const { chromium } = require('C:/Users/lucci/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs = require('fs');
fs.mkdirSync('artifacts/browser-test/live', { recursive: true });

const CUSTOMER = '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65'; // Elena Gómez (cliente KYC, 1000 EURT)
const OWNER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // owner/admin

const FAKE_SIG = '0x' + 'ab'.repeat(65);
function walletInit(acct) {
  return `
  (() => {
    const acct = '${acct}';
    const rpc = 'http://127.0.0.1:8545';
    const listeners = {};
    let seq = 1;
    const provider = {
      isMetaMask: true,
      request: async ({ method, params = [] }) => {
        switch (method) {
          case 'eth_requestAccounts':
          case 'eth_accounts': return [acct];
          case 'eth_chainId': return '0x7a69';
          case 'net_version': return '31337';
          case 'personal_sign':
          case 'eth_sign':
          case 'eth_signTypedData':
          case 'eth_signTypedData_v4': return '${FAKE_SIG}';
          case 'wallet_switchEthereumChain': return null;
          case 'wallet_addEthereumChain':
          case 'wallet_watchAsset': return null;
          default: {
            const res = await fetch(rpc, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', method, params, id: seq++ }) });
            const json = await res.json();
            if (json.error) { const e = new Error(json.error.message); e.code = json.error.code; throw e; }
            return json.result;
          }
        }
      },
      on: (e, h) => { (listeners[e] = listeners[e] || []).push(h); },
      removeListener: () => {},
      removeAllListeners: () => {},
    };
    Object.defineProperty(window, 'ethereum', { value: provider, writable: false });
  })();
  `;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = {};

  // ============ CUSTOMER 3001 ============
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES' });
    await ctx.addInitScript(walletInit(CUSTOMER));
    const page = await ctx.newPage();
    const alerts = [];
    page.on('dialog', async (d) => { alerts.push(d.message()); await d.accept().catch(() => {}); });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(4000);
    // Connect wallet via header
    const btn = page.locator('button:has-text("Conectar Billetera Web3")').first();
    if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(3000); }
    const headerText = (await page.locator('header').textContent().catch(() => '')).replace(/\s+/g, ' ').slice(0, 260);
    report.customerHeader = headerText;

    // Add a product to cart and check the balance widget
    await page.goto('http://127.0.0.1:3001/products/10', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('button:has-text("Adjuntar al Carrito")', { timeout: 30000 }).catch(() => {});
    await page.locator('button:has-text("Adjuntar al Carrito")').first().click().catch(() => {});
    await page.waitForTimeout(2500);
    await page.goto('http://127.0.0.1:3001/cart', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(4000);
    const balArea = (await page.locator('div', { hasText: 'Disponible en Wallet' }).first().textContent().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 220);
    report.customerCartBalance = balArea;
    const payBtn = page.locator('button:has-text("Pagar Factura en Pasarela Web3")').first();
    report.customerPayEnabled = await payBtn.isEnabled().catch(() => null);
    await page.screenshot({ path: 'artifacts/browser-test/live/customer-cart.png' });
    report.customerConsoleErrors = errors.slice(0, 3);
    await ctx.close();
  }

  // ============ ADMIN 3000 ============
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES' });
    await ctx.addInitScript(walletInit(OWNER));
    const page = await ctx.newPage();
    const alerts = [];
    page.on('dialog', async (d) => { alerts.push(d.message()); await d.accept().catch(() => {}); });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
    page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 200)));

    await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(4000);
    const btn = page.locator('button:has-text("Conectar Wallet")').first();
    if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(3000); }
    const homeText = (await page.locator('body').textContent().catch(() => '')).replace(/\s+/g, ' ').slice(0, 700);
    report.adminHome = homeText;
    await page.screenshot({ path: 'artifacts/browser-test/live/admin-home.png' });

    // /systems without owner role (fresh context, no wallet connect)
    await page.goto('http://127.0.0.1:3000/systems', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(3000);
    const systemsText = (await page.locator('body').textContent().catch(() => '')).replace(/\s+/g, ' ').slice(0, 600);
    report.adminSystems = systemsText;
    await page.screenshot({ path: 'artifacts/browser-test/live/admin-systems.png' });
    report.adminConsoleErrors = [...new Set(errors)].slice(0, 6);
    await ctx.close();
  }

  await browser.close();
  fs.writeFileSync('artifacts/browser-test/live/smoke.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
})();
