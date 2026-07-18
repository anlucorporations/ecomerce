# E-Commerce Blockchain System

Sistema de comercio electrónico descentralizado usando Ethereum, con tokens estables (EURT) para pagos.

## Estructura del Proyecto

- **[sc-ecommerce/](sc-ecommerce/)** - Smart contracts del e-commerce
- **[stablecoin/](stablecoin/)** - Smart contract del token EURT (ERC20)
- **[web-admin/](web-admin/)** - Aplicación web para administración
- **[web-customer/](web-customer/)** - Aplicación web para clientes

---

## 1. Smart Contracts (sc-ecommerce)

### 1.1 Contratos Principales

#### EcommerceMain.sol
Contrato principal que coordina todos los módulos del sistema.

```solidity
contract EcommerceMain {
    address public euroTokenAddress;
    address public owner;

    CompanyRegistry public companyRegistry;
    ProductCatalog public productCatalog;
    CustomerRegistry public customerRegistry;
    ShoppingCart public shoppingCart;
    InvoiceSystem public invoiceSystem;
    PaymentGateway public paymentGateway;
}
```

#### CompanyRegistry.sol
Gestiona el registro de empresas vendedoras.

```solidity
struct Company {
    uint256 companyId;
    address companyAddress;
    string name;
    string description;
    bool isActive;
    uint256 registrationDate;
}

function registerCompany(address _address, string _name, string _description) external;
function getCompany(uint256 _companyId) external view returns (Company);
function deactivateCompany(uint256 _companyId) external;
```

#### ProductCatalog.sol
Catálogo de productos con información almacenada en blockchain e imágenes en IPFS.

```solidity
struct Product {
    uint256 productId;
    uint256 companyId;
    string name;
    string description;
    uint256 price; // En EURT (6 decimales)
    string ipfsImageHash;
    uint256 stock;
    bool isActive;
    uint256 createdAt;
}

function addProduct(...) external returns (uint256);
function updateProduct(uint256 _productId, ...) external;
function updateStock(uint256 _productId, uint256 _newStock) external;
function getProduct(uint256 _productId) external view returns (Product);
function getProductsByCompany(uint256 _companyId) external view returns (uint256[]);
```

#### CustomerRegistry.sol
Registro de clientes y sus métricas de compra.

```solidity
struct Customer {
    address customerAddress;
    uint256 totalPurchases;
    uint256 totalSpent; // En EURT
    uint256 registrationDate;
    uint256 lastPurchaseDate;
    bool isActive;
}

function registerCustomer() external;
function updatePurchaseStats(address _customer, uint256 _amount) external;
function getCustomer(address _customer) external view returns (Customer);
```

#### ShoppingCart.sol
Carrito de compras por usuario.

```solidity
struct CartItem {
    uint256 productId;
    uint256 quantity;
    uint256 unitPrice;
}

function addToCart(uint256 _productId, uint256 _quantity) external;
function removeFromCart(uint256 _productId) external;
function updateQuantity(uint256 _productId, uint256 _quantity) external;
function getCart(address _customer) external view returns (CartItem[]);
function clearCart(address _customer) external;
function calculateTotal(address _customer) external view returns (uint256);
```

#### InvoiceSystem.sol
Sistema de facturación y registro de transacciones.

```solidity
struct Invoice {
    uint256 invoiceId;
    uint256 companyId;
    address customerAddress;
    uint256 totalAmount;
    uint256 timestamp;
    bool isPaid;
    string paymentTxHash;
}

struct InvoiceItem {
    uint256 productId;
    string productName;
    uint256 quantity;
    uint256 unitPrice;
    uint256 totalPrice;
}

function createInvoice(address _customer, uint256 _companyId) external returns (uint256);
function markAsPaid(uint256 _invoiceId, string _txHash) external;
function getInvoice(uint256 _invoiceId) external view returns (Invoice);
function getInvoiceItems(uint256 _invoiceId) external view returns (InvoiceItem[]);
function getCustomerInvoices(address _customer) external view returns (uint256[]);
```

#### PaymentGateway.sol
Procesamiento de pagos usando EURT.

```solidity
function processPayment(
    address _customer,
    uint256 _amount,
    uint256 _invoiceId
) external returns (bool);

function refund(uint256 _invoiceId) external returns (bool);
```

### 1.2 Estructura de Datos

La implementación usa una combinación de mappings y arrays:

