# 📙 Manual Técnico General: Plataforma BARLO-VENTAS E-Commerce Web3

**Versión:** 2.0 (Despliegue Multi-Servicio & Foundry Anvil Blockchain)  
**Autor:** Equipo de Desarrollo de Plataforma BARLO-VENTAS

---

## 🏛️ 1. Arquitectura General del Sistema

La plataforma **BARLO-VENTAS** está estructurada bajo una arquitectura modular de microservicios interconectados mediante contratos inteligentes en la blockchain EVM (Foundry Anvil):

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

---

## 📄 2. Índice de Manuales Técnicos por Servicio

Cada subsistema cuenta con su propio manual técnico independiente y detallado:

| Subsistema / Servicio | Puerto Local | Archivo de Manual Técnico Dedicado |
| :--- | :---: | :--- |
| **1. Smart Contracts & EVM Core** | `8545` | 📄 [`sc-ecommerce/MANUAL_TECNICO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/sc-ecommerce/MANUAL_TECNICO.md) |
| **2. Consola Web Admin** | `3000` | 📄 [`web-admin/MANUAL_TECNICO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/web-admin/MANUAL_TECNICO.md) |
| **3. Portal Web Customer** | `3001` | 📄 [`web-customer/MANUAL_TECNICO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/web-customer/MANUAL_TECNICO.md) |
| **4. Pasarela Web3 Escrow** | `3002` | 📄 [`stablecoin/pasarela-de-pago/MANUAL_TECNICO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/stablecoin/pasarela-de-pago/MANUAL_TECNICO.md) |
| **5. Adquisición FIAT-EURT (Stripe)** | `3003` | 📄 [`stablecoin/compra-stablecoin/MANUAL_TECNICO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/stablecoin/compra-stablecoin/MANUAL_TECNICO.md) |

---

## 🛠️ 3. Orquestador y Script de Gestión de Plataforma

La gestión del ciclo de vida de la plataforma se realiza mediante el orquestador PowerShell / CMD en la raíz:

### Comandos de Operación:

- **Iniciar Toda la Plataforma:**
  ```powershell
  .\manage-platform.ps1 -Action start
  ```
- **Detener y Apagar Toda la Plataforma:**
  ```powershell
  .\manage-platform.ps1 -Action stop
  ```
- **Reiniciar la Plataforma (Redespliegue Blockchain):**
  ```powershell
  .\manage-platform.ps1 -Action restart
  ```
- **Reiniciar Solo Un Servicio:**
  ```powershell
  .\manage-platform.ps1 -Action restart-service -ServiceName admin
  # Opciones ServiceName: admin, customer, pasarela, compra, rpc
  ```
- **Consultar Estado de Todos los Endpoints:**
  ```powershell
  .\manage-platform.ps1 -Action status
  ```
