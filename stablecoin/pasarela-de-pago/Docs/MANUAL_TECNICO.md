# 📘 Manual Técnico: Pasarela Web3 Escrow (`pasarela-de-pago`)

**Plataforma BARLO-VENTAS E-Commerce Web3**  
**Puerto Local:** `3002` | **URL:** `http://localhost:3002`

---

## 📋 1. Resumen Ejecutivo
`pasarela-de-pago` es la pasarela de cobro Web3 independiente e integrable. Permite a comercios externos procesar pagos en la stablecoin **EuroToken (`EURT`)** bajo esquema de custodia inteligente Escrow. Recibe parámetros vía URL (`merchant`, `amount`, `invoiceId`, `redirectUrl`) y procesa el cobro conectando la billetera MetaMask del cliente.

---

## 🛠️ 2. Stack Tecnológico

- **Framework:** Next.js 15 (App Router, Turbopack).
- **Lenguaje:** TypeScript / React 19.
- **Librería Blockchain:** Ethers.js v6.
- **Estilos:** Tailwind CSS / Glassmorphism.

---

## 🔄 3. Flujo de Procesamiento e Integración

1. **Parámetros de Entrada (Query String):**
   ```text
   http://localhost:3002/?merchant=Super+Owner+Enterprise&amount=10.00&invoiceId=1&redirectUrl=http%3A%2F%2Flocalhost%3A3001%2Forders
   ```
2. **Validación de Billetera y Conexión Web3:**  
   Conecta MetaMask mediante `window.ethereum`, verifica la red y obtiene el saldo en EURT del comprador (`euroToken.balanceOf`).
3. **Aprobación y Depósito Escrow:**  
   Ejecuta `euroToken.approve(ecommerceAddress, amount)` y posteriormente `ecommerce.processPayment(customerAddress, amount, invoiceId)`.
4. **Redirección Automatizada:**  
   Tras la confirmación de la transacción en la blockchain, redirige automáticamente al cliente al parámetro `redirectUrl` adjuntando la confirmación del pago.

---

## ⚙️ 4. Ejecución Local

```bash
cd stablecoin/pasarela-de-pago
npm install
npm run dev -- -p 3002
```
