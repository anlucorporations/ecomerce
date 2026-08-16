# Plan de Reconstrucción y Optimización Integral: Pasarela de Pago Web3 & Compra EURT (Stripe)

Este documento establece el plan técnico y arquitectónico para la reconstrucción optimizada de los servicios de **Pasarela de Pago Web3 (`pasarela-de-pago`)** y **Compra de EuroToken EURT (`compra-stablecoin`)**, abarcando la capa de contratos inteligentes, la arquitectura del backend asíncrono y el sistema de diseño e interacción del frontend.

---

## 📸 Diagrama Arquitectónico de la Solución Optimizada

![Diagrama Arquitectónico de la Pasarela de Pago y Recarga EURT Optimizada](file:///C:/Users/lucci/.gemini/antigravity/brain/25a8dcf4-79a8-488e-80ce-1c4be7e8b044/optimized_stablecoin_architecture_diagram_1786583414008.jpg)

---

## 📊 Matriz Comparativa: Estado Actual vs. Estado Optimizado Propuesto

| Capa / Componente | Estado Actual (Línea Base) | Propuesta de Reconstrucción Optimizada | Beneficio / Puntos de Mejora |
| :--- | :--- | :--- | :--- |
| **Smart Contract ERC-20** | Standard OpenZeppelin `ERC20` + `Ownable`. Requiere 2 transacciones (`approve` + `processPayment`). | Implementación de **ERC-2612 (Permit)** + `AccessControl` + `Pausable`. | **Pago en 1 solo clic (Gasless Approval)** mediante firma EIP-712 sin requerir aprobaciones previas con gas. |
| **Backend Stripe (On-Ramp)** | Minteo síncrono en `POST /api/checkout` con clave privada estática. | Procesamiento asíncrono con **Stripe Webhooks (`/api/webhooks/stripe`)** + Cola Idempotente. | Elimina el riesgo de doble minteo ante caídas de red y garantiza retencion / retries ante re-orgs de la blockchain. |
| **Relayer de Transacciones** | Conexión direct-to-node desde frontend o API sin gestión de Nonce. | **Relayer de Transacciones (Queue)** con gestión dinámica de Nonce y Gas Bumping. | Evita colisiones de transacciones (`NonceTooLow`) y atascamientos cuando múltiples usuarios compran simultáneamente. |
| **Notificación en Tiempo Real** | Polling periódico por cliente HTTP en `web-customer`. | **WebSockets / Server-Sent Events (SSE)** en `/api/events`. | Actualización instantánea (< 500ms) de saldos y confirmación de Custodia Escrow sin sobrecargar el nodo RPC. |
| **Frontend & UX Web3** | Manejo de estado local por componente sin proveedor global. | **`Web3PaymentProvider`** + Contexto de estado unificado + UI Optimista. | Reconexión automática de billetera, manejo transparente de firmas y feedback de progreso paso a paso. |

---

## 🛠️ Detalle de Puntos de Mejora Técnicos

### 1. Smart Contracts (`sc/src/EuroTokenOptimized.sol`)
1. **Firma EIP-712 / ERC-2612 Permit:**
   - Permite al comprador firmar digitalmente una autorización off-chain sin gastar gas. El contrato `Ecommerce.sol` ejecuta la verificación de firma y el cobro en una **única transacción atómica**.
2. **Control de Acceso Basado en Roles (`AccessControl`):**
   - Sustituye `Ownable` por roles finos: `MINTER_ROLE` (para la API de recarga de Stripe), `ADMIN_ROLE` (para gobernanza) y `PAUSER_ROLE` (circuito de emergencia).
3. **Interruptor de Emergencia (`Pausable`):**
   - Pausado inmediato de acuñaciones y transferencias en caso de detectar anomalías o brechas de seguridad.

### 2. Backend & Microservicios Asíncronos
1. **Procesamiento de Eventos Stripe vía Webhooks:**
   - Creación del webhook `/api/webhooks/stripe` respaldado por `stripe.events.constructEvent`.
   - Garantiza que la acuñación de EURT ocurra de forma **idempotente y resiliente** solo cuando Stripe confirme `payment_intent.succeeded`.
2. **Gestor de Relayer y Nonce (`RelayerService`):**
   - Cola FIFO (Redis/BullMQ) que administra el envío de transacciones on-chain, reintentos con incremento de gas (*gas bumping*) y reconciliación de recibos.
3. **Stream de Eventos WebSocket:**
   - Servidor SSE/WebSocket que notifica a `web-customer` y `web-admin` en el segundo exacto en que la orden pasa a `PAGADO_EN_CUSTODIA`.

### 3. Frontend & Arquitectura UI/UX
1. **Proveedor Unificado (`Web3PaymentProvider`):**
   - Contexto React global que mantiene la sincronía de balances (EURT/ETH), red activa, cuenta conectada y transacciones pendientes.
2. **Sistema de Formas Geométricas y Tokens Visuales:**
   - Controles de entrada (`.input-minimal`), botones de acción (`.btn-minimal-primary`) y píldoras de monto (`.btn-preset-pill`) estandarizados.
3. **Manejo de Errores & Fallbacks Elegantes:**
   - Error Boundaries en Next.js para aislar fallas RPC sin romper la experiencia del cliente.

---

## ⚠️ User Review Required

> [!IMPORTANT]
> **Optimización de Pagos ERC-2612 (Permit):** Esta mejora reducirá de 2 transacciones a 1 sola firma del usuario durante el checkout en el carrito, mejorando drásticamente la tasa de conversión.

> [!NOTE]
> **Webhook de Stripe:** Requiere configurar la clave secreta del webhook (`STRIPE_WEBHOOK_SECRET`) en las variables de entorno `.env.local` del microservicio `compra-stablecoin`.

---

## ❓ Open Questions

1. ¿Desea mantener el microservicio de recarga Stripe (`compra-stablecoin`) como un servicio de API independiente en el puerto `3003` o prefiere consolidarlo dentro del backend serverless de `web-customer`?
2. ¿Se requiere integración con alguna red Testnet pública (ej. Sepolia / Arbitrum Sepolia) además del nodo local Anvil?

---

## 🏗️ Proposed Changes

### Layer 1: Smart Contracts (`sc/`)

#### [NEW] [EuroTokenOptimized.sol](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/stablecoin/sc/src/EuroTokenOptimized.sol)
- Implementación de ERC-20 + ERC-2612 Permit + AccessControl + Pausable.

#### [NEW] [DeployEuroTokenOptimized.s.sol](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/stablecoin/sc/script/DeployEuroTokenOptimized.s.sol)
- Script Forge para desplegar el token optimizado con asignación de roles `MINTER_ROLE`.

---

### Layer 2: Microservicio Compra EURT / Stripe (`compra-stablecoin/`)

#### [NEW] [route.ts (Stripe Webhook)](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/stablecoin/compra-stablecoin/src/app/api/webhooks/stripe/route.ts)
- Handler asíncrono e idempotente de webhooks de Stripe para emisión de EURT.

#### [MODIFY] [route.ts (Checkout API)](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/stablecoin/compra-stablecoin/src/app/api/checkout/route.ts)
- Retorna el `client_secret` de PaymentIntent para confirmación segura en frontend sin minteo síncrono bloqueante.

---

### Layer 3: Microservicio Pasarela Web3 (`pasarela-de-pago/`)

#### [MODIFY] [page.tsx](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/stablecoin/pasarela-de-pago/src/app/page.tsx)
- Integración de flujo de firma EIP-712 (Permit) y visualización gráfica de estados en tiempo real.

---

## 🧪 Verification Plan

### Automated Tests
- **Smart Contract Tests:** `forge test --match-contract EuroTokenOptimizedTest` (Pruebas unitarias de permit, minting y roles).
- **Backend API Integration Tests:** Ejecución de pruebas HTTP sintéticas simulando eventos de Webhooks con Stripe CLI (`stripe trigger payment_intent.succeeded`).

### Manual Verification
- Pruebas E2E de recarga con tarjeta de prueba Visa en `compra-stablecoin` y verificación del balance final en `web-customer`.
- Verificación del flujo de pago en 1 clic mediante firma Permit en la pasarela de pago.
