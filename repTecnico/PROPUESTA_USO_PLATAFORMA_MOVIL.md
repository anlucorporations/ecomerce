# 📱 Propuesta: Uso de la Plataforma BARLO-VENTAS desde el Móvil (Conexión de Billetera)

**Fecha:** 2026-08-26 · **Autor:** Auditoría/Desarrollo BARLO-VENTAS · **Estado:** Propuesta

---

## 1. Diagnóstico del problema

Al abrir la plataforma desde el móvil **no se conecta la billetera instalada en el teléfono**. Causa raíz verificada en el código:

- Todo el flujo de conexión (`web-customer/src/hooks/useWallet.ts`, `web-customer/src/providers/Web3PaymentProvider.tsx`, `web-admin/src/hooks/useWallet.ts`, `web-admin/src/components/wallet-connect.tsx`) usa **exclusivamente `window.ethereum`** (protocolo EIP-1193 inyectado por la extensión del navegador de escritorio):

  ```ts
  // useWallet.ts:39
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not installed');
  }
  ```

- **En el móvil, los navegadores estándar (Chrome Android / Safari iOS) NO inyectan `window.ethereum`.** Las billeteras móviles (MetaMask, Trust Wallet, Rabby, Rainbow, Coinbase Wallet…) solo lo inyectan **dentro de su navegador integrado (in-app browser)** o mediante el protocolo **WalletConnect (EIP-1193 por puente QR/deep-link)**.

- La librería `mipd` (detección EIP-6963) está instalada, pero el flujo real de `connect()` no la aprovecha y **no hay WalletConnect / Reown AppKit** en las dependencias (`package.json` de ambas apps solo tiene `mipd`).

**Conclusión:** hoy la plataforma **sí funciona en móvil, pero únicamente abriéndola dentro del navegador integrado de la propia billetera** (opción A). Para conectarla desde Chrome/Safari del teléfono (con QR) hace falta integrar WalletConnect (opción B).

---

## 2. Opción A — Inmediata, sin desarrollo (funciona HOY)

Usar el **navegador integrado (in-app browser)** de la billetera móvil, que inyecta `window.ethereum` y es compatible con el código actual.

### A.1 Desde la demo en GCP (recomendado para móvil)

1. Instalar la billetera en el teléfono: **MetaMask**, **Trust Wallet**, **Rabby** o **Rainbow**.
2. Abrir la **URL pública de la plataforma** desde el navegador de la billetera:
   - Storefront: `https://mcc-web-customer-1095249147821.europe-west1.run.app`
   - Admin: `https://mcc-web-admin-1095249147821.europe-west1.run.app`
3. Añadir la **red local Anvil GCP** (chainId `31337`, RPC `https://mcc-foundry-anvil-1095249147821.europe-west1.run.app` — el endpoint es privado; para la demo el RPC se resuelve en el servidor, la wallet solo firma).
4. Pulsar **"Conectar Billetera Web3"** → la billetera in-app pide confirmación → conectada.
5. Importar el token **EURT** (`0x5FbDB2315678afecb367f032d93F642f64180aa3`, decimals 6) para ver saldo.

### A.2 Deep links para abrir directamente el navegador de la billetera

| Billetera | Formato |
|---|---|
| MetaMask | `https://metamask.app.link/dapp/<dominio-plataforma>` |
| Trust Wallet | `https://link.trustwallet.com/open_url?coin_id=60&url=<url-encoded>` |
| Coinbase Wallet | `https://go.cb-w.com/dapp?cb_url=<url-encoded>` |
| Rabby (extensión móvil) | Abrir la app → Navegador → pegar la URL |

*Ejemplo MetaMask:* `https://metamask.app.link/dapp/mcc-web-customer-1095249147821.europe-west1.run.app`

### A.3 Desde la plataforma LOCAL (red Wi-Fi doméstica)

- El teléfono **no puede usar `localhost`** — debe usar la **IP LAN de la máquina**:
  1. Obtener IP: `ipconfig` en la máquina (p.ej. `192.168.1.50`).
  2. En el teléfono: `http://192.168.1.50:3001` (storefront) o `:3000` (admin).
  3. Abrir esa URL en el **navegador de la billetera** (in-app).
