# 📕 Manual de Uso: Consola de Administración (`web-admin`)

**Plataforma BARLO-VENTAS E-Commerce Web3**  
**Acceso Web:** `http://localhost:3000`

---

## 📋 1. Propósito de este Manual
Este manual guía a los administradores del sistema, personal de finanzas y operadores de logística en el uso diario de la consola de administración `web-admin`.

---

## 🖥️ 2. Guía Paso a Paso de Módulos

### 📊 A. Sección Sistemas ➔ Pilar Usuarios (`/systems`)

Permite inspeccionar el expediente completo de cada usuario registrado en la blockchain:

1. Ingrese a **`Sistemas`** en el menú superior y seleccione la pestaña **`Pilar Usuarios`**.
2. En la tabla de usuarios registrados, ubique al cliente deseado.
3. Presione el botón destacado **`📊 Ficha Financiera`**.
4. Se abrirá una ventana emergente que detalla:
   - 💰 **Monto en EURT Total:** Saldo actual en su billetera Web3.
   - 🔒 **Monto en Custodia:** Importe de compras activas bloqueado en el contrato inteligente a la espera de entrega.
   - 🛍️ **Monto Pagado:** Suma acumulada de compras históricas confirmadas.
   - 📑 **Historial de Facturas:** Listado de facturas emitidas por el cliente con su estado y guía de tracking.

---

### 📦 B. Sección Gestión de Envíos y Despachos Logísticos (`/orders`)

El módulo de logística se divide en 2 pestañas funcionales:

#### 1. Pestaña `🚀 Envíos Activos` (Vista Principal):
- Muestra únicamente los despachos en curso pendientes de entrega (`status < 3`).
- **Cómo Despachar una Orden:**
  1. Identifique la orden pagada en la lista.
  2. Haga clic en **`📦 Marcar como Enviado`**.
  3. Se desplegará el modal **Formulario de Despacho Logístico**:
     - Seleccione la empresa de transporte (*DHL, FedEx, MRW, Delivery Expreso*, etc.).
     - Ingrese o confirme el **Número de Guía / Tracking ID**.
     - Seleccione la fecha estimada de entrega y agregue notas para el cliente.
     - *Si la orden estaba en estado pendiente, asegúrese de marcar la casilla "Confirmar Pago en Escrow"*.
  4. Haga clic en **`Despachar Pedido y Registrar Guía`** y confirme la transacción en MetaMask.

#### 2. Pestaña `📜 Histórico de Envíos (Finalizados & Valorados)`:
- Contiene todas las órdenes entregadas y completadas (`status >= 3`).
- Los fondos de custodia de estas órdenes ya han sido liberados on-chain a la empresa.
- Utilice el botón **`👁️ Ver Registro de Guía`** para auditar el historial del despacho.

---

### 🏬 C. Gestión de Comercios e Inventarios (`/companies`, `/inventory`)

- **Empresas (`/companies`):** Registrar nuevas empresas comerciales con tasa de inscripción en ETH.
- **Inventario (`/inventory`):** Agregar productos, actualizar precios en EURT (6 decimales) y gestionar el stock disponible.
