# 🧪 Reporte Maestro de Pruebas Unitarias de Toda la Plataforma

**Plataforma BARLO-VENTAS E-Commerce Web3**  
**Alcance:** Smart Contracts (Foundry), Web Admin, Web Customer, Pasarela Web3 y Compra EURT Stripe  
**Resultado Global:** **62 / 62 PRUEBAS PASADAS (100% ÉXITO)**

---

## 📊 1. Matriz Global de Pruebas por Servicio

```text
==========================================================================================
                      MATRIZ GLOBAL DE PRUEBAS UNITARIAS DE PLATAFORMA
==========================================================================================
  Servicio / Microservicio   | Tipo de Test / Runner     | Pruebas  | Estado | Resultado
-----------------------------+---------------------------+----------+--------+------------
  sc-ecommerce (Escrow)      | Foundry (forge test)      | 43 / 43  | ✅ OK  | 100% Passed
  stablecoin/sc (EuroToken)  | Foundry (forge test)      | 5 / 5    | ✅ OK  | 100% Passed
  web-customer (Storefront)  | Node Unit Test Suite      | 4 / 4    | ✅ OK  | 100% Passed
  web-admin (Console Admin)  | Node Unit Test Suite      | 3 / 3    | ✅ OK  | 100% Passed
  pasarela-de-pago (Escrow)  | Node Unit Test Suite      | 3 / 3    | ✅ OK  | 100% Passed
  compra-stablecoin (Stripe) | Node Unit Test Suite      | 4 / 4    | ✅ OK  | 100% Passed
-----------------------------+---------------------------+----------+--------+------------
  TOTAL DE LA PLATAFORMA     | 10 SUITES DE PRUEBAS      | 62 / 62  | ✅ OK  | 100% PASSED
==========================================================================================
```

---

## 🔍 2. Desglose de Pruebas por Subsistema

### 1. Smart Contracts & EVM Core (`sc-ecommerce` & `stablecoin/sc` - 48 Pruebas):
- **`EscrowSecurityTest` (2/2):** Verificación de Custodia Escrow en `address(this)`, retención de saldo y liberación a la empresa al confirmar la entrega (`confirmDelivery`).
- **`IntegrationTest` (6/6):** Flujo completo de compra, sesiones de compra multi-empresa, validación de saldos en EURT e historial de facturas.
- **`CompanyRegistryTest` (11/11):** Auditoría de empresas, activación/desactivación y permisos.
- **`ShoppingCartTest` (12/12):** Lógica de carrito, cálculo de totales en EURT y validación de stock.
- **`ProductCatalogTest` (12/12):** Inventario de productos, precios y hashes IPFS.
- **`EuroTokenOptimizedTest` (5/5):** Precisión de 6 decimales, roles de minteo, quema (`burn`) y pausado de emergencia.

### 2. Portal de Clientes (`web-customer` - 4 Pruebas):
- Conversión de precios a unidades raw (`amount * 1e6`).
- Cálculo exacto de acumulados del carrito.
- Verificación inteligente de ocultamiento de cuadro de valoración para facturas ya calificadas (`isInvoiceRated`).
- Asignación de insignias de estado KYC para wallets.

### 3. Consola de Administración (`web-admin` - 3 Pruebas):
- Cálculo de Ficha Financiera del Usuario (Balance EURT, Monto en Custodia Escrow y Monto pagado acumulado).
- Clasificación de órdenes en pestañas (*🚀 Envíos Activos* vs *📜 Histórico de Envíos*).
- Validación de formulario de despacho logístico (Carrier, Tracking ID).

### 4. Pasarela Web3 Escrow Independiente (`stablecoin/pasarela-de-pago` - 3 Pruebas):
- Lectura y formateo de Query String de la URL (`merchant`, `amount`, `invoiceId`, `redirectUrl`).
- Conversión de montos de entrada a decimales raw.
- Verificación de suficiencia de saldo EURT en la wallet del comprador.

### 5. Recarga Stripe FIAT-a-EURT (`stablecoin/compra-stablecoin` - 4 Pruebas):
- Validación de payload del endpoint API Route `/api/checkout`.
- Formateo de dirección pública Web3 (`0x...`).
- Conversión de Euros (€) a centavos bancarios de Stripe API.

---

## ⚡ 3. Guía de Ejecución de Pruebas en 1 Comando

Para ejecutar y verificar la suite de pruebas unitarias de cualquier microservicio:

```bash
# 1. Pruebas de Smart Contracts E-Commerce y Escrow (43 pruebas)
cd sc-ecommerce && forge test

# 2. Pruebas del EuroToken Stablecoin (5 pruebas)
cd stablecoin/sc && forge test

# 3. Pruebas del Portal de Clientes
cd web-customer && npm test

# 4. Pruebas de la Consola Web Admin
cd web-admin && npm test

# 5. Pruebas de la Pasarela Web3 Escrow
cd stablecoin/pasarela-de-pago && npm test

# 6. Pruebas de Adquisición Stripe EURT
cd stablecoin/compra-stablecoin && npm test
```