- ⚠️ Limitaciones: las billeteras móviles suelen exigir **HTTPS** para WalletConnect y a veces bloquean IPs de LAN en in-app browser; si falla, usar la demo GCP.

**Coste:** 0 horas · **Riesgo:** bajo · **Limitación:** el usuario debe saber usar el navegador de la billetera.

---

## 3. Opción B — Recomendada: integrar WalletConnect v2 (@reown/appkit)

Permite conectar la billetera móvil desde **cualquier navegador** (Chrome/Safari) escaneando un **QR** (o con deep link directo), sin depender del navegador integrado. Es el estándar actual de la industria (EIP-1193 por puente).

### B.1 Arquitectura resultante

```
Navegador móvil (Chrome/Safari) ──► Web App (web-customer / web-admin)
        │  QR / deep-link
        ▼
  Reown AppKit (WalletConnect v2) ──► Billetera móvil (MetaMask/Trust/Rabby/...)
        │
        ▼
  Provider EIP-1193 unificado ──► ethers BrowserProvider ──► Contratos (Anvil/31337)
```

- El resto de la plataforma **no cambia**: `ethers.BrowserProvider(providerEIP1193)` sigue funcionando para `signMessage` (autorizaciones Web3), `eth_sendTransaction` y `eth_accounts`.
- Se mantiene el soporte de escritorio (extensión `window.ethereum`) y se añade el móvil.

### B.2 Pasos de implementación (por app: `web-customer` y `web-admin`)

**1. Instalar dependencias**

```bash
npm install @reown/appkit @reown/appkit-adapter-wagmi wagmi viem @tanstack/react-query
# o, versión ligera sin wagmi:
npm install @walletconnect/ethereum-provider @walletconnect/modal
```

**2. Obtener un Project ID gratuito** en https://cloud.reown.com (se requiere para WalletConnect v2; es público, va en el cliente).

**3. Crear el proveedor unificado** (`src/lib/wallet/providers.ts`):

```ts
import { createAppKit } from '@reown/appkit';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, type AppKitNetwork } from '@reown/appkit/networks';
import { createConfig, http } from 'wagmi';

// Red BARLO-VENTAS (Anvil local/GCP, chainId 31337)
const barloVentas = {
  id: 31337,
  name: 'BARLO-VENTAS (Anvil)',
  nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545'] } },
} as AppKitNetwork;

const wagmiAdapter = new WagmiAdapter({
  networks: [barloVentas],
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'TU_PROJECT_ID',
  config: { chains: [barloVentas], transports: { [31337]: http() } },
});

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: [barloVentas],
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'TU_PROJECT_ID',
  features: { analytics: true },
});
```

**4. Reemplazar el `connect()` de `useWallet.ts`** para que use AppKit (que resuelve extensión de escritorio **y** WalletConnect móvil):

```ts
// useWallet.ts — connect()
const connect = useCallback(async () => {
  setState((prev) => ({ ...prev, isConnecting: true, error: null }));
  try {
    await appKit.open();                       // abre modal con QR + wallets instaladas
    const provider = await appKit.getProvider(); // EIP-1193 unificado
    if (!provider) throw new Error('No provider');
    const browserProvider = new BrowserProvider(provider);
    const accounts = await browserProvider.send('eth_requestAccounts', []);
    const signer = await browserProvider.getSigner();
    // ... resto igual: address, chainId, localStorage
  } catch (e) { /* manejo de error */ }
}, []);
```

**5. Añadir el botón "Conectar" de AppKit** en el header (`UserDropdown` / `WalletConnect`):

```tsx
import { appKit } from '@/lib/wallet/providers';

<button onClick={() => appKit.open()}>Conectar Billetera Web3</button>
```

**6. Auto-conexión y `accountsChanged`**: usar los hooks de AppKit/wagmi (`useAppKitAccount`, `useAppKitProvider`) o mantener los listeners actuales sobre el provider unificado.