```solidity
// Array de IDs para iteración
uint256[] private entityIds;

// Mapping para acceso O(1)
mapping(uint256 => Entity) private entities;
```

### 1.3 Tests de Smart Contracts

Los tests deben cubrir:

#### Test: CompanyRegistry.t.sol
- ✓ Registro de nueva empresa
- ✓ Obtener información de empresa
- ✓ Desactivar empresa
- ✓ Solo owner puede registrar empresas
- ✓ No se puede registrar empresa con dirección duplicada

#### Test: ProductCatalog.t.sol
- ✓ Añadir producto
- ✓ Actualizar producto
- ✓ Actualizar stock
- ✓ Desactivar producto
- ✓ Obtener productos por empresa
- ✓ Solo empresa propietaria puede modificar su producto

#### Test: CustomerRegistry.t.sol
- ✓ Registro automático de cliente
- ✓ Actualizar estadísticas de compra
- ✓ Obtener información de cliente

#### Test: ShoppingCart.t.sol
- ✓ Añadir producto al carrito
- ✓ Actualizar cantidad
- ✓ Eliminar producto del carrito
- ✓ Calcular total del carrito
- ✓ Limpiar carrito completo
- ✓ Validar stock disponible

#### Test: InvoiceSystem.t.sol
- ✓ Crear factura desde carrito
- ✓ Marcar factura como pagada
- ✓ Obtener facturas de cliente
- ✓ Obtener items de factura

#### Test: PaymentGateway.t.sol
- ✓ Procesar pago exitoso
- ✓ Procesar pago sin fondos suficientes
- ✓ Procesar reembolso
- ✓ Validar aprobación de tokens

#### Test: Integration.t.sol
- ✓ Flujo completo de compra: agregar al carrito → checkout → pago
- ✓ Flujo completo multi-empresa
- ✓ Validación de stock al procesar pago

---

## 2. Web Admin

Aplicación Next.js para la administración del e-commerce.

### 2.1 Funcionalidades

#### Gestión de Empresas
- Registrar nueva empresa
- Ver lista de empresas
- Activar/desactivar empresas
- Ver métricas de ventas por empresa

#### Gestión de Productos
- Añadir nuevo producto
- Editar producto existente
- Actualizar stock
- Subir imágenes a IPFS (Pinata)
- Activar/desactivar productos
- Ver lista de productos por empresa

#### Monitoreo
- Dashboard de ventas
- Lista de facturas
- Estadísticas de clientes
- Métricas del sistema

### 2.2 Tecnologías

- **Framework**: Next.js 14 (App Router)
- **Blockchain**: ethers.js v6
- **UI**: TailwindCSS + shadcn/ui
- **Storage**: IPFS via Pinata
- **Wallet**: RainbowKit / ConnectKit

### 2.3 Estructura de Carpetas

```
web-admin/
├── app/
│   ├── (dashboard)/
│   │   ├── companies/
│   │   ├── products/
│   │   ├── invoices/
│   │   └── customers/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── companies/
│   ├── products/
│   └── ui/
├── hooks/
│   ├── useContract.ts
│   ├── useIPFS.ts
│   └── useWallet.ts
├── lib/
│   ├── contracts/
│   │   ├── abis/
│   │   └── addresses.ts
│   └── utils.ts
└── services/
    ├── ipfs.ts
    └── blockchain.ts
```

### 2.4 Contratos Usados

- `CompanyRegistry` - Gestión de empresas
- `ProductCatalog` - Gestión de productos
- `InvoiceSystem` - Consulta de facturas
- `CustomerRegistry` - Consulta de clientes

---

## 3. Web Customer

Aplicación Next.js para clientes finales.

### 3.1 Funcionalidades

#### Shopping
- Ver catálogo de productos
- Filtrar por empresa/categoría
- Añadir productos al carrito
- Ver carrito de compras
- Checkout y pago

#### Gestión de Tokens
- Ver balance de EURT
- Comprar EURT con tarjeta (Stripe)
- Historial de transacciones

#### Perfil
- Ver historial de compras
- Ver facturas
- Descargar facturas

### 3.2 Tecnologías

- **Framework**: Next.js 14 (App Router)
- **Blockchain**: ethers.js v6
- **Payments**: Stripe + EURT
- **UI**: TailwindCSS + shadcn/ui
- **Wallet**: RainbowKit / ConnectKit

### 3.3 Estructura de Carpetas

