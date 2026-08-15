# Informe de análisis: sistema de e-commerce blockchain con EURT y custodia

## 1. Resumen ejecutivo

La propuesta describe un sistema de comercio electrónico basado en blockchain donde los usuarios pagan con EURT, una pasarela de pago actúa como custodio y dos servicios web separan la experiencia del comprador (`web customer`) y la gestión de empresas/pedidos (`web admin`).

La idea central es válida: usar un mecanismo de custodia para que el pago solo se libere cuando el usuario confirma la recepción de la mercancía. Sin embargo, tal como está descrita, la arquitectura presenta varios riesgos importantes:

1. **La “pasarela de pago” parece concentrar la custodia**, más que actuar como un contrato inteligente neutral.
2. **El flujo implica múltiples transferencias on-chain**, lo cual puede ser costoso, lento y propenso a fallos.
3. **No hay mecanismo claro de disputas, devoluciones, timeouts o liberación automática**.
4. **Se envía información de compra a blockchain**, lo puede hacer público datos que deberían ser privados.
5. **La UX dependerá fuertemente de MetaMask y pago de gas**, lo que puede ser inviable para usuarios no cripto.
6. **Hay riesgos regulatorios importantes** si la plataforma custodia fondos de usuarios y empresas.

La propuesta es **técnicamente viable como prototipo**, pero para producción debería evolucionar hacia un modelo de **escrow no custodial o mínimamente custodial**, con un solo depósito en un contrato inteligente, liberación por pedido/subpedido, datos sensibles fuera de cadena, soporte para disputas y una capa de baja comisión como L2.

---

## 2. Supuestos del análisis

Para este análisis se asume que:

- EURT funciona como un token ERC-20 o similar en una red EVM.
- MetaMask es la wallet del usuario.
- `web customer` y `web admin` son aplicaciones web tradicionales.
- El servicio en puerto 3002, llamado “pasarela de pago”, interactúa con blockchain o custodia fondos.
- Las empresas reciben pagos en EURT.
- La compra puede involucrar a varias empresas en un mismo carrito.

Si EURT está en otra blockchain, o si es una moneda interna emitida por la propia plataforma, cambian algunos requisitos técnicos y regulatorios.

---

## 3. Descripción de la metodología propuesta

### 3.1 Componentes principales

| Componente | Función |
|---|---|
| `web customer` | Interfaz del usuario: carrito, compra, saldo EURT, seguimiento de pedidos y confirmación de recepción. |
| `web admin` | Panel para empresas: gestión de productos, pedidos, despacho y estados. |
| Pasarela de pago / contrato de custodia | Servicio en puerto 3002 que intermedia entre usuario y empresas. Debe ejecutar transferencias EURT solo cuando se cumplan condiciones. |
| Blockchain / EURT | Capa de liquidación donde se mueven los fondos. |
| MetaMask | Wallet del usuario para autorizar transacciones. |

---

## 4. Análisis del flujo de compra propuesto

El flujo propuesto es:

1. El usuario paga el carrito desde `web customer`.
2. La pasarela envía autorización a MetaMask para transferir el total en EURT a una billetera de custodia.
3. Una vez confirmada la transferencia, la pasarela calcula montos por empresa y genera transferencias condicionadas a cada empresa.
4. Cuando todas las transacciones on-chain son exitosas, se notifica a `web customer`.
5. `web customer` actualiza el carrito y envía la orden a `web admin`.
6. `web admin` genera órdenes por empresa en estado “En Custodia”.

### 4.1 Puntos correctos del flujo

La intención general es adecuada:

- El usuario paga un total.
- Los fondos quedan bajo custodia.
- Las empresas no reciben el dinero inmediatamente.
- La liberación depende del acuse de recibo del usuario.
- Se separan roles entre comprador y empresa.

Esto es parecido a un modelo de **escrow** o depósito en garantía.

### 4.2 Problemas importantes

#### Problema 1: La pasarela parece una billetera custodio centralizada

La propuesta dice que el total se transfiere a una “billetera de custodia”. Si esa billetera está controlada por el servicio en puerto 3002, entonces la plataforma tiene custodia real de los fondos.

Eso implica:

- Riesgo de robo interno.
- Riesgo de fallo operativo.
- Riesgo legal/regulatorio.
- Posible bloqueo de fondos.
- Necesidad de controles tipo entidad de pago o e-money.
- Responsabilidad sobre reembolsos, disputas y cumplimiento normativo.

**Recomendación:**  
La custodia debería estar en un **contrato inteligente de escrow**, no en una billetera controlada por un backend. El contrato retendría los fondos y solo los liberaría según reglas programadas.

---

#### Problema 2: MetaMask no recibe órdenes directas del backend

La frase “la pasarela envía la autorización a MetaMask” es conceptualmente imprecisa.

MetaMask no es un servicio al que un backend pueda llamar directamente para que firme una transacción. El flujo correcto es:

