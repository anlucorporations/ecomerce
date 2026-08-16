# 📘 Manual Técnico: Portal de Clientes (`web-customer`)

**Plataforma BARLO-VENTAS E-Commerce Web3**  
**Puerto Local:** `3001` | **URL:** `http://localhost:3001`

---

## 📋 1. Resumen Ejecutivo
`web-customer` representa el portal e-commerce de cara al comprador final. Ofrece navegación Web3 fluida con detección automática de wallet, registro e inscripción de clientes, carrito de compra con **Flujo de Pago Unificado Directo (1-Step Escrow Direct Payment)**, panel de seguimiento de pedidos con confirmación de entrega y liberación de fondos en custodia, y recarga de stablecoin EURT vía Stripe.

---

## 🛠️ 2. Stack Tecnológico

- **Framework:** Next.js 15 (App Router, Turbopack).
- **Lenguaje:** TypeScript / React 19.
- **Librería Blockchain:** Ethers.js v6.
- **Estilos:** Vanilla CSS / Tailwind CSS.
- **Conexión Web3:** Injected Provider (MetaMask) & RPC Node (`localhost:8545`).

---

## 🛍️ 3. Módulos y Lógica de Negocio

### 💳 A. Flujo Unificado Directo de Pago en Carrito (`/cart`)
Al presionar el botón **`💳 Finalizar Pedido y Pagar con EURT`**, la aplicación ejecuta de manera continua y en 1 solo paso:
1. `createInvoice(companyId, productIds, quantities, totalAmount)` en `Ecommerce.sol`.
2. `euroToken.approve(ecommerceAddress, totalAmount)` en `EuroTokenOptimized.sol`.
3. `ecommerce.processPayment(customerAddress, totalAmount, invoiceId)` ➔ Deposita los EURT directamente en la **Custodia Escrow (`address(this)`)**.
4. Vacía el carrito de compras local y redirige inmediatamente a `/orders`.

### 📦 B. Panel de Pedidos y Confirmación de Entrega (`/orders`)
- **Visualización en 2 Columnas:** Lista de facturas a la izquierda y expediente detallado a la derecha.
- **Confirmación de Entrega y Liberación Escrow:**  
  Boton **`✍️ Firmar Entrega Recibida (Liberar Fondos Inmediatamente)`** ejecuta `confirmDelivery(invoiceId)` en blockchain, liberando los EURT bloqueados en custodia hacia la empresa vendedora.
- **Control Inteligente de Valoración:**  
  Comprueba en blockchain (`getCompanyReviews`) y en almacenamiento local si la compra ya fue valorada. Si la orden ya está valorada, oculta el cuadro de solicitud de calificación y muestra la insignia verde **`✓ Valoración Completada`**.

### 👤 C. Verificación de Inscripción & Perfil (`/profile`, `/components/registration-check.tsx`)
- Detecta si la wallet conectada en MetaMask está registrada como cliente activo en `Ecommerce.sol`.
- Si la wallet no está inscrita, despliega un aviso destacado en la barra de navegación con botón **`📝 Completar Registro`** direccionando a `/profile?register=true`.

---

## ⚙️ 4. Ejecución Local

```bash
cd web-customer
npm install
npm run dev -- -p 3001
```
