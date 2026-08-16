# 📘 Manual de Funciones y Uso: Portal del Cliente (`web-customer`)

**Plataforma BARLO-VENTAS E-Commerce Web3**  
**Puerto Local:** `3001` | **Ruta Base:** `web-customer/src/app`

---

## 📋 1. Visión General del Subsistema
`web-customer` provee la experiencia de usuario para la navegación de productos, compra con garantía de custodia Escrow, gestión de pedidos y recargas de saldo.

---

## 🛠️ 2. Especificación Detallada por Componente y Vista

### 👤 A. Verificación de Billetera e Inscripción (`/components/registration-check.tsx`)

#### Funciones y Componentes:
- **`useWallet()`:** Detecta la dirección activa en MetaMask y el estado del `signer`.
- **Banner de Inscripción Pendiente:** Muestra un aviso en la barra superior si la wallet conectada no está registrada como cliente activo en el Smart Contract.
- **Acción:** Botón **`📝 Completar Registro`** que redirige a `/profile?register=true`.

---

### 💳 B. Carrito y Pago Unificado Directo (`/cart`)

#### Funciones y Componentes:
- **`useCart()`:** Gestiona los artículos seleccionados, cantidades y cálculo del total en EURT.
- **`handleDirectCheckout()`:** Ejecuta el proceso de pago seguro en 1 solo paso:
  1. `createInvoice(companyId, productIds, quantities)` ➔ Crea la factura.
  2. `euroToken.approve(ecommerceAddress, totalAmount)` ➔ Autoriza el importe.
  3. `ecommerce.processPayment(customerAddress, totalAmount, invoiceId)` ➔ Deposita los tokens EURT directamente en la **Custodia Escrow (`address(this)`)**.
  4. Redirige automáticamente a `/orders`.

---

### 📦 C. Panel de Mis Pedidos (`/orders`)

#### Funciones y Componentes:
- **`fetchCustomerOrders()`:** Carga las facturas emitidas para la wallet activa y verifica qué órdenes ya han sido valoradas mediante `getCompanyReviews`.
- **Firma de Entrega (`handleConfirmDelivery`):**
  - Ejecuta `confirmDelivery(invoiceId)` en la blockchain.
  - Libera los fondos bloqueados en el contrato Escrow hacia la empresa vendedora.
- **Sistema de Valoración Inteligente:**
  - Si la orden no ha sido calificada, muestra las opciones **`⭐ Valorar Empresa Ahora`** (modal con estrellas y comentarios) y **`⚡ Aplicar Valoración Automática`** (4.0 ★ por defecto).
  - Si la orden **ya fue calificada**, oculta el panel de solicitud y despliega la tarjeta de confirmación **`⭐ Valoración Completada — ✓ Valorada`**.

---

### 💶 D. Recarga de Stablecoin EURT (`/topup`, `/components/stripe-topup-modal.tsx`)

#### Funciones y Componentes:
- Selector de montos predefinidos (€50 EURT, €100 EURT, €500 EURT) o personalizado.
- Conexión con el backend de Stripe (`http://localhost:3003/api/checkout`) para procesar cobros FIAT y recibir la acreditación en la wallet.
