enfocate en la carpeta stablecoin, esta es la base para los servicios externos (pasarela de pago y Compra de EURT), la logica deberia centrarce en lo siguiente:

la pasarela de pago (contrato de custodia): en este servicio (puerto 3002) solo proporciona la API para que la plataforma sirva de intermediario entre el usuario y las empresas. funciona como un contrato custodia que solo cuando se cumplan las condiciones se ejecuta las tranferencias de EURT que se desplegan en una compra, 

el flujo de compra Debera ser:

1. el Usuario en web customer procede al pago del carrito. envia a la pasarela el detalle de toda la compra.
2. la pasarela de pago se envia la autorizacion a metamax de usuario la tranferencia del total en EURT a la billetera de custodia.la autorizacion debe contener la informacion de la compra y los montos que seran tranferidos a cada empresa.
3. despues que la tranferencia resulte efectiva, la pasarela de pago se calcula el monto para cada empresa y genera la transferencia (EURT) a nombre de cada una con la condicion de efectuarce cuando el usuario emita el acuse de recibo de la mercancia. 
4. al ejecutarce correctamente todas las transacciones (on-chanin) se envia a web customer para continuar con el procesamiento de la orden.
5. al recibir la ejecucion exitosa de la pasarela, la web customer actualizar el carrito y envia la orden de compra para cada empresa en estado con la billetera del usuario a web admin.
6. web amin genera las ordenes de compra para cada empresa en estado "En Custodia".

el flujo de trabajo para el despacho Debera ser:

1. en web admin la empresa marca la orden de despacho como "Enviado" llenando el formulario de envio (Orden, Empresa de envio, Metodo de Envio, Fecha / Hora, Tracking / Numero de envio).
2. el usuario en web customer marca la orden como recibido. web customer envia la notificacion a la pasarela de pago la orden de liberacion del monto EURT a nombre de la empresa.
3. al ejecutarce efectivamente la liberacion la pasarela envia la respuesta a web customer.
4. en web customer al recibir notificacion exitosa pasa la orden a estado "Recibido" (en web admin aparece Liberado).
5. en web customer muestra el formulario para la valoracion de la compra (sistema de reputacion).



resolucion qwend

La custodia debería estar en un contrato inteligente de escrow, no en una billetera controlada por un backend. El contrato retendría los fondos y solo los liberaría según reglas programadas.

Usar un flujo explícito de firma:
Firma de autorización tipo EIP-712.
Transacción approve + transferFrom, si EURT es ERC-20.
Idealmente permit o Permit2, si el token lo soporta.
Meta-transacciones si se quiere reducir fricción.

Guardar el detalle completo fuera de cadena y enviar solo un hash criptográfico a blockchain.
Por ejemplo:
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
La blockchain verifica el compromiso; el detalle legal/commercial se guarda en base de datos o almacenamiento cifrado.

No transferir a las empresas en el momento de compra. En su lugar:
El usuario deposita el total en un contrato de escrow.
El contrato registra las asignaciones por empresa o subpedido.
Cada empresa solo recibe fondos cuando se libera su subpedido.
La liberación puede ser por usuario, timeout, árbitro o evidencia de entrega.

Diseñar el sistema con subpedidos independientes.
Cada subpedido puede tener su propio estado:
PENDIENTE
EN_CUSTODIA
ENVIADO
RECIBIDO
LIBERADO
DISPUTA
REEMBOLSADO
CANCELADO

¿Qué pasa si el usuario no confirma recepción?
Implementar timeout o liberación automática a los 5 dias de ser enviado se penaliza al usuario con 0 estrellas calificacion
(comocondicionada).

¿Qué pasa si el producto llega dañado o incorrecto?
La propuesta no contempla:
Devoluciones.
Reembolsos parciales.
Productos dañados.
Productos faltantes.
Disputas.
Cancelaciones antes del envío.
Cancelaciones después del envío.
Recomendación:
Añadir módulo de disputas.
Estados mínimos:
DISPUTA_ABIERTA
DISPUTA_EN_REVISION
RESUELTO_A_FAVOR_EMPRESA
RESUELTO_A_FAVOR_USUARIO
REEMBOLSO_PARCIAL
REEMBOLSO_TOTAL
Y funciones en contrato
openDispute(orderId)
resolveDispute(orderId, resolution)
refund(orderId, amount)
releasePartial(orderId, amount)

La liberación debería ser una operación sobre contrato inteligente, idealmente iniciada por:
Firma del usuario.
Transacción del usuario.
Meta-transacción firmada por usuario y enviada por relayer.
Timeout automático.
Resolución de disputa.
El backend solo debería indexar eventos y actualizar interfaz.


Modelo recomendado de custodia
Opción A: Escrow no custodial
Fondos en contrato inteligente.
Usuario deposita en contrato.
Contrato retiene.
Usuario confirma o timeout libera.
Empresa retira fondos.
