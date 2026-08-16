# 📘 Manual de Funciones y Uso: Pasarela Web3 Escrow (`pasarela-de-pago`)

**Plataforma BARLO-VENTAS E-Commerce Web3**  
**Puerto Local:** `3002` | **Ruta Base:** `stablecoin/pasarela-de-pago/src/app`

---

## 📋 1. Visión General del Subsistema
`pasarela-de-pago` es una aplicación de cobro Web3 desacoplada para procesar pagos seguros en la stablecoin **EuroToken (`EURT`)** reteniendo el saldo en custodia inteligente.

---

## 🛠️ 2. Especificación de Parámetros y Componentes

### 🔗 A. Parámetros de URL (Query String)

| Parámetro | Tipo | Ejemplo | Descripción |
| :--- | :---: | :--- | :--- |
| **`merchant`** | `string` | `Super+Owner+Enterprise` | Nombre comercial visible en la cabecera del cobro. |
| **`amount`** | `string` | `10.00` | Importe en EURT a cobrar al cliente. |
| **`invoiceId`** | `string` | `1` | ID numérico de la factura en el contrato inteligente. |
| **`redirectUrl`** | `string` | `http%3A%2F%2Flocalhost%3A3001%2Forders` | URL de retorno al finalizar el pago. |

---

### 💳 B. Lógica de Ejecución en `page.tsx`

1. **`connectWallet()`:** Solicita permisos en MetaMask para obtener la cuenta del cliente (`window.ethereum.request({ method: 'eth_requestAccounts' })`).
2. **`checkBalance()`:** Consulta el saldo en EURT del cliente mediante `euroToken.balanceOf(account)`.
3. **`handlePayment()`:**
   - Ejecuta `euroToken.approve(ecommerceAddress, rawAmount)`.
   - Ejecuta `ecommerce.processPayment(account, rawAmount, invoiceId)` ➔ Transfiere los EURT hacia la **Custodia Escrow (`address(this)`)**.
4. **Redirección de Confirmación:**
   - Al recibir el hash de la transacción, invoca `window.location.href = redirectUrl` adjuntando los parámetros de pago exitoso.
