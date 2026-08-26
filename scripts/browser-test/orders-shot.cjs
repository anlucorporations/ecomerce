// Screenshot the /orders page after a successful purchase (fixed-env instance)
const { chromium } = require('C:/Users/lucci/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs = require('fs');

const ACCOUNT = '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65';
const BASE = 'http://127.0.0.1:3010';
const OUT = 'artifacts/browser-test/fixed';
fs.mkdirSync(OUT, { recursive: true });

const FAKE_SIG = '0x' + 'ab'.repeat(65);
const walletInit = `
(() => {
  const acct = '${ACCOUNT}';
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
  localStorage.setItem('walletConnected', 'true');
  localStorage.setItem('walletAddress', acct);
})();
`;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES' });
  await context.addInitScript(walletInit);
  const page = await context.newPage();
  const alerts = [];
  page.on('dialog', async (d) => { alerts.push(d.message()); await d.accept().catch(() => {}); });

  await page.goto(BASE + '/orders', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: OUT + '/07-orders.png' });
  const bodyText = (await page.locator('body').textContent().catch(() => '')).replace(/\s+/g, ' ').slice(0, 1200);
  console.log('ORDERS PAGE TEXT:\n', bodyText);
  console.log('ALERTS:', JSON.stringify(alerts));
  await browser.close();
  process.exit(0);
})();
