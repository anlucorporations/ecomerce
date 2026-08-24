# Pasarela de Pago EuroToken (BARLO-VENTAS)

Pasarela de pago Web3 construida con Next.js (App Router) que permite autorizar
pagos con **EuroToken (EURT)** en **Anvil (chainId 31337)** conectando MetaMask.
El flujo real vive en `src/app/page.tsx` (componente `PaymentGatewayContent`).

> ⚠️ **Nota histórica:** `src/app/components/PaymentGateway.tsx` (versión legacy
> para red Besu 81234 con parámetros `merchant_address/address_customer/invoice/date`
> y envs `NEXT_PUBLIC_EUROTOKEN_CONTRACT_ADDRESS`) fue **eliminado** por estar sin
> uso: ningún componente ni página lo importa. Si necesitas esa integración legacy,
> recupérala desde el historial de Git.

## Características

- ✅ Conexión MetaMask (EIP-1193) y auto-detección de cuenta
- ✅ Validación de inscripción del cliente en el contrato `Ecommerce`
- ✅ Verificación de saldo EURT antes de procesar
- ✅ `approve()` + `processPayment()` en la custodia Escrow
- ✅ Validación estricta del query string (evita `BigInt(NaN)`)
- ✅ Allowlist de redirección post-pago (sin open redirect)
- ✅ `postMessage` con `targetOrigin` explícito (nunca `"*"`)
- ✅ API `/api/process-payment` con verificación on-chain del receipt

## Tecnologías

- **Framework:** Next.js 15 (App Router) · puerto `3002`
- **Blockchain:** ethers.js 6 · Anvil `http://127.0.0.1:8545` · chainId `31337`
- **Estilos:** Tailwind CSS 3 (config en `tailwind.config.ts` con `content`)

## Requisitos previos

- Node.js 20+
- MetaMask (red localhost 8545, chainId 31337)
- Anvil corriendo con límite de tamaño de código ampliado:

```bash
anvil --code-size-limit 100000
```

- Contratos desplegados: `EuroTokenOptimized` y `Ecommerce`
  (usa `./deploy-all.sh` o `./simple-deploy.sh` en la raíz del repo)

## Instalación

```bash
npm install
npm run dev   # http://localhost:3002
```

## Configuración (variables reales)

Copia `.env.local` con las variables que usa el código actual
(`src/app/page.tsx` y `src/app/api/process-payment/route.ts`):

```bash
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=31337

# Direcciones reales de los contratos (las genera deploy-all.sh)
NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS=0x...
NEXT_PUBLIC_EURO_TOKEN_ADDRESS=0x...

# Orígenes permitidos (allowlist de redirectUrl y postMessage)
NEXT_PUBLIC_WEB_CUSTOMER_URL=http://localhost:3001
NEXT_PUBLIC_WEB_ADMIN_URL=http://localhost:3000
NEXT_PUBLIC_COMPRA_STABLECOIN_URL=http://localhost:3003
```

Si una variable de contrato falta, se usan fallbacks de Anvil:
`NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS` → `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707`
y `NEXT_PUBLIC_EURO_TOKEN_ADDRESS` → `0x5FbDB2315678afecb367f032d93F642f64180aa3`.

## Uso (parámetros reales de `page.tsx`)

| Parámetro     | Tipo   | Descripción                                          | Requerido |
|---------------|--------|------------------------------------------------------|-----------|
| `merchant`    | string | Nombre del comercio (saneado, máx. 100 chars)        | ❌ (default: "Tienda BARLO-VENTAS") |
| `amount`      | number | Monto en EURT, **numérico > 0** (ej. `10.00`)        | ❌ (default: 10.00) |
| `invoiceId`   | number | ID de factura/orden, **entero positivo** si se envía  | ❌ (default: 1) |
| `redirectUrl` | string | URL post-pago — solo hosts de la allowlist            | ❌ (default: `{WEB_CUSTOMER_URL}/orders`) |

Ejemplo:

```
http://localhost:3002/?merchant=BARLO-VENTAS&amount=10.00&invoiceId=42&redirectUrl=http://localhost:3001/orders
```

### Seguridad de la redirección

`redirectUrl` solo se acepta si su `host` está en la allowlist
(`NEXT_PUBLIC_WEB_CUSTOMER_URL`, `NEXT_PUBLIC_WEB_ADMIN_URL`,
`NEXT_PUBLIC_COMPRA_STABLECOIN_URL` o `localhost`/`127.0.0.1`). Cualquier otra
URL cae al default `{WEB_CUSTOMER_URL}/orders`. El `postMessage` hacia la ventana
padre usa como `targetOrigin` el origin de `document.referrer` cuando pertenece a
la misma allowlist; en caso contrario no se envía.

## Flujo de pago

1. Validación del query string (`amount` > 0, `invoiceId` entero si existe)
2. Conexión MetaMask y verificación de inscripción en `Ecommerce`
3. Verificación de saldo EURT
4. `approve()` del EuroToken hacia el contrato `Ecommerce` (si falta allowance)
5. `processPayment(customer, amount, invoiceId)` → custodia Escrow
6. Confirmación con `txHash` + `postMessage(PAYMENT_SUCCESS)` + redirect

## API

### POST /api/process-payment

Verifica el receipt on-chain de la transacción antes de responder:

| Estado del receipt       | `status`    | `success` | HTTP |
|--------------------------|-------------|-----------|------|
| receipt status `1`       | `completed` | `true`    | 200  |
| receipt no encontrado    | `pending`   | `false`   | 202  |
| receipt status `0`       | `failed`    | `false`   | 422  |

**Request:**
```json
{
  "transactionHash": "0x...",
  "merchantAddress": "0x...",
  "customerAddress": "0x...",
  "amount": "10.00",
  "invoice": "42",
  "date": "2025-10-14T12:00:00Z"
}
```

**Response (200):**
```json
{
  "success": true,
  "transactionHash": "0x...",
  "paymentData": { "merchant_address": "0x...", "address_customer": "0x...", "amount": "10.00", "invoice": "42", "date": "2025-10-14T12:00:00Z" },
  "processedAt": "2025-10-14T12:00:05Z",
  "status": "completed",
  "verification": { "receiptStatus": 1, "blockNumber": 12 }
}
```

### GET /api/process-payment?transactionHash=0x...

Devuelve `{ transactionHash, status, verifiedAt, verification }` con el mismo
criterio de estados (200/202/422).

## Estructura

```
pasarela-de-pago/
├── src/app/
│   ├── page.tsx                  # Pasarela real (A12: validación + allowlist)
│   ├── components/
│   │   └── PaymentGatewayDirect.tsx  # Vista de prueba (solo lee parámetros)
│   ├── api/process-payment/route.ts  # Verificación on-chain
│   └── test/page.tsx             # Página de prueba (PaymentGatewayDirect)
├── tailwind.config.ts            # Tailwind con `content` (B12)
└── package.json
```

## Limitaciones conocidas

- Solo funciona con EuroToken de 6 decimales y MetaMask
- La verificación del receipt en `/api/process-payment` es básica (estado del
  receipt); para producción conviene validar también emisor, monto y destinatario
  del evento del contrato
- No persiste pagos en base de datos
