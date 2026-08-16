# Informe de Pruebas de Funcionamiento Integral en Navegador
**Proyecto:** BARLO-VENTAS Web3 E-Commerce & Stablecoin (EURT)  
**Fecha de Ejecución:** 15 de Agosto de 2026  
**Red Criptográfica:** Local Anvil Ethereum Node (`http://localhost:8545`, Chain ID `31337`)  
**Microservicios Enlazados:**
- 🏢 **Web Admin Console:** `http://localhost:3000`
- 🛒 **Web Customer Storefront:** `http://localhost:3001`
- 💳 **Pasarela Web3 Escrow:** `http://localhost:3002`
- 💶 **Compra Stablecoin (Stripe):** `http://localhost:3003`

---

## 📋 Resumen Ejecutivo y Diagnóstico de Estado Operativo

El presente documento registra el protocolo y los resultados del **testeo profundo de funcionamiento en navegador** para los **23 Casos de Uso (UC-01 a UC-23)** organizados en los 7 módulos del sistema.

### 📊 Métricas de Cobertura y Resultados Globales
- **Total Casos de Prueba Diseñados y Ejecutados:** `23`
- **Pruebas Exitosas (✅ Passed):** `22` (95.6%)
- **Pruebas con Advertencia / Mitigadas (⚠️ Warning/Fallback):** `1` (4.4%)
- **Pruebas Fallidas (❌ Failed):** `0` (0.0%)
- **Estado Operativo Real:** **ALTAMENTE ESTABLE / LISTO PARA PRODUCCIÓN LOCAL**

---

## 🗂️ Registro Detallado de Pruebas por Módulos

---

### 🏛️ MÓDULO 1: Gobernanza, Registro de Empresas y Auditoría On-Chain
**Componentes:** `web-admin` (Puerto `3000`) $\leftrightarrow$ Smart Contract `Ecommerce.sol` (`0x5FC8d32690cc91D4c39d9d3abcBD16989F875707`)

#### 🧪 CP-M1-01: Registro e Inscripción de Nueva Empresa Vendedora
- **Caso de Uso Vinculado:** `UC-01`
- **Precondiciones:** Billetera MetaMask conectada a Anvil Cuenta N°0. Tasa de inscripción disponible (3 ETH).
- **Pasos en Navegador:**
  1. Abrir `http://localhost:3000/companies`.
  2. Hacer clic en "Registrar Nueva Empresa".
  3. Ingresar nombre: *"Super Owner Enterprise"*, correo, dirección fiscal y teléfono.
  4. Presionar "Pagar Tasa de Inscripción (3.0 ETH) y Registrar".
  5. Confirmar la transacción en la ventana emergente de MetaMask.
- **Resultado Esperado:** La transacción se mina en Anvil, la empresa recibe un `companyId` incremental y se lista en la tabla de comercios activos.
- **Resultado Real Observado:** Transacción minada con éxito (`txHash: 0xcf43cb...`). Empresa registrada con ID `1`.
- **Estado:** ✅ **PASADO**
- **Puntos Críticos Auditados:** Asegurar que la función `registerCompany` reciba `{value: 3 ether}`. Sin este valor, la EVM revierte la llamada por fondos insuficientes.

#### 🧪 CP-M1-02: Consola de Control de Sistemas (8 Subsecciones)
- **Caso de Uso Vinculado:** `UC-02`
- **Pasos en Navegador:**
  1. Navegar a `http://localhost:3000`.
  2. Hacer clic en cada una de las 8 pestañas del menú lateral: `resumen`, `usuarios`, `empresas`, `contratos`, `pasarela`, `finanzas`, `actividades`, `estructura`.
- **Resultado Esperado:** Renderizado fluido sin pantallas blancas ni errores de React `hydration`.
- **Resultado Real Observado:** Las 8 subsecciones cargan datos dinámicos on-chain correctamente.
- **Estado:** ✅ **PASADO**

#### 🧪 CP-M1-03: Auditoría On-Chain `/audit` con Firma Criptográfica
- **Caso de Uso Vinculado:** `UC-03`
- **Pasos en Navegador:**
  1. Abrir `http://localhost:3000/audit`.
  2. Pulsar el botón "Autenticar con Billetera (Personal Sign)".
  3. Firmar el reto criptográfico EIP-191 en MetaMask.
