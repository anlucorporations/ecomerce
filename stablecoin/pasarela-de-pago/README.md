# Pasarela de Pago EuroToken

Una pasarela de pago Web3 construida con Next.js que permite realizar pagos con el token EuroToken (EURT) en Ethereum utilizando MetaMask.

## Descripción

Esta aplicación funciona como una pasarela de pago descentralizada que permite a comerciantes recibir pagos en EuroToken de sus clientes. La pasarela maneja todo el flujo de pago, desde la conexión de la billetera hasta la confirmación de la transacción en blockchain.

## Características

- ✅ Conexión con MetaMask para autenticación Web3
- ✅ Interfaz de pago intuitiva y responsiva
- ✅ Validación de dirección de cliente
- ✅ Verificación de saldo antes de procesar pagos
- ✅ Confirmación visual de transacciones
- ✅ Redirección automática después del pago
- ✅ Soporte para integración mediante URL parameters
- ✅ Comunicación con ventana padre via postMessage

## Tecnologías

- **Framework:** Next.js 15.5.4 con App Router
- **React:** 19.1.0
- **Blockchain:** Ethers.js 6.15.0
- **Estilos:** Tailwind CSS 4
- **TypeScript:** 5.x
- **Turbopack:** Para desarrollo y build optimizados

## Requisitos Previos

- Node.js 20.x o superior
- MetaMask instalado en el navegador
- Acceso a una red Ethereum (local o testnet)
- Token EuroToken (EURT) desplegado en la red

## Instalación

```bash
# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo
npm run dev

# Build de producción
npm run build

# Iniciar servidor de producción
npm start

# Ejecutar linter
npm run lint
```

