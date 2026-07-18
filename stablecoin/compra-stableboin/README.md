# Compra EuroToken - Aplicación de Compra de Stablecoin

Esta aplicación permite a los usuarios comprar EuroToken (EURT), una stablecoin respaldada 1:1 con EUR, utilizando pagos con tarjeta de crédito a través de Stripe y recibiendo los tokens directamente en su billetera MetaMask.

## Características

- ✅ Compra de EuroToken (EURT) con tarjeta de crédito
- ✅ Integración con MetaMask para direcciones de destino
- ✅ Procesamiento de pagos seguro con Stripe
- ✅ Interfaz intuitiva y responsiva
- ✅ Verificación de estado de transacciones
- ✅ Soporte para múltiples montos de compra

## Tecnologías Utilizadas

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Pagos**: Stripe Elements
- **Web3**: Ethers.js, MetaMask
- **Smart Contract**: ERC-20 (OpenZeppelin)

## Estructura del Proyecto

```
compra-stableboin/
├── src/
│   └── app/
│       ├── components/
│       │   ├── EuroTokenPurchase.tsx    # Componente principal
│       │   ├── MetaMaskConnect.tsx      # Conexión a MetaMask
│       │   └── CheckoutForm.tsx         # Formulario de Stripe
│       ├── api/
│       │   ├── create-payment-intent/   # API para crear intents
│       │   └── verify-payment/          # API para verificar pagos
│       ├── success/
│       │   └── page.tsx                 # Página de éxito
│       ├── layout.tsx
│       └── page.tsx
└── ../sc/                               # Smart Contract
    └── src/
        └── EuroToken.sol               # Contrato ERC-20
```

## Configuración

### 1. Configuración del Smart Contract

```bash
cd ../sc
forge install
forge build
```

### 2. Configuración de la Aplicación Web

```bash
npm install
```

### 3. Variables de Entorno

Copia `.env.example` a `.env.local` y configura:

```env
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 4. Configuración de Stripe

1. Crear cuenta en [Stripe](https://stripe.com)
2. Obtener las claves de API (test mode)
3. Configurar webhooks para eventos de pago

## Ejecución

### Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

### Producción

```bash
npm run build
npm start
```

## Funcionalidades Principales

### 1. Conexión de Billetera
- Los usuarios pueden conectar su billetera MetaMask
- Detección automática de MetaMask instalado
- Manejo de errores de conexión

### 2. Compra de Tokens
- Selección de monto (€10 - €10,000)
- Cálculo automático de tokens a recibir (1:1 EUR:EURT)
- Formulario de pago integrado con Stripe

### 3. Procesamiento de Pagos
- Pagos seguros con Stripe Elements
- Verificación del estado del pago
- Página de confirmación con detalles

### 4. Integración Blockchain
- Smart contract ERC-20 para EuroToken
- Función de mint para nuevos tokens
- Transferencia automática a billetera del usuario

## Smart Contract EuroToken

El contrato `EuroToken.sol` incluye:

- Standard ERC-20 con OpenZeppelin
- Funcionalidad de mint para el owner
- Funciones de burn para reducir supply
- 6 decimales para precisión de céntimos

### Características del Token

- **Nombre**: EuroToken
- **Símbolo**: EURT
- **Decimales**: 6
- **Supply Inicial**: 0 EURT (tokens se mintean al comprar)
- **Respaldo**: 1:1 con EUR
- **Modelo**: Minting dinámico tras pagos exitosos

## API Endpoints

### POST `/api/create-payment-intent`
Crea un nuevo payment intent de Stripe.

**Body:**
```json
{
  "amount": 100,
  "currency": "eur",
  "walletAddress": "0x..."
}
```

### GET `/api/verify-payment?payment_intent=pi_...`
Verifica el estado de un pago.

**Response:**
```json
{
  "status": "succeeded",
  "amount": 10000,
  "currency": "eur",
  "metadata": {
    "walletAddress": "0x..."
  }
}
```

### POST `/api/mint-tokens`
Mintea tokens EURT a una dirección (para testing).

**Body:**
```json
{
  "walletAddress": "0x...",
  "amount": 100
}
```

**Response:**
```json
{
  "success": true,
  "transactionHash": "0x...",
  "amountMinted": 100,
  "newBalance": "100.0",
  "totalSupply": "100.0"
}
```

### POST `/api/webhook`
Webhook de Stripe para minting automático tras pagos exitosos.

**Eventos soportados:**
- `payment_intent.succeeded`: Mintea tokens automáticamente

## Próximos Pasos

1. **Implementar minting automático**: Conectar el webhook de Stripe con el smart contract
2. **Agregar soporte para más redes**: Polygon, BSC, etc.
3. **Sistema de notificaciones**: Email/SMS de confirmación
4. **Dashboard de admin**: Para gestionar tokens y transacciones
5. **KYC/AML**: Implementar verificación de identidad
