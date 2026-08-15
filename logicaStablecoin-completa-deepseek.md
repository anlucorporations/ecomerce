## Método más efectivo: Escrow granular por vendedor con contrato inteligente en capa 2

El método más efectivo no consiste en una pasarela central que retiene fondos y genera transferencias condicionadas, sino en **un sistema descentralizado de escrow granular**, donde cada vendedor tiene su propio contrato de custodia, los fondos viven en la blockchain y la lógica de liberación está programada en un contrato inteligente. A continuación se describe en detalle.

---

### 1. Principios de diseño

- **Descentralización real**: los EURT no los custodia una API ni una empresa; los retiene un contrato inteligente inmutable.
- **Granularidad**: el carrito se divide en una orden por vendedor (o por grupo de envío). Cada orden tiene su propio escrow, lo que permite envíos, confirmaciones y disputas independientes.
- **Patrón *pull***: los fondos no se transfieren automáticamente; cada beneficiario retira su saldo cuando se libera. Esto reduce transacciones y evita fallos en cadena.
- **Confirmación optimista con timeout**: si el comprador no confirma ni disputa en un plazo definido, los fondos se liberan automáticamente al vendedor. No se depende de la acción manual indefinida del comprador.
- **Eficiencia de gas**: despliegue en una capa 2 (Polygon, Arbitrum, Base, Optimism), uso de `permit` (EIP-2612) y meta-transacciones para que el usuario no necesite ETH nativo.
- **Sincronización off-chain mediante eventos**: los backends de customer y admin escuchan eventos del contrato para actualizar sus bases de datos sin ser custodios.

---

### 2. Arquitectura propuesta

```
┌─────────────────┐      ┌──────────────────────────────┐
│ Web Customer    │      │   Web Admin (vendedores)      │
│ (frontend)      │      │   (frontend)                  │
└────────┬────────┘      └──────────────┬───────────────┘
         │                              │
         │  API de coordinación (puerto 3002)
         │  (solo orquesta, no custodia)
         │                              │
         ▼                              ▼
┌─────────────────────────────────────────────────────┐
│                Contratos inteligentes               │
│                                                     │
│  EscrowFactory (crea clones de EscrowOrder)         │
│        │                                            │
│        ├── EscrowOrder #1 (Vendedor A)              │
│        ├── EscrowOrder #2 (Vendedor B)              │
│        └── EscrowOrder #N (Vendedor N)              │
│                                                     │
│  Cada EscrowOrder retiene EURT y gestiona estados.  │
└─────────────────────────────────────────────────────┘
         │
         ▼
   Red L2 (Polygon/Arbitrum) + EURT (con permit)
```

- **`EscrowFactory`**: contrato que despliega clones ligeros de `EscrowOrder` mediante el estándar EIP-1167. El coste de crear una orden es mínimo.
- **`EscrowOrder`**: contrato por orden que maneja el ciclo de vida completo: depósito, envío, confirmación, disputa, reembolso y retiro.
- **API en puerto 3002**: solo coordina llamadas, emite órdenes de firma y escucha eventos. No tiene capacidad de mover fondos.

---

### 3. Flujo de compra (carrito dividido por vendedor)

1. **Creación de órdenes**  
   Cuando el usuario procede al pago, el backend de customer divide el carrito por vendedor. Para cada vendedor se crea una orden con:
   - Dirección del comprador.
   - Dirección del vendedor.
   - Monto en EURT.
   - Período de disputa (p. ej., 7 días).
   - Plazo máximo de envío (p. ej., 3 días).
   
   El backend llama a `EscrowFactory.createOrder(...)` y obtiene un contrato `EscrowOrder` por cada vendedor.

2. **Depósito del comprador**  
   El usuario firma una transacción de `permit` (EIP-2612) para aprobar el gasto de EURT y luego el backend (o un relayer) ejecuta el depósito en cada `EscrowOrder`.  
   Alternativamente, se puede usar `multicall` para agrupar todos los depósitos en una sola transacción.  
   Los fondos quedan retenidos en el contrato de la orden, no en una billetera central.

3. **Notificación a vendedores**  
   Una vez confirmado el depósito on-chain, el backend de customer actualiza el estado del carrito y notifica a web admin la existencia de nuevas órdenes con estado **"En custodia"**.

4. **Vendedor envía el producto**  
   El vendedor marca la orden como enviada en web admin. El backend llama a `EscrowOrder.markAsShipped(trackingHash)`.  
   El `trackingHash` puede ser el hash de la información de envío (empresa, número de tracking, fecha). El detalle completo se guarda off-chain.

5. **Comprador confirma recepción**  
   El comprador en web customer marca la orden como recibida. El backend llama a `EscrowOrder.confirmReceipt()`.  
   Si el comprador no hace nada, el vendedor puede ejecutar `finalizeAfterTimeout()` después del período de disputa y liberar los fondos.  
   Si el comprador no está conforme, puede abrir una disputa antes de que expire el plazo.

6. **Vendedor retira fondos**  
   Una vez liberada la orden, el vendedor (o su backend) llama a `EscrowOrder.withdraw()` y recibe sus EURT.  
   No se realiza ninguna transferencia automática desde un contrato central; cada vendedor retira su saldo.

---

### 4. Flujo de despacho y manejo de excepciones