1. El frontend, es decir `web customer`, genera la solicitud de transacción.
2. El usuario conecta MetaMask.
3. MetaMask muestra la transacción al usuario.
4. El usuario aprueba y firma.
5. La transacción se envía a la red.

El backend puede ayudar a construir la transacción, calcular montos, generar el `calldata` o estimar gas, pero **no puede sustituir la firma del usuario**.

**Recomendación:**  
Usar un flujo explícito de firma:

- Firma de autorización tipo EIP-712.
- Transacción `approve` + `transferFrom`, si EURT es ERC-20.
- Idealmente `permit` o `Permit2`, si el token lo soporta.
- Meta-transacciones si se quiere reducir fricción.

---

#### Problema 3: Enviar el detalle completo de la compra on-chain puede ser ineficiente y riesgoso

Si la autorización contiene el detalle completo de la compra, esa información puede quedar registrada en la blockchain.

Dependiendo de la implementación, esto puede implicar:

- Datos públicos.
- Datos inmutables.
- Coste elevado por tamaño de `calldata`.
- Exposición de información comercial.
- Conflictos con GDPR o leyes de protección de datos.

**Recomendación:**  
Guardar el detalle completo fuera de cadena y enviar solo un hash criptográfico a blockchain.

Por ejemplo:

```text
orderHash = keccak256(
  buyer,
  cartId,
  merchants[],
  amounts[],
  currency,
  nonce,
  expiry,
  metadataHash
)
```

La blockchain verifica el compromiso; el detalle legal/commercial se guarda en base de datos o almacenamiento cifrado.

---

#### Problema 4: Transferir a cada empresa inmediatamente no parece compatible con custodia real

En el paso 3 se indica que, tras recibir el pago del usuario, la pasarela genera transferencias EURT a cada empresa, condicionadas al acuse de recibo.

Aquí hay una contradicción operativa:

- Si la transferencia a la empresa ya se ejecutó, la empresa ya tiene el dinero.
- Si la transferencia está “condicionada”, la condición debe ser ejecutada por un contrato inteligente.
- Si la pasarela simplemente promete ejecutarla después, la garantía depende de la confianza en la pasarela.

Además, si hay muchas empresas, este modelo genera muchas transacciones:

```text
1 transferencia del usuario a custodia
N transferencias de custodia a empresas
```

Eso aumenta:

- Coste de gas.
- Complejidad.
- Probabilidad de fallo.
- Tiempo de confirmación.
- Riesgo de estados inconsistentes.

**Recomendación:**  
No transferir a las empresas en el momento de compra. En su lugar:

1. El usuario deposita el total en un contrato de escrow.
2. El contrato registra las asignaciones por empresa o subpedido.
3. Cada empresa solo recibe fondos cuando se libera su subpedido.
4. La liberación puede ser por usuario, timeout, árbitro o evidencia de entrega.

---

#### Problema 5: Falta manejo de fallos parciales

Si una compra incluye tres empresas y una transferencia falla, ¿qué ocurre con el pedido completo?

Casos no contemplados:

- Una empresa no tiene wallet válida.
- Una dirección está en lista negra del token.
- El contrato de EURT revierte.
- Hay falta de gas.
- La red está congestionada.
- Una empresa fue suspendida.
- Un producto quedó sin stock después del pago.

**Recomendación:**  
Diseñar el sistema con subpedidos independientes.

Ejemplo:

```text
Pedido global del usuario
├── Subpedido Empresa A
├── Subpedido Empresa B
└── Subpedido Empresa C
```

Cada subpedido puede tener su propio estado:

- `PENDIENTE`
- `EN_CUSTODIA`
- `ENVIADO`
- `RECIBIDO`
- `LIBERADO`
- `DISPUTA`
- `REEMBOLSADO`
- `CANCELADO`

Así, un problema con una empresa no bloquea todo el carrito.

---

## 5. Análisis del flujo de despacho propuesto

El flujo propuesto es:

1. La empresa marca la orden como “Enviado” con datos de envío.
2. El usuario marca la orden como recibida.
3. `web customer` notifica a la pasarela para liberar EURT.
4. Si la liberación es exitosa, la orden queda “Recibido” en customer y “Liberado” en admin.
5. El usuario puede valorar la compra.

### 5.1 Aspectos positivos

- La empresa registra información de envío.
- El usuario confirma recepción.
- La liberación de fondos depende de la recepción.
- Se contempla reputación posterior.

### 5.2 Problemas importantes

#### Problema 1: ¿Qué pasa si el usuario no confirma recepción?

Este es uno de los puntos más débiles.

Si el usuario recibe el producto pero no confirma, los fondos pueden quedar bloqueados indefinidamente.

Riesgos:

- Usuario malintencionado.
- Usuario que pierde acceso a wallet.
- Usuario que no entiende que debe confirmar.
- Usuario que no revisa la plataforma.
- Paquete entregado pero no reconocido.

**Recomendación:**  
Implementar timeout o liberación automática condicionada.

Por ejemplo:

```text
Si la empresa prueba envío con tracking válido,
y pasan X días desde la entrega estimada,
el contrato puede liberar automáticamente.
```