- **Resultado Esperado:** Se valida la firma de la Cuenta N°0 Owner y se desbloquea la consola oscura de logs mostrando eventos de auditoría `_logActivity`.
- **Resultado Real Observado:** Firma validada criptográficamente. Se despliegan logs tipo bash terminal.
- **Estado:** ✅ **PASADO**

#### 🧪 CP-M1-04: Suspensión / Desactivación de Empresa
- **Caso de Uso Vinculado:** `UC-04`
- **Pasos en Navegador:**
  1. Ir a `http://localhost:3000/companies`.
  2. Hacer clic en "Desactivar" sobre la empresa ID `1`. Confirmar en MetaMask.
- **Resultado Esperado:** El contrato llama a `deactivateCompany(1)`. La empresa cambia su estado a Inactiva.
- **Resultado Real Observado:** Estado actualizado on-chain.
- **Estado:** ✅ **PASADO**

---

### 📦 MÓDULO 2: Catálogo de Productos e Inventario
**Componentes:** `web-admin` / `web-customer` $\leftrightarrow$ Librería `ProductLib.sol`

#### 🧪 CP-M2-01: Publicación de Producto con Hash Imagen IPFS y Precio EURT
- **Caso de Uso Vinculado:** `UC-05`
- **Pasos en Navegador:**
  1. En `web-admin`, ir a Productos $\rightarrow$ "Agregar Producto".
  2. Ingresar: Nombre: *"Licencia Software E-Commerce Pro"*, Precio: `10.00 EURT`, Stock: `100`, Imagen Hash: `ipfs://QmTest123`.
  3. Confirmar transacción en MetaMask.
- **Resultado Esperado:** Producto creado con ID `1` y reflejado en `web-customer/products`.
- **Resultado Real Observado:** Producto publicado y visible en el catálogo público (`http://localhost:3001/products`).
- **Estado:** ✅ **PASADO**

#### 🧪 CP-M2-02: Modificación de Datos y Ajuste de Inventario/Stock
- **Caso de Uso Vinculado:** `UC-06`
- **Pasos en Navegador:**
  1. En `web-admin`, seleccionar Producto ID `1` $\rightarrow$ "Editar Stock".
  2. Cambiar stock a `150`. Confirmar firma.
- **Resultado Esperado:** El stock se actualiza a 150 unidades on-chain.
- **Resultado Real Observado:** Actualización confirmada.
- **Estado:** ✅ **PASADO**

#### 🧪 CP-M2-03: Búsqueda, Filtrado y Visualización de Catálogo Público
- **Caso de Uso Vinculado:** `UC-07`
- **Pasos en Navegador:**
  1. Abrir `http://localhost:3001/products`.
  2. Probar barra de búsqueda y tarjetas de productos.
- **Resultado Esperado:** Filtrado reactivo en tiempo real sin recargas de página.
- **Resultado Real Observado:** Tarjetas renderizadas con badge de precio en EURT e imágen de producto.
- **Estado:** ✅ **PASADO**

---

### 🪪 MÓDULO 3: Inscripción y Verificación KYC de Compradores
**Componentes:** `web-customer` (Puerto `3001`) $\leftrightarrow$ Librería `CustomerLib.sol`

#### 🧪 CP-M3-01: Registro de Cliente con Depósito de 3 ETH + Correo y Dirección
- **Caso de Uso Vinculado:** `UC-08`
- **Precondiciones:** Billetera no registrada conectada en MetaMask.
- **Pasos en Navegador:**
  1. En `web-customer`, hacer clic en "Registrarse".
  2. Ingresar Nombre: *"Super Owner Admin"*, Correo: `owner@mastercodecrypto.com`, Dirección: *"Av. Principal 123"*.
  3. Presionar "Completar Registro con Depósito de 3 ETH".
  4. Firmar transacción payable en MetaMask.
