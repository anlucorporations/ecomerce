# 📕 Manual de Uso: Nodo Blockchain y Smart Contracts

**Plataforma BARLO-VENTAS E-Commerce Web3**

---

## 📋 1. Propósito de este Manual
Esta guía orienta a los administradores Web3, desarrolladores y auditores sobre cómo operar el nodo blockchain **Foundry Anvil** y cómo interactuar con los contratos inteligentes **`EuroTokenOptimized`** y **`Ecommerce`**.

---

## 🔑 2. Cuentas Preconfiguradas para Pruebas (Node Anvil)

Al iniciar el nodo blockchain local (`http://localhost:8545`), Anvil asigna 10 cuentas de prueba cargadas con 10,000 ETH cada una:

| Nombre / Rol en la Plataforma | Dirección de Billetera Publica | Llave Privada (Importar en MetaMask) |
| :--- | :--- | :--- |
| **Cuenta #0: Administrador General y Empresa #1** | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| **Cuenta #9: Cliente / Comprador Frecuente** | `0xa0Ee7A142d267C1f36714E4a8F75612F20a79720` | `0x2a871d0798f97d79e3a922e012cce5f4879e17a829394d6fc826164d15a4a358` |

---

## 🦊 3. Configuración de MetaMask para interactuar con los Contratos

1. Abra su extensión **MetaMask**.
2. Haga clic en la selección de redes y seleccione **`Agregar red manualmente`**.
3. Ingrese los siguientes datos:
   - **Nombre de la Red:** `Foundry Anvil Local`
   - **URL de RPC:** `http://localhost:8545`
   - **ID de Cadena (Chain ID):** `31337`
   - **Símbolo de Moneda:** `ETH`
4. Guarde y cambie a la red recién agregada.
5. Para agregar la stablecoin **EuroToken (EURT)** a su wallet, haga clic en `Importar tokens` e ingrese:
   - **Dirección del contrato del token:** `0x5FbDB2315678afecb367f032d93F642f64180aa3`
   - **Símbolo:** `EURT`
   - **Decimales:** `6`

---

## 📊 4. Verificación del Estado de la Custodia Escrow

Para verificar los saldos retenidos en el Smart Contract de Custodia Escrow (`0x5FC8d32690cc91D4c39d9d3abcBD16989F875707`), ejecute el script de auditoría en la raíz del proyecto:

```bash
node C:\Users\lucci\.gemini\antigravity\brain\25a8dcf4-79a8-488e-80ce-1c4be7e8b044\scratch\check_rpc.js
```
El script mostrará en pantalla el saldo en EURT del usuario, los fondos retenidos en el contrato inteligente y el saldo liberado en la empresa.
