// Proxy RPC local -> GCP Anvil (Cloud Run autenticado). Reenvía peticiones JSON-RPC
// a mcc-foundry-anvil añadiendo el header Authorization: Bearer <identity-token>.
// Uso: node scripts/gcp-rpc-proxy.cjs   (escucha en 127.0.0.1:8545)
const http = require('http');
const { execSync } = require('child_process');

const GCP_RPC = process.env.GCP_RPC_URL || 'https://mcc-foundry-anvil-1095249147821.europe-west1.run.app';
const PORT = 8545;

function getToken() {
  try {
    return execSync('gcloud auth print-identity-token', { encoding: 'utf8' }).trim();
  } catch (e) {
    console.error('No se pudo obtener identity token:', e.message);
    process.exit(1);
  }
}

let token = getToken();
// Renovar token cada 50 minutos (caduca a la hora)
setInterval(() => { try { token = getToken(); console.log('[proxy] token renovado'); } catch (e) {} }, 50 * 60 * 1000);

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 5e6) req.destroy(); });
  req.on('end', async () => {
    try {
      const r = await fetch(GCP_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: body || '{}',
      });
      const text = await r.text();
      res.writeHead(r.status, { 'Content-Type': 'application/json' });
      res.end(text);
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: e.message }, id: null }));
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[proxy] GCP RPC proxy en http://127.0.0.1:${PORT} -> ${GCP_RPC}`);
});