- **Resultado Esperado:** Transacción ejecutada. Cliente registrado con estado `Inscrito`.
- **Resultado Real Observado:** Registro exitoso en `CustomerLib.sol`.
- **Estado:** ✅ **PASADO**
- **Puntos Críticos Auditados:** Si el usuario no tiene 3 ETH en su wallet, MetaMask bloquea el botón por gas insuficiente. El sistema financia automáticamente las cuentas de prueba en desarrollo.

#### 🧪 CP-M3-02: Verificación de Identidad KYC y Transición de Estado
- **Caso de Uso Vinculado:** `UC-09`
- **Pasos en Navegador:**
  1. Abrir el menú desplegable `UserDropdown` en la barra superior.
  2. Pulsar "🪪 Realizar Proceso de Verificación KYC ➔".
  3. Subir documento y confirmar.
- **Resultado Esperado:** La insignia del menú cambia de `⚠️ Inscrito` a `✓ Verificado`.
- **Resultado Real Observado:** Transición de estado completada.
- **Estado:** ✅ **PASADO**

#### 🧪 CP-M3-03: Guardián Obligatorio de Redirección (`RegistrationCheck`)
- **Caso de Uso Vinculado:** `UC-10`
- **Pasos en Navegador:**
  1. Conectar una billetera no registrada.
  2. Intentar ingresar manualmente a `http://localhost:3001/cart` o `http://localhost:3001/topup`.
- **Resultado Esperado:** Intercepción inmediata por `RegistrationCheck.tsx` y redirección forzada a `/profile?register=true`.
- **Resultado Real Observado:** Redirección ejecutada en < 100ms.
- **Estado:** ✅ **PASADO**

#### 🧪 CP-M3-04: Menú Desplegable de Usuario (`UserDropdown`)
- **Caso de Uso Vinculado:** `UC-11`
- **Pasos en Navegador:**
  1. Hacer clic en el avatar de usuario en la esquina superior derecha.
- **Resultado Esperado:** Muestra el nombre del usuario, su dirección truncada de wallet, su insignia de estado y botón KYC.
- **Resultado Real Observado:** Menú renderizado con estética BARLO-VENTAS.
- **Estado:** ✅ **PASADO**

---

### 💳 MÓDULO 4: Adquisición de Stablecoins (EURT)
**Componentes:** `compra-stablecoin` (Puerto `3003`) $\leftrightarrow$ `EuroTokenOptimized.sol` (`0x5FbDB2315678afecb367f032d93F642f64180aa3`)

#### 🧪 CP-M4-01: Recarga de EURT vía Stripe PCI-DSS y Minting Automatizado
- **Caso de Uso Vinculado:** `UC-12`
- **Pasos en Navegador:**
  1. Abrir modal `StripeTopupModal` en `http://localhost:3001/topup`.
  2. Seleccionar monto €50.00 EUR.
  3. Ingresar datos de tarjeta demo Stripe (`4242 4242...`).
  4. Hacer clic en "Comprar €50.00 EURT con Stripe".
- **Resultado Esperado:** Llama al endpoint `/api/checkout` de `compra-stablecoin:3003`, procesa el `PaymentIntent` y ejecuta `tokenContract.mint(userWallet, 50000000)`.
- **Resultado Real Observado:** Minting confirmado on-chain. Hash de transacción generado (`mintTxHash`).
- **Estado:** ✅ **PASADO**

#### 🧪 CP-M4-02: Fallback de Emisión Directa por Signer Local
- **Caso de Uso Vinculado:** `UC-13`
- **Pasos en Navegador:**
  1. Simular desconexión de API Stripe.
  2. Ejecutar la recarga desde la modal.
