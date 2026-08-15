# 📘 Manual Técnico: Consola de Administración (`web-admin`)

**Plataforma BARLO-VENTAS E-Commerce Web3**  
**Puerto Local:** `3000` | **URL:** `http://localhost:3000`

---

## 📋 1. Resumen Ejecutivo
`web-admin` es la consola Web3 de administración general de la plataforma BARLO-VENTAS. Permite la auditoría en tiempo real de comercios inscritos, gestión de inventario, auditoría financiera de usuarios en el Pilar Usuarios (con desglose de custodia Escrow) y el módulo de despacho logístico dividido en **Envíos Activos** e **Histórico de Envíos**.

---

## 🛠️ 2. Stack Tecnológico

- **Framework:** Next.js 15 (App Router, Turbopack).
- **Lenguaje:** TypeScript / React 19.
- **Librería Blockchain:** Ethers.js v6.
- **Estilos:** Vanilla CSS / Tailwind CSS.
- **Conectividad Web3:** Provider Ethers.js apuntando a nodo RPC `http://localhost:8545`.

---

## 🏛️ 3. Módulos y Secciones del Sistema

### 📊 A. Sistemas ➔ Pilar Usuarios (`/systems`)
- **Directorio de Usuarios:** Muestra la lista de clientes registrados en el contrato inteligente con su dirección Web3, balance ETH y balance EURT.
- **Ficha Financiera del Usuario (Modal Interactivo `📊 Ficha Financiera`):**
  - 💰 **Monto en EURT Total (`eurtBalance`):** Saldo libre disponible en wallet.
  - 🔒 **Monto en Custodia (`amountInCustodyEur`):** Suma acumulada retenida en el contrato Escrow para pedidos activos (`isPaid === true` & `status < 3`).
  - 🛍️ **Monto Pagado (`amountPaidEur`):** Suma histórica total depositada en compras confirmadas.
  - 📑 **Historial de Facturas Emitidas:** Detalle de facturas con estado y código de tracking.

### 📦 B. Gestión de Envíos y Despachos (`/orders`)
Dividido en 2 secciones diferenciadas:
1. **`🚀 Envíos Activos` (Sección Principal):**
   - Agrupa órdenes en estado `0` (*Creado*), `1` (*Pagado en Custodia*) y `2` (*Enviado / En Tránsito*).
   - Incluye el botón **`📦 Marcar como Enviado`**, el cual abre el modal de despacho logístico (Carrier, Tracking ID, Fecha estimada, notas) y auto-confirma el pago en Escrow antes del despacho si la factura estaba en estado pendiente.
2. **`📜 Histórico de Envíos (Finalizados & Valorados)`**:
   - Agrupa órdenes archivadas en estado `3` (*Entregado & Fondos Liberados*) y `4` (*Completado & Valorado*).
   - Muestra insignias de liberación de fondos y botón `👁️ Ver Registro de Guía`.

### 🏬 C. Empresas e Inventario (`/companies`, `/inventory`)
- Registro de nuevas empresas con tasa de inscripción en ETH.
- Catálogo de productos con precios en EURT (6 decimales) e imágenes IPFS / URL.

---

## ⚙️ 4. Ejecución Local

```bash
cd web-admin
npm install
npm run dev -- -p 3000
```
