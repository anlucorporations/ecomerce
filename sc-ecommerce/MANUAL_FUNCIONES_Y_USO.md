# 📘 Manual de Funciones y Uso: Smart Contracts & Blockchain (`sc-ecommerce`)

**Plataforma BARLO-VENTAS E-Commerce Web3**  
**Lenguaje:** Solidity `^0.8.13` | **Motor:** Foundry (`anvil` / `forge`)

---

## 📋 1. Visión General del Subsistema
El subsistema de Smart Contracts administra la lógica inmutable del negocio en la blockchain Ethereum Virtual Machine (EVM). Contiene las estructuras de datos, eventos y funciones que regulan la emisión de moneda digital **EuroToken (`EURT`)**, la **Custodia Escrow de Fondos**, el registro de clientes y empresas, la facturación y la reputación.

---

## 🛠️ 2. Especificación Detallada de Funciones

### 💶 A. Contrato `EuroTokenOptimized.sol` (Token ERC-20)

| Función | Tipo | Parámetros | Descripción y Uso |
| :--- | :---: | :--- | :--- |
| **`balanceOf`** | `view` | `address account` | Devuelve el saldo en EURT (6 decimales) de una billetera. |
| **`transfer`** | `external` | `address to, uint256 amount` | Transfiere saldo EURT directamente a otra billetera. |
| **`approve`** | `external` | `address spender, uint256 amount` | Autoriza al contrato E-Commerce a debitar tokens de la billetera del cliente. |
| **`transferFrom`**| `external` | `address from, address to, uint256 amount` | Ejecuta la transferencia de tokens aprobados previamente. |
| **`mint`** | `external` | `address to, uint256 amount` | Acuña nuevos tokens EURT (ejecutado por la rampa de recarga Stripe). |

---

### 🔒 B. Contrato `Ecommerce.sol` (Lógica Principal & Custodia Escrow)

#### 1. Registro de Empresas y Clientes:
- **`registerCompanySelf(string name, string description, uint8 businessType)`**  
  - *Uso:* Permite a una empresa registrarse abonando la tarifa de inscripción en ETH.
- **`registerCustomerSelf(string name, string email, string physicalAddress)`**  
  - *Uso:* Permite a un usuario registrar su billetera Web3 como cliente activo en la plataforma.

#### 2. Gestión de Productos e Inventario:
- **`addProduct(uint256 companyId, string name, string description, uint256 price, string ipfsHash, uint256 stock)`**  
  - *Uso:* Añade un nuevo producto al catálogo asignándole su precio en EURT (6 decimales).
- **`updateProduct(uint256 productId, string name, string description, uint256 price, string ipfsHash, uint256 stock, bool isActive)`**  
  - *Uso:* Modifica precio, descripción o disponibilidad del producto.

#### 3. Proceso de Pago y Custodia Escrow:
- **`createInvoice(uint256 companyId, uint256[] productIds, uint256[] quantities)`**  
  - *Uso:* Emite una factura oficial con el cálculo del importe total en EURT.
- **`processPayment(address _customer, uint256 _amount, uint256 _invoiceId)`**  
  - *Uso:* **Transfiere los EURT del cliente a la Custodia del Smart Contract (`address(this)`)**. El saldo de la empresa NO aumenta hasta confirmarse la entrega.
- **`shipOrder(uint256 _invoiceId, string _trackingNumber)`**  
  - *Uso:* Utilizada por la empresa vendedora para asignar el código de guía y marcar la orden como enviada (`status = 2`).
- **`confirmDelivery(uint256 _invoiceId)`**  
  - *Uso:* Firma la entrega recibida por el cliente o administrador y **libera la transferencia de EURT desde `address(this)` hacia la empresa vendedora**.

#### 4. Reputación y Valoraciones:
- **`rateCompany(uint256 _companyId, uint8 _rating, string _comment)`**  
  - *Uso:* Registra una calificación de 1 a 5 estrellas y un comentario sobre el servicio recibido.
- **`getCompanyReviews(uint256 _companyId)`**  
  - *Uso:* Consulta la lista histórica de comentarios y valoraciones recibidas por una empresa.
