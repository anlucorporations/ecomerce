# 📘 Manual Técnico: Adquisición EURT vía Stripe (`compra-stablecoin`)

**Plataforma BARLO-VENTAS E-Commerce Web3**  
**Puerto Local:** `3003` | **URL:** `http://localhost:3003`

---

## 📋 1. Resumen Ejecutivo
`compra-stablecoin` es el microservicio encendido como rampa de entrada FIAT-a-Crypto. Permite a los usuarios comprar tokens **EuroToken (`EURT`)** utilizando tarjetas de crédito o débito mediante la pasarela de pago **Stripe**. Al confirmarse la transacción bancaria, el servicio acuña automáticamente los tokens EURT equivalentes en la dirección Web3 del comprador.

---

## 🛠️ 2. Stack Tecnológico

- **Framework:** Next.js 15 (App Router, Turbopack).
- **Lenguaje:** TypeScript / React 19.
- **Integración Pasarela:** SDK Oficial Stripe API (`stripe`).
- **Librería Blockchain:** Ethers.js v6 (Conexión RPC con Privileged Relayer Wallet).

---

## ⚡ 3. Arquitectura del Endpoint `/api/checkout`

```text
 [ Usuario en Front-End ] 
         │ 
         ▼ POST /api/checkout { amount, userAddress }
 ┌────────────────────────────────────────────────────────────┐
 │  API Route Next.js (/api/checkout)                        │
 │  1. Genera Sesión de Checkout Stripe en EUR               │
 │  2. Tras confirmación FIAT, utiliza Relayer Wallet        │
 │  3. Ejecuta EuroToken.mint(userAddress, amount)           │
 └────────────────────────────────────────────────────────────┘
         │ 
         ▼ Transaction Hash emitido en Blockchain
 [ Balance EURT acreditado en Billetera Web3 del Cliente ]
```

---

## ⚙️ 4. Ejecución Local

```bash
cd stablecoin/compra-stablecoin
npm install
npm run dev -- -p 3003
```
