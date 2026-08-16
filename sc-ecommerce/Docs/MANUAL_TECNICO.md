# 📘 Manual Técnico: Smart Contracts & Arquitectura Blockchain (Foundry)

**Plataforma BARLO-VENTAS E-Commerce Web3**  
**Versión:** 2.0 (Arquitectura de Custodia Escrow On-Chain & Foundry Anvil)

---

## 📋 1. Resumen Ejecutivo
El subsistema de Smart Contracts de la plataforma BARLO-VENTAS constituye la capa base descentralizada e inmutable ejecutada en la blockchain EVM (Ethereum Virtual Machine). Gestiona la emisión y control de la stablecoin **EuroToken (`EURT`)**, el registro auditado de empresas y clientes, el inventario de productos, la emisión de facturas y la **Custodia Escrow de Fondos**.

---

## 🛠️ 2. Tecnologías y Herramientas

- **Solidity:** `^0.8.13`
- **Framework de Desarrollo:** Foundry (`forge` para compilación/testing, `anvil` como nodo RPC local).
- **Estándar Token:** ERC-20 (con 6 decimales de precisión).
- **Red Local / RPC:** `http://localhost:8545` (Chain ID `31337`).

---

## 🏛️ 3. Direcciones Inmutables de Despliegue Local

| Contrato Inteligente | Dirección On-Chain | Descripción |
| :--- | :--- | :--- |
| **`EuroTokenOptimized.sol`** | `0x5FbDB2315678afecb367f032d93F642f64180aa3` | Token ERC-20 representativo de Euro (EURT, 6 decimales). |
| **`Ecommerce.sol`** | `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707` | Contrato Principal E-Commerce, Registro y Custodia Escrow. |

---

## 🔒 4. Arquitectura de Custodia Escrow On-Chain

La plataforma garantiza que **ningún pago pase directamente a la billetera del comercio al comprar**, sino que es retenido en la dirección del propio Smart Contract (`address(this)`):

```
 [ Cliente (MetaMask) ] 
         │ 
         ▼ (1) approve(Ecommerce, amount) & processPayment(...)
 ┌────────────────────────────────────────────────────────────┐
 │  Smart Contract Escrow (Ecommerce.sol)                     │
 │  Dirección: 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707      │
 │  🔒 FONDOS EN CUSTODIA (balanceOf(address(this)))          │
 └────────────────────────────────────────────────────────────┘
         │ 
         ▼ (2) Despacho (shipOrder) + Confirmación de Entrega (confirmDelivery)
 [ Billetera Web3 de la Empresa Proveedora ]
```

### Funciones Clave del Workflow Escrow:

1. **`processPayment(address _customer, uint256 _amount, uint256 _invoiceId)`**
   - Transfiere tokens EURT desde `_customer` hacia `address(this)` (Contrato Escrow).
   - Marca `invoice.isPaid = true` y actualiza estado a `Paid` (`1`).
   - Reduce stock de productos y actualiza volumen de compra del cliente.

2. **`shipOrder(uint256 _invoiceId, string memory _trackingNumber)`**
   - Requiere que la factura esté pagada (`isPaid == true`).
   - Actualiza estado a `Shipped` (`2`) y registra la guía de transporte.

3. **`confirmDelivery(uint256 _invoiceId)`**
   - Firma la entrega recibida por parte del cliente o administrador.
   - Ejecuta la transferencia de fondos liberados:  
     `euroToken.transfer(company.companyAddress, invoice.totalAmount)`
   - Actualiza el estado a `Delivered` (`3`) / `Completed` (`4`).

---

## ⚙️ 5. Comandos de Compilación y Despliegue (Foundry)

```bash
# Compilación de Contratos
cd sc-ecommerce
forge build

# Despliegue en Nodo Anvil Local (Puerto 8545)
forge script script/DeployEcommerce.s.sol:DeployEcommerceScript \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```