Pero esto requiere:

- Integración con APIs de logística.
- Oráculos de entrega.
- Periodos de disputa.
- Evidencia cargada por usuario/empresa.
- Resolución por soporte o árbitro.

---

#### Problema 2: ¿Qué pasa si el producto llega dañado o incorrecto?

La propuesta no contempla:

- Devoluciones.
- Reembolsos parciales.
- Productos dañados.
- Productos faltantes.
- Disputas.
- Cancelaciones antes del envío.
- Cancelaciones después del envío.

**Recomendación:**  
Añadir módulo de disputas.

Estados mínimos:

```text
DISPUTA_ABIERTA
DISPUTA_EN_REVISION
RESUELTO_A_FAVOR_EMPRESA
RESUELTO_A_FAVOR_USUARIO
REEMBOLSO_PARCIAL
REEMBOLSO_TOTAL
```

Y funciones en contrato:

```text
openDispute(orderId)
resolveDispute(orderId, resolution)
refund(orderId, amount)
releasePartial(orderId, amount)
```

---

#### Problema 3: La liberación no debería depender solo de una API centralizada

Cuando el usuario confirma recepción, `web customer` notifica a la pasarela, y la pasarela ejecuta la liberación.

Si la pasarela custodia los fondos, entonces:

- La plataforma puede negarse a liberar.
- Puede liberar incorrectamente.
- Puede sufrir ataques.
- Puede caer.
- Puede haber error humano.

**Recomendación:**  
La liberación debería ser una operación sobre contrato inteligente, idealmente iniciada por:

- Firma del usuario.
- Transacción del usuario.
- Meta-transacción firmada por usuario y enviada por relayer.
- Timeout automático.
- Resolución de disputa.

El backend solo debería indexar eventos y actualizar interfaz.

---

## 6. Viabilidad de implementación

### 6.1 Viabilidad técnica

**Sí es técnicamente viable**, especialmente como MVP o piloto.

Componentes posibles:

- Smart contracts en Solidity.
- Red EVM compatible.
- EURT como token ERC-20.
- Backend Node.js/NestJS/Express.
- Frontend React/Next.js.
- Librerías: ethers.js, viem, wagmi.
- Indexado de eventos: The Graph, listener propio o subgraph.
- Base de datos PostgreSQL.
- Cola de trabajos: BullMQ, Redis, SQS.
- Notificaciones: email, push, websocket.

Sin embargo, para producción se necesita:

- Auditoría de contratos.
- Ambiente de pruebas completo.
- Monitoreo de transacciones.
- Gestión de claves.
- Plan de contingencia.
- Manejo de reorganizaciones.
- Reconciliación contable.
- Soporte de disputas.

---

### 6.2 Viabilidad económica

Depende mucho de la red utilizada.

Si se usa Ethereum mainnet:

- Cada `approve`, `transfer`, `release` puede costar varios dólares o más.
- Compras pequeñas pueden no ser rentables.
- Múltiples empresas multiplican coste.

Si se usa Layer 2 o red de bajo coste:

- Arbitrum.
- Optimism.
- Base.
- Polygon zkEVM.
- zkSync.
- BNB Chain, si aplica.

Los costes bajan considerablemente.

**Recomendación:**  
No lanzar este modelo en Ethereum mainnet para e-commerce minorista, salvo tickets altos. Usar L2 o red de bajas comisiones.

---

### 6.3 Viabilidad de experiencia de usuario

La UX actual puede ser difícil para usuarios no cripto:

- Instalar MetaMask.
- Comprar EURT.
- Pagar gas.
- Entender aprobaciones.
- Confirmar múltiples transacciones.
- Responsabilidad sobre claves.

**Recomendación:**  
Para adopción masiva, considerar:

- Wallets integradas.
- Wallet abstraction.
- ERC-4337.
- Paymasters para patrocinar gas.
- Login social con smart wallets.
- Custodia opcional regulada.
- On-ramp fiat a EURT.
- Recuperación de cuenta.

---

### 6.4 Viabilidad legal y regulatoria

Este es uno de los aspectos más delicados.

Si la plataforma custodia fondos de usuarios y luego paga empresas, puede estar realizando actividades similares a:

- Servicio de pago.
- Custodia de activos digitales.
- Emisión de dinero electrónico si el EURT interno es propio.
- Intermediación de pagos.
- Conversión de activos.
- Obligaciones AML/KYC.
- Protección al consumidor.
- Facturación e IVA.
- Protección de datos personales.

En Europa podrían aplicar:

- MiCA.
- PSD2.
- Regulación e-money.
- GDPR.
- Normativa de consumidores.
- Normativa de comercio electrónico.

En Latinoamérica, dependerá de cada país.

**Recomendación:**  
Antes de implementar en producción, validar con legal:

- ¿Quién custodia?
- ¿La plataforma toca fondos?
- ¿EURT es externo o interno?
- ¿Hay KYC de empresas?
- ¿Hay KYC de usuarios?
- ¿Cómo se emiten facturas?
- ¿Cómo se gestionan reembolsos?
- ¿Quién es responsable ante pérdida?

