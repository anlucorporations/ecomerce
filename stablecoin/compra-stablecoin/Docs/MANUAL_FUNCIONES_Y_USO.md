# 📘 Manual de Funciones y Uso: Recarga FIAT-EURT (`compra-stablecoin`)

**Plataforma BARLO-VENTAS E-Commerce Web3**  
**Puerto Local:** `3003` | **Ruta Base:** `stablecoin/compra-stablecoin/src/app`

---

## 📋 1. Visión General del Subsistema
`compra-stablecoin` opera como la pasarela de adquisición FIAT que permite a cualquier usuario comprar saldo **EuroToken (`EURT`)** pagando en Euros (€) con tarjeta de crédito o débito mediante Stripe API.

---

## 🛠️ 2. Especificación de Endpoints y Componentes

### 💳 A. Interface Principal (`page.tsx`)
- Formulario de recarga con entrada para la dirección de billetera pública MetaMask y el monto en EUR.
- Botones de selección rápida (€50 EURT, €100 EURT, €500 EURT).

### ⚙️ B. Route Handler (`/api/checkout/route.ts`)

| Método | Endpoint | Parámetros Body | Descripción y Uso |
| :---: | :--- | :--- | :--- |
| **`POST`** | `/api/checkout` | `{ amount, userAddress }` | Genera una sesión de pago en Stripe Checkout y emite los tokens EURT on-chain al confirmarse el cobro. |

#### Secuencia Interna del Endpoint:
1. Crea la sesión `stripe.checkout.sessions.create({ payment_method_types: ['card'], line_items, mode: 'payment' })`.
2. Al recibir la confirmación de Stripe, inicializa un `ethers.Wallet` con la cuenta privilegida del nodo blockchain (Relayer Wallet).
3. Invoca la función `EuroToken.mint(userAddress, amountInRawUnits)`.
4. Devuelve la respuesta JSON con la URL de Stripe o la confirmación de la transacción.
