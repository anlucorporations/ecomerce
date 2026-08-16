# 📗 Manual Maestro de Funciones y Uso de Toda la Plataforma

**Plataforma BARLO-VENTAS E-Commerce Web3**  
**Versión:** 2.0 (Custodia Escrow On-Chain & Foundry Anvil)

---

## 🏛️ 1. Matriz Integral de Funciones y Servicios de la Plataforma

```text
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                    PLATAFORMA BARLO-VENTAS E-COMMERCE WEB3                             │
 ├─────────────────────────┬─────────────────────────┬────────────────────────────────────┤
 │ SUBSISTEMA              │ PUERTO / TECNOLOGÍA     │ MANUAL DE FUNCIONES DEDICADO       │
 ├─────────────────────────┼─────────────────────────┼────────────────────────────────────┤
 │ Smart Contracts & EVM   │ 8545 / Solidity Foundry │ sc-ecommerce/MANUAL_FUNCIONES...   │
 │ Consola Web Admin       │ 3000 / Next.js Ethers   │ web-admin/MANUAL_FUNCIONES...      │
 │ Portal Web Customer     │ 3001 / Next.js Ethers   │ web-customer/MANUAL_FUNCIONES...   │
 │ Pasarela Web3 Escrow    │ 3002 / Next.js Ethers   │ pasarela-de-pago/MANUAL_FUNC...    │
 │ Adquisición Stripe FIAT │ 3003 / Stripe API       │ compra-stablecoin/MANUAL_FUNC...   │
 └─────────────────────────┴─────────────────────────┴────────────────────────────────────┘
```

---

## 📄 2. Índice Directo a los Manuales por Servicio

Haga clic en los enlaces a continuación para acceder a la especificación detallada de funciones de cada servicio:

- 📘 [`sc-ecommerce/MANUAL_FUNCIONES_Y_USO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/sc-ecommerce/MANUAL_FUNCIONES_Y_USO.md) — Especificación de funciones Solidity, eventos y Custodia Escrow.
- 📘 [`web-admin/MANUAL_FUNCIONES_Y_USO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/web-admin/MANUAL_FUNCIONES_Y_USO.md) — Especificación de funciones de la Ficha Financiera, Pilar Usuarios y Envíos Activos / Histórico.
- 📘 [`web-customer/MANUAL_FUNCIONES_Y_USO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/web-customer/MANUAL_FUNCIONES_Y_USO.md) — Especificación de funciones del Carrito 1-Step, confirmación de entrega y valoraciones.
- 📘 [`stablecoin/pasarela-de-pago/MANUAL_FUNCIONES_Y_USO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/stablecoin/pasarela-de-pago/MANUAL_FUNCIONES_Y_USO.md) — Especificación de parámetros URL y cobro Web3 independiente.
- 📘 [`stablecoin/compra-stablecoin/MANUAL_FUNCIONES_Y_USO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/stablecoin/compra-stablecoin/MANUAL_FUNCIONES_Y_USO.md) — Especificación del endpoint `/api/checkout` e integración Stripe.