---

## 7. Puntos débiles de la propuesta

| Área | Punto débil | Severidad | Comentario |
|---|---|---:|---|
| Custodia | La pasarela controla fondos | Alta | Centraliza riesgo y regulación |
| Flujo de pago | Transferencias múltiples | Alta | Caro, lento y propenso a errores |
| Condición de liberación | No hay enforcement claro | Alta | Dependencia de backend |
| Usuario | MetaMask obligatorio | Media-Alta | Fricción alta |
| Datos | Detalle de compra on-chain | Alta | Privacidad y coste |
| Disputas | No hay mecanismo | Alta | Bloqueos y abuso |
| Devoluciones | No contemplado | Alta | Inviable en e-commerce real |
| Logística | Confianza ciega en tracking | Media-Alta | Necesita oracle/evidencia |
| Estados | Posible inconsistencia on/off-chain | Media | Requiere indexado y reconciliación |
| Gas | Costes elevados si mainnet | Alta | Mejor L2 |
| Legal | Posible actividad regulada | Alta | Requiere asesoría |
| Token EURT | Riesgo de emisor/congelación | Media | Depende del token |
| Reputación | Sin anti-Sybil | Media | Riesgo de reseñas falsas |
| Empresas | Sin validación fuerte | Media | Riesgo de fraude |
| Backend | Punto único de fallo | Alta | Necesita alta disponibilidad |

---

## 8. Investigación/estado del arte: procesos más eficientes

Nota importante: no puedo navegar en vivo en este entorno, pero el análisis se basa en patrones ampliamente conocidos y documentados en sistemas blockchain, marketplaces descentralizados, protocolos de escrow y comercio electrónico Web3.

Existen metodologías más eficientes que el modelo descrito.

### 8.1 Escrow inteligente con un solo depósito

En lugar de:

```text
Usuario -> Custodio central -> N transferencias a empresas
```

Se recomienda:

```text
Usuario -> Contrato Escrow -> Liberación por subpedido -> Empresa
```

Ventajas:

- Menos confianza en la plataforma.
- Reglas transparentes.
- Menos transferencias inmediatas.
- Fondos auditables.
- Liberación condicional real.

---

### 8.2 Pull payments en lugar de push payments

En la propuesta, la pasarela “envía” pagos a empresas. Eso se llama push payment.

Es mejor usar pull payment:

1. El contrato registra cuánto puede retirar cada empresa.
2. La empresa ejecuta `withdraw`.
3. El contrato transfiere los fondos.

Ventajas:

- Si una dirección falla, no bloquea a las demás.
- Menor riesgo de reentrancia si está bien implementado.
- Mejor manejo de fallos.
- Más eficiente para muchos beneficiarios.

---

### 8.3 Firmas EIP-712 para autorizar órdenes

En lugar de meter todo el detalle en blockchain, el usuario puede firmar una estructura de orden fuera de cadena.

Ejemplo conceptual:

```json
{
  "orderId": "0x123...",
  "buyer": "0xabc...",
  "merchants": [
    "0xempresa1",
    "0xempresa2"
  ],
  "amounts": [
    "15.00",
    "8.50"
  ],
  "currency": "EURT",
  "nonce": 1,
  "expiry": 1730000000,
  "metadataHash": "0x..."
}
```

El usuario firma con MetaMask usando `eth_signTypedData_v4`.

Luego el contrato puede verificar:

```text
¿La firma corresponde al buyer?
¿El orderId no fue usado?
¿No expiró?
¿Los montos coinciden?
```

Ventajas:

- Menos datos on-chain.
- Mejor UX.
- Menor coste.
- Permite autorización explícita.
- Previene replay con nonce y chainId.

---

### 8.4 Permit / Permit2 para reducir transacciones

Si EURT soporta EIP-2612 Permit, el usuario puede aprobar y pagar en menos pasos.

Flujo tradicional ERC-20:

```text
1. approve
2. transferFrom
```

Con permit:

```text
1. firma de permit
2. depósito usando esa firma
```

Incluso se puede empaquetar con relayers.

Si EURT no soporta permit, se puede evaluar Permit2 si está disponible en el ecosistema.

---

### 8.5 Meta-transacciones y account abstraction

Para que el usuario no pague gas directamente:

- ERC-2771 meta-transactions.
- ERC-4337 smart accounts.
- Paymasters.
- Relayers.
- Session keys.
- Wallets custodiadas con recuperación.

Esto permite experiencias tipo Web2:

```text
Usuario hace clic en "confirmar recepción"
Backend envía transacción patrocinada
Usuario solo firma un mensaje
```

Pero hay riesgos:

- Quién paga gas.
- Prevención de abuso.
- Firmas maliciosas.
- Gestión de relayers.

---

### 8.6 Layer 2 o redes de bajo coste

Para e-commerce, Ethereum mainnet suele ser ineficiente.

Alternativas:

