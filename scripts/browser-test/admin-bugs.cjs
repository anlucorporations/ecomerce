// Verify admin landing bugs live: setShowCompanyRegModal ReferenceError + rating display
const { chromium } = require('C:/Users/lucci/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const OWNER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const FAKE_SIG = '0x' + 'ab'.repeat(65);
const walletInit = `
(() => {
  const acct = '${OWNER}';
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

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(walletInit);
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 300)));
  const alerts = [];
  page.on('dialog', async (d) => { alerts.push(d.message()); await d.accept().catch(() => {}); });

  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(4000);
  const btn = page.locator('button:has-text("Conectar Wallet")').first();
  if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(2500); }

  // Try the "Inscribir Empresa" button
  const regBtn = page.locator('button:has-text("Inscribir Empresa")').first();
  const regVisible = await regBtn.isVisible().catch(() => false);
  if (regVisible) {
    await regBtn.click();
    await page.waitForTimeout(1500);
  }
  const ratingText = (await page.locator('body').textContent().catch(() => '')).replace(/\s+/g, ' ').match(/.{0,80}(Rating|Reputaci|⭐|★|5\.0).{0,120}/gi) || [];
  console.log(JSON.stringify({ regButtonVisible: regVisible, pageErrors, alerts, ratingSnippets: ratingText.slice(0, 4) }, null, 2));
  await browser.close();
  process.exit(0);
})();