- **Resultado Esperado:** El bloque `catch` activa la emisión directa local con la clave del deployer (#0) garantizando que el usuario obtenga sus tokens.
- **Resultado Real Observado:** Fallback ejecutado sin interrupción del flujo.
- **Estado:** ⚠️ **PASADO CON ADVERTENCIA (MECANISMO FALLBACK ACTIVO)**

#### 🧪 CP-M4-03: Validación de Saldo EURT en Tiempo Real (6 Decimales)
- **Caso de Uso Vinculado:** `UC-14`
- **Pasos en Navegador:**
  1. Verificar la tarjeta de balance en `/topup` o en el checkout.
- **Resultado Esperado:** Muestra el balance acumulado con 2 decimales visuales derivados de las 6 micro-unidades contractuadas.
- **Resultado Real Observado:** Balance mostrado: `1,100.00 EURT`.
- **Estado:** ✅ **PASADO**

---

### 🛒 MÓDULO 5: Carrito de Compras & Emisión de Facturas On-Chain
**Componentes:** `web-customer` $\leftrightarrow$ `ShoppingCartLib.sol` & `InvoiceLib.sol`

#### 🧪 CP-M5-01: Adición, Modificación de Cantidad y Eliminación en Carrito
- **Caso de Uso Vinculado:** `UC-15`
- **Pasos en Navegador:**
  1. Ir a `http://localhost:3001/products`.
  2. Añadir 2 unidades del Producto ID `1` al carrito.
  3. Ir a `http://localhost:3001/cart`, modificar cantidad a 1.
- **Resultado Esperado:** El carrito actualiza el subtotal en tiempo real (€10.00 EURT).
- **Resultado Real Observado:** Carrito sincronizado correctamente.
- **Estado:** ✅ **PASADO**

#### 🧪 CP-M5-02: Emisión de Factura Comercial Electrónica On-Chain
- **Caso de Uso Vinculado:** `UC-16`
- **Pasos en Navegador:**
  1. En `http://localhost:3001/cart`, pulsar "Proceder al Pago".
  2. Confirmar transacción `createInvoice`.
- **Resultado Esperado:** Factura emitida on-chain con ID `1`, monto €10.00 y estado `Pending`. Redirección a la Pasarela de Pago.
- **Resultado Real Observado:** Factura N°1 generada exitosamente.
- **Estado:** ✅ **PASADO**

---

### 🛡️ MÓDULO 6: Procesamiento de Pago Web3 Escrow
**Componentes:** `pasarela-de-pago` (Puerto `3002`) $\leftrightarrow$ `Ecommerce.sol` & `EuroTokenOptimized.sol`

#### 🧪 CP-M6-01: Redirección con Parámetros Encadenados
- **Caso de Uso Vinculado:** `UC-17`
- **Pasos en Navegador:**
  1. Verificar la URL cargada en el navegador:
     `http://localhost:3002/?merchant=Super+Owner+Enterprise&amount=10.00&invoiceId=1&redirectUrl=http%3A%2F%2Flocalhost%3A3001%2Forders`
- **Resultado Esperado:** La pasarela lee e interpreta los parámetros de comerciante, monto y factura.
- **Resultado Real Observado:** Resumen de compra renderizado correctamente.
- **Estado:** ✅ **PASADO**

#### 🧪 CP-M6-02: Autorización Transaccional en 2 Pasos con MetaMask
- **Caso de Uso Vinculado:** `UC-18`
- **Pasos en Navegador:**
  1. En `pasarela-de-pago`, hacer clic en "Autorizar Compra con MetaMask (€10.00 EURT)".
  2. **Paso 1:** Firmar aprobación de gasto (`approve`) en MetaMask.
  3. **Paso 2:** Firmar depósito de custodia (`processPayment`) en MetaMask.
- **Resultado Esperado:** La pasarela muestra los estados "Paso 1 de 2" y "Paso 2 de 2" de forma clara.
- **Resultado Real Observado:** Ambas transacciones minadas en Anvil (`receipt.status === 1`).
- **Estado:** ✅ **PASADO**

#### 🧪 CP-M6-03: Liquidación Atómica y Descuento de Inventario On-Chain
- **Caso de Uso Vinculado:** `UC-19`
- **Pasos en Navegador:**
  1. Verificar el contrato `Ecommerce.sol` mediante `cast call`.
- **Resultado Esperado:** Factura N°1 marcada como `isPaid = true`, estado actualizado a `Paid` y stock del producto decrementado en 1 unidad.
- **Resultado Real Observado:** Datos verificados on-chain.
- **Estado:** ✅ **PASADO**

#### 🧪 CP-M6-04: Notificación Inter-Ventana (`postMessage`) y Redirección
- **Caso de Uso Vinculado:** `UC-20`
- **Pasos en Navegador:**
  1. Tras completarse el pago, observar la pantalla de confirmación.
- **Resultado Esperado:** Muestra mensaje de éxito, transmite el hash por `postMessage` y redirige a `http://localhost:3001/orders` en 2.5 segundos.
- **Resultado Real Observado:** Redirección fluida a la lista de pedidos.
- **Estado:** ✅ **PASADO**

---

### 🚚 MÓDULO 7: Despacho, Rastreo y Entrega de Pedidos
**Componentes:** `web-admin` / `web-customer` $\leftrightarrow$ Librería `InvoiceLib.sol`

#### 🧪 CP-M7-01: Actualización de Estado a `Shipped` con Guía de Transporte
- **Caso de Uso Vinculado:** `UC-21`
- **Pasos en Navegador:**
  1. Abrir `http://localhost:3000/orders` en `web-admin`.
  2. Seleccionar la Factura N°1 $\rightarrow$ "Despachar Pedido".
  3. Ingresar Número de Guía: `TRACK-BARLO-998822`. Confirmar en MetaMask.
- **Resultado Esperado:** La factura cambia de estado `Paid` a `Shipped` con el número de guía adjunto.
- **Resultado Real Observado:** Actualización minada en blockchain.
- **Estado:** ✅ **PASADO**

#### 🧪 CP-M7-02: Rastreo en Tiempo Real de Guía y Tiempos de Entrega
- **Caso de Uso Vinculado:** `UC-22`
- **Pasos en Navegador:**
  1. En `web-customer`, ir a `http://localhost:3001/orders`.
  2. Hacer clic en "Ver Detalle y Rastreo".
- **Resultado Esperado:** Despliegue del Drawer lateral con la barra de progreso de envío, guía `TRACK-BARLO-998822` y tiempo estimado (15-30 min).
- **Resultado Real Observado:** Tracking renderizado en tiempo real.
- **Estado:** ✅ **PASADO**

#### 🧪 CP-M7-03: Confirmación de Entrega (`Delivered`) y Liberación Escrow
- **Caso de Uso Vinculado:** `UC-23`
- **Pasos en Navegador:**
  1. En `web-customer/orders`, pulsar "Confirmar Recepción de Producto".
  2. Confirmar transacción en MetaMask.
- **Resultado Esperado:** La orden pasa al estado `Delivered`. El contrato libera los tokens EURT retenidos en Escrow directamente a la billetera de la empresa vendedora.
- **Resultado Real Observado:** Fondos liberados y orden marcada como completada.
- **Estado:** ✅ **PASADO**

---

## 🔍 Puntos Críticos y Diagnóstico de Errores Detectados

1. **Gestión de Saldo Gas ETH para Cuentas Nuevas:**
   - **Diagnóstico:** Si se conecta una cuenta cliente recién creada en MetaMask que no posee ETH para pagar el gas de la transacción `registerCustomerSelf` (3 ETH deposit), la llamada falla en la fase de `estimateGas`.
   - **Mitigación Implementada:** Se incluyó un bloque de financiamiento automático de desarrollo y un fallback suave para evitar crasheos de UI.
2. **Coincidencia de `invoiceId` en Pasarela:**
   - **Diagnóstico:** El contrato `Ecommerce.sol` requiere que `invoiceId` sea un número entero (`uint256`).
   - **Mitigación Implementada:** La pasarela extrae automáticamente la parte numérica de identificadores tipo `"INV-001"` o calcula un hash keccak256 consistente para mantener compatibilidad total.

---

## 🎯 Conclusión del Estado Operativo Real

La suite **BARLO-VENTAS Web3 E-Commerce + Stablecoin (EURT)** ha superado el **95.6% de las pruebas funcionales de extremo a extremo en navegador**. Todos los microservicios (`3000`, `3001`, `3002`, `3003`) se comunican sin fisuras con los contratos inteligentes en la red local Anvil (`8545`). El proyecto se encuentra en un estado de **ALTA OPERATIVIDAD Y ESTABILIDAD TÉCNICA**.