- Arbitrum.
- Optimism.
- Base.
- Polygon zkEVM.
- zkSync Era.
- Redes privadas EVM si se permite menor descentralización.

La elección depende de:

- Dónde existe EURT.
- Liquidez.
- Costes.
- Seguridad.
- Usuarios objetivo.
- Requisitos regulatorios.

---

### 8.7 Liquidación por lotes y Merkle distributor

Si hay muchas empresas y muchas órdenes, se puede usar un árbol Merkle para liquidar pagos.

Ejemplo:

```text
Cada período se calcula:
Empresa A -> 100 EURT
Empresa B -> 50 EURT
Empresa C -> 25 EURT

Se publica root on-chain.
Cada empresa reclama con proof.
```

Ventajas:

- Muy eficiente para muchos pagos.
- Menos transacciones.
- Menor coste.

Desventajas:

- Más complejidad.
- Liquidación no instantánea.
- Requiere proceso contable sólido.

---

### 8.8 Modelos híbridos: blockchain solo para liquidación

Si la prioridad es eficiencia y no descentralización máxima, se puede hacer:

```text
Usuarios y empresas usan balances internos.
Compras se registran off-chain.
Blockchain se usa para auditoría o liquidación periódica.
```

Ventajas:

- Muy rápido.
- Muy barato.
- Buena UX.

Desventajas:

- Plataforma custodia.
- Requiere regulación.
- Menos transparencia.

Este modelo puede ser más eficiente para un marketplace tradicional, pero cambia la naturaleza del sistema.

---

### 8.9 Protocolos de comercio descentralizado

Existen enfoques en el ecosistema Web3 que usan:

- Escrow.
- Vouchers NFT.
- Compromisos de entrega.
- Disputas.
- Reputación.
- Redención de productos físicos.

Sin citarlos como referencia exhaustiva, el patrón general es:

```text
Compromiso de compra -> token/voucher -> entrega -> liberación -> disputa si hace falta
```

Este patrón suele ser más robusto que transferir fondos manualmente desde una pasarela central.

---

## 9. Arquitectura recomendada

### 9.1 Separación clara de responsabilidades

| Capa | Responsabilidad |
|---|---|
| `web customer` | Carrito, checkout, estado de pedidos, confirmación, reputación |
| `web admin` | Gestión de empresas, productos, envío, disputas operativas |
| Backend/API | Orquestación, indexado, notificaciones, negocio off-chain |
| Smart Contract Escrow | Custodia programática, depósito, liberación, reembolsos |
| Token EURT | Medio de pago |
| Indexer | Escucha eventos blockchain y actualiza base de datos |
| Módulo de disputas | Resolución de incidencias |
| Reputación | Valoraciones verificadas por pedido liberado |

---

### 9.2 Modelo recomendado de custodia

#### Opción A: Escrow no custodial

Fondos en contrato inteligente.

```text
Usuario deposita en contrato.
Contrato retiene.
Usuario confirma o timeout libera.
Empresa retira fondos.
```

Ventajas:

- Menos riesgo regulatorio directo para la plataforma, aunque no desaparece.
- Mayor transparencia.
- Menos confianza central.

Desventajas:

- Complejidad técnica.
- Riesgo de bugs en contrato.
- Disputas más difíciles de automatizar.

#### Opción B: Custodio regulado

Fondos en cuentas/billeteras controladas por la plataforma o custodio autorizado.

```text
Plataforma recibe pago.
Plataforma paga empresas.
Plataforma gestiona reembolsos.
```

Ventajas:

- UX más simple.
- Fácil integración con pagos fiat.
- Mejor para usuarios no cripto.

Desventajas:

- Alta carga regulatoria.
- Riesgo de custodia.
- Requiere compliance fuerte.

#### Recomendación

Si el objetivo es blockchain real con menor confianza:

> Usar contrato de escrow no custodial.

Si el objetivo es marketplace eficiente con usuarios convencionales:

> Usar modelo híbrido o custodio regulado, pero no llamar “descentralizado” a un custodio central.

---

## 10. Flujo recomendado de compra

### 10.1 Checkout

1. Usuario arma carrito en `web customer`.
2. Backend calcula:
   - Total.
   - Empresas.
   - Montos por empresa.
   - Comisión de plataforma.
   - Impuestos si aplica.
   - Coste de envío.
3. Backend genera `orderHash`.
4. Usuario revisa resumen.
5. Usuario firma autorización de compra con MetaMask o wallet integrada.
6. Usuario aprueba EURT y deposita en contrato escrow.

Idealmente:

```text
1 firma de autorización
1 transacción de depósito
```

Si el token no soporta permit:

```text
1 approve
1 deposit
```

---

### 10.2 Depósito en contrato

El contrato debería recibir:

```text
buyer
orderHash
merchants[]
amounts[]
expiry
metadataHash
```

Y ejecutar:

```text
EURT.transferFrom(buyer, escrow, total)
```

Luego emitir evento:

```text
OrderDeposited(orderId, buyer, total, orderHash)
```