**7. Variables de entorno** (`.env.local` de ambas apps, no versionado):

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=TU_PROJECT_ID
NEXT_PUBLIC_RPC_URL=https://mcc-foundry-anvil-1095249147821.europe-west1.run.app   # o IP LAN local
```

**8. HTTPS obligatorio** para WalletConnect v2 en producción:
- La demo GCP ya es HTTPS ✅ (funciona directamente).
- En local, generar un túnel `ngrok http 3001` / `3000` (HTTPS público) o un certificado autofirmado para la IP LAN.

### B.3 Impacto en el resto de la plataforma (verificado)

| Flujo | ¿Afectado? | Detalle |
|---|---|---|
| `signMessage` (autorización de recarga KYC/topup) | No | `ethers.BrowserProvider` sobre el provider WalletConnect firma igual |
| `eth_sendTransaction` (checkout escrow, registro) | No | Anvil acepta `from` de cuentas desbloqueadas; la wallet móvil firma |
| `switchNetwork` (31337) | Sí | AppKit gestiona `wallet_switchEthereumChain`/`wallet_addEthereumChain` |
| KYC/registro (modal con firma) | No | Solo necesita `signer` |
| Pasarela 3002 (iframe) | No | Hereda el provider de la página padre |

**Coste estimado:** 1–2 días por app (4–6 h app web-customer + 3–4 h web-admin + pruebas en dispositivo).

---

## 4. Opción C — Mejoras complementarias (recomendadas junto a B)

1. **Aprovechar `mipd` (EIP-6963)** ya instalado: listar las wallets detectadas (MetaMask, Rabby, etc.) además del QR, mejorando la UX de escritorio y del navegador integrado móvil.
2. **Deep-link directo desde la UI**: botón "Abrir en MetaMask" (`https://metamask.app.link/dapp/…`) para saltar del navegador estándar al in-app de la billetera (solución de respaldo si WalletConnect no está disponible).
3. **Detección móvil**: si `navigator.userAgent` es móvil y no hay `window.ethereum`, mostrar instrucciones ("abre en el navegador de tu billetera o escanea el QR").
4. **Botón "Escanea para conectar"**: renderizar el QR de WalletConnect de forma nativa (sin abrir el modal) para pantallas pequeñas.

---

## 5. Plan de implementación priorizado

| Fase | Acción | Duración | Entregable |
|---|---|---|---|
| **0** | Documentar en `/help` el uso con el navegador de la billetera + deep links (Opción A) | 2 h | Guía móvil en la plataforma |
| **1** | Integrar AppKit/WalletConnect en `web-customer` (instalar, Project ID, provider unificado, botón, auto-conexión) | 1 día | Conexión QR desde Chrome/Safari móvil |
| **2** | Integrar en `web-admin` (mismo patrón) | 0,5 día | Conexión QR en admin |
| **3** | HTTPS local para pruebas (ngrok o certificado) + pruebas en dispositivo real (Android + iOS, MetaMask + Trust + Rabby) | 0,5 día | Matriz de compatibilidad |
| **4** | (Opcional) EIP-6963 completo + deep-link de respaldo | 0,5 día | UX pulida |

**Total estimado:** ~2,5–3 días-hombre.

---

## 6. Riesgos y notas de seguridad

- **Project ID de Reown es público** (va en el bundle) — no es un secreto; no incluirlo en `.env` versionado.
- **No exponer claves privadas**: la wallet móvil firma localmente; la plataforma nunca debe pedir la private key.
- **Red local vs GCP**: en producción el RPC debe ser el del nodo GCP; en local, la IP LAN. Documentar en `.env.example`.
- **WalletConnect v2 exige HTTPS** en el dominio de la dapp (excepto `localhost`): usar la demo GCP o un túnel.
- Recordar los hallazgos de la auditoría al tocar el código de conexión: mantener la firma obligatoria y no introducir bypass de autorización.

---

## 7. Conclusión

- **Hoy (sin código):** la plataforma ya es usable desde el móvil abriendo la URL en el **navegador integrado de la billetera** (MetaMask/Trust/Rabby) — ver sección 2.
- **Para una experiencia completa (QR desde cualquier navegador):** integrar **WalletConnect v2 con Reown AppKit** en `web-customer` y `web-admin` — sección 3. Es la solución estándar, de bajo riesgo y compatible con el stack actual (ethers + EIP-1193).
- **Recomendación:** aplicar Fase 0 (documentación, inmediata) + Fases 1–2 (AppKit) y probar en dispositivo real antes de liberar.

*Archivo generado por la sesión de auditoría/desarrollo de BARLO-VENTAS.*