- **Cancelación antes del envío**  
  Si el vendedor no marca como enviado dentro del plazo máximo de envío, el comprador puede cancelar y recuperar su depósito llamando a `cancelOrder()`.

- **Disputa**  
  Si el comprador abre una disputa, el estado pasa a `Disputed` y los fondos quedan bloqueados. Un árbitro (puede ser una multisig de la plataforma, un tribunal descentralizado como Kleros o un oráculo optimista) resuelve a favor del comprador (reembolso) o del vendedor (liberación).

- **Liberación automática por timeout**  
  Si la orden está enviada y no hay confirmación ni disputa después del período establecido, cualquier parte puede llamar a `finalizeAfterTimeout()` y los fondos se liberan al vendedor. Esto evita que los fondos queden atrapados por inacción del comprador.

- **Envíos parciales**  
  Al estar cada vendedor en un escrow separado, un retraso o problema con un vendedor no afecta a los demás. El comprador puede confirmar recepción de los productos que sí llegaron.

---

### 5. Mejoras frente al método original

| Aspecto | Método original | Método efectivo propuesto |
|---------|-----------------|---------------------------|
| **Custodia** | API central (puerto 3002) | Contratos inteligentes por orden |
| **Transferencias** | 1 + N transacciones (usuario→custodia, custodia→cada empresa) | 1 depósito por orden + 1 retiro por vendedor |
| **Condicionalidad** | Transferencias "condicionadas" no estándar | Estados del contrato con liberación programada |
| **Dependencia del comprador** | Liberación solo si el comprador marca recibido | Liberación automática por timeout si no hay disputa |
| **Disputas** | No definidas | Período de disputa + árbitro |
| **Cancelación** | No definida | Cancelación antes del envío con reembolso |
| **Envíos parciales** | Acoplados en una sola orden | Independientes por vendedor |
| **Coste de gas** | Alto (muchas transacciones) | Bajo (L2, clones, permit, multicall) |
| **UX** | Lenta, requiere confirmaciones múltiples | Fluida con meta-transacciones y paymaster |

---

### 6. Implementación con OpenZeppelin

Los contratos se construyen con módulos auditados:

- **`Initializable` + `Clones`**: contratos `EscrowOrder` desplegados como clones ligeros desde la fábrica.
- **`AccessControl`**: roles para `PLATFORM_ROLE` (backend), `ARBITRATOR_ROLE` (resolución de disputas) y `DEFAULT_ADMIN_ROLE`.
- **`ReentrancyGuard`**: evita ataques de reentrancy en funciones de retiro y reembolso.
- **`Pausable`**: permite pausar el sistema en caso de emergencia.
- **`SafeERC20`**: transferencias seguras de EURT.

Funciones principales de `EscrowOrder`:

```solidity
function initialize(address buyer, address seller, uint256 amount, uint256 disputePeriod, uint256 maxShippingTime) external;
function deposit(uint256 amount) external;                 // Usuario deposita EURT
function markAsShipped(bytes32 trackingHash) external;     // Vendedor envía
function confirmReceipt() external;                        // Comprador confirma
function dispute() external;                               // Comprador disputa
function resolveDispute(bool buyerWins) external;          // Árbitro resuelve
function finalizeAfterTimeout() external;                  // Liberación automática
function cancelOrder() external;                           // Cancelación antes de envío
function withdraw() external;                              // Vendedor retira
```

Todos los cambios de estado emiten eventos (`Deposited`, `Shipped`, `Confirmed`, `Disputed`, `Resolved`, `Withdrawn`) que los backends de customer y admin escuchan para sincronizar sus bases de datos.

---

### 7. Ventajas finales del método efectivo

- **Confianza minimizada**: ni la plataforma ni la API pueden robar o congelar fondos arbitrariamente.
- **Aislamiento de riesgos**: un problema con un vendedor no bloquea a los demás.
- **Costes reducidos**: L2 + clones + `permit` + patrón pull reducen drásticamente el coste por operación.
- **Completitud**: contempla cancelación, disputa, reembolso, timeout y envíos parciales.
- **Escalabilidad**: al ser contratos ligeros y sin estado global complejo, el sistema puede manejar miles de órdenes sin degradación.
- **Mejor UX**: el usuario no necesita ETH para gas (si se usa paymaster), no espera múltiples confirmaciones on-chain y puede interactuar con la billetera de forma sencilla.

---

### 8. Puntos débiles residuales y mitigación

- **Auditoría obligatoria**: el contrato maneja fondos; se requiere auditoría profesional.
- **Dependencia de EURT**: si el emisor congela fondos, el sistema se ve afectado. Mitigación: usar una stablecoin descentralizada o múltiples tokens.
- **Regulación**: la custodia de fondos puede requerir licencia; se debe consultar con asesores legales.
- **Educación del usuario**: el uso de wallets y firmas puede ser una barrera; mitigar con onboarding simplificado y meta-transacciones.

---

### Conclusión

El método más efectivo es un **escrow granular por vendedor implementado con contratos inteligentes en una capa 2**, donde cada orden tiene su propio contrato de custodia, los fondos se liberan mediante lógica programada con confirmación optimista, disputas y timeouts, y la API solo coordina sin tocar los activos. Este enfoque resuelve las deficiencias del modelo original y aprovecha las mejores prácticas de OpenZeppelin y del ecosistema blockchain actual, ofreciendo seguridad, eficiencia y una experiencia de usuario superior.