El servidor de desarrollo estará disponible en [http://localhost:3000](http://localhost:3000).

## Configuración

### Contrato EuroToken

El contrato EuroToken está configurado en [src/app/components/PaymentGateway.tsx:31](src/app/components/PaymentGateway.tsx#L31):

```typescript
const EUROTOKEN_CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
```

**Importante:** Actualiza esta dirección con la dirección del contrato desplegado en tu red.

### ABI del Contrato

El ABI utilizado incluye las siguientes funciones:

```typescript
const EUROTOKEN_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];
```

## Uso

### Parámetros URL Requeridos

La pasarela requiere los siguientes parámetros en la URL:

| Parámetro | Tipo | Descripción | Requerido |
|-----------|------|-------------|-----------|
| `merchant_address` | string | Dirección Ethereum del comerciante | ✅ |
| `address_customer` | string | Dirección Ethereum del cliente | ✅ |
| `amount` | string | Cantidad a pagar en EURT | ✅ |
| `invoice` | string | Número de factura o identificador | ✅ |
| `date` | string | Fecha de la transacción | ✅ |
| `redirect` | string | URL de retorno después del pago | ❌ |

### Ejemplo de URL

```
http://localhost:3000/?merchant_address=0x1234...&address_customer=0x5678...&amount=100.50&invoice=INV-001&date=2025-10-14&redirect=https://miapp.com/success
```

### Integración en una Aplicación

#### Opción 1: Redirección Directa

```javascript
const paymentUrl = new URL('http://localhost:3000');
paymentUrl.searchParams.append('merchant_address', '0x...');
paymentUrl.searchParams.append('address_customer', '0x...');
paymentUrl.searchParams.append('amount', '100.50');
paymentUrl.searchParams.append('invoice', 'INV-001');
paymentUrl.searchParams.append('date', new Date().toISOString());
paymentUrl.searchParams.append('redirect', 'https://miapp.com/success');

window.location.href = paymentUrl.toString();
```

#### Opción 2: Ventana Emergente (Popup)

```javascript
const paymentUrl = /* URL con parámetros */;
const popup = window.open(paymentUrl, 'payment', 'width=600,height=800');

// Escuchar mensaje de confirmación
window.addEventListener('message', (event) => {
  if (event.data.type === 'PAYMENT_COMPLETED') {
    console.log('Pago completado:', event.data.result);
    popup.close();
  }
});
```

## Flujo de Pago

1. **Validación de Parámetros:** La aplicación verifica que todos los parámetros requeridos estén presentes
2. **Conexión de Billetera:** El usuario conecta su MetaMask
3. **Validación de Dirección:** Se verifica que la dirección conectada coincida con `address_customer`
4. **Verificación de Saldo:** Se comprueba que el cliente tenga suficiente EURT
5. **Confirmación de Detalles:** El usuario revisa los detalles del pago
6. **Firma de Transacción:** El usuario firma la transacción en MetaMask
7. **Procesamiento:** La transacción se envía a la blockchain
8. **Confirmación:** Se muestra el resultado con el hash de transacción
9. **Redirección:** (Opcional) Se redirige al usuario a la URL especificada

## API Endpoints

### POST /api/process-payment

Procesa la confirmación de un pago (endpoint de ejemplo para uso futuro).

**Request Body:**
```json
{
  "transactionHash": "0x...",
  "merchantAddress": "0x...",
  "customerAddress": "0x...",
  "amount": "100.50",
  "invoice": "INV-001",
  "date": "2025-10-14T12:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "transactionHash": "0x...",
  "paymentData": {
    "merchant_address": "0x...",
    "address_customer": "0x...",
    "amount": "100.50",
    "invoice": "INV-001",
    "date": "2025-10-14T12:00:00Z"
  },
  "processedAt": "2025-10-14T12:00:05Z",
  "status": "completed"
}
```

### GET /api/process-payment?transactionHash=0x...

Obtiene el estado de un pago por hash de transacción.

**Response:**
```json
{
  "transactionHash": "0x...",
  "status": "completed",
  "verifiedAt": "2025-10-14T12:00:05Z"
}
```

## Estructura del Proyecto

```
pasarela-de-pago/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── PaymentGateway.tsx      # Componente principal de pago
│   │   │   └── PaymentGatewayDirect.tsx # Versión alternativa
│   │   ├── api/
│   │   │   └── process-payment/
│   │   │       └── route.ts             # API endpoint para procesar pagos
│   │   ├── test/
│   │   │   └── page.tsx                 # Página de prueba
│   │   ├── page.tsx                     # Página principal
│   │   ├── layout.tsx                   # Layout de la app
│   │   ├── globals.css                  # Estilos globales
│   │   └── favicon.ico
│   └── types/
│       └── ethereum.d.ts                # Tipos TypeScript para Ethereum
├── public/                              # Recursos estáticos
├── next.config.ts                       # Configuración Next.js
├── tsconfig.json                        # Configuración TypeScript
├── tailwind.config.js                   # Configuración Tailwind
└── package.json
```

## Tipos TypeScript

### PaymentData

```typescript
interface PaymentData {
  merchant_address: string;
  address_customer: string;
  amount: string;
  invoice: string;
  date: string;
  redirect?: string;
}
```

### PaymentResult

```typescript
interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  paymentData: PaymentData;
}
```

## Seguridad

- ✅ Validación de dirección de cliente antes de procesar pagos
- ✅ Verificación de saldo antes de ejecutar transacciones
- ✅ Manejo de errores exhaustivo
- ✅ No almacena claves privadas (usa MetaMask)
- ⚠️ **Importante:** Valida siempre las transacciones en el backend antes de confirmar pedidos
- ⚠️ **Importante:** Implementa límites de rate-limiting en producción

## Limitaciones Conocidas

- Solo funciona con el token EuroToken (EURT) de 6 decimales
- Requiere MetaMask instalado en el navegador
- No incluye persistencia de datos de pagos (implementar en backend)
- No verifica la transacción en blockchain después de enviarla

## Mejoras Futuras

- [ ] Soporte para múltiples tokens
- [ ] Verificación de transacción en blockchain
- [ ] Persistencia de pagos en base de datos
- [ ] Soporte para WalletConnect y otras billeteras
- [ ] Panel de administración para comerciantes
- [ ] Webhooks para notificaciones
- [ ] Soporte para pagos parciales
- [ ] Sistema de reembolsos

## Desarrollo

### Ejecutar en Modo Desarrollo

```bash
npm run dev
```

La aplicación se ejecutará con Turbopack para hot-reload optimizado.

### Build de Producción

```bash
npm run build
npm start
```

## Licencia

Este proyecto es privado.

## Soporte

Para reportar problemas o solicitar características, contacta al equipo de desarrollo.


http://localhost:3002/?merchant_address=0x70997970C51812dc3A010C7d01b50e0d17dc79C8&address_customer=0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266&amount=100.50&invoice=INV-001&date=2025-10-14&redirect=https://miapp.com/success


http://localhost:3002/?merchant_address=0x70997970C51812dc3A010C7d01b50e0d17dc79C8&address_customer=0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266&amount=100.50&invoice=INV-001&date=2025-10-14&redirect=https://miapp.com/success