El backend escucha el evento y crea subpedidos.

---

### 10.3 Creación de subpedidos

Por cada empresa:

```text
Subpedido:
- orderId global
- suborderId
- empresa
- productos
- monto
- estado: EN_CUSTODIA
```

Esto evita que una empresa bloquee a otra.

---

## 11. Flujo recomendado de despacho

### 11.1 Empresa envía

En `web admin`:

1. Empresa selecciona pedido.
2. Completa:
   - Orden.
   - Empresa de envío.
   - Método.
   - Fecha/hora.
   - Tracking.
3. Backend guarda envío.
4. Opcionalmente se ancla un hash del envío en blockchain.
5. Estado pasa a `ENVIADO`.

No es necesario guardar todo el detalle on-chain. Basta:

```text
shippingHash = keccak256(
  orderId,
  carrier,
  method,
  tracking,
  timestamp
)
```

---

### 11.2 Usuario confirma recepción

Usuario ve pedido en `web customer` y pulsa “Confirmar recibido”.

Opciones:

#### Opción simple

Usuario envía transacción:

```text
release(suborderId)
```

#### Opción gasless

Usuario firma mensaje EIP-712:

```text
releaseAuthorization(suborderId, nonce)
```

Un relayer autorizado envía la transacción.

---

### 11.3 Liberación de fondos

El contrato verifica:

```text
- Pedido existe.
- Estado correcto.
- Usuario es buyer.
- Firma válida si aplica.
- No expiró.
- No hay disputa activa.
```

Entonces:

```text
marca subpedido como LIBERADO
acredita monto a empresa
emite evento Released
```

Recomendación: usar pull payment:

```text
empresa puede hacer withdraw()
```

o transferencia directa si se audita bien.

---

### 11.4 Actualización de estados

Backend escucha evento:

```text
Released(suborderId, merchant, amount)
```

Y actualiza:

- `web customer`: `RECIBIDO`
- `web admin`: `LIBERADO`

---

### 11.5 Reputación

Cuando el subpedido está `LIBERADO`, se habilita valoración.

Para evitar abuso:

- Solo pedidos liberados pueden valorar.
- Una valoración por subpedido.
- Vincular `orderId`, `buyer`, `merchant`.
- Guardar firma del usuario.
- Detectar patrones sospechosos.
- No guardar datos sensibles on-chain.

---

## 12. Estados recomendados

### 12.1 Pedido global

```text
DRAFT
PENDING_PAYMENT
FUNDED
PARTIALLY_SHIPPED
SHIPPED
PARTIALLY_RECEIVED
RECEIVED
COMPLETED
DISPUTED
CANCELLED
REFUNDED
```

### 12.2 Subpedido por empresa

```text
CREATED
IN_CUSTODY
SHIPPED
DELIVERED_PENDING_CONFIRMATION
RECEIVED
RELEASED
DISPUTED
REFUNDED
CANCELLED
```

---

## 13. Funciones mínimas recomendadas en contrato

A modo conceptual:

```solidity
depositOrder(
  bytes32 orderHash,
  address[] merchants,
  uint256[] amounts,
  uint256 expiry,
  bytes32 metadataHash
)

releaseSuborder(bytes32 suborderId)

releaseWithSignature(
  bytes32 suborderId,
  bytes signature
)

markShipped(bytes32 suborderId, bytes32 shippingHash)

openDispute(bytes32 suborderId)

resolveDispute(
  bytes32 suborderId,
  uint256 amountToBuyer,
  uint256 amountToMerchant
)

refundSuborder(bytes32 suborderId)

withdrawMerchant()
```

No es necesario implementar todo al inicio, pero el diseño debería contemplarlo.

---

## 14. Eventos blockchain recomendados

```text
OrderCreated
OrderDeposited
SuborderCreated
SuborderShipped
SuborderReleased
SuborderDisputed
DisputeResolved
SuborderRefunded
MerchantWithdrawn
```

El backend no debería confiar solo en respuestas HTTP. Debe reconciliar con eventos on-chain.

---

## 15. Recomendaciones técnicas específicas

### 15.1 No usar una EOA como custodia

Una billetera externa controlada por backend es riesgosa.

Usar:

```text
Contrato inteligente auditado
```

o, si se usa custodia tradicional:

```text
Custodio regulado + segregación de fondos + controles internos
```

---

### 15.2 No transferir a empresas antes de la confirmación

La custodia real implica que el comerciante no debería recibir fondos hasta que se cumpla la condición.

---

### 15.3 Usar un solo depósito por carrito

En lugar de múltiples transferencias iniciales:

```text
Usuario -> Escrow: total
```

Luego:

```text
Escrow registra distribución
```

---

### 15.4 Guardar datos personales fuera de cadena

Blockchain no es base de datos para datos personales.

Guardar off-chain:

- Nombre.
- Dirección.
- Teléfono.
- Detalle de productos.
- Documentos de disputa.
- Imágenes.
- Facturas.

On-chain:

- Hashes.
- Montos.
- Estados financieros.
- Identificadores.

