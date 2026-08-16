# 📗 Manual Maestro de Funciones y Uso de Toda la Plataforma

**Plataforma BARLO-VENTAS E-Commerce Web3**  
**Versión:** 2.0 (Custodia Escrow On-Chain & Foundry Anvil)

---

## 🏛️ 1. Matriz Integral de Funciones y Servicios de la Plataforma (`Docs/`)

```text
 ┌────────────────────────────────────────────────────────────────────────────────────────────┐
 │                     PLATAFORMA BARLO-VENTAS E-COMMERCE WEB3                                │
 ├─────────────────────────┬─────────────────────────┬────────────────────────────────────────┤
 │ SUBSISTEMA              │ PUERTO / TECNOLOGÍA     │ MANUAL DE FUNCIONES EN CARPETA Docs/   │
 ├─────────────────────────┼─────────────────────────┼────────────────────────────────────────┤
 │ Smart Contracts & EVM   │ 8545 / Solidity Foundry │ sc-ecommerce/Docs/MANUAL_FUNCIONES...  │
 │ Consola Web Admin       │ 3000 / Next.js Ethers   │ web-admin/Docs/MANUAL_FUNCIONES...     │
 │ Portal Web Customer     │ 3001 / Next.js Ethers   │ web-customer/Docs/MANUAL_FUNCIONES...  │
 │ Pasarela Web3 Escrow    │ 3002 / Next.js Ethers   │ pasarela-de-pago/Docs/MANUAL_FUNC...   │
 │ Adquisición Stripe FIAT │ 3003 / Stripe API       │ compra-stablecoin/Docs/MANUAL_FUNC...  │
 └─────────────────────────┴─────────────────────────┴────────────────────────────────────────┘
```

---

## 📄 2. Índice Directo a los Manuales por Servicio (`Docs/`)

Haga clic en los enlaces a continuación para acceder a la especificación detallada de funciones de cada servicio:

- 📘 [`sc-ecommerce/Docs/MANUAL_FUNCIONES_Y_USO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/sc-ecommerce/Docs/MANUAL_FUNCIONES_Y_USO.md) — Especificación de funciones Solidity, eventos y Custodia Escrow.
- 📘 [`web-admin/Docs/MANUAL_FUNCIONES_Y_USO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/web-admin/Docs/MANUAL_FUNCIONES_Y_USO.md) — Especificación de funciones de la Ficha Financiera, Pilar Usuarios y Envíos Activos / Histórico.
- 📘 [`web-customer/Docs/MANUAL_FUNCIONES_Y_USO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/web-customer/Docs/MANUAL_FUNCIONES_Y_USO.md) — Especificación de funciones del Carrito 1-Step, confirmación de entrega y valoraciones.
- 📘 [`stablecoin/pasarela-de-pago/Docs/MANUAL_FUNCIONES_Y_USO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/stablecoin/pasarela-de-pago/Docs/MANUAL_FUNCIONES_Y_USO.md) — Especificación de parámetros URL y cobro Web3 independiente.
- 📘 [`stablecoin/compra-stablecoin/Docs/MANUAL_FUNCIONES_Y_USO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/stablecoin/compra-stablecoin/Docs/MANUAL_FUNCIONES_Y_USO.md) — Especificación del endpoint `/api/checkout` e integración Stripe.
