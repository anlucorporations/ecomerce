# 📕 Manual de Uso: Adquisición de EURT vía Stripe (`compra-stablecoin`)

**Plataforma BARLO-VENTAS E-Commerce Web3**  
**Acceso Web:** `http://localhost:3003`

---

## 📋 1. Propósito de este Manual
Este manual explica cómo funciona la adquisición de tokens **EuroToken (`EURT`)** mediante pago convencional con tarjetas de crédito/débito usando Stripe.

---

## 💶 2. Guía de Compra de Tokens

1. Ingrese a `http://localhost:3003` (o haga clic en "Recargar EURT" desde la tienda del cliente).
2. Introduzca la **Dirección Pública de su Billetera MetaMask** (ej: `0xf39Fd6e5...`).
3. Ingrese la cantidad de Euros a comprar (ej: €50.00 EUR).
4. Presione **`Continuar a Pago Seguro con Stripe`**.
5. Se abrirá la pasarela bancaria protegida de Stripe Checkout.
6. Introduzca los datos de su tarjeta bancaria y confirme la compra.
7. Una vez aprobado el cargo bancario, el backend emite automáticamente los tokens EURT hacia su wallet Web3 mediante la función `mint` en la blockchain.
