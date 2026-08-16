# 📕 Manual de Uso: Portal del Cliente (`web-customer`)

**Plataforma BARLO-VENTAS E-Commerce Web3**  
**Acceso Web:** `http://localhost:3001`

---

## 📋 1. Propósito de este Manual
Este manual orienta a los compradores y clientes de la plataforma BARLO-VENTAS sobre cómo comprar productos, recargar saldo en la stablecoin EuroToken (EURT), realizar el pago con garantía Escrow y liberar los fondos al recibir su pedido.

---

## 🛍️ 2. Guía Paso a Paso para Comprar

### 🦊 1. Conexión de Billetera y Registro de Cliente
1. Ingrese a `http://localhost:3001`.
2. Haga clic en el botón **`Conectar Wallet`** en el encabezado superior y apruebe la conexión en **MetaMask**.
3. Si su wallet no está inscrita como cliente, aparecerá una barra informativa azul en el encabezado:
   `"⚠️ Wallet no registrada como Cliente. Complete su registro para acceder a compras."`
4. Presione **`📝 Completar Registro`**, introduzca su nombre, correo y dirección de entrega, y confirme la inscripción.

---

### 💶 2. Recarga de Saldo en EURT (`/topup`)
1. Haga clic en **`💶 Recargar EURT`** en el menú superior o en la tarjeta de perfil.
2. Seleccione el monto de recarga en Euros (ej: €50 EURT, €100 EURT, €500 EURT).
3. Presione **`Pagar con Tarjeta de Crédito (Stripe)`**.
4. Complete el formulario de pago seguro de Stripe. Al confirmarse el pago bancario, los EURT se acreditarán instantáneamente en su wallet Web3.

---

### 💳 3. Carrito y Pago Unificado en 1 Paso (`/cart`)
1. Ingrese al catálogo de productos y añada los artículos deseados a su carrito.
2. Diríjase a su carrito en `http://localhost:3001/cart`.
3. Revise el desglose en EURT y presione el botón destacado:  
   **`💳 Finalizar Pedido y Pagar con EURT`**
4. Confirme la transacción de autorización y depósito en MetaMask.
5. Sus fondos quedarán retenidos de forma segura en **Custodia Escrow** y será redirigido automáticamente a la sección de **Mis Pedidos**.

---

### 📦 4. Seguimiento, Firma de Recepción y Valoración (`/orders`)
1. Ingrese a **`Mis Pedidos`** (`http://localhost:3001/orders`).
2. Seleccione la orden de la lista a la izquierda para inspeccionar sus detalles, empresa vendedora y código de tracking de la guía de envío.
3. **Firma de Entrega:**  
   Cuando reciba el paquete en su domicilio, presione el botón:  
   **`✍️ Firmar Entrega Recibida (Liberar Fondos Inmediatamente)`**
4. **Valoración:**  
   Puede calificar a la empresa de 1 a 5 estrellas inmediatamente. Si ya calificó esa compra, el sistema mostrará la insignia verde **`✓ Valoración Completada`**.
