# 🛒 BARLO-VENTAS — Plataforma E-Commerce Web3 con Custodia Escrow On-Chain

[![Blockchain](https://img.shields.io/badge/Blockchain-Ethereum%20EVM-3C3C3D?style=for-the-badge&logo=ethereum)](https://ethereum.org)
[![Foundry](https://img.shields.io/badge/Framework-Foundry%20Anvil-FF4B4B?style=for-the-badge&logo=cargo)](https://getfoundry.sh/)
[![Next.js](https://img.shields.io/badge/Front--End-Next.js%2015%20(Turbopack)-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Solidity](https://img.shields.io/badge/Smart%20Contracts-Solidity%20%5E0.8.13-363636?style=for-the-badge&logo=solidity)](https://soliditylang.org/)
[![Stablecoin](https://img.shields.io/badge/Stablecoin-EuroToken%20(EURT)-0077BB?style=for-the-badge)](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/sc-ecommerce/src/Ecommerce.sol)

**BARLO-VENTAS** es un ecosistema descentralizado de comercio electrónico de grado profesional construido sobre contratos inteligentes en Solidity, arquitectura de microservicios con Next.js 15 y el motor de blockchain **Foundry Anvil**. Garantiza compras 100% seguras respaldadas por una **Custodia Escrow On-Chain Real** y la stablecoin **EuroToken (`EURT`)**.

---

## 🏛️ 1. Arquitectura de la Plataforma y Microservicios

El sistema opera mediante 5 microservicios interconectados y sincronizados mediante un orquestador automatizado (`manage-platform.ps1`):

```text
                               ┌──────────────────────────────────────────┐
                               │  Nodo Blockchain EVM RPC (Foundry Anvil) │
                               │  http://localhost:8545 [Chain ID 31337]  │
                               └────────────────────┬─────────────────────┘
                                                    │
         ┌──────────────────────┬───────────────────┼───────────────────┬──────────────────────┐
         │                      │                   │                   │                      │
         ▼                      ▼                   ▼                   ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Smart Contracts │  │    web-admin     │  │  web-customer │  │ pasarela-de-pago │  │ compra-stablecoin│
│ (Solidity/Forge) │  │  Console Admin   │  │  Storefront   │  │  Pasarela Escrow │  │ Rampa Stripe FIAT│
│  EuroToken & ECom│  │  Puerto: 3000    │  │  Puerto: 3001 │  │   Puerto: 3002   │  │   Puerto: 3003   │
└──────────────────┘  └──────────────────┘  └───────────────┘  └──────────────────┘  └──────────────────┘
```

| Microservicio / Módulo | Puerto | URL Local | Descripción Técnica |
| :--- | :---: | :--- | :--- |
| **Foundry Anvil EVM Node** | `8545` | `http://localhost:8545` | Nodo blockchain local en tiempo real (Chain ID `31337`). |
| **`web-admin` Console** | `3000` | `http://localhost:3000` | Consola de administración, Pilar Usuarios con Ficha Financiera, Gestión de Envíos Activos e Histórico. |
| **`web-customer` Storefront** | `3001` | `http://localhost:3001` | Portal de compradores, carrito 1-Step Direct Escrow, rastro de pedidos, firma de recepción y valoraciones. |
| **`pasarela-de-pago` Escrow** | `3002` | `http://localhost:3002` | Pasarela Web3 independiente para integración en tiendas externas vía URL query string. |
| **`compra-stablecoin` (Stripe)** | `3003` | `http://localhost:3003` | Rampa de adquisición FIAT-a-Crypto para recargar saldo EURT con tarjeta de crédito mediante Stripe API. |

---

## 🔒 2. Custodia Escrow On-Chain Real (Solidity)

A diferencia de las pasarelas tradicionales, en BARLO-VENTAS **el pago no llega directamente al comerciante al comprar**. 

```solidity
// Al ejecutar processPayment: Los tokens EURT se transfieren a la custodia del contrato inteligente (address(this))
require(euroToken.transferFrom(_customer, address(this), _amount), "Transfer to Escrow failed");
```

### Flujo del Dinero On-Chain:
1. **Pago en Carrito (`processPayment`):** Los EURT del cliente se bloquean dentro de la dirección del propio contrato inteligente `Ecommerce.sol` (`0x5FC8d32690cc91D4c39d9d3abcBD16989F875707`).
2. **Despacho Logístico (`shipOrder`):** El vendedor emite la guía de envío y la registra en blockchain.
3. **Firma y Liberación (`confirmDelivery`):** Cuando el comprador o el administrador confirman la recepción, el contrato ejecuta la liberación de fondos retenidos hacia la billetera del vendedor:
   ```solidity
   require(euroToken.transfer(company.companyAddress, invoice.totalAmount), "Escrow release failed");
   ```

---

## 🔑 3. Direcciones Inmutables de Contratos Inteligentes

- **`EuroTokenOptimized.sol` (ERC-20 EURT):** `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **`Ecommerce.sol` (Escrow Core):** `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707`

### Cuentas Preconfiguradas para Pruebas (MetaMask):
> ⚠️ **Solo entorno local (Anvil).** Estas claves privadas son las públicas por defecto de Anvil y NUNCA deben usarse en producción. En producción, las claves del owner/relayer se inyectan por variables de entorno.
- **Administrador & Empresa ID #1:** `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`  
  *(PrivateKey: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`)*
- **Cliente Frecuente (Cuenta #9):** `0xa0Ee7A142d267C1f36714E4a8F75612F20a79720`  
  *(PrivateKey: `0x2a871d0798f97d79e3a922e012cce5f4879e17a829394d6fc826164d15a4a358`)*

---

## ⚡ 4. Guía de Ejecución de la Plataforma

### Requisitos Previos:
- **Node.js:** `>= 18.0.0`
- **Foundry:** `anvil` & `forge` instalados.
- **PowerShell / Bash**

### Comandos del Orquestador (`manage-platform.ps1`):

```powershell
# 1. Iniciar toda la plataforma (Nodo Anvil + 4 Microservicios Web)
.\manage-platform.ps1 -Action start

# 2. Consultar estado operativo de todos los servicios (200 OK)
.\manage-platform.ps1 -Action status

# 3. Reiniciar la plataforma y re-desplegar contratos en blockchain
.\manage-platform.ps1 -Action restart

# 4. Reiniciar solo un servicio especifico (ej: admin, customer, pasarela, compra, rpc)
.\manage-platform.ps1 -Action restart-service -ServiceName admin

# 5. Apagar y detener todos los servicios de la plataforma
.\manage-platform.ps1 -Action stop

# 6. Inyectar datos de prueba locales (2 empresas, 10 productos, 2 clientes + 1000 EURT)
.\manage-platform.ps1 -Action seed
```

---

## 📚 5. Directorio de Documentación y Manuales

Toda la documentación técnica y de uso se encuentra organizada por carpetas dedicadas:

### 📂 Manuales por Servicio (`Docs/`):
- 📄 [`Docs/MANUAL_TECNICO_PLATAFORMA.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/Docs/MANUAL_TECNICO_PLATAFORMA.md) — Manual Técnico General Maestro.
- 📕 [`Docs/MANUAL_DE_USO_PLATAFORMA.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/Docs/MANUAL_DE_USO_PLATAFORMA.md) — Manual de Uso General Maestro.
- 📗 [`Docs/MANUAL_FUNCIONES_Y_USO_PLATAFORMA.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/Docs/MANUAL_FUNCIONES_Y_USO_PLATAFORMA.md) — Manual Maestro de Funciones de la Plataforma.
- 📄 [`sc-ecommerce/Docs/MANUAL_TECNICO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/sc-ecommerce/Docs/MANUAL_TECNICO.md) — Contratos Inteligentes & Foundry.
- 📄 [`web-admin/Docs/MANUAL_TECNICO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/web-admin/Docs/MANUAL_TECNICO.md) — Consola Web Admin.
- 📄 [`web-customer/Docs/MANUAL_TECNICO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/web-customer/Docs/MANUAL_TECNICO.md) — Storefront Web Customer.
- 📄 [`stablecoin/pasarela-de-pago/Docs/MANUAL_TECNICO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/stablecoin/pasarela-de-pago/Docs/MANUAL_TECNICO.md) — Pasarela Web3 Escrow.
- 📄 [`stablecoin/compra-stablecoin/Docs/MANUAL_TECNICO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/stablecoin/compra-stablecoin/Docs/MANUAL_TECNICO.md) — Recarga EURT con Stripe.

### 📁 Histórico de Desarrollo (`repTecnico/`):
- 📁 [`repTecnico/INDEX_REPOSITORIO_TECNICO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/repTecnico/INDEX_REPOSITORIO_TECNICO.md) — Catálogo completo de documentos de diseño, pruebas y requerimientos.
