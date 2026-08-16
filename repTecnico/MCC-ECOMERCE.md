Bases de desarrollo proyecto E-comerce para máster Code Crypto

Se trata de elaborar una plataforma que integre las actividades económicas de Compra y venta de productos/Servicios desde tres perspectivas usando una Stablecoin llamada eurotoken (EURT) que será la moneda de pago en la plataforma, establecemos como premisa los siguientes enfoques:

* Enfoque de las empresas: la plataforma debe garantizar los procesos básicos que le permita a una empresa desarrollar la actividad economica, la oferta y publicación de productos/servicios, la administración básica de inventario, la contabilidad básica del negocio, la competencia en el sistema de recompensa, el manejo de reputación, etc   
* Enfoque desde el cliente: la plataforma debe garantizar al cliente una experiencia de usuario atractiva y lógica para la localización y compra de un producto/servicio, para ello debe tener un apartado donde se gestione el carrito de compra, balance y gestión de finanzas basado en la Stablecoin de la plataforma, recargar su billetera a través de la plataforma de pago, manejo de reputación como clienta, pertenecer al sistema de recompensa, etc.  
* Enfoque bancario: la plataforma permite tanto a clientes como a empresas gestionar sus finanzas basado en una Stablecoin única para la plataforma permitiendo que todas las transacciones de compra y venta entre el cliente y las empresas sea a través de este activo, también debe ofrecer la herramientas para la adquisición, transferencia y liquidación de está crioptomoneda a través de la construcción de la plataforma de una pasarela de pago.  
* Enfoque de la plataforma: debe ofrecer la robustez utilizando la arquitectura web3 para certificar las transferencias de activos (estable coin interna) entre las diferentes billeteras, la tranzabilidad del ejercicio económico, la certificación (KYC ligero) tanto para el cliente como para la empresa, el manejo integral de la privacidad e identidad de ambos actores, el sistema de recompensa y el sistema de reputación.

Actúa como un ingeniero de Software y genera una entrevista para descifrar las necesidades del cliente (Yo), poder definir los principales procesos, las  tecnologías involucradas y el diagrama de base de datos. Como estar de desarrollo debes cumplir estrictamente con 7 fases (Conceptualización, planificación, codificación, despliegue, pruebas, registro y puesta en producción), sólo cuando alcancemos el 100% de cada fase pasaremos a la siguiente. La forma de iteración entre nosotros será tipo entrevista

tomaremos como concepto principal que los sistemas (WEB’s) se ejecutaran de forma independiente, cada uno con sus componentes de despliegue y estructura, se desplegaran en diferentes puertos (como si fueran micro servicios que se ejecutan el estructuras diferentes) web admin 3000, web cliente 3001, pasarela de pago 3002, web de compra de crypto con strpe 3003\.

la secuencia de conceptualización sera:

1. web de compra de crypto con stripe (puerto 3003): en este web se usara para validar la compra del EUROTOKEN con tarjetas de cheditos de prueba.  
   1. usa la *Publishable key* pk\_test\_51U33mX3SsKtEjZCdpMF89LCgtK9HZkvxMZPoUtuuVRnwWbSuinuPRyp6xZvZWZBX9Sso9QPhM1cF9UR5BUKFQu0T00mGHzQ97f (para el frontend) y la *Secret key* sk\_test\_51U33mX3SsKtEjZCdtzeQeA2iw85cvwG7bCdEtyj5Cfa09yX9No92Efj8Suxgf5TJTqaz35Mu5VD4PenTP4CwOcRv00djJuJ1x3 (para el backend).   
   2. **Instala la librería oficial**: Usa el paquete adecuado según tu lenguaje.  
   3. **Usa Stripe Elements o Checkout**: No crees formularios de tarjeta nativos de HTML. Utiliza las herramientas precargadas de Stripe para que los datos viajen seguros y cumplas con las normativas de seguridad de datos (PCI-DSS).  
2.  pasarela de pago (puerto 3002): Una pasarela de pago Web3 construida con Next.js que permite realizar pagos con el token EuroToken (EURT) en Ethereum utilizando MetaMask.Esta aplicación funciona como una pasarela de pago descentralizada que permite a comerciantes recibir pagos en EuroToken de sus clientes. La pasarela maneja todo el flujo de pago, desde la conexión de la billetera hasta la confirmación de la transacción en blockchain.  
   1. Características:  
      1. \- ✅ Conexión con MetaMask para autenticación Web3  
      2. \- ✅ Interfaz de pago intuitiva y responsiva  
      3. \- ✅ Validación de dirección de cliente  
      4. \- ✅ Verificación de saldo antes de procesar pagos  
      5. \- ✅ Confirmación visual de transacciones  
      6. \- ✅ Redirección automática después del pago  
      7. \- ✅ Soporte para integración mediante URL parameters  
      8. \- ✅ Comunicación con ventana padre via postMessage  
   2. Tecnologías:  
      1. \- \*\*Framework:\*\* Next.js 15.5.4 con App Router  
      2. \- \*\*React:\*\* 19.1.0  
      3. \- \*\*Blockchain:\*\* Ethers.js 6.15.0  
      4. \- \*\*Estilos:\*\* Tailwind CSS 4  
      5. \- \*\*TypeScript:\*\* 5.x  
      6. \- \*\*Turbopack:\*\* Para desarrollo y build optimizados  
   3. Requisitos Previos:  
      1. \- Node.js 20.x o superior  
      2. \- MetaMask instalado en el navegador  
      3. \- Acceso a una red Ethereum (local o testnet)  
      4. \- Token EuroToken (EURT) desplegado en la red  
3. web admin (puerto 3003): se encarga de gestionar las incripciones de las empresas, también gestiona el inventario de dicha empresa y su entrega, gestionar los pedidos y las finanzas de la empresa.  
4.  web cliente (puerto 3001): en esta web se gestionara las funciones principales del cliente y sus actividades de compra, la administración de su billetera para la compra de eurotoken y finanzas en general, gestión de los pedidos de compra (carrito de compra) y su seguimiento hasta la entrega, el sistema de puntuación de las empresa a través de la valoración de la empresa.

