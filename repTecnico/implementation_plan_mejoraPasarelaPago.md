# Plan Ajustado de Reconstrucción y Optimización: Pasarela de Pago Web3 & Compra EURT (Stripe)

Este documento presenta el plan técnico integral para la reconstrucción y optimización de los servicios de **Pasarela de Pago Web3 (`pasarela-de-pago`)**, **Compra de EuroToken EURT (`compra-stablecoin`)** e **Integración Global con el Frontend de `web-customer`**.

---

## 🎯 Directivas del Usuario Incorporadas en el Plan

1. **Integración Global con `web-customer` (Puerto 3001):** Sincronización completa con el storefront, carrito de compras, pedidos, finanzas y menú desplegable mediante proveedor global Web3.
2. **Microservicio Independiente en Puerto 3003:** El servicio `compra-stablecoin` se mantendrá como una aplicación/API independiente en `http://localhost:3003`.
3. **Entorno Local Exclusivo Anvil:** Desarrollo y ejecución 100% sobre el nodo local **Anvil** (`http://localhost:8545`).
4. **Simulador Embebido de Stripe Webhooks (Puerto 3003):** Endpoint `/api/webhooks/simulate` para simular eventos `payment_intent.succeeded` localmente sin depender de la CLI de Stripe ni túneles externos.
5. **Optimización con API de Stripe:** Arquitectura en 2 fases con `PaymentIntents` + `Webhooks` idempotentes.

---

## 📸 Diagrama Arquitectónico de la Solución Optimizada