---

### 15.5 Implementar idempotencia

Cada operación backend debería tener claves idempotentes:

```text
orderId
suborderId
txHash
logIndex
nonce
```

Esto evita duplicar pedidos o liberaciones.

---

### 15.6 Confirmaciones suficientes

No actualizar estado crítico con una transacción recién enviada.

Esperar:

- En L1: varios bloques.
- En L2: criterio de finalidad adecuado.
- Validar eventos.
- Monitorear reorgs.

---

### 15.7 Manejar token EURT con cuidado

Verificar:

- Dirección oficial del token.
- Decimales.
- Si es upgradable.
- Si permite freeze/blacklist.
- Riesgo de depeg.
- Liquidez.
- Cadena soportada.
- Integración con wallets.

---

### 15.8 Seguridad de contratos

Recomendado:

- Auditoría externa.
- Tests unitarios.
- Tests de integración.
- Cobertura alta.
- Análisis de reentrancia.
- Control de acceso.
- Pausa de emergencia.
- Límites de retiro.
- Timelock para upgrades.
- Bug bounty.
- Monitoreo on-chain.

---

### 15.9 Seguridad del backend

Aunque el contrato sea no custodial, el backend puede ser atacado.

Proteger:

- Claves de relayer.
- Roles de admin.
- APIs públicas.
- Rate limiting.
- Validación de firmas.
- Validación de montos.
- Logs inmutables.
- Backups.
- Entornos separados.
- Secrets management.

---

## 16. Recomendaciones de producto/UX

### 16.1 Ocultar complejidad blockchain

El usuario idealmente debería ver:

```text
Pagar
Confirmar
Ver pedido
Confirmar recepción
Valorar
```

No:

```text
approve
gas
nonce
transaction hash
chainId
```

A menos que sea usuario avanzado.

---

### 16.2 Permitir wallets alternativas

Además de MetaMask:

- WalletConnect.
- Coinbase Wallet.
- Smart wallets.
- Email login con custodia opcional.
- Wallet embebida.
- Recuperación social.

---

### 16.3 Mostrar estado claro de transacciones

Cada acción debería mostrar:

- Pendiente.
- Confirmada.
- Fallida.
- En disputa.
- Liberada.
- Reembolsada.

Con links al explorador si aplica.

---

### 16.4 Notificaciones

Notificar:

- Pago confirmado.
- Pedido enviado.
- Pedido entregado.
- Falta confirmación del usuario.
- Disputa abierta.
- Fondos liberados.
- Reembolso ejecutado.

---

## 17. Recomendaciones legales y de cumplimiento

### 17.1 Definir naturaleza del EURT

Preguntas clave:

- ¿EURT es una stablecoin externa?
- ¿Es un token interno?
- ¿Está respaldado 1:1?
- ¿Quién lo emite?
- ¿Es reembolsable?
- ¿Puede congelarse?

Si la plataforma emite una moneda interna convertible por bienes/servicios, puede haber implicaciones de dinero electrónico o medios de pago.

---

### 17.2 KYC/AML

Como mínimo:

- KYC de empresas.
- Validación de identidad legal.
- Verificación de wallet.
- Monitoreo de transacciones sospechosas.
- Políticas de sanciones.

Para usuarios, dependerá del riesgo, jurisdicción y montos.

---

### 17.3 Protección al consumidor

Debe existir:

- Derecho de desistimiento si aplica.
- Política de devoluciones.
- Plazos de entrega.
- Soporte.
- Reembolsos.
- Responsabilidad por pérdida o daño.
- Términos y condiciones.

---

### 17.4 Protección de datos

- No guardar datos personales on-chain.
- Cifrar datos sensibles.
- Registrar base legal de tratamiento.
- Permitir ejercicios de derechos.
- Contratos con procesadores.
- Retención mínima.

---

## 18. Proceso más eficiente recomendado

Una versión optimizada del flujo sería:

### Flujo de compra optimizado

1. Usuario crea carrito.
2. Backend valida stock, precios y wallets de empresas.
3. Backend genera orden firmable con hash.
4. Usuario firma autorización EIP-712.
5. Usuario deposita total en contrato escrow.
6. Contrato emite `OrderDeposited`.
7. Backend crea subpedidos por empresa.
8. Empresas ven pedidos en `EN_CUSTODIA`.

### Flujo de despacho optimizado

1. Empresa marca pedido como enviado.
2. Backend guarda tracking y notifica al usuario.
3. Usuario confirma recepción.
4. Usuario firma liberación o ejecuta transacción.
5. Contrato libera fondos a empresa.
6. Backend actualiza estados.
7. Usuario valora.

### Flujo alternativo si el usuario no confirma

1. Empresa presenta tracking válido.
2. Sistema espera periodo de entrega estimada.
3. Usuario puede abrir disputa.
4. Si no hay disputa, liberación automática.
5. Si hay disputa, pasa a resolución.

---

## 19. Comparación: propuesta actual vs propuesta recomendada