```
web-customer/
├── app/
│   ├── products/
│   ├── cart/
│   ├── checkout/
│   ├── invoices/
│   ├── wallet/
│   └── profile/
├── components/
│   ├── cart/
│   ├── checkout/
│   ├── products/
│   └── ui/
├── hooks/
│   ├── useCart.ts
│   ├── useCheckout.ts
│   └── useWallet.ts
├── lib/
│   ├── contracts/
│   └── stripe.ts
└── services/
    └── blockchain.ts
```

### 3.4 Contratos Usados

- `ProductCatalog` - Consultar productos
- `ShoppingCart` - Gestión del carrito
- `InvoiceSystem` - Ver facturas
- `PaymentGateway` - Procesar pagos
- `EuroToken` - Transferencias de EURT

### 3.5 Flujo de Compra

1. **Navegar productos** → Consultar `ProductCatalog`
2. **Añadir al carrito** → Llamar `ShoppingCart.addToCart()`
3. **Checkout** → Calcular total con `ShoppingCart.calculateTotal()`
4. **Pago**:
   - Si no tiene EURT → Comprar con Stripe → Mint EURT
   - Aprobar tokens: `EuroToken.approve(PaymentGateway, amount)`
   - Procesar pago: `PaymentGateway.processPayment()`
5. **Confirmación** → Se crea factura automáticamente

---

## 4. EuroToken (EURT)

Token ERC20 estable vinculado al euro.

### 4.1 Características

- **Standard**: ERC20
- **Decimales**: 6 (para representar céntimos)
- **Nombre**: EuroToken
- **Symbol**: EURT

### 4.2 Funciones Principales

```solidity
function mint(address to, uint256 amount) public onlyOwner;
function burn(uint256 amount) public;
function burnFrom(address account, uint256 amount) public;
```

### 4.3 Integración con Stripe

1. Usuario paga EUR con tarjeta en Stripe
2. Webhook de Stripe notifica al backend
3. Backend llama `EuroToken.mint(userAddress, amount)`
4. Usuario recibe EURT en su wallet

---

## 5. Quick Start

See [QUICK_START.md](QUICK_START.md) for one-command deployment!

```bash
# 1. Start Anvil
anvil

# 2. Deploy everything
./deploy-all.sh

# 3. Start apps
cd web-admin && npm run dev
cd web-customer && npm run dev -- -p 3001
```

## 6. Deployment & Environment

### 5.1 Variables de Entorno

#### web-admin/.env.local
```bash
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS=0x...
NEXT_PUBLIC_EURO_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_PINATA_JWT=...
```

#### web-customer/.env.local
```bash
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS=0x...
NEXT_PUBLIC_EURO_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
```

### 5.2 Deployment de Contratos

```bash
cd sc-ecommerce
forge build
forge test
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
```

---

## 7. Arquitectura de Datos

### Datos On-Chain

- Customer: `address`, `totalPurchases`, `totalSpent`
- Company: `companyId`, `address`, `nombre`
- Product: `productId`, `companyId`, `nombre`, `precio`, `ipfsHash`, `stock`
- Invoice: `invoiceId`, `fecha`, `customerAddress`, `amount`, `status`, `tx_pago`
- InvoiceItems: `invoiceId`, `productId`, `price`, `quantity`

### Implementación

Se usa una combinación de **mapping** (acceso O(1)) y **array** (iteración):

```solidity
// Array para IDs
uint256[] private entityIds;

// Mapping para datos
mapping(uint256 => Entity) private entities;
```

---

## 8. Scripts de Deployment

### Deployment Automático

```bash
./deploy-all.sh
```

Este script:
- Deploya EuroToken y todos los contratos de e-commerce
- Actualiza automáticamente los archivos `.env.local`
- Genera documentación con las direcciones

Ver [SCRIPTS.md](SCRIPTS.md) para documentación completa de scripts.

### Verificar Deployment

```bash
./test-deployment.sh
```

---

## 9. Ver También

- [QUICK_START.md](QUICK_START.md) - Guía de inicio rápido
- [SCRIPTS.md](SCRIPTS.md) - Documentación de scripts de deployment
- [ARCHITECTURE.md](ARCHITECTURE.md) - Diagramas detallados del sistema
- [DEPLOYMENT.md](DEPLOYMENT.md) - Guía de deployment manual
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Solución de problemas
- [DEPLOYED_ADDRESSES.md](DEPLOYED_ADDRESSES.md) - Direcciones de contratos (auto-generado)
