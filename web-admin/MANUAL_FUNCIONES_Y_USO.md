# 📘 Manual de Funciones y Uso: Consola de Administración (`web-admin`)

**Plataforma BARLO-VENTAS E-Commerce Web3**  
**Puerto Local:** `3000` | **Ruta Base:** `web-admin/src/app`

---

## 📋 1. Visión General del Subsistema
La consola de administración `web-admin` provee las herramientas operativas para la auditoría de usuarios, el control de envíos y la supervisión comercial.

---

## 🛠️ 2. Especificación Detallada por Módulo y Pantalla

### 📊 A. Módulo Sistemas ➔ Pilar Usuarios (`/systems`)

#### Funciones y Componentes:
- **`loadSystemData()`:** Consulta en el nodo RPC la lista total de usuarios e inspeciona sus balances on-chain.
- **Tabla de Usuarios:** Muestra dirección de wallet, saldo ETH y saldo EURT disponible.
- **Botón `📊 Ficha Financiera`:** Despliega la ventana modal del expediente financiero del usuario.
- **Modal Ficha Financiera (`financialUser`):**
  - **`Monto EURT Total`:** Muestra `euroToken.balanceOf(userAddress)`.
  - **`Monto en Custodia`:** Suma las facturas activas pagadas retenidas en Escrow (`isPaid === true` & `status < 3`).
  - **`Monto Pagado`:** Suma histórica total depositada en compras confirmadas.
  - **`Historial de Facturas`:** Tabla interactiva con número de factura, monto, estado de pago e información de guía de envío.

---

### 📦 B. Módulo Gestión de Envíos y Despachos (`/orders`)

#### Funciones y Componentes:
- **Pestaña `🚀 Envíos Activos` (`activeTab === "active"`):**
  - Filtra órdenes activas con `status < 3` (*Pendientes de Pago*, *Pagados en Custodia* y *Enviados*).
  - Previene saturar la vista operativa del administrador con órdenes ya completadas.
- **Pestaña `📜 Histórico de Envíos` (`activeTab === "history"`):**
  - Agrupa órdenes con `status >= 3` (*Entregado & Fondos Liberados* y *Completado & Valorado*).
- **Formulario Modal de Despacho Logístico (`isShippingModalOpen`):**
  - Campos: Empresa de transporte (`carrier`), Número de guía (`trackingNumber`), Fecha estimada de entrega (`estimatedDeliveryDate`) y Notas de envío.
  - **Auto-Confirmación de Pago:** Casilla `autoApprovePayment` para procesar el pago en Escrow antes de autorizar el despacho si la factura estaba en estado creado.
- **Acciones On-Chain:**
  - `shipOrder(invoiceId, fullTrackingInfo)`: Registra la guía en la blockchain.

---

### 🏬 C. Módulo Comercios e Inventarios (`/companies`, `/inventory`)

#### Funciones y Componentes:
- **Alta de Empresas (`/companies`):** Registro de nuevos comercios vendedores.
- **Administración de Inventarios (`/inventory`):**
  - `addProduct`: Alta de producto con precio en EURT (convertido automáticamente a unidades raw de 6 decimales `amount * 1e6`).
  - `updateProduct`: Edición de precio, disponibilidad o unidades en existencia.