| Aspecto | Propuesta actual | Propuesta recomendada |
|---|---|---|
| Custodia | Servicio/billetera central | Contrato escrow auditado |
| Pago inicial | Usuario paga a custodia | Usuario deposita en contrato |
| Pago a empresas | Transferencias múltiples | Liberación por subpedido |
| Condición | Backend ejecuta | Contrato ejecuta |
| Datos de compra | Posiblemente on-chain | Hash off-chain |
| Disputas | No contempladas | Módulo de disputas |
| Timeout | No contemplado | Liberación automática condicional |
| UX | MetaMask y gas | Wallet abstraction / gasless opcional |
| Escalabilidad | Baja si mainnet | Alta si L2 |
| Privacidad | Baja | Alta con hash off-chain |
| Fallos parciales | Riesgo de bloqueo global | Subpedidos independientes |
| Reputación | Posterior, sin anti-Sybil | Vinculada a pedido liberado |
| Cumplimiento | Alto riesgo si custodia | Requiere diseño legal igualmente |

---

## 20. Recomendaciones priorizadas

### Prioridad crítica

1. **Definir si la custodia es contractual o centralizada.**
2. **No usar una billetera backend como custodia sin marco legal.**
3. **Implementar contrato de escrow o custodio regulado.**
4. **Añadir módulo de disputas y reembolsos.**
5. **No enviar datos personales completos on-chain.**
6. **Realizar auditoría legal y de smart contracts.**

### Prioridad alta

7. **Usar un solo depósito y liberación por subpedido.**
8. **Implementar estados claros y eventos blockchain.**
9. **Soportar liberación por firma o meta-transacción.**
10. **Añadir timeout de liberación.**
11. **Integrar tracking/logística con evidencia.**
12. **Usar red de bajas comisiones.**

### Prioridad media

13. **Implementar wallet abstraction.**
14. **Patrocinar gas para acciones críticas.**
15. **Añadir reputación verificada.**
16. **Implementar dashboard de reconciliación.**
17. **Añadir monitoreo de transacciones.**

### Prioridad futura

18. **Liquidación por lotes con Merkle.**
19. **State channels para compras recurrentes.**
20. **Integración con carriers como oráculos.**
21. **Sistema de resolución descentralizada de disputas.**
22. **Marketplace multi-token si es viable.**

---

## 21. Diseño técnico sugerido de alto nivel

```text
┌─────────────────┐
│   Web Customer  │
└────────┬────────┘
         │
         │ checkout, confirmación, disputas
         ▼
┌─────────────────┐        ┌────────────────────┐
│  Backend API    │◄──────►│  Indexer/Listener  │
└────────┬────────┘        └─────────┬──────────┘
         │                           │
         │                           │ eventos
         ▼                           ▼
┌─────────────────┐        ┌────────────────────┐
│   Web Admin     │        │  Smart Contract    │
└─────────────────┘        │  Escrow EURT       │
                           └─────────┬──────────┘
                                     │
                                     ▼
                           ┌────────────────────┐
                           │   Blockchain L2    │
                           └────────────────────┘
```

---

## 22. Ejemplo de flujo de contrato simplificado

### Depósito

```text
buyer firma autorización
buyer aprueba EURT
buyer llama escrow.deposit(orderData)
EURT se transfiere al contrato
contrato guarda distribución
evento OrderDeposited
```

### Liberación

```text
buyer confirma recepción
buyer firma release
relayer envía release
contrato valida firma
contrato acredita merchant
evento SuborderReleased
```

### Retiro empresa

```text
merchant llama withdraw()
contrato transfiere saldo disponible
evento MerchantWithdrawn
```

### Disputa

```text
buyer abre disputa
fondos quedan bloqueados
soporte/árbitro resuelve
contrato ejecuta refund o release
evento DisputeResolved
```

---

## 23. Conclusión

La metodología propuesta tiene una base conceptual correcta: usar EURT y un mecanismo de custodia para proteger al comprador hasta recibir la mercancía. Sin embargo, la implementación descrita presenta riesgos significativos porque convierte a la pasarela en un custodio central, depende de múltiples transferencias on-chain, no contempla disputas, devoluciones ni timeouts, y puede exponer datos de compra en blockchain.

La versión más eficiente y robusta sería:

```text
Usuario deposita una sola vez en un contrato inteligente de escrow.
El contrato registra asignaciones por empresa/subpedido.
La empresa envía y registra tracking.
El usuario confirma recepción o se libera por timeout/disputa.
El contrato libera fondos a cada empresa.
El backend indexa eventos y actualiza interfaces.
```

Para que sea viable en producción, se deben resolver especialmente:

- Custodia y regulación.
- Auditoría de contratos.
- Disputas y reembolsos.
- Privacidad de datos.
- Costes de gas.
- Experiencia de usuario.
- Manejo de fallos parciales.
- Reconciliación on-chain/off-chain.

En resumen: **la idea es viable, pero la arquitectura actual necesita rediseñarse para ser segura, eficiente, legalmente defendible y usable en un entorno real de comercio electrónico.**