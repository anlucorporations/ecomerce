# 📕 Manual de Uso: Pasarela Web3 Escrow (`pasarela-de-pago`)

**Plataforma BARLO-VENTAS E-Commerce Web3**  
**Acceso Web:** `http://localhost:3002`

---

## 📋 1. Propósito de este Manual
Este manual orienta a desarrolladores y comercios aliados sobre cómo integrar y operar la pasarela de pago independiente `pasarela-de-pago` para cobrar en **EuroToken (`EURT`)** bajo custodia inteligente.

---

## 🌐 2. Estructura de Integración por URL

Para redirigir a un cliente a la pasarela de cobro desde una tienda externa, construya una URL con la siguiente sintaxis:

```text
http://localhost:3002/?merchant=NOMBRE_EMPRESA&amount=MONTO_EURT&invoiceId=ID_FACTURA&redirectUrl=URL_DE_RETORNO
```

### Parámetros Requeridos:
- **`merchant`:** Nombre comercial del negocio (ej: `Super+Owner+Enterprise`).
- **`amount`:** Monto total a cobrar en EURT (ej: `10.00`).
- **`invoiceId`:** Identificador único de la factura en blockchain (ej: `1`).
- **`redirectUrl`:** Dirección URL a la que será devuelto el cliente una vez confirmado el pago.

---

## 💳 3. Experiencia del Cliente en la Pasarela

1. El cliente llega a la pantalla de la pasarela y visualiza la tarjeta de cobro con el monto y nombre del comercio.
2. Presiona **`Conectar Billetera MetaMask`**.
3. Revisa su saldo disponible en EURT y presiona **`Autorizar y Pagar en Escrow`**.
4. Aprueba la transacción Web3.
5. Al confirmarse en blockchain, la pasarela muestra la pantalla de éxito y redirige automáticamente al cliente a `redirectUrl`.