![Diagrama Arquitectónico de la Pasarela de Pago y Recarga EURT Optimizada](file:///C:/Users/lucci/.gemini/antigravity/brain/25a8dcf4-79a8-488e-80ce-1c4be7e8b044/optimized_stablecoin_architecture_diagram_1786583414008.jpg)

---

## 🌐 Integración Completa con el Frontend Global de `web-customer` (Puerto 3001)

La arquitectura integrará de forma nativa todos los flujos de pago y recarga dentro del ecosistema de `web-customer`:

### 1. Proveedor de Estado Global (`Web3PaymentProvider`)
- Unifica el estado de conexión de MetaMask, balance en EURT (6 decimales) y saldo ETH en todas las páginas (`/`, `/products`, `/cart`, `/orders`, `/finance`, `/profile`, `/topup`).
- Refresco automático e instantáneo de saldos ante eventos de recarga o liquidación.

### 2. Checkout en Carrito con Firma en 1 Clic (ERC-2612 Permit en `/cart`)
- El carrito reemplaza el flujo de 2 transacciones por una **firma EIP-712 Permit sin gas** seguida de la transacción atómica de depósito en Escrow.
- Si el cliente no dispone del excedente de 1.50 EURT (`eurtBalance < total + 1.50 EURT`), la interfaz deshabilita el botón de pago y muestra los accesos a la sección `/topup` o al modal flotante `StripeTopupModal`.

### 3. Seguimiento de Pedidos y Liberación Inmediata de Escrow (`/orders`)
- **Panel de 2 Columnas:** Muestra el listado de compras a la izquierda y el detalle/guía de despacho a la derecha.
- **Liberación de Fondos al Firmar:** Al presionar *"✍️ Firmar Entrega Recibida"*, el contrato transfiere inmediatamente el 100% de los EuroTokens retenidos a la wallet de la empresa.
- **Sistema de Reputación con Calificación Automática tras 24h:** Habilita la calificación voluntaria de 1 a 5 estrellas. Si transcurren 24 horas sin opinión, aplica automáticamente `4 / 5 ★` (*"Valoracion por default del cliente"*).

### 4. Sección Oficial de Recarga (`/topup`) y Modal Flotante (`StripeTopupModal`)
- Sección dedicada en `web-customer` con diseño `Azul Caribe`, `Naranja Cacao Sol` y `Verde Manglar`, formulario con simulador PCI-DSS y botón *"⚡ Simular Webhook Stripe (`payment_intent.succeeded`)"*.

---

## 🧪 Simulador Local de Stripe Webhooks (`/api/webhooks/simulate` - Puerto 3003)

```
[Prueba Local en Frontend / Postman]
       │
       │  POST /api/webhooks/simulate
       │  Payload: { amount: "50", walletAddress: "0x...", paymentIntentId: "pi_sim_123" }
       ▼
[compra-stablecoin API (:3003)]
       │
       │  1. Genera payload identico a Stripe Event (payment_intent.succeeded)
       │  2. Ejecuta pipeline de verificacion idempotente
       ▼
[Minteo On-Chain en Anvil (8545)] ──> euroTokenContract.mint(walletAddress, 50_000_000)
```

---

## 📊 Matriz Comparativa: Estado Actual vs. Estado Optimizado Propuesto

| Capa / Componente | Estado Actual | Propuesta de Reconstrucción Optimizada | Beneficio de Mejora |
| :--- | :--- | :--- | :--- |
| **Smart Contract ERC-20** | OpenZeppelin `ERC20` + `Ownable`. Requiere 2 transacciones (`approve` + `processPayment`). | **ERC-2612 (Permit)** + `AccessControl` + `Pausable`. | **Pago en 1 solo clic (Gasless Approval)** mediante firma EIP-712 sin comisiones dobles de gas. |
| **Frontend `web-customer`** | Manejo de estado por página sin sincronización de balances global. | **`Web3PaymentProvider`** + Sección `/topup` + Checkout Permit en 1 Clic + Drawer `/orders`. | Experiencia fluida sin recargas completas de página ni inconsistencias de saldo. |
| **Microservicio Stripe** | Minteo síncrono en puerto 3003 sin webhooks ni idempotencia. | **Microservicio Independiente en Puerto 3003** con `PaymentIntents` + Webhooks + Simulador Local. | Cumplimiento estricto de Stripe PCI-DSS, alta disponibilidad y pruebas autónomas sin dependencias externas. |
| **Simulación de Eventos** | Requiere comandos externos o peticiones síncronas. | **Simulador `/api/webhooks/simulate`** embebido en el puerto 3003. | Pruebas locales instantáneas de minteo y confirmación asíncrona. |
| **Red Blockchain** | Nodos locales y claves estáticas sin relayer. | **Nodo Local Anvil (`http://localhost:8545`)** con Relayer y cola de transacciones. | Cero colisiones de Nonce (`NonceTooLow`) en Anvil y despacho veloz (< 1 seg). |

---

## 🛠️ Detalle de Componentes a Desarrollar

### 1. Smart Contracts Optimizado (`sc/src/EuroTokenOptimized.sol`)
- **ERC-2612 Permit:** Autorizaciones mediante firma criptográfica EIP-712 sin consumo de gas antes del pago.
- **AccessControl (RBAC):** Asignación del rol `MINTER_ROLE` a la cuenta relayer del puerto `3003`.

### 2. Frontend Global `web-customer` (Puerto 3001)
- **`Web3PaymentProvider.tsx`**: Proveedor global de contexto para wallet, balances y ciclo de pagos.
- **`src/app/cart/page.tsx`**: Checkout optimizado con firma EIP-712 Permit en 1 clic y validación de excedente +1.50 EURT.
- **`src/app/topup/page.tsx`**: Sección oficial de recarga con simulación de tarjeta Stripe e integración on-chain.
- **`src/app/orders/page.tsx`**: Panel de 2 columnas con liberación inmediata de Escrow y valoración automática a las 24h.

### 3. Microservicio Independiente `compra-stablecoin` (Puerto 3003)
- **`POST /api/checkout`**: Genera el `PaymentIntent` y retorna el `clientSecret`.
- **`POST /api/webhooks/stripe`**: Handler de webhooks reales con verificación de firma raw body.
- **`POST /api/webhooks/simulate`**: Simulador local de eventos `payment_intent.succeeded` para Anvil.

### 4. Pasarela Web3 (`pasarela-de-pago` - Puerto 3002)
- Integración de firma EIP-712 Permit en 1 solo clic para depósito inmediato en Custodia Escrow.

---

## ⚠️ User Review Required

> [!IMPORTANT]
> **Integración Global en `web-customer`:** El proveedor `Web3PaymentProvider` envolverá a toda la aplicación `web-customer` en `layout.tsx`, garantizando que cualquier recarga realizada en `/topup` o en la pasarela actualice instantáneamente el saldo EURT en el menú de usuario y en el carrito.

---

## 🏗️ Proposed Changes

### Layer 1: Smart Contracts (`sc/`)

#### [NEW] [EuroTokenOptimized.sol](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/stablecoin/sc/src/EuroTokenOptimized.sol)
- Implementación de ERC-20 con ERC-2612 Permit, AccessControl y Pausable.

#### [NEW] [DeployEuroTokenOptimized.s.sol](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/stablecoin/sc/script/DeployEuroTokenOptimized.s.sol)
- Script de despliegue en Anvil con asignación de `MINTER_ROLE`.

---

### Layer 2: Frontend Global `web-customer` (Puerto 3001)

#### [NEW] [Web3PaymentProvider.tsx](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/web-customer/src/providers/Web3PaymentProvider.tsx)
- Proveedor de contexto global para wallet Web3, saldos EURT/ETH y eventos de pago.

#### [MODIFY] [layout.tsx](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/web-customer/src/app/layout.tsx)
- Inclusión del proveedor `Web3PaymentProvider` y barra de navegación unificada.

#### [MODIFY] [cart/page.tsx](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/web-customer/src/app/cart/page.tsx)
- Checkout optimizado con firma EIP-712 Permit en 1 clic.

#### [MODIFY] [orders/page.tsx](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/web-customer/src/app/orders/page.tsx)
- Drawer de pedidos con liberación de Escrow en tiempo real y rating automático a las 24h.

---

### Layer 3: Microservicio Compra EURT / Stripe (`compra-stablecoin/` - Puerto 3003)

#### [NEW] [route.ts (Webhook Simulator)](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/stablecoin/compra-stablecoin/src/app/api/webhooks/simulate/route.ts)
- Simulador local de eventos `payment_intent.succeeded` para pruebas autónomas en Anvil.

#### [NEW] [route.ts (Webhook Listener Real)](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/stablecoin/compra-stablecoin/src/app/api/webhooks/stripe/route.ts)
- Handler asíncrono para eventos reales de Stripe.

#### [MODIFY] [route.ts (Checkout API)](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/stablecoin/compra-stablecoin/src/app/api/checkout/route.ts)
- Endpoint optimizado que retorna el `clientSecret` del PaymentIntent.

---

### Layer 4: Pasarela Web3 (`pasarela-de-pago/` - Puerto 3002)

#### [MODIFY] [page.tsx](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/stablecoin/pasarela-de-pago/src/app/page.tsx)
- Integración del flujo de pago en 1 clic mediante firma Permit.

---

## 🧪 Verification Plan

### Automated Tests
- Pruebas unitarias Forge en Anvil: `forge test --match-contract EuroTokenOptimizedTest`.
- Prueba sintética POST a `/api/webhooks/simulate` en el puerto 3003.

### Manual Verification
- Verificación del refresco de saldos en tiempo real en `web-customer` tras realizar una recarga en la sección `/topup`.
- Confirmación del pago en 1 clic con firma Permit en el carrito y depósito inmediato en Escrow.
- Prueba de liberación inmediata de fondos en `/orders` y autoevaluación 4/5★ a las 24h.
